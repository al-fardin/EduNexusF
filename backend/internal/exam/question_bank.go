package exam

import (
	"encoding/json"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"strings"
	"time"
)

type BankItem struct {
	ID         string    `json:"id"`
	Question   Question  `json:"question"`
	Topic      string    `json:"topic"`
	Difficulty string    `json:"difficulty"`
	Version    int64     `json:"version"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func registerQuestionBank(app *fiber.App, h *Handler) {
	g := app.Group("/classrooms/:id/question-bank", authMiddleware.JWTProtected())
	g.Get("/", h.BankList)
	g.Post("/", h.BankSave)
	g.Post("/draw", h.BankDraw)
	g.Put("/:bankID", h.BankSave)
	g.Delete("/:bankID", h.BankDelete)
}
func (h *Handler) BankList(c *fiber.Ctx) error { return h.bankRead(c, false) }
func (h *Handler) BankDraw(c *fiber.Ctx) error { return h.bankRead(c, true) }
func (h *Handler) bankRead(c *fiber.Ctx, random bool) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	limit := 200
	order := "updated_at DESC"
	if random {
		limit = c.QueryInt("count", 5)
		if limit < 1 || limit > 40 {
			return failure(c, 400, "draw 1-40 questions")
		}
		order = "random()"
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,question,topic,difficulty,version,updated_at FROM classroom_question_bank
 WHERE classroom_id=$1::uuid AND ($2='' OR topic ILIKE '%'||$2||'%') AND ($3='' OR difficulty=$3)
 AND ($4='' OR question->>'kind'=$4) ORDER BY `+order+` LIMIT $5`, c.Params("id"), c.Query("topic"), c.Query("difficulty"), c.Query("kind"), limit)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]BankItem, 0)
	for rows.Next() {
		var item BankItem
		var raw []byte
		if err = rows.Scan(&item.ID, &raw, &item.Topic, &item.Difficulty, &item.Version, &item.UpdatedAt); err != nil {
			return err
		}
		if err = json.Unmarshal(raw, &item.Question); err != nil {
			return err
		}
		out = append(out, item)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, 200, out)
}
func (h *Handler) BankSave(c *fiber.Ctx) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	user, _ := identity(c)
	var items []BankItem
	if strings.HasPrefix(strings.TrimSpace(string(c.Body())), "[") {
		if err := c.BodyParser(&items); err != nil {
			return failure(c, 400, "invalid question import")
		}
	} else {
		var item BankItem
		if err := c.BodyParser(&item); err != nil {
			return failure(c, 400, "invalid question")
		}
		items = []BankItem{item}
	}
	if len(items) < 1 || len(items) > 100 || len(c.Body()) > 2*1024*1024 {
		return failure(c, 400, "import 1-100 questions, up to 2 MB")
	}
	editing := c.Params("bankID") != ""
	if editing {
		if _, err := uuid.Parse(c.Params("bankID")); err != nil || len(items) != 1 {
			return failure(c, 400, "invalid bank question")
		}
	}
	for i := range items {
		item := &items[i]
		item.Question.ID = uuid.NewString()
		item.Topic = strings.TrimSpace(item.Topic)
		if item.Difficulty == "" {
			item.Difficulty = "medium"
		}
		if len(item.Topic) > 120 || (item.Difficulty != "easy" && item.Difficulty != "medium" && item.Difficulty != "hard") {
			return failure(c, 400, "invalid topic or difficulty")
		}
		item.Question.Topic = item.Topic
		qs := []Question{item.Question}
		if err := h.hydrateTesters(c, qs); err != nil {
			return err
		}
		if _, err := normalizeQuestions(qs); err != nil {
			return failure(c, 400, err.Error())
		}
		item.Question = qs[0]
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE`, c.Params("id")); err != nil {
		return err
	}
	var count int
	if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_question_bank WHERE classroom_id=$1::uuid`, c.Params("id")).Scan(&count); err != nil {
		return err
	}
	if !editing && count+len(items) > 2000 {
		return failure(c, 409, "question bank limit is 2000 per classroom")
	}
	for i := range items {
		item := &items[i]
		raw, _ := json.Marshal(item.Question)
		if editing {
			err = tx.QueryRow(c.UserContext(), `UPDATE classroom_question_bank SET question=$3::jsonb,topic=$4,difficulty=$5,version=version+1,updated_at=now() WHERE id=$1::uuid AND classroom_id=$2::uuid AND version=$6 RETURNING id::text,version,updated_at`, c.Params("bankID"), c.Params("id"), raw, item.Topic, item.Difficulty, item.Version).Scan(&item.ID, &item.Version, &item.UpdatedAt)
		} else {
			err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_question_bank(classroom_id,created_by,question,topic,difficulty) VALUES($1::uuid,$2::uuid,$3::jsonb,$4,$5) RETURNING id::text,version,updated_at`, c.Params("id"), user, raw, item.Topic, item.Difficulty).Scan(&item.ID, &item.Version, &item.UpdatedAt)
		}
		if err != nil {
			if editing {
				return failure(c, 409, "question changed or is unavailable; refresh the bank")
			}
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, items)
}
func (h *Handler) BankDelete(c *fiber.Ctx) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	if _, err := uuid.Parse(c.Params("bankID")); err != nil {
		return failure(c, 400, "invalid bank question")
	}
	tag, err := h.db.Exec(c.UserContext(), `DELETE FROM classroom_question_bank WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("bankID"), c.Params("id"))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return failure(c, 404, "bank question not found")
	}
	return result(c, 200, fiber.Map{"deleted": true})
}
