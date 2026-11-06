package messaging

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strconv"
	"time"
)

func (h *Handler) Preferences(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	if c.Method() == "PUT" {
		var request struct {
			Hours int `json:"hours"`
		}
		if c.BodyParser(&request) != nil || (request.Hours != 0 && request.Hours != 1 && request.Hours != 8 && request.Hours != 24 && request.Hours != -1) {
			return fiber.NewError(400, "choose a valid mute duration")
		}
		var until *time.Time
		if request.Hours != 0 {
			value := time.Now().Add(time.Duration(request.Hours) * time.Hour)
			if request.Hours == -1 {
				value = time.Date(9999, 1, 1, 0, 0, 0, 0, time.UTC)
			}
			until = &value
		}
		_, err = h.db.Exec(c.UserContext(), `INSERT INTO conversation_preferences(conversation_id,user_id,muted_until) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(conversation_id,user_id) DO UPDATE SET muted_until=excluded.muted_until`, c.Params("threadID"), user, until)
		if err != nil {
			return err
		}
	}
	var until *time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT muted_until FROM conversation_preferences WHERE conversation_id=$1::uuid AND user_id=$2::uuid`, c.Params("threadID"), user).Scan(&until)
	if errors.Is(err, pgx.ErrNoRows) {
		err = nil
	}
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"muted_until": until, "muted": until != nil && until.After(time.Now())})
}

func (h *Handler) Pins(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	if c.Method() == "PUT" {
		id, e := strconv.ParseInt(c.Params("messageID"), 10, 64)
		if e != nil || id <= 0 {
			return fiber.NewError(400, "invalid message")
		}
		var request struct {
			Pinned bool `json:"pinned"`
		}
		if c.BodyParser(&request) != nil {
			return fiber.NewError(400, "invalid pin")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('pins:'||$1,0))`, c.Params("threadID")); e != nil {
			return e
		}
		var available bool
		e = tx.QueryRow(c.UserContext(), `SELECT deleted_at IS NULL FROM classroom_messages WHERE id=$1 AND conversation_id=$2::uuid FOR UPDATE`, id, c.Params("threadID")).Scan(&available)
		if errors.Is(e, pgx.ErrNoRows) {
			return fiber.NewError(404, "message unavailable")
		}
		if e != nil {
			return e
		}
		if !available {
			return fiber.NewError(404, "message unavailable")
		}
		if request.Pinned {
			if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); e != nil {
				return e
			}
			allowed, e := canSend(c.UserContext(), tx, c.Params("id"), user)
			if e != nil {
				return e
			}
			if !allowed {
				return fiber.NewError(403, "your teacher has paused your messages")
			}
			var count int
			e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM conversation_pins WHERE conversation_id=$1::uuid AND message_id<>$2`, c.Params("threadID"), id).Scan(&count)
			if e != nil {
				return e
			}
			if count >= 5 {
				return fiber.NewError(409, "unpin a message before adding another")
			}
			_, e = tx.Exec(c.UserContext(), `INSERT INTO conversation_pins(conversation_id,message_id,pinned_by) VALUES($1::uuid,$2,$3::uuid) ON CONFLICT DO NOTHING`, c.Params("threadID"), id, user)
		} else {
			_, e = tx.Exec(c.UserContext(), `DELETE FROM conversation_pins WHERE conversation_id=$1::uuid AND message_id=$2`, c.Params("threadID"), id)
		}
		if e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT m.id::text,m.body,m.file_name,p.pinned_by::text,p.pinned_at FROM conversation_pins p JOIN classroom_messages m ON m.id=p.message_id AND m.conversation_id=p.conversation_id WHERE p.conversation_id=$1::uuid AND m.deleted_at IS NULL ORDER BY p.pinned_at DESC LIMIT 5`, c.Params("threadID"))
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, body, file, by string
		var at time.Time
		if err = rows.Scan(&id, &body, &file, &by, &at); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "body": body, "file_name": file, "pinned_by": by, "pinned_at": at})
	}
	if rows.Err() != nil {
		return rows.Err()
	}
	return result(c, out)
}
