package messaging

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"strconv"
)

func (h *Handler) Stars(c *fiber.Ctx) error {
	user, e := h.thread(c)
	if e != nil {
		return e
	}
	if c.Method() == "GET" {
		rows, e := h.db.Query(c.UserContext(), `SELECT s.message_id::text FROM classroom_message_stars s JOIN classroom_messages m ON m.id=s.message_id WHERE s.user_id=$1::uuid AND m.conversation_id=$2::uuid AND m.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 1000`, user, c.Params("threadID"))
		if e != nil {
			return e
		}
		defer rows.Close()
		out := []string{}
		for rows.Next() {
			var id string
			if e = rows.Scan(&id); e != nil {
				return e
			}
			out = append(out, id)
		}
		if e = rows.Err(); e != nil {
			return e
		}
		return result(c, out)
	}
	id, e := strconv.ParseInt(c.Params("messageID"), 10, 64)
	if e != nil || id < 1 {
		return fiber.NewError(400, "invalid message")
	}
	var r struct {
		Starred bool `json:"starred"`
	}
	if c.BodyParser(&r) != nil {
		return fiber.NewError(400, "invalid star")
	}
	var exists bool
	if e = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_messages WHERE id=$1 AND conversation_id=$2::uuid AND deleted_at IS NULL)`, id, c.Params("threadID")).Scan(&exists); e != nil {
		return e
	}
	if !exists {
		return fiber.NewError(404, "message not found")
	}
	if r.Starred {
		_, e = h.db.Exec(c.UserContext(), `INSERT INTO classroom_message_stars(user_id,message_id) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING`, user, id)
	} else {
		_, e = h.db.Exec(c.UserContext(), `DELETE FROM classroom_message_stars WHERE user_id=$1::uuid AND message_id=$2`, user, id)
	}
	if e != nil {
		return e
	}
	payload, _ := json.Marshal(fiber.Map{"kind": "message_star", "users": []string{user}})
	_, _ = h.db.Exec(c.UserContext(), `SELECT pg_notify('edunexus_events',$1)`, string(payload))
	return result(c, fiber.Map{"saved": true})
}
