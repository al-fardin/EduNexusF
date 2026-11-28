package exam

// Legacy metadata compatibility only. Native upload, download tickets and execution
// are retired; existing question records remain readable.
import (
	"context"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type TesterAttachment struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	SHA256 string `json:"sha256"`
	Size   int    `json:"size"`
}

func (h *Handler) hydrateTesters(c *fiber.Ctx, questions []Question) error {
	return hydrateTesters(c, h.db, questions)
}

type testerReader interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

// Use the transaction reader when the caller already holds a connection.
func hydrateTesters(c *fiber.Ctx, db testerReader, questions []Question) error {
	if len(questions) < 1 || len(questions) > 40 {
		return fiber.NewError(400, "1-40 questions required")
	}
	for i := range questions {
		q := &questions[i]
		if q.Tester == nil {
			continue
		}
		if q.Kind != "coding" {
			return fiber.NewError(400, "testers can only be attached to coding questions")
		}
		if _, err := uuid.Parse(q.Tester.ID); err != nil {
			return fiber.NewError(400, "invalid tester attachment")
		}
		var canonical TesterAttachment
		err := db.QueryRow(c.UserContext(), `SELECT id::text,name,sha256,octet_length(executable) FROM classroom_question_testers WHERE id=$1::uuid AND classroom_id=$2::uuid`, q.Tester.ID, c.Params("id")).Scan(&canonical.ID, &canonical.Name, &canonical.SHA256, &canonical.Size)
		if errors.Is(err, pgx.ErrNoRows) {
			return fiber.NewError(400, "tester attachment not found in this classroom")
		}
		if err != nil {
			return err
		}
		q.Tester = &canonical
	}
	return nil
}
