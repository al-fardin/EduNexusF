package messaging

import (
	"github.com/gofiber/fiber/v2"
	"strconv"
)

type Reaction struct {
	Emoji string `json:"emoji"`
	User  string `json:"user_id"`
}

func validReaction(emoji string) bool {
	switch emoji {
	case "👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "✅", "👀":
		return true
	}
	return false
}
func (h *Handler) React(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("messageID"), 10, 64)
	if err != nil || id <= 0 {
		return fiber.NewError(400, "invalid message")
	}
	var req struct {
		Emoji string `json:"emoji"`
	}
	if c.BodyParser(&req) != nil || (req.Emoji != "" && !validReaction(req.Emoji)) {
		return fiber.NewError(400, "choose an available reaction")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	allowed, err := canSend(c.UserContext(), tx, c.Params("id"), user)
	if err != nil {
		return err
	}
	if !allowed {
		return fiber.NewError(403, "Your teacher has paused your messages and reactions.")
	}
	var exists bool
	err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_messages WHERE id=$1 AND conversation_id=$2::uuid AND deleted_at IS NULL)`, id, c.Params("threadID")).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fiber.NewError(404, "message not found in this conversation")
	}
	if req.Emoji == "" {
		_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_message_reactions WHERE message_id=$1 AND user_id=$2::uuid`, id, user)
	} else {
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_message_reactions(message_id,user_id,emoji) VALUES($1,$2::uuid,$3) ON CONFLICT(message_id,user_id) DO UPDATE SET emoji=excluded.emoji,updated_at=now()`, id, user, req.Emoji)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, fiber.Map{"saved": true})
}
