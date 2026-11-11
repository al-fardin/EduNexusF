package learning

import (
	"github.com/gofiber/fiber/v2"
	"time"
)

// Workspace data is derived exclusively from the caller's active memberships.
func (h *Handler) Workspace(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if err := validID(user); err != nil {
		return fail(401, "authentication required")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT cl.id::text,cl.owner_id::text,cl.name,COALESCE(cl.subject,''),COALESCE(cl.section,''),COALESCE(cl.room,''),COALESCE(cl.description,''),cl.class_code,cl.status,cl.created_at,cl.updated_at,m.member_role,trim(u.first_name||' '||u.last_name),COALESCE(u.avatar_url,'') FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id JOIN users u ON u.id=cl.owner_id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL ORDER BY cl.created_at DESC LIMIT 100`, user)
	if err != nil {
		return err
	}
	classes := make([]fiber.Map, 0)
	for rows.Next() {
		var id, owner, name, subject, section, room, description, code, status, role, teacher, avatar string
		var created, updated time.Time
		if err = rows.Scan(&id, &owner, &name, &subject, &section, &room, &description, &code, &status, &created, &updated, &role, &teacher, &avatar); err != nil {
			rows.Close()
			return err
		}
		classes = append(classes, fiber.Map{"id": id, "owner_id": owner, "name": name, "subject": subject, "section": section, "room": room, "description": description, "class_code": code, "status": status, "created_at": created, "updated_at": updated, "role": role, "teacher_name": teacher, "teacher_avatar": avatar})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	from, to := time.Now(), time.Now().AddDate(0, 0, 45)
	if raw := c.Query("from"); raw != "" {
		from, err = time.Parse(time.RFC3339, raw)
		if err != nil {
			return fail(400, "invalid calendar start")
		}
	}
	if raw := c.Query("to"); raw != "" {
		to, err = time.Parse(time.RFC3339, raw)
		if err != nil {
			return fail(400, "invalid calendar end")
		}
	}
	if !to.After(from) || to.Sub(from) > 93*24*time.Hour {
		return fail(400, "calendar range must be within 93 days")
	}
	rows, err = h.db.Query(c.UserContext(), `WITH accessible AS(SELECT cl.id,cl.name,m.member_role FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL),events AS(SELECT e.id,'exam'::text kind,e.title,e.starts_at at,a.id classroom_id,a.name classroom_name,a.member_role FROM classroom_exams e JOIN accessible a ON a.id=e.classroom_id WHERE e.status='published' AND e.closed_at IS NULL AND e.starts_at>=$2 AND e.starts_at<$3 UNION ALL SELECT e.id,'assignment',e.title,e.due_at,a.id,a.name,a.member_role FROM classroom_assignments e JOIN accessible a ON a.id=e.classroom_id WHERE e.status='published' AND e.due_at>=$2 AND e.due_at<$3) SELECT id::text,kind,title,at,classroom_id::text,classroom_name,member_role FROM events ORDER BY at LIMIT 500`, user, from, to)
	if err != nil {
		return err
	}
	upcoming := make([]fiber.Map, 0)
	for rows.Next() {
		var id, kind, title, class, name, role string
		var at time.Time
		if err = rows.Scan(&id, &kind, &title, &at, &class, &name, &role); err != nil {
			rows.Close()
			return err
		}
		upcoming = append(upcoming, fiber.Map{"id": id, "kind": kind, "title": title, "at": at, "classroom_id": class, "classroom_name": name, "role": role})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	rows, err = h.db.Query(c.UserContext(), `SELECT p.id::text,COALESCE(NULLIF(p.title,''),'Class update'),cl.id::text,cl.name,COALESCE(trim(u.first_name||' '||u.last_name),'Classroom'),p.post_type,p.created_at,m.member_role FROM classroom_stream_posts p JOIN classrooms cl ON cl.id=p.classroom_id JOIN classroom_memberships m ON m.classroom_id=cl.id LEFT JOIN users u ON u.id=p.author_id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 6`, user)
	if err != nil {
		return err
	}
	activity := make([]fiber.Map, 0)
	for rows.Next() {
		var id, title, class, name, author, kind, role string
		var at time.Time
		if err = rows.Scan(&id, &title, &class, &name, &author, &kind, &at, &role); err != nil {
			rows.Close()
			return err
		}
		activity = append(activity, fiber.Map{"id": id, "title": title, "classroom_id": class, "classroom_name": name, "author_name": author, "kind": kind, "at": at, "role": role})
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"classes": classes, "upcoming": upcoming, "activity": activity})
}

func (h *Handler) WorkspaceFiles(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if err := validID(user); err != nil {
		return fail(401, "authentication required")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT f.id::text,cl.id::text,cl.name,f.title,f.original_filename,f.media_type,f.file_size,f.created_at,m.member_role FROM classroom_materials f JOIN classrooms cl ON cl.id=f.classroom_id JOIN classroom_memberships m ON m.classroom_id=cl.id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.classroom_id=cl.id AND p.reference_type='material' AND p.reference_id=f.id AND p.deleted_at IS NULL) ORDER BY f.created_at DESC LIMIT 500`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, class, name, title, file, mime, role string
		var size int64
		var at time.Time
		if err = rows.Scan(&id, &class, &name, &title, &file, &mime, &size, &at, &role); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "classroom_id": class, "classroom_name": name, "title": title, "file_name": file, "media_type": mime, "file_size": size, "created_at": at, "role": role})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, out)
}
