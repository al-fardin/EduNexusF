package learning

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"strings"
)

var staffCapabilities = []string{"coursework", "grading", "attendance", "people", "messaging", "moderation", "reports"}

// Every authenticated classroom route shares this check, including older
// handlers. Missing settings preserve an existing co-teacher's permissions.
func StaffPolicy(pool *pgxpool.Pool) func(context.Context, string, string, string) error {
	return func(ctx context.Context, user, path, method string) error {
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) < 2 || parts[0] != "classrooms" || validID(parts[1]) != nil {
			return nil
		}
		scope := ""
		if len(parts) == 2 {
			if method != "GET" {
				scope = "owner"
			}
		} else {
			scope = staffScope(parts[2:], method)
		}
		if scope == "" {
			return nil
		}
		var allowed bool
		if scope == "owner" {
			e := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM classrooms WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL)`, parts[1], user).Scan(&allowed)
			if e != nil {
				return e
			}
			if !allowed {
				return fail(403, "Only the class owner can change class settings or delete the class")
			}
			return nil
		}
		e := pool.QueryRow(ctx, `SELECT COALESCE((SELECT cl.owner_id=$2::uuid OR m.member_role<>'teacher' OR p.user_id IS NULL OR COALESCE((p.permissions->>$3)::boolean,false) FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid LEFT JOIN classroom_staff_permissions p ON p.classroom_id=cl.id AND p.user_id=m.user_id WHERE cl.id=$1::uuid),true)`, parts[1], user, scope).Scan(&allowed)
		if e != nil {
			return e
		}
		if !allowed {
			return fail(403, "Your co-teacher permissions do not include this action")
		}
		return nil
	}
}
func staffScope(parts []string, method string) string {
	route := strings.Join(parts, "/")
	first := parts[0]
	if first == "archive" || first == "unarchive" || first == "course-code" {
		if method != "GET" {
			return "owner"
		}
		return ""
	}
	if first == "staff-permissions" || first == "details" || first == "leave" {
		return ""
	}
	if first == "reports" {
		return "reports"
	}
	if first == "message-reports" {
		return "moderation"
	}
	if first == "attendance" {
		return "attendance"
	}
	if first == "gradebook" || first == "analytics" || first == "progress" || first == "rechecks" || first == "activity" || strings.Contains(route, "/submissions") || strings.Contains(route, "/import-grades") || strings.Contains(route, "/submission-bundle") || strings.Contains(route, "/similarity") || strings.Contains(route, "/question-analysis") || strings.Contains(route, "/results") || strings.Contains(route, "/marks") || strings.Contains(route, "/monitor") || strings.Contains(route, "/attempts") {
		return "grading"
	}
	if first == "members" || first == "memberships" || first == "students" || first == "invitations" {
		return "people"
	}
	if strings.Contains(first, "messag") || first == "conversations" {
		return "messaging"
	}
	if first == "storage" {
		return ""
	} // Storage endpoints separately require ownership.
	return "coursework"
}
func (h *Handler) StaffPermissions(c *fiber.Ctx) error {
	user, _, e := h.member(c, true)
	if e != nil {
		return e
	}
	var owner bool
	if e = h.db.QueryRow(c.UserContext(), `SELECT owner_id=$2::uuid FROM classrooms WHERE id=$1::uuid`, c.Params("id"), user).Scan(&owner); e != nil {
		return e
	}
	if !owner {
		return fail(403, "Class owner permission required")
	}
	if c.Method() == "POST" {
		var req struct {
			Email string `json:"email"`
		}
		if c.BodyParser(&req) != nil || len(req.Email) > 254 {
			return fail(400, "Enter the co-teacher email")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		var staff string
		e = tx.QueryRow(c.UserContext(), `SELECT id::text FROM users WHERE lower(email)=lower($1) AND role IN ('instructor','admin') AND status='active' AND email_verified AND deleted_at IS NULL AND id<>$2::uuid`, strings.TrimSpace(req.Email), user).Scan(&staff)
		if e != nil {
			return fail(404, "An active, verified instructor account is required")
		}
		tag, e := tx.Exec(c.UserContext(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status) VALUES($1::uuid,$2::uuid,'teacher','active') ON CONFLICT(classroom_id,user_id) DO UPDATE SET status='active' WHERE classroom_memberships.member_role='teacher'`, c.Params("id"), staff)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "An existing student membership cannot be promoted here")
		}
		permissions := map[string]bool{}
		for _, k := range staffCapabilities {
			permissions[k] = false
		}
		if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_staff_permissions(classroom_id,user_id,permissions,updated_by) VALUES($1::uuid,$2::uuid,$3::jsonb,$4::uuid) ON CONFLICT(classroom_id,user_id) DO NOTHING`, c.Params("id"), staff, permissions, user); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 200, fiber.Map{"id": staff})
	}
	if c.Method() == "DELETE" {
		if validID(c.Params("staffID")) != nil {
			return fail(400, "Invalid co-teacher")
		}
		tag, e := h.db.Exec(c.UserContext(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND member_role='teacher' AND user_id<>$3::uuid`, c.Params("id"), c.Params("staffID"), user)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(404, "Co-teacher not found")
		}
		return respond(c, 200, fiber.Map{"removed": true})
	}
	if c.Method() == "PUT" {
		var req struct {
			Permissions map[string]bool `json:"permissions"`
		}
		if validID(c.Params("staffID")) != nil || c.BodyParser(&req) != nil || len(req.Permissions) != len(staffCapabilities) {
			return fail(400, "Provide every co-teacher permission")
		}
		for _, k := range staffCapabilities {
			if _, ok := req.Permissions[k]; !ok {
				return fail(400, "Invalid permissions")
			}
		}
		tag, e := h.db.Exec(c.UserContext(), `INSERT INTO classroom_staff_permissions(classroom_id,user_id,permissions,updated_by) SELECT $1::uuid,m.user_id,$3::jsonb,$4::uuid FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active' AND cl.owner_id<>m.user_id ON CONFLICT(classroom_id,user_id) DO UPDATE SET permissions=EXCLUDED.permissions,updated_by=EXCLUDED.updated_by,updated_at=now()`, c.Params("id"), c.Params("staffID"), req.Permissions, user)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "Choose an active co-teacher, not the class owner")
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),cl.owner_id=u.id,p.permissions FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id JOIN users u ON u.id=m.user_id LEFT JOIN classroom_staff_permissions p ON p.classroom_id=m.classroom_id AND p.user_id=m.user_id WHERE m.classroom_id=$1::uuid AND m.member_role='teacher' AND m.status='active' ORDER BY cl.owner_id=u.id DESC,u.first_name LIMIT 100`, c.Params("id"))
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, name string
		var owns bool
		var permissions map[string]bool
		if e = rows.Scan(&id, &name, &owns, &permissions); e != nil {
			return e
		}
		if permissions == nil {
			permissions = map[string]bool{}
			for _, k := range staffCapabilities {
				permissions[k] = true
			}
		}
		items = append(items, fiber.Map{"id": id, "name": name, "owner": owns, "permissions": permissions})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return respond(c, 200, items)
}
