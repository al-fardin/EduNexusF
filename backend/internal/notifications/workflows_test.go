package notifications

import (
	"bytes"
	"encoding/json"
	"errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"net/http/httptest"
	"testing"
)

func TestDigestFrequencyBatchingAndDeliveryPermissionChecks(t *testing.T) {
	f := testsupport.Database(t)
	mailer := &recordingMailer{}
	h := &Handler{db: f.DB, mailer: mailer, emailConfigured: true}
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO notification_preferences(user_id,email_frequency,email_digest_at) VALUES($1::uuid,'daily',now()-interval '2 days')`, f.Student); err != nil {
		t.Fatal(err)
	}
	makeNotification := func() string {
		t.Helper()
		id := uuid.NewString()
		_, err := f.DB.Exec(t.Context(), `INSERT INTO user_notifications(id,user_id,classroom_id,event_key,kind,title,body,url) VALUES($1::uuid,$2::uuid,$3::uuid,$4,'material','Fixture update','Class update','/student/classrooms/'||$3::text||'?tab=classwork')`, id, f.Student, f.ClassID, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	first := makeNotification()
	second := makeNotification()
	if err := h.prepareDigest(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := h.deliverDigest(t.Context()); err != nil {
		t.Fatal(err)
	}
	if mailer.calls != 1 {
		t.Fatal("digest did not batch mail", mailer.calls)
	}
	if err := h.deliverDigest(t.Context()); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("sent digest retried", err)
	}
	var count int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM user_notifications WHERE id=ANY($1::uuid[]) AND email_status='sent'`, []string{first, second}).Scan(&count); err != nil || count != 2 {
		t.Fatal(count, err)
	}
	pending := makeNotification()
	if err := h.prepareDigest(t.Context()); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("daily frequency ignored", err)
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE notification_preferences SET email_frequency='weekly',email_digest_at=now()-interval '8 days' WHERE user_id=$1::uuid`, f.Student); err != nil {
		t.Fatal(err)
	}
	if err := h.prepareDigest(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student); err != nil {
		t.Fatal(err)
	}
	if err := h.deliverDigest(t.Context()); err != nil {
		t.Fatal(err)
	}
	if mailer.calls != 1 {
		t.Fatal("digest sent after membership removal")
	}
	var state string
	if err := f.DB.QueryRow(t.Context(), `SELECT email_status FROM user_notifications WHERE id=$1::uuid`, pending).Scan(&state); err != nil || state != "skipped" {
		t.Fatal(state, err)
	}
}
func TestNotificationGroupingFiltersAndOwnedGroupRead(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Get("/notifications", h.List)
	app.Put("/preferences", h.SavePreferences)
	app.Post("/notifications/:notificationID/read", h.ReadOne)
	request := func(user, method, path string, payload any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		req := httptest.NewRequest(method, path, bytes.NewReader(raw))
		req.Header.Set("X-Test-User", user)
		req.Header.Set("Content-Type", "application/json")
		response, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		var body map[string]any
		_ = json.NewDecoder(response.Body).Decode(&body)
		if response.StatusCode != status {
			t.Fatalf("%s %s: %d %v", method, path, response.StatusCode, body)
		}
		if body["data"] == nil {
			return nil
		}
		return body["data"].(map[string]any)
	}
	for i := 0; i < 3; i++ {
		if _, err := f.DB.Exec(t.Context(), `INSERT INTO user_notifications(user_id,classroom_id,event_key,kind,title,body,url,email_status) VALUES($1::uuid,$2::uuid,$3,'material','Fixture','Update','/same-coursework','skipped')`, f.Student, f.ClassID, uuid.NewString()); err != nil {
			t.Fatal(err)
		}
	}
	listing := request(f.Student, "GET", "/notifications?group=true&kind=material&class="+f.ClassID, nil, 200)
	items := listing["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["group_count"] != float64(3) {
		t.Fatal(items)
	}
	id := items[0].(map[string]any)["id"].(string)
	request(f.Outsider, "POST", "/notifications/"+id+"/read", fiber.Map{"group": true}, 200)
	listing = request(f.Student, "GET", "/notifications?unread=true", nil, 200)
	if listing["unread_count"] != float64(3) {
		t.Fatal("another user marked a group read")
	}
	request(f.Student, "POST", "/notifications/"+id+"/read", fiber.Map{"group": true}, 200)
	listing = request(f.Student, "GET", "/notifications", nil, 200)
	if listing["unread_count"] != float64(0) {
		t.Fatal(listing)
	}
	request(f.Student, "GET", "/notifications?class=not-a-uuid", nil, 400)
	request(f.Student, "PUT", "/preferences", fiber.Map{"app_enabled": true, "email_enabled": true, "email_frequency": "hourly"}, 400)
	changed := request(f.Student, "PUT", "/preferences", fiber.Map{"app_enabled": true, "email_enabled": true, "email_frequency": "weekly"}, 200)
	if changed["email_frequency"] != "weekly" {
		t.Fatal(changed)
	}
	// Existing clients that save only booleans must keep the chosen frequency.
	changed = request(f.Student, "PUT", "/preferences", fiber.Map{"app_enabled": true, "email_enabled": true}, 200)
	if changed["email_frequency"] != "weekly" {
		t.Fatal(changed)
	}
}
