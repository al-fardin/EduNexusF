package learning

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) Classwork(c *fiber.Ctx) error {
	_, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	kind := c.Query("kind")
	if kind != "" && kind != "assignment" && kind != "material" && kind != "exam" {
		return fail(400, "Invalid classwork type")
	}
	topic := c.Query("topic")
	if topic != "" && topic != "unfiled" {
		if err = validID(topic); err != nil {
			return err
		}
	}
	q := strings.TrimSpace(c.Query("q"))
	if len(q) > 200 {
		return fail(400, "Search is limited to 200 bytes")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 50000 {
		return fail(400, "Invalid page")
	}
	ordering := map[string]string{"newest": "created_at DESC,id DESC", "title": "lower(title),id", "due": "due_at ASC NULLS LAST,id"}[c.Query("sort", "newest")]
	if ordering == "" {
		return fail(400, "Invalid sort order")
	}
	rows, err := h.db.Query(c.UserContext(), `WITH work AS(
 SELECT id,'assignment' kind,title,instructions description,due_at,created_at,status,'' filename,0::bigint file_size FROM classroom_assignments WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published')
 UNION ALL SELECT m.id,'material',m.title,m.description,NULL,m.created_at,'published',m.original_filename,m.file_size FROM classroom_materials m WHERE m.classroom_id=$1::uuid AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.classroom_id=m.classroom_id AND p.reference_type='material' AND p.reference_id=m.id AND p.deleted_at IS NULL)
 UNION ALL SELECT id,'exam',title,description,ends_at,created_at,status,'',0 FROM classroom_exams WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published')
 )SELECT w.id::text,w.kind,w.title,w.description,w.due_at,w.created_at,w.status,w.filename,w.file_size,COALESCE(r.topic_id::text,'') FROM work w LEFT JOIN classroom_topic_resources r ON r.resource_kind=w.kind AND r.resource_id=w.id AND r.classroom_id=$1::uuid
 WHERE ($3='' OR w.title ILIKE '%'||$3||'%' OR w.description ILIKE '%'||$3||'%') AND ($4='' OR w.kind=$4) AND ($5='' OR ($5='unfiled' AND r.topic_id IS NULL) OR r.topic_id::text=$5)
 ORDER BY `+ordering+` LIMIT 51 OFFSET $6`, c.Params("id"), role, q, kind, topic, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	next := -1
	for rows.Next() {
		var id, kind, title, description, status, filename, topic string
		var due *time.Time
		var created time.Time
		var size int64
		if err = rows.Scan(&id, &kind, &title, &description, &due, &created, &status, &filename, &size, &topic); err != nil {
			return err
		}
		if len(out) == 50 {
			next = offset + 50
			break
		}
		out = append(out, fiber.Map{"id": id, "kind": kind, "title": title, "description": description, "due_at": due, "created_at": created, "status": status, "file_name": filename, "file_size": size, "topic_id": topic})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"items": out, "next_offset": next})
}
func (h *Handler) DuplicateCoursework(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	id := c.Params("resourceID")
	if err = validID(id); err != nil {
		return err
	}
	kind := c.Params("kind")
	if kind != "assignment" && kind != "exam" {
		return fail(400, "Only assignments and exams can be copied here")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	copy := uuid.NewString()
	var copied string
	if kind == "assignment" {
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_assignments(id,classroom_id,created_by,title,instructions,due_at,max_points,allow_late,allow_resubmit,rubric,status) SELECT $3::uuid,classroom_id,$4::uuid,left(title,190)||' (copy)',instructions,due_at,max_points,allow_late,allow_resubmit,rubric,'draft' FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid RETURNING id::text`, id, c.Params("id"), copy, actor).Scan(&copied)
	} else {
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,description,starts_at,ends_at,duration_minutes,questions,allow_mobile_mcq,status) SELECT $3::uuid,classroom_id,$4::uuid,left(title,190)||' (copy)',description,starts_at,ends_at,duration_minutes,(SELECT jsonb_agg(jsonb_set(q,'{id}',to_jsonb(gen_random_uuid()::text))) FROM jsonb_array_elements(questions) q),allow_mobile_mcq,'draft' FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid RETURNING id::text`, id, c.Params("id"), copy, actor).Scan(&copied)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Coursework not found")
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_topic_resources(classroom_id,topic_id,resource_kind,resource_id) SELECT classroom_id,topic_id,resource_kind,$3::uuid FROM classroom_topic_resources WHERE classroom_id=$1::uuid AND resource_id=$2::uuid AND resource_kind=$4`, c.Params("id"), id, copy, kind); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 201, fiber.Map{"id": copied, "status": "draft"})
}
