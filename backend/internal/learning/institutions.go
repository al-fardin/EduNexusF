package learning

import (
	"errors"
	orgs "github.com/edunexus/edunexus/internal/platform/institutions"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"strconv"
	"strings"
	"time"
)

func institutionActor(c *fiber.Ctx) (string, error) {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return "", fail(401, "Authentication required")
	}
	c.Set("Cache-Control", "no-store")
	return user, nil
}
func institutionPage(c *fiber.Ctx) (int, error) {
	n, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || n < 0 || n > 10000 {
		return 0, fail(400, "Invalid page")
	}
	return n, nil
}
func (h *Handler) institutionRole(c *fiber.Ctx, user string, admin bool) (string, error) {
	if validID(c.Params("institutionID")) != nil {
		return "", fail(400, "Invalid institution")
	}
	var role string
	e := h.db.QueryRow(c.UserContext(), `SELECT role FROM institution_members WHERE institution_id=$1::uuid AND user_id=$2::uuid AND active`, c.Params("institutionID"), user).Scan(&role)
	if errors.Is(e, pgx.ErrNoRows) || e == nil && admin && role != "owner" && role != "admin" {
		return "", fail(403, "Institution membership does not permit this action")
	}
	return role, e
}
func institutionUnique(e error) error {
	var p *pgconn.PgError
	if errors.As(e, &p) && p.Code == "23505" {
		return fail(409, "This name or invitation already exists")
	}
	return e
}
func (h *Handler) Institutions(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if c.Method() == "GET" {
		offset, e := institutionPage(c)
		if e != nil {
			return e
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT i.id::text,i.name,i.version,m.role,(SELECT count(*)::int FROM institution_classrooms p JOIN classrooms cl ON cl.id=p.classroom_id WHERE p.institution_id=i.id AND cl.deleted_at IS NULL) FROM institutions i JOIN institution_members m ON m.institution_id=i.id WHERE m.user_id=$1::uuid AND m.active AND(NOT $3 OR m.role IN ('owner','admin','teacher')) ORDER BY lower(i.name),i.id LIMIT 51 OFFSET $2`, user, offset, c.Query("teaching") == "1")
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, name, role string
			var version, count int
			if e = rows.Scan(&id, &name, &version, &role, &count); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "name": name, "version": version, "role": role, "classes": count})
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
	var req struct {
		Name string `json:"name"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid institution")
	}
	req.Name = strings.TrimSpace(req.Name)
	if len([]rune(req.Name)) < 2 || len([]rune(req.Name)) > 140 {
		return fail(400, "Institution name requires 2–140 characters")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var verified bool
	e = tx.QueryRow(c.UserContext(), `SELECT email_verified FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR UPDATE`, user).Scan(&verified)
	if e != nil {
		return e
	}
	if !verified {
		return fail(403, "Verify your email before creating an institution")
	}
	var count int
	if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM institutions WHERE owner_id=$1::uuid`, user).Scan(&count); e != nil {
		return e
	}
	if count >= 10 {
		return fail(422, "An account can own up to 10 institutions")
	}
	var id string
	if e = tx.QueryRow(c.UserContext(), `INSERT INTO institutions(owner_id,name) VALUES($1::uuid,$2) RETURNING id::text`, user, req.Name).Scan(&id); e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO institution_members(institution_id,user_id,role) VALUES($1::uuid,$2::uuid,'owner')`, id, user); e != nil {
		return e
	}
	if e = orgs.Record(c.UserContext(), tx, id, user, "institution_created", id, nil, req.Name, ""); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 201, fiber.Map{"id": id})
}
func (h *Handler) InstitutionWorkspace(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	role, e := h.institutionRole(c, user, false)
	if e != nil {
		return e
	}
	org := c.Params("institutionID")
	if c.Method() == "PATCH" {
		var req struct {
			Name    string `json:"name"`
			Version int    `json:"version"`
		}
		if c.BodyParser(&req) != nil || req.Version < 1 || len([]rune(strings.TrimSpace(req.Name))) < 2 || len([]rune(req.Name)) > 140 {
			return fail(400, "Invalid institution name or version")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = orgs.Lock(c.UserContext(), tx, org, user, true); e != nil {
			return e
		}
		var old string
		e = tx.QueryRow(c.UserContext(), `SELECT name FROM institutions WHERE id=$1::uuid AND version=$2`, org, req.Version).Scan(&old)
		if errors.Is(e, pgx.ErrNoRows) {
			return fail(409, "Institution changed. Reload before saving")
		}
		if e != nil {
			return e
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE institutions SET name=$2,version=version+1 WHERE id=$1::uuid`, org, strings.TrimSpace(req.Name)); e != nil {
			return e
		}
		if e = orgs.Record(c.UserContext(), tx, org, user, "institution_renamed", org, old, strings.TrimSpace(req.Name), ""); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	var name string
	var version int
	if e = h.db.QueryRow(c.UserContext(), `SELECT name,version FROM institutions WHERE id=$1::uuid`, org).Scan(&name, &version); e != nil {
		return e
	}
	units := map[string][]fiber.Map{"departments": {}, "terms": {}}
	rows, e := h.db.Query(c.UserContext(), `SELECT id::text,name,version,'departments' kind,'' starts,'' ends FROM institution_departments WHERE institution_id=$1::uuid UNION ALL SELECT id::text,name,version,'terms',starts_on::text,ends_on::text FROM institution_terms WHERE institution_id=$1::uuid ORDER BY 4,5 DESC,2,1`, org)
	if e != nil {
		return e
	}
	defer rows.Close()
	for rows.Next() {
		var id, title, kind, start, end string
		var v int
		if e = rows.Scan(&id, &title, &v, &kind, &start, &end); e != nil {
			return e
		}
		units[kind] = append(units[kind], fiber.Map{"id": id, "name": title, "version": v, "starts_on": start, "ends_on": end})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"id": org, "name": name, "version": version, "role": role, "departments": units["departments"], "terms": units["terms"]})
}
func (h *Handler) InstitutionUnits(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if validID(c.Params("institutionID")) != nil {
		return fail(400, "Invalid institution")
	}
	org := c.Params("institutionID")
	kind := c.Params("unitType")
	table := map[string]string{"departments": "institution_departments", "terms": "institution_terms"}[kind]
	if table == "" {
		return fail(404, "Unknown institution setting")
	}
	var req struct {
		Name    string `json:"name"`
		Start   string `json:"starts_on"`
		End     string `json:"ends_on"`
		Version int    `json:"version"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid department or semester")
	}
	req.Name = strings.TrimSpace(req.Name)
	var start, end time.Time
	if c.Method() != "DELETE" {
		min, max := 1, 80
		if kind == "terms" {
			min, max = 2, 100
		}
		if len([]rune(req.Name)) < min || len([]rune(req.Name)) > max {
			return fail(400, "Choose a valid department or semester name")
		}
		if kind == "terms" {
			var a, b error
			start, a = time.Parse("2006-01-02", req.Start)
			end, b = time.Parse("2006-01-02", req.End)
			if a != nil || b != nil || end.Before(start) || end.Sub(start) > 730*24*time.Hour {
				return fail(400, "Semester dates must be within two years")
			}
		}
	}
	id := c.Params("unitID")
	if c.Method() != "POST" && (validID(id) != nil || req.Version < 1) {
		return fail(400, "Invalid department or semester version")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = orgs.Lock(c.UserContext(), tx, org, user, true); e != nil {
		return e
	}
	if c.Method() == "POST" {
		var count int
		if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM `+table+` WHERE institution_id=$1::uuid`, org).Scan(&count); e != nil {
			return e
		}
		if count >= 100 {
			return fail(422, "Use up to 100 departments and 100 semesters per institution")
		}
		if kind == "terms" {
			e = tx.QueryRow(c.UserContext(), `INSERT INTO institution_terms(institution_id,name,starts_on,ends_on) VALUES($1::uuid,$2,$3,$4) RETURNING id::text`, org, req.Name, start, end).Scan(&id)
		} else {
			e = tx.QueryRow(c.UserContext(), `INSERT INTO institution_departments(institution_id,name) VALUES($1::uuid,$2) RETURNING id::text`, org, req.Name).Scan(&id)
		}
	} else {
		var found string
		e = tx.QueryRow(c.UserContext(), `SELECT id::text FROM `+table+` WHERE id=$1::uuid AND institution_id=$2::uuid AND version=$3`, id, org, req.Version).Scan(&found)
		if errors.Is(e, pgx.ErrNoRows) {
			return fail(409, "Department or semester changed. Reload before saving")
		}
		if e != nil {
			return e
		}
		if c.Method() == "DELETE" {
			column := "department_id"
			if kind == "terms" {
				column = "term_id"
			}
			var used bool
			if e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM institution_classrooms WHERE institution_id=$1::uuid AND `+column+`=$2::uuid)`, org, id).Scan(&used); e != nil {
				return e
			}
			if used {
				return fail(409, "This department or semester is in use by a class")
			}
			_, e = tx.Exec(c.UserContext(), `DELETE FROM `+table+` WHERE id=$1::uuid`, id)
		} else if kind == "terms" {
			_, e = tx.Exec(c.UserContext(), `UPDATE institution_terms SET name=$2,starts_on=$3,ends_on=$4,version=version+1 WHERE id=$1::uuid`, id, req.Name, start, end)
		} else {
			_, e = tx.Exec(c.UserContext(), `UPDATE institution_departments SET name=$2,version=version+1 WHERE id=$1::uuid`, id, req.Name)
		}
	}
	if e != nil {
		return institutionUnique(e)
	}
	if e = orgs.Record(c.UserContext(), tx, org, user, kind+"_"+strings.ToLower(c.Method()), id, nil, req, ""); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"id": id})
}
