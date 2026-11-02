package exam

import "github.com/gofiber/fiber/v2"

func (h *Handler) ActiveAttempts(c *fiber.Ctx) error {
	role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return failure(c, 403, "students only")
	}
	user, _ := identity(c)
	rows, err := h.db.Query(c.UserContext(), `SELECT e.id::text,e.title,a.id::text,a.expires_at,a.last_saved_at,a.revision
      FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id
      WHERE e.classroom_id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress'
        AND e.status='published' AND e.closed_at IS NULL AND e.ends_at>now() AND a.expires_at>now()
      ORDER BY a.started_at DESC LIMIT 20`, c.Params("id"), user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var examID, title, attemptID string
		var expires any
		var saved any
		var revision int64
		if err = rows.Scan(&examID, &title, &attemptID, &expires, &saved, &revision); err != nil {
			return err
		}
		out = append(out, fiber.Map{"exam_id": examID, "title": title, "attempt_id": attemptID, "expires_at": expires, "last_saved_at": saved, "revision": revision})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, out)
}
