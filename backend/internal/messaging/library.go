package messaging

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) Library(c *fiber.Ctx) error {
	if _, err := h.thread(c); err != nil {
		return err
	}
	kind := c.Query("kind", "all")
	if kind != "all" && kind != "media" && kind != "files" {
		return fiber.NewError(400, "Choose media or files")
	}
	q := strings.TrimSpace(c.Query("q"))
	if len(q) > 200 {
		return fiber.NewError(400, "Search is limited to 200 bytes")
	}
	before, err := strconv.ParseInt(c.Query("before", "9223372036854775807"), 10, 64)
	if err != nil || before < 1 {
		return fiber.NewError(400, "Invalid file cursor")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,sender_id::text,body,created_at,kind,duration_ms,file_name,file_size,media_type FROM classroom_messages WHERE conversation_id=$1::uuid AND id<$2 AND deleted_at IS NULL AND file_name<>'' AND ($3='' OR file_name ILIKE '%'||$3||'%') AND ($4='all' OR ($4='media' AND (media_type LIKE 'image/%' OR media_type LIKE 'video/%' OR media_type LIKE 'audio/%')) OR ($4='files' AND media_type NOT LIKE 'image/%' AND media_type NOT LIKE 'video/%' AND media_type NOT LIKE 'audio/%')) ORDER BY id DESC LIMIT 51`, c.Params("threadID"), before, q, kind)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	next := ""
	for rows.Next() {
		var id, sender, body, kind, name, media string
		var at time.Time
		var duration, size int64
		if err = rows.Scan(&id, &sender, &body, &at, &kind, &duration, &name, &size, &media); err != nil {
			return err
		}
		if len(out) == 50 {
			next = out[49]["id"].(string)
			break
		}
		out = append(out, fiber.Map{"id": id, "sender_id": sender, "body": body, "created_at": at, "kind": kind, "duration_ms": duration, "emoji_size": 1, "client_request_id": "", "reactions": []any{}, "attachment": Attachment{Name: name, Size: size, Type: media}})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, fiber.Map{"items": out, "next": next})
}
