package handler

import (
	"errors"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func enrollmentOffset(c *fiber.Ctx) (int, error) {
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 10000 {
		return 0, fiber.NewError(400, "Invalid page")
	}
	return offset, nil
}
func enrollmentPage(c *fiber.Ctx, items []fiber.Map, offset int) error {
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	return enrollmentResult(c, 200, fiber.Map{"items": items, "next_offset": next})
}
func normalizedInvitationEmail(raw string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(raw))
	address, e := mail.ParseAddress(email)
	return email, e == nil && address.Address == email && len(email) <= 254 && !strings.ContainsAny(email, "\r\n")
}
func (h *EnrollmentPhase5) InviteStudent(c *fiber.Ctx) error {
	user, e := h.teacher(c, false)
	if e != nil {
		return e
	}
	var req struct {
		Email string `json:"email"`
	}
	if c.BodyParser(&req) != nil {
		return fiber.NewError(400, "Invalid invitation")
	}
	email, ok := normalizedInvitationEmail(req.Email)
	if !ok {
		return fiber.NewError(400, "Enter one valid student email address")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if e = lockEnrollmentTeacher(c.UserContext(), tx, c.Params("id"), user, false); e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); e != nil {
		return e
	}
	var member bool
	e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM users u JOIN classroom_memberships m ON m.user_id=u.id WHERE lower(u.email)=$2 AND m.classroom_id=$1::uuid AND (m.status='active' OR m.member_role='teacher'))`, c.Params("id"), email).Scan(&member)
	if e != nil {
		return e
	}
	if member {
		return fiber.NewError(409, "This email already belongs to a class member")
	}
	var count int
	e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_invitation_events WHERE actor_id=$1::uuid AND status='pending' AND created_at>now()-interval '1 day'`, user).Scan(&count)
	if e != nil {
		return e
	}
	if count >= 100 {
		return fiber.NewError(429, "Daily invitation limit reached")
	}
	var id string
	var at time.Time
	e = tx.QueryRow(c.UserContext(), `SELECT id::text,updated_at FROM classroom_student_invitations WHERE classroom_id=$1::uuid AND email=$2 FOR UPDATE`, c.Params("id"), email).Scan(&id, &at)
	if e != nil && !errors.Is(e, pgx.ErrNoRows) {
		return e
	}
	if e == nil && time.Since(at) < 10*time.Minute {
		return fiber.NewError(429, "Wait ten minutes before sending another invitation to this email")
	}
	e = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_student_invitations(classroom_id,email,invited_by) VALUES($1::uuid,$2,$3::uuid) ON CONFLICT(classroom_id,email) DO UPDATE SET status='pending',invited_by=$3::uuid,expires_at=now()+interval '7 days',updated_at=now(),version=classroom_student_invitations.version+1,email_status='pending',email_attempts=0,email_next_at=now(),email_lease=NULL,email_sent_at=NULL RETURNING id::text`, c.Params("id"), email, user).Scan(&id)
	if e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_invitation_events(invitation_id,actor_id,status) VALUES($1::uuid,$2::uuid,'pending')`, id, user); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 201, fiber.Map{"id": id, "email_configured": h.emailConfigured, "status": "pending"})
}
func (h *EnrollmentPhase5) Invitations(c *fiber.Ctx) error {
	if _, e := h.teacher(c, false); e != nil {
		return e
	}
	offset, e := enrollmentOffset(c)
	if e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT i.id::text,i.email,i.status,i.expires_at,i.version,i.updated_at,i.email_status,EXISTS(SELECT 1 FROM users u JOIN classroom_memberships m ON m.user_id=u.id WHERE lower(u.email)=i.email AND m.classroom_id=i.classroom_id AND m.status='active') FROM classroom_student_invitations i WHERE i.classroom_id=$1::uuid ORDER BY i.updated_at DESC,i.id LIMIT 51 OFFSET $2`, c.Params("id"), offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, email, status, delivery string
		var expires, at time.Time
		var version int
		var member bool
		if e = rows.Scan(&id, &email, &status, &expires, &version, &at, &delivery, &member); e != nil {
			return e
		}
		if status == "pending" && !expires.After(time.Now()) {
			status = "expired"
		}
		items = append(items, fiber.Map{"id": id, "email": email, "status": status, "expires_at": expires, "version": version, "updated_at": at, "email_status": delivery, "active_member": member})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	return enrollmentResult(c, 200, fiber.Map{"items": items, "next_offset": next, "email_configured": h.emailConfigured})
}
func (h *EnrollmentPhase5) RevokeInvitation(c *fiber.Ctx) error {
	user, e := h.teacher(c, false)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("invitationID")); e != nil {
		return fiber.NewError(400, "Invalid invitation")
	}
	var req struct {
		Version int `json:"version"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 {
		return fiber.NewError(400, "Invalid invitation version")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if e = lockEnrollmentTeacher(c.UserContext(), tx, c.Params("id"), user, false); e != nil {
		return e
	}
	tag, e := tx.Exec(c.UserContext(), `UPDATE classroom_student_invitations SET status='revoked',version=version+1,updated_at=now(),email_lease=NULL,email_status=CASE WHEN email_status IN ('pending','sending') THEN 'skipped' ELSE email_status END WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='pending' AND version=$3`, c.Params("invitationID"), c.Params("id"), req.Version)
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(409, "Invitation changed or was already answered")
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_invitation_events(invitation_id,actor_id,status) VALUES($1::uuid,$2::uuid,'revoked')`, c.Params("invitationID"), user); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"revoked": true})
}
func (h *EnrollmentPhase5) EnrollmentInbox(c *fiber.Ctx) error {
	user, e := phase5User(c)
	if e != nil {
		return e
	}
	offset, e := enrollmentOffset(c)
	if e != nil {
		return e
	}
	focus := c.Query("invite", "")
	if focus != "" {
		if _, err := uuid.Parse(focus); err != nil {
			return fiber.NewError(400, "Invalid invitation link")
		}
	}
	var email string
	var verified bool
	e = h.db.QueryRow(c.UserContext(), `SELECT lower(email),email_verified FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL`, user).Scan(&email, &verified)
	if e != nil {
		return fiber.NewError(401, "Account unavailable")
	}
	rows, e := h.db.Query(c.UserContext(), `WITH items AS(
 SELECT i.id,'invitation' kind,cl.id class_id,cl.name class_name,COALESCE(trim(u.first_name||' '||u.last_name),'Class teacher') teacher_name,'pending' status,''::text roll,''::text reason,i.version,i.updated_at at,i.expires_at FROM classroom_student_invitations i JOIN classrooms cl ON cl.id=i.classroom_id LEFT JOIN users u ON u.id=i.invited_by WHERE $3 AND i.email=$2 AND i.status='pending' AND i.expires_at>now() AND cl.status='active' AND cl.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM classroom_memberships m WHERE m.classroom_id=cl.id AND m.user_id=$1::uuid AND m.status='active')
 UNION ALL SELECT r.id,'request',cl.id,cl.name,trim(u.first_name||' '||u.last_name),r.status,r.student_roll,r.reason,r.version,r.updated_at,NULL::timestamptz FROM classroom_join_requests r JOIN classrooms cl ON cl.id=r.classroom_id JOIN users u ON u.id=cl.owner_id WHERE r.user_id=$1::uuid AND cl.deleted_at IS NULL
 ) SELECT id::text,kind,class_id::text,class_name,teacher_name,status,roll,reason,version,at,expires_at FROM items ORDER BY CASE WHEN kind='invitation' AND id::text=$5 THEN 0 ELSE 1 END,at DESC,id LIMIT 51 OFFSET $4`, user, email, verified, offset, focus)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, kind, class, name, teacher, status, roll, reason string
		var version int
		var at time.Time
		var expires *time.Time
		if e = rows.Scan(&id, &kind, &class, &name, &teacher, &status, &roll, &reason, &version, &at, &expires); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "kind": kind, "classroom_id": class, "classroom_name": name, "teacher_name": teacher, "status": status, "student_roll": roll, "reason": reason, "version": version, "updated_at": at, "expires_at": expires})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	var count int
	e = h.db.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_student_invitations i JOIN classrooms cl ON cl.id=i.classroom_id WHERE $3 AND i.email=$2 AND i.status='pending' AND i.expires_at>now() AND cl.status='active' AND cl.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM classroom_memberships m WHERE m.classroom_id=cl.id AND m.user_id=$1::uuid AND m.status='active')`, user, email, verified).Scan(&count)
	if e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"items": items, "next_offset": next, "pending_invitations": count, "email_verified": verified})
}
func (h *EnrollmentPhase5) RespondInvitation(c *fiber.Ctx) error {
	user, e := phase5User(c)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("invitationID")); e != nil {
		return fiber.NewError(400, "Invalid invitation")
	}
	var req struct {
		Status  string `json:"status"`
		Roll    string `json:"student_roll"`
		Version int    `json:"version"`
	}
	if c.BodyParser(&req) != nil || (req.Status != "accepted" && req.Status != "declined") || req.Version < 1 {
		return fiber.NewError(400, "Choose accept or decline")
	}
	roll, ok := validRoll(req.Roll)
	if req.Status == "accepted" && !ok {
		return fiber.NewError(400, "Enter a valid Student ID / roll")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var class string
	e = tx.QueryRow(c.UserContext(), `SELECT classroom_id::text FROM classroom_student_invitations WHERE id=$1::uuid`, c.Params("invitationID")).Scan(&class)
	if e != nil {
		return fiber.NewError(404, "Invitation unavailable")
	}
	var active bool
	e = tx.QueryRow(c.UserContext(), `SELECT status='active' AND deleted_at IS NULL FROM classrooms WHERE id=$1::uuid FOR UPDATE`, class).Scan(&active)
	if e != nil {
		return e
	}
	if !active {
		return fiber.NewError(409, "Class is unavailable")
	}
	var allowed bool
	e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_student_invitations i JOIN users u ON lower(u.email)=i.email WHERE i.id=$1::uuid AND u.id=$2::uuid AND u.email_verified AND u.status='active' AND u.deleted_at IS NULL AND i.status='pending' AND i.expires_at>clock_timestamp() AND i.version=$3)`, c.Params("invitationID"), user, req.Version).Scan(&allowed)
	if e != nil {
		return e
	}
	if !allowed {
		return fiber.NewError(409, "Invitation expired, changed, or requires its verified recipient email")
	}
	if req.Status == "accepted" {
		if e = activateEnrollment(c.UserContext(), tx, class, user, roll); e != nil {
			return e
		}
		if e = closePendingJoin(c.UserContext(), tx, class, user, user, "Accepted a teacher invitation"); e != nil {
			return e
		}
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE classroom_student_invitations SET status=$2,version=version+1,updated_at=now(),email_lease=NULL,email_status=CASE WHEN email_status IN ('pending','sending') THEN 'skipped' ELSE email_status END WHERE id=$1::uuid`, c.Params("invitationID"), req.Status); e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_invitation_events(invitation_id,actor_id,status) VALUES($1::uuid,$2::uuid,$3)`, c.Params("invitationID"), user, req.Status); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"status": req.Status, "classroom_id": class})
}
func (h *EnrollmentPhase5) CancelJoinRequest(c *fiber.Ctx) error {
	user, e := phase5User(c)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("requestID")); e != nil {
		return fiber.NewError(400, "Invalid join request")
	}
	var req struct {
		Version int `json:"version"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 {
		return fiber.NewError(400, "Invalid request version")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var class string
	e = tx.QueryRow(c.UserContext(), `SELECT classroom_id::text FROM classroom_join_requests WHERE id=$1::uuid AND user_id=$2::uuid`, c.Params("requestID"), user).Scan(&class)
	if e != nil {
		return fiber.NewError(404, "Request not found")
	}
	if _, e = tx.Exec(c.UserContext(), `SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE`, class); e != nil {
		return e
	}
	tag, e := tx.Exec(c.UserContext(), `UPDATE classroom_join_requests SET status='cancelled',version=version+1,updated_at=now() WHERE id=$1::uuid AND user_id=$2::uuid AND status='pending' AND version=$3`, c.Params("requestID"), user, req.Version)
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(409, "Request changed or was already reviewed")
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_join_request_events(request_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,'cancelled','Withdrawn by student')`, c.Params("requestID"), user); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return enrollmentResult(c, 200, fiber.Map{"cancelled": true})
}
