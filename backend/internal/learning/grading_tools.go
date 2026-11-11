package learning

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"strings"
)

type RubricCriterion struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Maximum int    `json:"maximum"`
}

func validRubric(criteria []RubricCriterion, maximum int) error {
	if len(criteria) > 0 && (maximum < 1 || maximum > 1000) {
		return fail(400, "Rubrics support a total of 1–1000 points")
	}
	if len(criteria) > 20 {
		return fail(400, "A rubric supports at most 20 criteria")
	}
	sum := 0
	seen := map[string]bool{}
	for _, q := range criteria {
		if _, err := uuid.Parse(q.ID); err != nil || seen[q.ID] || len(strings.TrimSpace(q.Title)) < 1 || len(q.Title) > 200 || q.Maximum < 1 || q.Maximum > 1000 {
			return fail(400, "Provide unique rubric criteria with titles and 1–1000 points")
		}
		seen[q.ID] = true
		sum += q.Maximum
	}
	if len(criteria) > 0 && sum != maximum {
		return fail(400, "Rubric points must equal the assignment maximum")
	}
	return nil
}
func rubricTotal(criteria []RubricCriterion, scores map[string]int) (int, error) {
	if len(criteria) == 0 {
		if len(scores) > 0 {
			return 0, fail(400, "This assignment has no rubric")
		}
		return 0, nil
	}
	if len(scores) != len(criteria) {
		return 0, fail(400, "Score every rubric criterion")
	}
	total := 0
	for _, criterion := range criteria {
		score, ok := scores[criterion.ID]
		if !ok || score < 0 || score > criterion.Maximum {
			return 0, fail(400, "Rubric score is outside its criterion maximum")
		}
		total += score
	}
	return total, nil
}
func (h *Handler) GradingTemplates(c *fiber.Ctx) error {
	user, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if c.Method() == "DELETE" {
		if err = validID(c.Params("templateID")); err != nil {
			return err
		}
		tag, e := h.db.Exec(c.UserContext(), `DELETE FROM classroom_grading_templates WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("templateID"), c.Params("id"))
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(404, "Template not found")
		}
		return respond(c, 200, fiber.Map{"removed": true})
	}
	if c.Method() == "POST" {
		var req struct {
			Kind     string            `json:"kind"`
			Title    string            `json:"title"`
			Criteria []RubricCriterion `json:"criteria"`
			Text     string            `json:"text"`
		}
		if c.BodyParser(&req) != nil || len(strings.TrimSpace(req.Title)) < 1 || len(req.Title) > 120 {
			return fail(400, "Provide a template title (1–120 bytes)")
		}
		var payload any
		switch req.Kind {
		case "rubric":
			total := 0
			for _, r := range req.Criteria {
				total += r.Maximum
			}
			if len(req.Criteria) == 0 {
				return fail(400, "A rubric needs criteria")
			}
			if err = validRubric(req.Criteria, total); err != nil {
				return err
			}
			payload = fiber.Map{"criteria": req.Criteria}
		case "feedback":
			if len(strings.TrimSpace(req.Text)) < 1 || len(req.Text) > 5000 {
				return fail(400, "Provide feedback of at most 5000 bytes")
			}
			payload = fiber.Map{"text": req.Text}
		default:
			return fail(400, "Choose rubric or feedback")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('grading-templates:'||$1,0))`, c.Params("id")); e != nil {
			return e
		}
		var count int
		if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_grading_templates WHERE classroom_id=$1::uuid`, c.Params("id")).Scan(&count); e != nil {
			return e
		}
		if count >= 100 {
			return fail(409, "Remove an unused template before adding another")
		}
		raw, _ := json.Marshal(payload)
		var id string
		e = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_grading_templates(classroom_id,kind,title,payload,created_by) VALUES($1::uuid,$2,$3,$4::jsonb,$5::uuid) RETURNING id::text`, c.Params("id"), req.Kind, strings.TrimSpace(req.Title), raw, user).Scan(&id)
		var pgErr *pgconn.PgError
		if errors.As(e, &pgErr) && pgErr.Code == "23505" {
			return fail(409, "A template with this title already exists")
		}
		if e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 201, fiber.Map{"id": id})
	}
	kind := c.Query("kind")
	if kind != "" && kind != "rubric" && kind != "feedback" {
		return fail(400, "Invalid template kind")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,kind,title,payload FROM classroom_grading_templates WHERE classroom_id=$1::uuid AND ($2='' OR kind=$2) ORDER BY lower(title),id LIMIT 100`, c.Params("id"), kind)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, kind, title string
		var payload json.RawMessage
		if err = rows.Scan(&id, &kind, &title, &payload); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "kind": kind, "title": title, "payload": payload})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, out)
}
