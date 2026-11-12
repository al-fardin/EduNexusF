package learning

import (
	"github.com/gofiber/fiber/v2"
	"strconv"
)

func (h *Handler) Storage(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT cl.id::text,cl.name,cl.storage_quota_bytes,edunexus_storage_used(cl.id) FROM classrooms cl WHERE cl.owner_id=$1::uuid AND cl.deleted_at IS NULL ORDER BY cl.created_at DESC LIMIT 501`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, name string
		var quota, used int64
		if err = rows.Scan(&id, &name, &quota, &used); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "name": name, "quota": quota, "used": used})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(out) > 500 {
		return fail(422, "Storage overview supports 500 classes")
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, out)
}
func (h *Handler) StorageFiles(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if validID(c.Params("id")) != nil {
		return fail(400, "Invalid class")
	}
	var err error
	var owner bool
	if err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classrooms WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL)`, c.Params("id"), user).Scan(&owner); err != nil {
		return err
	}
	if !owner {
		return fail(403, "Class owner permission required")
	}
	if c.Method() == "PUT" {
		var req struct {
			Quota int64 `json:"quota"`
		}
		if c.BodyParser(&req) != nil || req.Quota < 10485760 || req.Quota > 2147483648 {
			return fail(400, "Quota must be between 10 MB and 2 GB")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('storage:'||$1,0))`, c.Params("id")); e != nil {
			return e
		}
		var used int64
		if e = tx.QueryRow(c.UserContext(), `SELECT edunexus_storage_used($1::uuid)`, c.Params("id")).Scan(&used); e != nil {
			return e
		}
		if req.Quota < used {
			return fail(409, "Quota cannot be smaller than stored files")
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE classrooms SET storage_quota_bytes=$2 WHERE id=$1::uuid`, c.Params("id"), req.Quota); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid page")
	}
	rows, err := h.db.Query(c.UserContext(), `WITH files AS (
 SELECT id::text,'material' kind,title,file_size bytes,created_at FROM classroom_materials WHERE classroom_id=$1::uuid
 UNION ALL SELECT s.id::text,'submission',a.title||' · v'||s.version,octet_length(s.file_bytes),s.submitted_at FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND octet_length(s.file_bytes)>0
 UNION ALL SELECT m.id::text,'message',m.file_name,m.file_size,m.created_at FROM classroom_messages m JOIN classroom_conversations t ON t.id=m.conversation_id WHERE t.classroom_id=$1::uuid AND (t.user_low=$2::uuid OR t.user_high=$2::uuid) AND m.file_size>0
 UNION ALL SELECT id::text,'tester',name,octet_length(executable),created_at FROM classroom_question_testers WHERE classroom_id=$1::uuid
 ) SELECT id,kind,title,bytes FROM files ORDER BY bytes DESC,id LIMIT 51 OFFSET $3`, c.Params("id"), user, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, kind, title string
		var size int64
		if err = rows.Scan(&id, &kind, &title, &size); err != nil {
			return err
		}
		items = append(items, fiber.Map{"id": id, "kind": kind, "title": title, "bytes": size})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
}
func (h *Handler) MaterialUsage(c *fiber.Ctx) error {
	_, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if validID(c.Params("materialID")) != nil {
		return fail(400, "Invalid material")
	}
	var posts int
	var syllabus bool
	err = h.db.QueryRow(c.UserContext(), `SELECT (SELECT count(*) FROM classroom_stream_posts WHERE classroom_id=m.classroom_id AND reference_type='material' AND reference_id=m.id AND deleted_at IS NULL),position(m.id::text in cl.syllabus)>0 FROM classroom_materials m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.id=$1::uuid AND m.classroom_id=$2::uuid`, c.Params("materialID"), c.Params("id")).Scan(&posts, &syllabus)
	if err != nil {
		return fail(404, "Material not found")
	}
	return respond(c, 200, fiber.Map{"stream_posts": posts, "syllabus_reference": syllabus, "note": "Only references managed by EduNexus can be detected. External links are not tracked."})
}
