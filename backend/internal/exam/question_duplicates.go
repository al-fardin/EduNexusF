package exam

import (
	"github.com/gofiber/fiber/v2"
	"strings"
)

// Preview-only: matching text warns the teacher, never changes or rejects an
// existing bank item. Choices/points may intentionally differ between variants.
func (h *Handler) BankDuplicates(c *fiber.Ctx) error {
	if _, e := h.member(c, true); e != nil {
		return e
	}
	var req struct {
		Prompts []string `json:"prompts"`
	}
	if len(c.Body()) > 2*1024*1024 || c.BodyParser(&req) != nil || len(req.Prompts) > 100 {
		return failure(c, 400, "Check up to 100 question prompts")
	}
	for _, p := range req.Prompts {
		if len(p) > 10000 {
			return failure(c, 400, "Question text is too long")
		}
	}
	c.Set("Cache-Control", "no-store")
	rows, e := h.db.Query(c.UserContext(), `SELECT b.id::text,b.question->>'prompt' FROM classroom_question_bank b WHERE b.classroom_id=$1::uuid AND lower(regexp_replace(trim(b.question->>'prompt'),'\s+',' ','g')) IN (SELECT lower(regexp_replace(trim(p),'\s+',' ','g')) FROM unnest($2::text[]) p) ORDER BY b.id LIMIT 2001`, c.Params("id"), req.Prompts)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, prompt string
		if e = rows.Scan(&id, &prompt); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "prompt": strings.TrimSpace(prompt)})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return result(c, 200, items)
}
