package messaging

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type queryer interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

// Restrictions govern student writes, while history and teacher outreach remain available.
func canSend(ctx context.Context, db queryer, class, user string) (bool, error) {
	var allowed bool
	err := db.QueryRow(ctx, `SELECT m.member_role='teacher' OR (COALESCE(p.students_can_message,true) AND NOT EXISTS(SELECT 1 FROM classroom_messaging_restrictions r WHERE r.classroom_id=m.classroom_id AND r.user_id=m.user_id)) FROM classroom_memberships m LEFT JOIN classroom_messaging_policy p ON p.classroom_id=m.classroom_id WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.status='active'`, class, user).Scan(&allowed)
	return allowed, err
}
func (h *Handler) teacher(c *fiber.Ctx) (string, error) {
	user, role, err := h.member(c)
	if err != nil {
		return "", err
	}
	if role != "teacher" {
		return "", fiber.NewError(403, "class teacher permission required")
	}
	return user, nil
}
func (h *Handler) Settings(c *fiber.Ctx) error {
	user, role, err := h.member(c)
	if err != nil {
		return err
	}
	allowed, err := canSend(c.UserContext(), h.db, c.Params("id"), user)
	if err != nil {
		return err
	}
	var global bool
	var theme string
	err = h.db.QueryRow(c.UserContext(), `SELECT COALESCE((SELECT students_can_message FROM classroom_messaging_policy WHERE classroom_id=$1::uuid),true),COALESCE((SELECT theme FROM classroom_shared_message_themes WHERE classroom_id=$1::uuid),'violet')`, c.Params("id")).Scan(&global, &theme)
	if err != nil {
		return err
	}
	students := make([]fiber.Map, 0)
	if role == "teacher" {
		rows, e := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,''),NOT EXISTS(SELECT 1 FROM classroom_messaging_restrictions r WHERE r.classroom_id=m.classroom_id AND r.user_id=m.user_id) FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.status='active' AND m.member_role='student' ORDER BY u.first_name,u.last_name`, c.Params("id"))
		if e != nil {
			return e
		}
		defer rows.Close()
		for rows.Next() {
			var id, name, roll string
			var enabled bool
			if e = rows.Scan(&id, &name, &roll, &enabled); e != nil {
				return e
			}
			students = append(students, fiber.Map{"id": id, "name": name, "roll": roll, "can_message": enabled})
		}
		if e = rows.Err(); e != nil {
			return e
		}
	}
	return result(c, fiber.Map{"role": role, "can_send": allowed, "students_can_message": global, "theme": theme, "students": students})
}
func (h *Handler) Policy(c *fiber.Ctx) error {
	user, err := h.teacher(c)
	if err != nil {
		return err
	}
	var req struct {
		Allowed *bool `json:"students_can_message"`
	}
	if c.BodyParser(&req) != nil || req.Allowed == nil {
		return fiber.NewError(400, "choose whether students can message")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	// The same class lock makes a block and an in-flight send take effect in order.
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_messaging_policy(classroom_id,students_can_message,updated_by) VALUES($1::uuid,$2,$3::uuid) ON CONFLICT(classroom_id) DO UPDATE SET students_can_message=excluded.students_can_message,updated_by=excluded.updated_by,updated_at=now()`, c.Params("id"), *req.Allowed, user)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, fiber.Map{"saved": true})
}
func (h *Handler) StudentPolicy(c *fiber.Ctx) error {
	user, err := h.teacher(c)
	if err != nil {
		return err
	}
	student := c.Params("studentID")
	if _, err = uuid.Parse(student); err != nil {
		return fiber.NewError(400, "invalid student")
	}
	var req struct {
		Allowed *bool `json:"can_message"`
	}
	if c.BodyParser(&req) != nil || req.Allowed == nil {
		return fiber.NewError(400, "choose a messaging permission")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	var exists bool
	err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND member_role='student' AND status='active')`, c.Params("id"), student).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fiber.NewError(404, "active student not found")
	}
	if *req.Allowed {
		_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_messaging_restrictions WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, c.Params("id"), student)
	} else {
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_messaging_restrictions(classroom_id,user_id,updated_by) VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT(classroom_id,user_id) DO UPDATE SET updated_by=excluded.updated_by`, c.Params("id"), student, user)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, fiber.Map{"saved": true})
}
func validTheme(t string) bool {
	switch t {
	case "violet", "lavender", "ocean", "sage", "rose", "midnight":
		return true
	}
	return false
}
func (h *Handler) Theme(c *fiber.Ctx) error {
	user, _, err := h.member(c)
	if err != nil {
		return err
	}
	thread := c.Params("threadID")
	if thread != "" {
		if _, err = h.thread(c); err != nil {
			return err
		}
	}
	if c.Method() == "GET" {
		var theme string
		err = h.db.QueryRow(c.UserContext(), `SELECT COALESCE((SELECT theme FROM conversation_shared_message_themes WHERE conversation_id=$1::uuid),'')`, thread).Scan(&theme)
		if err != nil {
			return err
		}
		return result(c, fiber.Map{"theme": theme})
	}
	var req struct {
		Theme string `json:"theme"`
	}
	if c.BodyParser(&req) != nil || (!validTheme(req.Theme) && !(thread != "" && req.Theme == "")) {
		return fiber.NewError(400, "choose an available theme")
	}
	if thread == "" {
		_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_shared_message_themes(classroom_id,updated_by,theme) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(classroom_id) DO UPDATE SET theme=excluded.theme,updated_by=excluded.updated_by,updated_at=now()`, c.Params("id"), user, req.Theme)
	} else if req.Theme == "" {
		_, err = h.db.Exec(c.UserContext(), `DELETE FROM conversation_shared_message_themes WHERE conversation_id=$1::uuid`, thread)
	} else {
		_, err = h.db.Exec(c.UserContext(), `INSERT INTO conversation_shared_message_themes(conversation_id,updated_by,theme) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(conversation_id) DO UPDATE SET theme=excluded.theme,updated_by=excluded.updated_by,updated_at=now()`, thread, user, req.Theme)
	}
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"saved": true})
}
