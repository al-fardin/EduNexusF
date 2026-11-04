package learning

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"strings"
	"unicode/utf8"
)

func (h *Handler) Topics(c *fiber.Ctx) error {
	_, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,title FROM classroom_topics WHERE classroom_id=$1::uuid ORDER BY lower(title)`, c.Params("id"))
	if err != nil {
		return err
	}
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var id, title string
		if err = rows.Scan(&id, &title); err != nil {
			rows.Close()
			return err
		}
		items = append(items, fiber.Map{"id": id, "title": title})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	rows, err = h.db.Query(c.UserContext(), `SELECT r.resource_id::text,r.resource_kind,r.topic_id::text FROM classroom_topic_resources r WHERE r.classroom_id=$1::uuid AND((r.resource_kind='assignment' AND EXISTS(SELECT 1 FROM classroom_assignments a WHERE a.id=r.resource_id AND a.classroom_id=r.classroom_id AND($2='teacher' OR a.status='published'))) OR(r.resource_kind='material' AND EXISTS(SELECT 1 FROM classroom_materials a JOIN classroom_stream_posts p ON p.reference_id=a.id AND p.classroom_id=a.classroom_id AND p.reference_type='material' AND p.deleted_at IS NULL WHERE a.id=r.resource_id AND a.classroom_id=r.classroom_id)))`, c.Params("id"), role)
	if err != nil {
		return err
	}
	defer rows.Close()
	links := make(map[string]string)
	for rows.Next() {
		var resource, kind, topic string
		if err = rows.Scan(&resource, &kind, &topic); err != nil {
			return err
		}
		links[kind+":"+resource] = topic
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"items": items, "links": links})
}
func (h *Handler) SaveTopic(c *fiber.Ctx) error {
	user, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	id := c.Params("topicID")
	if id != "" {
		if err = validID(id); err != nil {
			return err
		}
	}
	if c.Method() == "DELETE" {
		tag, e := h.db.Exec(c.UserContext(), `DELETE FROM classroom_topics WHERE id=$1::uuid AND classroom_id=$2::uuid`, id, c.Params("id"))
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(404, "topic not found")
		}
		return respond(c, 200, fiber.Map{"removed": true})
	}
	var req struct {
		Title string `json:"title"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "invalid topic")
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || utf8.RuneCountInString(req.Title) > 80 {
		return fail(400, "topic must contain 1–80 characters")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('topics:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	if id == "" {
		var count int
		if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_topics WHERE classroom_id=$1::uuid`, c.Params("id")).Scan(&count); err != nil {
			return err
		}
		if count >= 200 {
			return fail(400, "a class can contain up to 200 topics")
		}
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_topics(classroom_id,title,created_by) VALUES($1::uuid,$2,$3::uuid) RETURNING id::text`, c.Params("id"), req.Title, user).Scan(&id)
	} else {
		tag, e := tx.Exec(c.UserContext(), `UPDATE classroom_topics SET title=$3 WHERE id=$1::uuid AND classroom_id=$2::uuid`, id, c.Params("id"), req.Title)
		err = e
		if err == nil && tag.RowsAffected() == 0 {
			return fail(404, "topic not found")
		}
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return fail(409, "a topic with that name already exists")
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"id": id, "title": req.Title})
}
func (h *Handler) MoveTopicResource(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	resource := c.Params("resourceID")
	if err := validID(resource); err != nil {
		return err
	}
	kind := c.Params("kind")
	if kind != "assignment" && kind != "material" {
		return fail(400, "unknown classwork type")
	}
	var req struct {
		Topic string `json:"topic_id"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "invalid topic")
	}
	if req.Topic != "" {
		if err := validID(req.Topic); err != nil {
			return err
		}
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var exists bool
	err = tx.QueryRow(c.UserContext(), `SELECT CASE WHEN $3='assignment' THEN EXISTS(SELECT 1 FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid) ELSE EXISTS(SELECT 1 FROM classroom_materials WHERE id=$1::uuid AND classroom_id=$2::uuid) END`, resource, c.Params("id"), kind).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fail(404, "classwork item not found")
	}
	if req.Topic == "" {
		_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_topic_resources WHERE classroom_id=$1::uuid AND resource_id=$2::uuid AND resource_kind=$3`, c.Params("id"), resource, kind)
	} else {
		err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_topics WHERE id=$1::uuid AND classroom_id=$2::uuid)`, req.Topic, c.Params("id")).Scan(&exists)
		if err != nil {
			return err
		}
		if !exists {
			return fail(404, "topic not found in this class")
		}
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_topic_resources(classroom_id,topic_id,resource_kind,resource_id) VALUES($1::uuid,$2::uuid,$3,$4::uuid) ON CONFLICT(resource_kind,resource_id) DO UPDATE SET topic_id=excluded.topic_id`, c.Params("id"), req.Topic, kind, resource)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"moved": true})
}
