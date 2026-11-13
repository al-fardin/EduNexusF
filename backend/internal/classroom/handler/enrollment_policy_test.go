package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/classroom/repository"
	"github.com/edunexus/edunexus/internal/classroom/service"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	appErrors "github.com/edunexus/edunexus/internal/platform/errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func enrollmentApp(f *testsupport.Fixture) (*fiber.App, *EnrollmentPhase5) {
	h := NewEnrollmentPhase5(f.DB)
	app := fiber.New(fiber.Config{ErrorHandler: appErrors.Handler})
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user_id", c.Get("X-Test-User"))
		c.Locals("role", "student")
		return c.Next()
	})
	app.Post("/lookup", h.LookupCode)
	app.Post("/join", h.Join)
	g := app.Group("/classrooms/:id")
	g.Get("/settings", h.JoinSettings)
	g.Put("/settings", h.JoinSettings)
	g.Get("/requests", h.JoinRequests)
	g.Post("/requests/:requestID/respond", h.ReviewJoinRequest)
	g.Get("/invitations", h.Invitations)
	g.Post("/invitations", h.InviteStudent)
	g.Post("/invitations/:invitationID/revoke", h.RevokeInvitation)
	app.Get("/inbox", h.EnrollmentInbox)
	app.Post("/respond/:invitationID", h.RespondInvitation)
	app.Post("/cancel/:requestID", h.CancelJoinRequest)
	q := db.New(f.DB)
	create := New(service.New(repository.New(q, f.DB), repository.NewMembershipRepository(q)))
	app.Post("/create", create.Create)
	return app, h
}
func enrollmentCall(t *testing.T, app *fiber.App, user, method, path string, payload any, status int) map[string]any {
	t.Helper()
	raw, _ := json.Marshal(payload)
	r := httptest.NewRequest(method, path, bytes.NewReader(raw))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("X-Test-User", user)
	res, e := app.Test(r, 5000)
	if e != nil {
		t.Fatal(e)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != status {
		t.Fatalf("%s %s expected %d got %d: %s", method, path, status, res.StatusCode, body)
	}
	var out map[string]any
	json.Unmarshal(body, &out)
	data, _ := out["data"].(map[string]any)
	return data
}
func classCode(t *testing.T, f *testsupport.Fixture) string {
	t.Helper()
	var code string
	if e := f.DB.QueryRow(t.Context(), `UPDATE classrooms SET class_code=upper(class_code) WHERE id=$1::uuid RETURNING class_code`, f.ClassID).Scan(&code); e != nil {
		t.Fatal(e)
	}
	return code
}
func TestEnrollmentCreateIsAtomicAndDefaultsRemainDirect(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	ids := []string{}
	t.Cleanup(func() { f.DB.Exec(context.Background(), `DELETE FROM classrooms WHERE id=ANY($1::uuid[])`, ids) })
	expires := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	for _, v := range []struct {
		payload fiber.Map
		mode    string
		enabled bool
	}{{fiber.Map{"name": "Approval class", "join_mode": "approval", "code_join_enabled": false, "class_code_expires_at": expires}, "approval", false}, {fiber.Map{"name": "Existing client defaults"}, "direct", true}} {
		data := enrollmentCall(t, app, f.Teacher, "POST", "/create", v.payload, 201)
		id := data["id"].(string)
		ids = append(ids, id)
		var mode string
		var enabled bool
		var expiry *time.Time
		if e := f.DB.QueryRow(t.Context(), `SELECT join_mode,code_join_enabled,class_code_expires_at FROM classrooms WHERE id=$1::uuid`, id).Scan(&mode, &enabled, &expiry); e != nil {
			t.Fatal(e)
		}
		if mode != v.mode || enabled != v.enabled {
			t.Fatal("creation did not persist enrollment policy")
		}
		if v.mode == "approval" && (expiry == nil || !expiry.Equal(expires)) {
			t.Fatal("creation lost expiry")
		}
	}
	enrollmentCall(t, app, f.Teacher, "POST", "/create", fiber.Map{"name": "Invalid", "join_mode": "unknown"}, 400)
	enrollmentCall(t, app, f.Teacher, "POST", "/create", fiber.Map{"name": "Expired", "class_code_expires_at": time.Now().Add(-time.Hour)}, 400)
}
func TestApprovalDoesNotEnrollBeforeTeacherReviewAndRechecksExpiry(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	base := "/classrooms/" + f.ClassID
	code := classCode(t, f)
	policy := fiber.Map{"join_mode": "approval", "code_join_enabled": true, "class_code_expires_at": time.Now().Add(time.Hour), "version": 1}
	enrollmentCall(t, app, f.Student, "PUT", base+"/settings", policy, 403)
	saved := enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", policy, 200)
	if saved["version"] != float64(2) {
		t.Fatal(saved)
	}
	enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", policy, 409)
	lookup := enrollmentCall(t, app, f.Outsider, "POST", "/lookup", fiber.Map{"class_code": code}, 200)
	if lookup["join_mode"] != "approval" {
		t.Fatal(lookup)
	}
	payload := fiber.Map{"class_code": code, "student_roll": "002"}
	request := enrollmentCall(t, app, f.Outsider, "POST", "/join", payload, 202)
	id := request["request_id"].(string)
	repeat := enrollmentCall(t, app, f.Outsider, "POST", "/join", payload, 202)
	if repeat["request_id"] != id || repeat["version"] != float64(1) {
		t.Fatal("pending retry was not idempotent")
	}
	var active bool
	f.DB.QueryRow(t.Context(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active')`, f.ClassID, f.Outsider).Scan(&active)
	if active {
		t.Fatal("request granted classroom access")
	}
	payload["student_roll"] = "003"
	enrollmentCall(t, app, f.Outsider, "POST", "/join", payload, 202)
	enrollmentCall(t, app, f.Student, "GET", base+"/requests", nil, 403)
	enrollmentCall(t, app, f.Outsider, "POST", base+"/requests/"+id+"/respond", fiber.Map{"status": "approved", "version": 2}, 403)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/requests/"+id+"/respond", fiber.Map{"status": "approved", "version": 1}, 409)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/requests/"+id+"/respond", fiber.Map{"status": "approved", "version": 2}, 200)
	var roll string
	if e := f.DB.QueryRow(t.Context(), `SELECT student_roll FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active'`, f.ClassID, f.Outsider).Scan(&roll); e != nil || roll != "003" {
		t.Fatal("approval did not enroll the requested roll")
	}
	enrollmentCall(t, app, f.Teacher, "POST", base+"/requests/"+id+"/respond", fiber.Map{"status": "approved", "version": 2}, 409)
	enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", fiber.Map{"join_mode": "approval", "code_join_enabled": true, "class_code_expires_at": time.Now().Add(-time.Second), "version": 2}, 200)
	enrollmentCall(t, app, f.Student, "POST", "/lookup", fiber.Map{"class_code": code}, 410)
	enrollmentCall(t, app, f.Student, "POST", "/join", payload, 410)
}
func TestApprovalConcurrentRollConflictAndStudentWithdrawal(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	base := "/classrooms/" + f.ClassID
	code := classCode(t, f)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid;`, f.ClassID, f.Student); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", fiber.Map{"join_mode": "approval", "code_join_enabled": true, "version": 1}, 200)
	ids := []string{}
	for _, student := range []string{f.Student, f.Outsider} {
		data := enrollmentCall(t, app, student, "POST", "/join", fiber.Map{"class_code": code, "student_roll": "007"}, 202)
		ids = append(ids, data["request_id"].(string))
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	statuses := []int{}
	for _, id := range ids {
		wg.Go(func() {
			raw, _ := json.Marshal(fiber.Map{"status": "approved", "version": 1})
			r := httptest.NewRequest("POST", base+"/requests/"+id+"/respond", bytes.NewReader(raw))
			r.Header.Set("Content-Type", "application/json")
			r.Header.Set("X-Test-User", f.Teacher)
			res, e := app.Test(r, 5000)
			if e != nil {
				t.Error(e)
				return
			}
			defer res.Body.Close()
			mu.Lock()
			statuses = append(statuses, res.StatusCode)
			mu.Unlock()
		})
	}
	wg.Wait()
	if len(statuses) != 2 || statuses[0]+statuses[1] != 609 {
		t.Fatal(statuses)
	}
	var pending, student string
	if e := f.DB.QueryRow(t.Context(), `SELECT id::text,user_id::text FROM classroom_join_requests WHERE classroom_id=$1::uuid AND status='pending'`, f.ClassID).Scan(&pending, &student); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, f.Teacher, "POST", "/cancel/"+pending, fiber.Map{"version": 1}, 404)
	enrollmentCall(t, app, student, "POST", "/cancel/"+pending, fiber.Map{"version": 1}, 200)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/requests/"+pending+"/respond", fiber.Map{"status": "approved", "version": 1}, 409)
}
func TestInvitationRequiresVerifiedRecipientAndBypassesExpiredCode(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	base := "/classrooms/" + f.ClassID
	if _, e := f.DB.Exec(t.Context(), `UPDATE classrooms SET join_mode='approval' WHERE id=$1::uuid`, f.ClassID); e != nil {
		t.Fatal(e)
	}
	request := enrollmentCall(t, app, f.Outsider, "POST", "/join", fiber.Map{"class_code": classCode(t, f), "student_roll": "008"}, 202)
	email := f.Outsider + "@example.invalid"
	enrollmentCall(t, app, f.Student, "POST", base+"/invitations", fiber.Map{"email": email}, 403)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": f.Student + "@example.invalid"}, 409)
	invite := enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": " " + strings.ToUpper(email) + " "}, 201)
	id := invite["id"].(string)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": email}, 429)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classrooms SET join_mode='approval',code_join_enabled=false,class_code_expires_at=now()-interval '1 hour' WHERE id=$1::uuid`, f.ClassID); e != nil {
		t.Fatal(e)
	}
	inbox := enrollmentCall(t, app, f.Outsider, "GET", "/inbox?invite="+id, nil, 200)
	if inbox["pending_invitations"] != float64(1) {
		t.Fatal(inbox)
	}
	enrollmentCall(t, app, f.Student, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "008"}, 409)
	if _, e := f.DB.Exec(t.Context(), `UPDATE users SET email_verified=false WHERE id=$1::uuid`, f.Outsider); e != nil {
		t.Fatal(e)
	}
	inbox = enrollmentCall(t, app, f.Outsider, "GET", "/inbox", nil, 200)
	for _, item := range inbox["items"].([]any) {
		if item.(map[string]any)["kind"] == "invitation" {
			t.Fatal("unverified email disclosed invitation")
		}
	}
	enrollmentCall(t, app, f.Outsider, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "008"}, 409)
	if _, e := f.DB.Exec(t.Context(), `UPDATE users SET email_verified=true WHERE id=$1::uuid`, f.Outsider); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, f.Outsider, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "001"}, 409)
	enrollmentCall(t, app, f.Outsider, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "008"}, 200)
	enrollmentCall(t, app, f.Outsider, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "009"}, 409)
	var roll string
	if e := f.DB.QueryRow(t.Context(), `SELECT student_roll FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Outsider).Scan(&roll); e != nil || roll != "008" {
		t.Fatal("invitation changed or omitted the chosen roll")
	}
	var requestStatus string
	if e := f.DB.QueryRow(t.Context(), `SELECT status FROM classroom_join_requests WHERE id=$1::uuid`, request["request_id"]).Scan(&requestStatus); e != nil || requestStatus != "approved" {
		t.Fatal("invitation left an obsolete pending join request")
	}
}
func TestInvitationSignupExpiryRevocationAndDecline(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	base := "/classrooms/" + f.ClassID
	email := "future-" + uuid.NewString() + "@example.invalid"
	id := enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": email}, 201)["id"].(string)
	user := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO users(id,email,username,password_hash,first_name,last_name,email_verified) VALUES($1::uuid,$2,$1::text,'fixture','Future','Student',true)`, user, email); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { f.DB.Exec(context.Background(), `DELETE FROM users WHERE id=$1::uuid`, user) })
	inbox := enrollmentCall(t, app, user, "GET", "/inbox", nil, 200)
	if inbox["pending_invitations"] != float64(1) {
		t.Fatal("invitation did not survive later signup")
	}
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET expires_at=now()-interval '1 second' WHERE id=$1::uuid`, id); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, user, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "88"}, 409)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET expires_at=now()+interval '1 day' WHERE id=$1::uuid`, id); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, user, "POST", "/respond/"+id, fiber.Map{"status": "declined", "version": 1}, 200)
	enrollmentCall(t, app, user, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "88"}, 409)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET updated_at=now()-interval '11 minutes' WHERE id=$1::uuid`, id); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": email}, 201)
	enrollmentCall(t, app, user, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 1, "student_roll": "88"}, 409)
	enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations/"+id+"/revoke", fiber.Map{"version": 3}, 200)
	enrollmentCall(t, app, user, "POST", "/respond/"+id, fiber.Map{"status": "accepted", "version": 3, "student_roll": "88"}, 409)
}

type invitationMailer struct {
	send func(string, string, string) error
}

func TestChangingPolicyDoesNotAutoEnrollAndArchivedClassRejectsInvitations(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	base := "/classrooms/" + f.ClassID
	code := classCode(t, f)
	enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", fiber.Map{"join_mode": "approval", "code_join_enabled": true, "version": 1}, 200)
	pending := enrollmentCall(t, app, f.Outsider, "POST", "/join", fiber.Map{"class_code": code, "student_roll": "009"}, 202)
	enrollmentCall(t, app, f.Teacher, "PUT", base+"/settings", fiber.Map{"join_mode": "direct", "code_join_enabled": true, "version": 2}, 200)
	var active bool
	f.DB.QueryRow(t.Context(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active')`, f.ClassID, f.Outsider).Scan(&active)
	if active {
		t.Fatal("changing policy silently approved a pending request")
	}
	joined := enrollmentCall(t, app, f.Outsider, "POST", "/join", fiber.Map{"class_code": code, "student_roll": "009"}, 201)
	if joined["status"] != "joined" {
		t.Fatal(joined)
	}
	var state string
	f.DB.QueryRow(t.Context(), `SELECT status FROM classroom_join_requests WHERE id=$1::uuid`, pending["request_id"]).Scan(&state)
	if state != "approved" {
		t.Fatal("direct joining left a pending request")
	}
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Outsider); e != nil {
		t.Fatal(e)
	}
	invitation := enrollmentCall(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": f.Outsider + "@example.invalid"}, 201)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classrooms SET status='archived' WHERE id=$1::uuid`, f.ClassID); e != nil {
		t.Fatal(e)
	}
	enrollmentCall(t, app, f.Outsider, "POST", "/respond/"+invitation["id"].(string), fiber.Map{"status": "accepted", "student_roll": "009", "version": 1}, 409)
	enrollmentCall(t, app, f.Teacher, "GET", base+"/requests", nil, 403)
	inbox := enrollmentCall(t, app, f.Outsider, "GET", "/inbox", nil, 200)
	if inbox["pending_invitations"] != float64(0) {
		t.Fatal("archived class kept an actionable invitation")
	}
}

