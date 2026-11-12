package learning

import (
	"github.com/gofiber/fiber/v2"
	"strconv"
	"strings"
	"time"
)

// Search never searches exam answers, submission content or private messages.
func (h *Handler) Search(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "authentication required")
	}
	q := strings.TrimSpace(c.Query("q"))
	kind := c.Query("kind", "all")
	if len([]rune(q)) < 2 || len([]rune(q)) > 200 {
		return fail(400, "Search requires 2–200 characters")
	}
	if kind != "all" && kind != "class" && kind != "post" && kind != "material" && kind != "assignment" && kind != "exam" {
		return fail(400, "Invalid search type")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid search page")
	}
	// Escape LIKE syntax so user input is a literal substring, including % and _.
	pattern := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(q) + "%"
	rows, err := h.db.Query(c.UserContext(), `WITH access AS (
 SELECT cl.id,cl.name,m.member_role FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id
 WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL
 ), found AS (
 SELECT a.id,'class'::text kind,a.name title,''::text excerpt,a.id classroom_id,a.name classroom_name,a.member_role,cl.created_at at FROM access a JOIN classrooms cl ON cl.id=a.id WHERE a.name ILIKE $2
 UNION ALL SELECT p.id,'post',COALESCE(NULLIF(p.title,''),'Class update'),left(p.content,220),a.id,a.name,a.member_role,p.created_at FROM classroom_stream_posts p JOIN access a ON a.id=p.classroom_id WHERE p.deleted_at IS NULL AND (p.title ILIKE $2 OR p.content ILIKE $2)
 UNION ALL SELECT f.id,'material',f.title,left(COALESCE(NULLIF(f.description,''),x.caption,x.plain_text,''),220),a.id,a.name,a.member_role,f.created_at FROM classroom_materials f JOIN access a ON a.id=f.classroom_id LEFT JOIN classroom_material_accessibility x ON x.material_id=f.id WHERE (f.title ILIKE $2 OR f.description ILIKE $2 OR f.original_filename ILIKE $2 OR x.plain_text ILIKE $2 OR x.transcript ILIKE $2 OR x.caption ILIKE $2 OR x.image_alt ILIKE $2) AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.classroom_id=a.id AND p.reference_type='material' AND p.reference_id=f.id AND p.deleted_at IS NULL)
 UNION ALL SELECT f.id,'assignment',f.title,left(f.instructions,220),a.id,a.name,a.member_role,f.created_at FROM classroom_assignments f JOIN access a ON a.id=f.classroom_id WHERE (a.member_role='teacher' OR f.status='published') AND (f.title ILIKE $2 OR f.instructions ILIKE $2)
 UNION ALL SELECT f.id,'exam',f.title,''::text,a.id,a.name,a.member_role,f.created_at FROM classroom_exams f JOIN access a ON a.id=f.classroom_id WHERE (a.member_role='teacher' OR f.status='published') AND f.title ILIKE $2
 ) SELECT id::text,kind,title,excerpt,classroom_id::text,classroom_name,member_role,at FROM found WHERE ($3='all' OR kind=$3) ORDER BY at DESC,kind,id LIMIT 51 OFFSET $4`, user, pattern, kind, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, k, title, excerpt, class, name, role string
		var at time.Time
		if err = rows.Scan(&id, &k, &title, &excerpt, &class, &name, &role, &at); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "kind": k, "title": title, "excerpt": excerpt, "classroom_id": class, "classroom_name": name, "role": role, "at": at})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(out) > 50 {
		out = out[:50]
		next = offset + 50
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"items": out, "next_offset": next})
}
