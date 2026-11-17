package learning

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

func trashPage(c *fiber.Ctx) (int, error) {
	n, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || n < 0 || n > 10000 {
		return 0, fail(400, "Invalid page")
	}
	return n, nil
}
func restoreRequest(c *fiber.Ctx) (time.Time, string, error) {
	var r struct {
		Deleted time.Time `json:"deleted_at"`
		Reason  string    `json:"reason"`
	}
	if c.BodyParser(&r) != nil || r.Deleted.IsZero() || len(strings.TrimSpace(r.Reason)) < 3 || len(r.Reason) > 1000 {
		return time.Time{}, "", fail(400, "Confirm the deleted version and provide a reason")
	}
	return r.Deleted, strings.TrimSpace(r.Reason), nil
}

func (h *Handler) TrashClasses(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if c.Method() == "GET" {
		offset, e := trashPage(c)
		if e != nil {
			return e
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT id::text,name,deleted_at FROM classrooms WHERE owner_id=$1::uuid AND deleted_at>now()-interval '30 days' ORDER BY deleted_at DESC,id LIMIT 51 OFFSET $2`, user, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, name string
			var at time.Time
			if e = rows.Scan(&id, &name, &at); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "title": name, "kind": "class", "deleted_at": at})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		c.Set("Cache-Control", "no-store")
		return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
	}
	if validID(c.Params("classID")) != nil {
		return fail(400, "Invalid class")
	}
	at, reason, e := restoreRequest(c)
	if e != nil {
		return e
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var title string
	e = tx.QueryRow(c.UserContext(), `UPDATE classrooms SET deleted_at=NULL,status='archived',archived_at=now(),updated_at=now() WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at=$3 AND deleted_at>now()-interval '30 days' RETURNING name`, c.Params("classID"), user, at).Scan(&title)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(409, "Class changed, is unavailable or is outside the 30-day restore window")
	}
	if e != nil {
		return e
	}
	if e = recordRestore(c, tx, c.Params("classID"), user, c.Params("classID"), title, "class_restored", reason); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"restored": true, "status": "archived"})
}
func recordRestore(c *fiber.Ctx, tx pgx.Tx, class, user, id, title, action, reason string) error {
	_, e := tx.Exec(c.UserContext(), `INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,reason) SELECT $1::uuid,id,trim(first_name||' '||last_name),$5,$3,$4,$6 FROM users WHERE id=$2::uuid`, class, user, id, title, action, reason)
	return e
}
func (h *Handler) TrashContent(c *fiber.Ctx) error {
	actor, _, e := h.member(c, true)
	if e != nil {
		return e
	}
	class := c.Params("id")
	if c.Method() == "GET" {
		offset, e := trashPage(c)
		if e != nil {
			return e
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT id::text,title,kind,deleted_at FROM(SELECT m.id,m.title,'material'::text kind,t.deleted_at FROM classroom_materials m JOIN classroom_material_trash t ON t.material_id=m.id WHERE m.classroom_id=$1::uuid UNION ALL SELECT id,COALESCE(NULLIF(title,''),'Class update'),'post',deleted_at FROM classroom_stream_posts WHERE classroom_id=$1::uuid AND reference_id IS NULL AND post_type='announcement')r WHERE deleted_at>now()-interval '30 days' ORDER BY deleted_at DESC,kind,id LIMIT 51 OFFSET $2`, class, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, title, kind string
			var at time.Time
			if e = rows.Scan(&id, &title, &kind, &at); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "title": title, "kind": kind, "deleted_at": at})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		c.Set("Cache-Control", "no-store")
		return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
	}
	id, kind := c.Params("resourceID"), c.Params("kind")
	if validID(id) != nil || (kind != "material" && kind != "post") {
		return fail(400, "Invalid deleted content")
	}
	at, reason, e := restoreRequest(c)
	if e != nil {
		return e
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if e = lockRoster(c.UserContext(), tx, class, actor); e != nil {
		return e
	}
	var title string
	if kind == "post" {
		e = tx.QueryRow(c.UserContext(), `UPDATE classroom_stream_posts SET deleted_at=NULL,updated_at=now() WHERE id=$1::uuid AND classroom_id=$2::uuid AND reference_id IS NULL AND post_type='announcement' AND deleted_at=$3 AND deleted_at>now()-interval '30 days' RETURNING COALESCE(NULLIF(title,''),'Class update')`, id, class, at).Scan(&title)
	} else {
		e = tx.QueryRow(c.UserContext(), `SELECT title FROM classroom_materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, id, class).Scan(&title)
		if e == nil {
			var posts []string
			e = tx.QueryRow(c.UserContext(), `DELETE FROM classroom_material_trash WHERE material_id=$1::uuid AND deleted_at=$2 AND deleted_at>now()-interval '30 days' RETURNING post_ids::text[]`, id, at).Scan(&posts)
			if e == nil {
				_, e = tx.Exec(c.UserContext(), `UPDATE classroom_stream_posts SET deleted_at=NULL,updated_at=now() WHERE id=ANY($1::uuid[]) AND classroom_id=$2::uuid AND reference_type='material' AND reference_id=$3::uuid AND deleted_at=$4`, posts, class, id, at)
			}
		}
	}
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(409, "Content changed, is unavailable or is outside the 30-day restore window")
	}
	if e != nil {
		return e
	}
	if e = recordRestore(c, tx, class, actor, id, title, kind+"_restored", reason); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"restored": true})
}