func (m invitationMailer) Send(to, subject, body string) error { return m.send(to, subject, body) }
func TestInvitationMailRetriesEscapingAndRevokedLease(t *testing.T) {
	f := testsupport.Database(t)
	app, h := enrollmentApp(f)
	t.Setenv("FRONTEND_URL", "https://workspace.example")
	email := "mail-" + uuid.NewString() + "@example.invalid"
	id := enrollmentCall(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/invitations", fiber.Map{"email": email}, 201)["id"].(string)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classrooms SET name='<script>Notes</script>' WHERE id=$1::uuid`, f.ClassID); e != nil {
		t.Fatal(e)
	}
	calls := 0
	h.mailer = invitationMailer{func(to, subject, body string) error {
		calls++
		if to != email || !strings.Contains(body, "&lt;script&gt;") || strings.Contains(body, "<script>") || !strings.Contains(body, "https://workspace.example/invitations?invite="+id) {
			t.Error("unsafe or incorrectly addressed invitation email")
		}
		if calls == 1 {
			return errors.New("fixture temporary failure")
		}
		return nil
	}}
	if e := h.deliverInvitation(t.Context()); e == nil {
		t.Fatal("delivery error was lost")
	}
	var status string
	var attempts int
	if e := f.DB.QueryRow(t.Context(), `SELECT email_status,email_attempts FROM classroom_student_invitations WHERE id=$1::uuid`, id).Scan(&status, &attempts); e != nil || status != "pending" || attempts != 1 {
		t.Fatal("failed delivery was not scheduled for retry")
	}
	f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET email_next_at=now() WHERE id=$1::uuid`, id)
	if e := h.deliverInvitation(t.Context()); e != nil {
		t.Fatal(e)
	}
	f.DB.QueryRow(t.Context(), `SELECT email_status FROM classroom_student_invitations WHERE id=$1::uuid`, id).Scan(&status)
	if status != "sent" {
		t.Fatal(status)
	}
	f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET email_status='pending',email_next_at=now() WHERE id=$1::uuid`, id)
	h.mailer = invitationMailer{func(_, _, _ string) error {
		_, e := f.DB.Exec(t.Context(), `UPDATE classroom_student_invitations SET version=version+1,email_status='pending',email_lease=NULL WHERE id=$1::uuid`, id)
		return e
	}}
	if e := h.deliverInvitation(t.Context()); e != nil {
		t.Fatal(e)
	}
	f.DB.QueryRow(t.Context(), `SELECT email_status FROM classroom_student_invitations WHERE id=$1::uuid`, id).Scan(&status)
	if status != "pending" {
		t.Fatal("old worker overwrote a newer invitation")
	}
	enrollmentCall(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/invitations/"+id+"/revoke", fiber.Map{"version": 2}, 200)
	if e := h.deliverInvitation(t.Context()); !errors.Is(e, pgx.ErrNoRows) {
		t.Fatal("revoked invitation remained deliverable")
	}
}
