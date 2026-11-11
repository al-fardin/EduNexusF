package learning

import (
	"context"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"log"
	"strings"
	"time"
)

func (h *Handler) Announcements(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	ctx := c.UserContext()
	if c.Method() == "GET" {
		rows, e := h.db.Query(ctx, `SELECT id::text,title,content,state,publish_at,version,error,updated_at FROM classroom_announcement_drafts WHERE classroom_id=$1::uuid ORDER BY CASE WHEN state IN ('draft','scheduled','blocked') THEN 0 ELSE 1 END,updated_at DESC,id DESC LIMIT 200`, c.Params("id"))
		if e != nil {
			return e
		}
		defer rows.Close()
		out := make([]fiber.Map, 0)
		for rows.Next() {
			var id, title, content, state, message string
			var publish *time.Time
			var updated time.Time
			var version int
			if e = rows.Scan(&id, &title, &content, &state, &publish, &version, &message, &updated); e != nil {
				return e
			}
			out = append(out, fiber.Map{"id": id, "title": title, "content": content, "state": state, "publish_at": publish, "version": version, "error": message, "updated_at": updated})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		return respond(c, 200, out)
	}
	var req struct {
		ID      string     `json:"id"`
		Title   string     `json:"title"`
		Content string     `json:"content"`
		State   string     `json:"state"`
		Publish *time.Time `json:"publish_at"`
		Version int        `json:"version"`
	}
	if c.BodyParser(&req) != nil || len(req.Title) > 200 || len(strings.TrimSpace(req.Content)) < 1 || len(req.Content) > 20000 {
		return fail(400, "Provide announcement content up to 20000 bytes and a title up to 200 bytes")
	}
	if req.State != "draft" && req.State != "scheduled" && req.State != "cancelled" {
		return fail(400, "Choose draft, scheduled or cancelled")
	}
	if req.State == "scheduled" && (req.Publish == nil || !req.Publish.After(time.Now()) || req.Publish.After(time.Now().Add(366*24*time.Hour))) {
		return fail(400, "Choose a future publish time within one year")
	}
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('announcement-drafts:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	if req.ID == "" {
		var count int
		if err = tx.QueryRow(ctx, `SELECT count(*) FROM classroom_announcement_drafts WHERE classroom_id=$1::uuid AND state IN ('draft','scheduled','blocked')`, c.Params("id")).Scan(&count); err != nil {
			return err
		}
		if count >= 200 {
			return fail(409, "Publish or cancel an existing draft before adding more")
		}
		req.ID = uuid.NewString()
		_, err = tx.Exec(ctx, `INSERT INTO classroom_announcement_drafts(id,classroom_id,author_id,title,content,state,publish_at) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)`, req.ID, c.Params("id"), actor, strings.TrimSpace(req.Title), strings.TrimSpace(req.Content), req.State, req.Publish)
	} else {
		if err = validID(req.ID); err != nil {
			return err
		}
		tag, e := tx.Exec(ctx, `UPDATE classroom_announcement_drafts SET title=$3,content=$4,state=$5,publish_at=$6,author_id=$7::uuid,version=version+1,error='',updated_at=now() WHERE id=$1::uuid AND classroom_id=$2::uuid AND version=$8 AND state NOT IN ('published','cancelled')`, req.ID, c.Params("id"), strings.TrimSpace(req.Title), strings.TrimSpace(req.Content), req.State, req.Publish, actor, req.Version)
		err = e
		if err == nil && tag.RowsAffected() == 0 {
			return fail(409, "Announcement changed or was published. Refresh before editing")
		}
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"id": req.ID})
}

func (h *Handler) PublishAnnouncement(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if err = validID(c.Params("draftID")); err != nil {
		return err
	}
	var req struct {
		Version int `json:"version"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 {
		return fail(400, "Provide the current draft version")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var title, content string
	err = tx.QueryRow(c.UserContext(), `SELECT title,content FROM classroom_announcement_drafts WHERE id=$1::uuid AND classroom_id=$2::uuid AND version=$3 AND state NOT IN ('published','cancelled') FOR UPDATE`, c.Params("draftID"), c.Params("id"), req.Version).Scan(&title, &content)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(409, "Draft changed or already published. Refresh first")
	}
	if err != nil {
		return err
	}
	var post string
	if err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content) VALUES($1::uuid,$2::uuid,'announcement',$3,$4) RETURNING id::text`, c.Params("id"), actor, title, content).Scan(&post); err != nil {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `UPDATE classroom_announcement_drafts SET author_id=$2::uuid,state='published',post_id=$3::uuid,version=version+1,error='',updated_at=now() WHERE id=$1::uuid`, c.Params("draftID"), actor, post); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"id": post})
}
func (h *Handler) publishScheduled(ctx context.Context) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var id, class, actor, title, content string
	err = tx.QueryRow(ctx, `SELECT id::text,classroom_id::text,COALESCE(author_id::text,''),title,content FROM classroom_announcement_drafts WHERE state='scheduled' AND publish_at<=now() ORDER BY publish_at,id FOR UPDATE SKIP LOCKED LIMIT 1`).Scan(&id, &class, &actor, &title, &content)
	if err != nil {
		return err
	}
	var allowed bool
	if actor != "" {
		err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND u.status='active' AND u.deleted_at IS NULL)`, class, actor).Scan(&allowed)
		if err != nil {
			return err
		}
	}
	if !allowed {
		_, err = tx.Exec(ctx, `UPDATE classroom_announcement_drafts SET state='blocked',error='Teacher or classroom access changed',version=version+1,updated_at=now() WHERE id=$1::uuid`, id)
	} else {
		var post string
		err = tx.QueryRow(ctx, `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content) VALUES($1::uuid,$2::uuid,'announcement',$3,$4) RETURNING id::text`, class, actor, title, content).Scan(&post)
		if err == nil {
			_, err = tx.Exec(ctx, `UPDATE classroom_announcement_drafts SET state='published',post_id=$2::uuid,version=version+1,updated_at=now() WHERE id=$1::uuid`, id, post)
		}
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func registerScheduledAnnouncements(app *fiber.App, h *Handler) {
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error {
		go func() {
			timer := time.NewTicker(15 * time.Second)
			defer timer.Stop()
			for {
				work, stop := context.WithTimeout(ctx, 10*time.Second)
				for i := 0; i < 20; i++ {
					if err := h.publishScheduled(work); err != nil {
						if !errors.Is(err, pgx.ErrNoRows) {
							log.Print("Scheduled announcement publishing deferred")
						}
						break
					}
				}
				stop()
				select {
				case <-ctx.Done():
					return
				case <-timer.C:
				}
			}
		}()
		return nil
	})
	app.Hooks().OnShutdown(func() error { cancel(); return nil })
}
