package handler

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func enrollmentResult(c *fiber.Ctx, status int, data any) error {
	c.Set("Cache-Control", "no-store")
	return c.Status(status).JSON(fiber.Map{"success": true, "data": data})
}
func (h *EnrollmentPhase5) RegisterEnrollment(app *fiber.App) {
	rate := func() fiber.Handler {
		return limiter.New(limiter.Config{Max: 30, Expiration: time.Minute, KeyGenerator: func(c *fiber.Ctx) string { u, _ := c.Locals("user_id").(string); return u }})
	}
	g := app.Group("/classrooms/:id", auth.JWTProtected())
	g.Get("/join-settings", h.JoinSettings)
	g.Put("/join-settings", h.JoinSettings)
	g.Get("/enrollment/requests", h.JoinRequests)
	g.Post("/enrollment/requests/:requestID/respond", h.ReviewJoinRequest)
	g.Get("/enrollment/invitations", h.Invitations)
	g.Post("/enrollment/invitations", rate(), h.InviteStudent)
	g.Post("/enrollment/invitations/:invitationID/revoke", h.RevokeInvitation)
	w := app.Group("/workspace/enrollment", auth.JWTProtected())
	w.Get("/", h.EnrollmentInbox)
	w.Post("/invitations/:invitationID/respond", rate(), h.RespondInvitation)
	w.Post("/requests/:requestID/cancel", h.CancelJoinRequest)
}
func (h *EnrollmentPhase5) teacher(c *fiber.Ctx, ownerOnly bool) (string, error) {
	user, e := phase5User(c)
	if e != nil {
		return "", e
	}
	if _, e = uuid.Parse(c.Params("id")); e != nil {
		return "", fiber.NewError(400, "Invalid class")
	}
	var owner bool
	e = h.db.QueryRow(c.UserContext(), `SELECT cl.owner_id=$2::uuid FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active' WHERE cl.id=$1::uuid AND cl.status='active' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&owner)
	if errors.Is(e, pgx.ErrNoRows) || e == nil && ownerOnly && !owner {
		return "", fiber.NewError(403, "Class teacher permission required")
	}
	return user, e
}
func lockEnrollmentTeacher(ctx context.Context, tx pgx.Tx, class, user string, ownerOnly bool) error {
	var owner bool
	e := tx.QueryRow(ctx, `SELECT cl.owner_id=$2::uuid FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active' WHERE cl.id=$1::uuid AND cl.status='active' AND cl.deleted_at IS NULL FOR UPDATE OF cl FOR SHARE OF m`, class, user).Scan(&owner)
	if errors.Is(e, pgx.ErrNoRows) || e == nil && ownerOnly && !owner {
		return fiber.NewError(403, "Class teacher permission required")
	}
	return e
}
func (h *EnrollmentPhase5) JoinSettings(c *fiber.Ctx) error {
	user, e := h.teacher(c, true)
	if e != nil {
		return e
	}
	if c.Method() == "PUT" {
		var req struct {
			Mode    string     `json:"join_mode"`
			Enabled bool       `json:"code_join_enabled"`
			Expires *time.Time `json:"class_code_expires_at"`
			Version int        `json:"version"`
		}
		if c.BodyParser(&req) != nil || (req.Mode != "direct" && req.Mode != "approval") || req.Version < 1 || req.Expires != nil && req.Expires.After(time.Now().AddDate(1, 0, 0)) {
			return fiber.NewError(400, "Choose a join policy and code expiry within a year")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if e = lockEnrollmentTeacher(c.UserContext(), tx, c.Params("id"), user, true); e != nil {
			return e
		}
		tag, e := tx.Exec(c.UserContext(), `UPDATE classrooms SET join_mode=$2,code_join_enabled=$3,class_code_expires_at=$4,join_settings_version=join_settings_version+1,updated_at=now() WHERE id=$1::uuid AND join_settings_version=$5`, c.Params("id"), req.Mode, req.Enabled, req.Expires, req.Version)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fiber.NewError(409, "Join settings changed. Reload before saving")
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
	}
	var mode, code string
	var enabled bool
	var expires *time.Time
	var version int
	e = h.db.QueryRow(c.UserContext(), `SELECT join_mode,code_join_enabled,class_code_expires_at,join_settings_version,class_code FROM classrooms WHERE id=$1::uuid`, c.Params("id")).Scan(&mode, &enabled, &expires, &version, &code)
	if e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"join_mode": mode, "code_join_enabled": enabled, "class_code_expires_at": expires, "version": version, "class_code": code, "email_configured": h.emailConfigured})
}
func (h *EnrollmentPhase5) submitJoinRequest(c *fiber.Ctx, tx pgx.Tx, class, user, roll, name string) error {
	if _, e := tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); e != nil {
		return e
	}
	var id, status, oldRoll string
	var version int
	e := tx.QueryRow(c.UserContext(), `SELECT id::text,status,student_roll,version FROM classroom_join_requests WHERE classroom_id=$1::uuid AND user_id=$2::uuid FOR UPDATE`, class, user).Scan(&id, &status, &oldRoll, &version)
	if e != nil && !errors.Is(e, pgx.ErrNoRows) {
		return e
	}
	same := e == nil && status == "pending" && oldRoll == roll
	if !same {
		var count int
		e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_join_request_events WHERE actor_id=$1::uuid AND status='pending' AND created_at>now()-interval '1 day'`, user).Scan(&count)
		if e != nil {
			return e
		}
		if count >= 20 {
			return fiber.NewError(429, "Daily join-request limit reached")
		}
		e = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_join_requests(classroom_id,user_id,student_roll) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(classroom_id,user_id) DO UPDATE SET student_roll=$3,status='pending',reason='',reviewed_by=NULL,version=classroom_join_requests.version+1,updated_at=now() RETURNING id::text,version`, class, user, roll).Scan(&id, &version)
		if e != nil {
			return e
		}
		if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_join_request_events(request_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,'pending','Student requested enrollment')`, id, user); e != nil {
			return e
		}
		if _, e = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,'join-request:'||$3||':'||$4,'enrollment','Class join request','A student requested to join your class.','people&enrollment=1','teacher')`, class, user, id, strconv.Itoa(version)); e != nil {
			return e
		}
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 202, fiber.Map{"status": "pending", "request_id": id, "version": version, "student_roll": roll, "classroom": fiber.Map{"id": class, "name": name}})
}
func activateEnrollment(ctx context.Context, tx pgx.Tx, class, user, roll string) error {
	tag, e := tx.Exec(ctx, `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) SELECT $1::uuid,u.id,'student','active',$3 FROM users u WHERE u.id=$2::uuid AND u.status='active' AND u.deleted_at IS NULL ON CONFLICT(classroom_id,user_id) DO UPDATE SET status='active',student_roll=$3,removed_at=NULL,updated_at=now(),joined_at=now() WHERE classroom_memberships.status='removed' AND classroom_memberships.member_role='student'`, class, user, roll)
	if rollConflict(e) {
		return fiber.NewError(409, "Student ID / roll already exists. The student must choose another roll")
	}
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(409, "Account unavailable or already belongs to this class")
	}
	return nil
}
func closePendingJoin(ctx context.Context, tx pgx.Tx, class, user, actor, reason string) error {
	_, e := tx.Exec(ctx, `WITH changed AS(UPDATE classroom_join_requests SET status='approved',reason=$4,reviewed_by=$3::uuid,version=version+1,updated_at=now() WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='pending' RETURNING id) INSERT INTO classroom_join_request_events(request_id,actor_id,status,reason) SELECT id,$3::uuid,'approved',$4 FROM changed`, class, user, actor, reason)
	return e
}
func (h *EnrollmentPhase5) JoinRequests(c *fiber.Ctx) error {
	if _, e := h.teacher(c, false); e != nil {
		return e
	}
	state := c.Query("state", "pending")
	if state != "pending" && state != "closed" {
		return fiber.NewError(400, "Invalid request status")
	}
	offset, e := enrollmentOffset(c)
	if e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT r.id::text,r.user_id::text,trim(u.first_name||' '||u.last_name),u.email,r.student_roll,r.status,r.reason,r.version,r.updated_at FROM classroom_join_requests r JOIN users u ON u.id=r.user_id WHERE r.classroom_id=$1::uuid AND (($2='pending' AND r.status='pending') OR ($2='closed' AND r.status<>'pending')) ORDER BY r.updated_at DESC,r.id LIMIT 51 OFFSET $3`, c.Params("id"), state, offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, user, name, email, roll, status, reason string
		var version int
		var at time.Time
		if e = rows.Scan(&id, &user, &name, &email, &roll, &status, &reason, &version, &at); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "user_id": user, "name": name, "email": email, "student_roll": roll, "status": status, "reason": reason, "version": version, "updated_at": at})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return enrollmentPage(c, items, offset)
}
func (h *EnrollmentPhase5) ReviewJoinRequest(c *fiber.Ctx) error {
	user, e := h.teacher(c, false)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("requestID")); e != nil {
		return fiber.NewError(400, "Invalid join request")
	}
	var req struct {
		Status  string `json:"status"`
		Version int    `json:"version"`
		Reason  string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || (req.Status != "approved" && req.Status != "rejected") || req.Version < 1 || len([]rune(req.Reason)) > 1000 {
		return fiber.NewError(400, "Choose an enrollment decision")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if e = lockEnrollmentTeacher(c.UserContext(), tx, c.Params("id"), user, false); e != nil {
		return e
	}
	var student, roll string
	e = tx.QueryRow(c.UserContext(), `SELECT user_id::text,student_roll FROM classroom_join_requests WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='pending' AND version=$3 FOR UPDATE`, c.Params("requestID"), c.Params("id"), req.Version).Scan(&student, &roll)
	if errors.Is(e, pgx.ErrNoRows) {
		return fiber.NewError(409, "Request changed or was already reviewed")
	}
	if e != nil {
		return e
	}
	if req.Status == "approved" {
		if e = activateEnrollment(c.UserContext(), tx, c.Params("id"), student, roll); e != nil {
			return e
		}
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE classroom_join_requests SET status=$2,reason=$3,reviewed_by=$4::uuid,version=version+1,updated_at=now() WHERE id=$1::uuid`, c.Params("requestID"), req.Status, strings.TrimSpace(req.Reason), user); e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_join_request_events(request_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,$3,$4)`, c.Params("requestID"), user, req.Status, strings.TrimSpace(req.Reason)); e != nil {
		return e
	}
	if req.Status == "approved" {
		if _, e = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,'enrollment-approved:'||$3||':'||$4,'enrollment','Class join approved','Your teacher approved your class join request.','stream','student',$5::uuid)`, c.Params("id"), user, c.Params("requestID"), strconv.Itoa(req.Version), student); e != nil {
			return e
		}
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"status": req.Status})
}
