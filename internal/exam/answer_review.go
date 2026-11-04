package exam

import (
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) ReviewSettings(c *fiber.Ctx) error {
	exam, _, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if c.Method() == "GET" {
		var enabled bool
		err = h.db.QueryRow(c.UserContext(), `SELECT COALESCE((SELECT show_explanations FROM classroom_exam_review_settings WHERE exam_id=$1::uuid),false)`, exam.ID).Scan(&enabled)
		if err != nil {
			return err
		}
		return result(c, 200, fiber.Map{"show_explanations": enabled})
	}
	var req struct {
		Enabled *bool `json:"show_explanations"`
	}
	if c.BodyParser(&req) != nil || req.Enabled == nil {
		return failure(c, 400, "choose an answer review policy")
	}
	user, _ := identity(c)
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_review_settings(exam_id,show_explanations,updated_by) VALUES($1::uuid,$2,$3::uuid) ON CONFLICT(exam_id) DO UPDATE SET show_explanations=excluded.show_explanations,updated_by=excluded.updated_by,updated_at=now()`, exam.ID, *req.Enabled, user)
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"saved": true})
}
