package learning

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
)

// Student view only evaluates visibility; it never impersonates a student or starts an attempt.
func (h *Handler) StudentView(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	roll := strings.ToUpper(strings.TrimSpace(c.Query("roll")))
	if len(roll) < 1 || len(roll) > 32 {
		return fail(400, "Enter a student roll")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid page")
	}
	var student, name, section string
	err = h.db.QueryRow(c.UserContext(), `SELECT m.user_id::text,trim(u.first_name||' '||u.last_name),COALESCE(s.name,'') FROM classroom_memberships m JOIN users u ON u.id=m.user_id LEFT JOIN classroom_sections s ON s.id=m.section_id WHERE m.classroom_id=$1::uuid AND m.student_roll=$2 AND m.status='active' AND m.member_role='student' AND u.status='active' AND u.deleted_at IS NULL`, c.Params("id"), roll).Scan(&student, &name, &section)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Student roll not found")
	}
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `WITH items AS(SELECT id,'exam' kind,title,status='published' published,created_at FROM classroom_exams WHERE classroom_id=$1::uuid UNION ALL SELECT id,'assignment',title,status='published',created_at FROM classroom_assignments WHERE classroom_id=$1::uuid UNION ALL SELECT m.id,'material',m.title,EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_type='material' AND p.reference_id=m.id AND p.deleted_at IS NULL),m.created_at FROM classroom_materials m WHERE m.classroom_id=$1::uuid AND NOT EXISTS(SELECT 1 FROM classroom_material_trash WHERE material_id=m.id) UNION ALL SELECT id,'post',COALESCE(title,'Class update'),true,created_at FROM classroom_stream_posts WHERE classroom_id=$1::uuid AND deleted_at IS NULL AND post_type='announcement') SELECT id::text,kind,title,published,edunexus_resource_visible($1::uuid,kind,id,$2::uuid) FROM items ORDER BY created_at DESC,kind,id LIMIT 51 OFFSET $3`, c.Params("id"), student, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, kind, title string
		var published, assigned bool
		if err = rows.Scan(&id, &kind, &title, &published, &assigned); err != nil {
			return err
		}
		reason := "Available"
		if !published {
			reason = "Unpublished"
		} else if !assigned {
			reason = "Not assigned"
		}
		items = append(items, fiber.Map{"id": id, "kind": kind, "title": title, "visible": published && assigned, "reason": reason})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"student": fiber.Map{"name": name, "roll": roll, "section": section}, "items": items, "next_offset": next})
}
