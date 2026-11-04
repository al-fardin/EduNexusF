package messaging

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"
)

func (h *Handler) ChangeMessage(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("messageID"), 10, 64)
	if err != nil || id <= 0 {
		return fiber.NewError(400, "invalid message")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var sender, key string
	var deleted bool
	err = tx.QueryRow(c.UserContext(), `SELECT sender_id::text,storage_key,deleted_at IS NOT NULL FROM classroom_messages WHERE id=$1 AND conversation_id=$2::uuid FOR UPDATE`, id, c.Params("threadID")).Scan(&sender, &key, &deleted)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(404, "message not found")
	}
	if err != nil {
		return err
	}
	if sender != user {
		return fiber.NewError(403, "only your own messages can be changed")
	}
	if c.Method() == "DELETE" {
		if !deleted {
			_, err = tx.Exec(c.UserContext(), `UPDATE classroom_messages SET body='Message deleted',file_name='',file_size=0,media_type='',storage_key='',file_hash='',deleted_at=now() WHERE id=$1`, id)
			if err == nil {
				_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_message_reactions WHERE message_id=$1`, id)
			}
		}
	} else {
		if deleted {
			return fiber.NewError(409, "deleted messages cannot be edited")
		}
		var req struct {
			Body string `json:"body"`
		}
		if c.BodyParser(&req) != nil {
			return fiber.NewError(400, "invalid message")
		}
		req.Body = strings.TrimSpace(req.Body)
		if utf8.RuneCountInString(req.Body) > 4000 || len(req.Body) > 16000 || (req.Body == "" && key == "") {
			return fiber.NewError(400, "enter a message up to 4000 characters")
		}
		if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); err != nil {
			return err
		}
		allowed, e := canSend(c.UserContext(), tx, c.Params("id"), user)
		if e != nil {
			return e
		}
		if !allowed {
			return fiber.NewError(403, "your teacher has paused your messages")
		}
		_, err = tx.Exec(c.UserContext(), `UPDATE classroom_messages SET body=$2,edited_at=CASE WHEN body IS DISTINCT FROM $2 THEN now() ELSE edited_at END WHERE id=$1`, id, req.Body)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	if c.Method() == "DELETE" && key != "" {
		_ = os.Remove(filepath.Join(fileDirectory(), key))
	}
	return result(c, fiber.Map{"saved": true})
}
