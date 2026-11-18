package learning

import (
	"encoding/json"
	"errors"
	orgs "github.com/edunexus/edunexus/internal/platform/institutions"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) InstitutionMembers(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if _, e = h.institutionRole(c, user, true); e != nil {
		return e
	}
	org := c.Params("institutionID")
	if c.Method() == "GET" {
		offset, e := institutionPage(c)
		if e != nil {
			return e
		}
		q := strings.TrimSpace(c.Query("q"))
		if len(q) > 200 {
			return fail(400, "Search is too long")
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),u.email,m.role,m.version FROM institution_members m JOIN users u ON u.id=m.user_id WHERE m.institution_id=$1::uuid AND m.active AND u.deleted_at IS NULL AND($2='' OR position(lower($2) in lower(u.first_name||' '||u.last_name||' '||u.email))>0) ORDER BY m.role,u.first_name,u.last_name,u.id LIMIT 51 OFFSET $3`, org, q, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, name, email, role string
			var version int
			if e = rows.Scan(&id, &name, &email, &role, &version); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "name": name, "email": email, "role": role, "version": version})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
	}
	if validID(c.Params("memberID")) != nil {
		return fail(400, "Invalid member")
	}
	var req struct {
		Role    string `json:"role"`
		Version int    `json:"version"`
		Reason  string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 || len(strings.TrimSpace(req.Reason)) < 3 || len(req.Reason) > 1000 || c.Method() != "DELETE" && req.Role != "admin" && req.Role != "teacher" && req.Role != "student" {
		return fail(400, "Choose a valid role, version and reason")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	actorRole, e := orgs.Lock(c.UserContext(), tx, org, user, true)
	if e != nil {
		return e
	}
	target := c.Params("memberID")
	var old string
	var version int
	e = tx.QueryRow(c.UserContext(), `SELECT role,version FROM institution_members WHERE institution_id=$1::uuid AND user_id=$2::uuid AND active FOR UPDATE`, org, target).Scan(&old, &version)
	if errors.Is(e, pgx.ErrNoRows) || e == nil && version != req.Version {
		return fail(409, "Institution member changed. Reload before saving")
	}
	if e != nil {
		return e
	}
	if old == "owner" || target == user || actorRole != "owner" && (old == "admin" || req.Role == "admin") {
		return fail(403, "Only the owner can manage administrators; self and owner changes are protected")
	}
	active := c.Method() != "DELETE"
	next := req.Role
	if !active {
		next = old
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE institution_members SET role=$3,active=$4,version=version+1 WHERE institution_id=$1::uuid AND user_id=$2::uuid`, org, target, next, active); e != nil {
		return e
	}
	detached := 0
	if !active || next == "student" {
		tag, e := tx.Exec(c.UserContext(), `UPDATE institution_classrooms p SET institution_id=NULL,department_id=NULL,term_id=NULL,version=p.version+1,updated_at=now() FROM classrooms cl WHERE cl.id=p.classroom_id AND p.institution_id=$1::uuid AND cl.owner_id=$2::uuid`, org, target)
		if e != nil {
			return e
		}
		detached = int(tag.RowsAffected())
	}
	if e = orgs.Record(c.UserContext(), tx, org, user, "member_updated", target, fiber.Map{"role": old, "active": true}, fiber.Map{"role": next, "active": active, "detached_classes": detached}, strings.TrimSpace(req.Reason)); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"saved": true, "detached_classes": detached})
}
func (h *Handler) InstitutionActivity(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if _, e = h.institutionRole(c, user, true); e != nil {
		return e
	}
	before, e := strconv.ParseInt(c.Query("before", "9223372036854775807"), 10, 64)
	if e != nil || before < 1 {
		return fail(400, "Invalid history cursor")
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT id,actor_name,action,target_id,before_value,after_value,reason,created_at FROM institution_activity WHERE institution_id=$1::uuid AND id<$2 ORDER BY id DESC LIMIT 51`, c.Params("institutionID"), before)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	next := ""
	for rows.Next() {
		var id int64
		var actor, action, target, reason string
		var old, current json.RawMessage
		var at time.Time
		if e = rows.Scan(&id, &actor, &action, &target, &old, &current, &reason, &at); e != nil {
			return e
		}
		if len(items) == 50 {
			next = items[49]["id"].(string)
			break
		}
		items = append(items, fiber.Map{"id": strconv.FormatInt(id, 10), "actor": actor, "action": action, "target_id": target, "before": old, "after": current, "reason": reason, "created_at": at})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"items": items, "next": next})
}
