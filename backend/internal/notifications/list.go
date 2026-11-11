package notifications

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"strconv"
	"time"
)

func (h *Handler) listFiltered(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	class := c.Query("class")
	if class != "" {
		if _, err = uuid.Parse(class); err != nil {
			return fiber.NewError(400, "Invalid class filter")
		}
	}
	kind := c.Query("kind")
	if len(kind) > 80 {
		return fiber.NewError(400, "Invalid notification type")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 50000 {
		return fiber.NewError(400, "Invalid page")
	}
	grouped := c.QueryBool("group")
	unreadOnly := c.QueryBool("unread")
	query := `WITH filtered AS(SELECT n.id,n.classroom_id,cl.name classroom_name,n.kind,n.title,n.body,n.url,n.created_at,n.read_at,n.email_status,count(*) OVER(PARTITION BY n.classroom_id,n.kind,n.url,date_trunc('day',n.created_at AT TIME ZONE 'UTC')) group_count, bool_or(n.read_at IS NULL) OVER(PARTITION BY n.classroom_id,n.kind,n.url,date_trunc('day',n.created_at AT TIME ZONE 'UTC')) group_unread FROM user_notifications n JOIN classrooms cl ON cl.id=n.classroom_id WHERE n.user_id=$1::uuid AND ` + visible + ` AND ($2='' OR n.classroom_id::text=$2) AND ($3='' OR n.kind=$3) AND (NOT $4 OR n.read_at IS NULL)), selected AS(`
	if grouped {
		query += `SELECT DISTINCT ON(classroom_id,kind,url,date_trunc('day',created_at AT TIME ZONE 'UTC')) * FROM filtered ORDER BY classroom_id,kind,url,date_trunc('day',created_at AT TIME ZONE 'UTC'),created_at DESC,id DESC`
	} else {
		query += `SELECT * FROM filtered`
	}
	query += `)SELECT id::text,classroom_id::text,classroom_name,kind,title,body,url,created_at,read_at,email_status,group_count,group_unread FROM selected ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET $5`
	rows, err := h.db.Query(c.UserContext(), query, user, class, kind, unreadOnly, offset)
	if err != nil {
		return err
	}
	out := make([]fiber.Map, 0)
	next := -1
	for rows.Next() {
		var id, class, name, kind, title, body, url, email string
		var created time.Time
		var read *time.Time
		var count int
		var groupUnread bool
		if err = rows.Scan(&id, &class, &name, &kind, &title, &body, &url, &created, &read, &email, &count, &groupUnread); err != nil {
			rows.Close()
			return err
		}
		if len(out) == 50 {
			next = offset + 50
			break
		}
		if !grouped {
			count = 1
			groupUnread = read == nil
		}
		out = append(out, fiber.Map{"id": id, "classroom_id": class, "classroom_name": name, "kind": kind, "title": title, "body": body, "url": url, "created_at": created, "read_at": read, "email_status": email, "group_count": count, "unread": groupUnread})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	var unread int
	if err = h.db.QueryRow(c.UserContext(), `SELECT count(*) FROM user_notifications n WHERE user_id=$1::uuid AND read_at IS NULL AND `+visible, user).Scan(&unread); err != nil {
		return err
	}
	rows, err = h.db.Query(c.UserContext(), `SELECT cl.id::text,cl.name FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL ORDER BY cl.name LIMIT 500`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	classes := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name string
		if err = rows.Scan(&id, &name); err != nil {
			return err
		}
		classes = append(classes, fiber.Map{"id": id, "name": name})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, fiber.Map{"items": out, "classes": classes, "unread_count": unread, "next_offset": next})
}
