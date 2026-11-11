package learning

import "github.com/gofiber/fiber/v2"

// Expose only teacher display names to active members, without private profiles.
func (h *Handler) ClassroomDetails(c *fiber.Ctx) error {
	if _, _, memberErr := h.member(c, false); memberErr != nil {
		status, ok := memberErr.(*fiber.Error)
		if !ok || status.Code != 403 {
			return memberErr
		}
		var owner bool
		if err := h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classrooms WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL)`, c.Params("id"), c.Locals("user_id")).Scan(&owner); err != nil {
			return err
		}
		if !owner {
			return memberErr
		}
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name) FROM users u WHERE u.id IN (SELECT owner_id FROM classrooms WHERE id=$1::uuid UNION SELECT user_id FROM classroom_memberships WHERE classroom_id=$1::uuid AND member_role='teacher' AND status='active') ORDER BY u.first_name,u.last_name`, c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	teachers := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name string
		if err = rows.Scan(&id, &name); err != nil {
			return err
		}
		teachers = append(teachers, fiber.Map{"id": id, "name": name})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"teachers": teachers})
}

func (h *Handler) LeaveClassroom(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return fail(403, "teachers cannot leave a class through student enrollment")
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_memberships m SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND member_role='student' AND status='active' AND NOT EXISTS(SELECT 1 FROM classrooms WHERE id=m.classroom_id AND owner_id=$2::uuid) AND NOT EXISTS(SELECT 1 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.classroom_id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress' AND a.expires_at>now() AND e.ends_at>now() AND e.closed_at IS NULL)`, c.Params("id"), user)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "finish your active exam before leaving this class")
	}
	return respond(c, 200, fiber.Map{"left": true})
}
