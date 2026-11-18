package learning

import (
	"errors"
	orgs "github.com/edunexus/edunexus/internal/platform/institutions"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strings"
)

func (h *Handler) InstitutionClasses(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if _, e = h.institutionRole(c, user, false); e != nil {
		return e
	}
	offset, e := institutionPage(c)
	if e != nil {
		return e
	}
	dept, term, q := c.Query("department"), c.Query("term"), strings.TrimSpace(c.Query("q"))
	if dept != "" && validID(dept) != nil || term != "" && validID(term) != nil || len(q) > 200 {
		return fail(400, "Invalid institution class filter")
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT cl.id::text,cl.name,COALESCE(cl.section,''),COALESCE(cl.subject,''),cl.status,COALESCE(d.name,''),COALESCE(t.name,''),COALESCE(m.member_role,''),cl.owner_id=$2::uuid,p.version FROM institution_classrooms p JOIN classrooms cl ON cl.id=p.classroom_id LEFT JOIN institution_departments d ON d.id=p.department_id LEFT JOIN institution_terms t ON t.id=p.term_id LEFT JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid AND m.status='active' WHERE p.institution_id=$1::uuid AND cl.deleted_at IS NULL AND($3='' OR p.department_id=NULLIF($3,'')::uuid) AND($4='' OR p.term_id=NULLIF($4,'')::uuid) AND($5='' OR position(lower($5) in lower(cl.name||' '||COALESCE(cl.subject,'')||' '||COALESCE(cl.section,'')))>0) ORDER BY lower(cl.name),cl.id LIMIT 51 OFFSET $6`, c.Params("institutionID"), user, dept, term, q, offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, name, section, subject, status, department, semester, role string
		var owned bool
		var version int
		if e = rows.Scan(&id, &name, &section, &subject, &status, &department, &semester, &role, &owned, &version); e != nil {
			return e
		}
		url := ""
		if role != "" {
			prefix := "student"
			if role == "teacher" {
				prefix = "instructor"
			}
			url = "/" + prefix + "/classrooms/" + id
		}
		items = append(items, fiber.Map{"id": id, "name": name, "section": section, "subject": subject, "status": status, "department": department, "semester": semester, "role": role, "owned": owned, "url": url, "version": version})
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
func (h *Handler) ClassInstitution(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if validID(c.Params("id")) != nil {
		return fail(400, "Invalid class")
	}
	if c.Method() == "GET" {
		var member, owner bool
		e = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=cl.id AND user_id=$2::uuid AND status='active'),cl.owner_id=$2::uuid FROM classrooms cl WHERE cl.id=$1::uuid AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&member, &owner)
		if errors.Is(e, pgx.ErrNoRows) || e == nil && !member && !owner {
			return fail(403, "Class membership required")
		}
		if e != nil {
			return e
		}
		var p orgs.Placement
		var version int
		var name, dept, term string
		e = h.db.QueryRow(c.UserContext(), `SELECT COALESCE(p.institution_id::text,''),COALESCE(p.department_id::text,''),COALESCE(p.term_id::text,''),COALESCE(p.version,0),COALESCE(i.name,''),COALESCE(d.name,''),COALESCE(t.name,'') FROM classrooms cl LEFT JOIN institution_classrooms p ON p.classroom_id=cl.id LEFT JOIN institutions i ON i.id=p.institution_id LEFT JOIN institution_departments d ON d.id=p.department_id LEFT JOIN institution_terms t ON t.id=p.term_id WHERE cl.id=$1::uuid`, c.Params("id")).Scan(&p.Institution, &p.Department, &p.Term, &version, &name, &dept, &term)
		if e != nil {
			return e
		}
		return respond(c, 200, fiber.Map{"placement": p, "version": version, "name": name, "department": dept, "semester": term, "can_manage": owner})
	}
	var req struct {
		Placement *orgs.Placement `json:"placement"`
		Version   int             `json:"version"`
	}
	if c.BodyParser(&req) != nil || req.Version < 0 {
		return fail(400, "Invalid class institution settings")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	version, e := orgs.Place(c.UserContext(), tx, c.Params("id"), user, req.Placement, req.Version, "Class organization updated")
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"version": version})
}
func (h *Handler) InstitutionDetach(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if validID(c.Params("institutionID")) != nil || validID(c.Params("classID")) != nil {
		return fail(400, "Invalid class placement")
	}
	var req struct {
		Version int    `json:"version"`
		Reason  string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 || len(strings.TrimSpace(req.Reason)) < 3 || len(req.Reason) > 1000 {
		return fail(400, "Confirm placement version and reason")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = orgs.Lock(c.UserContext(), tx, c.Params("institutionID"), user, true); e != nil {
		return e
	}
	tag, e := tx.Exec(c.UserContext(), `UPDATE institution_classrooms SET institution_id=NULL,department_id=NULL,term_id=NULL,version=version+1,updated_at=now() WHERE classroom_id=$1::uuid AND institution_id=$2::uuid AND version=$3`, c.Params("classID"), c.Params("institutionID"), req.Version)
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "Class placement changed. Reload before detaching")
	}
	if e = orgs.Record(c.UserContext(), tx, c.Params("institutionID"), user, "class_detached", c.Params("classID"), nil, nil, strings.TrimSpace(req.Reason)); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
