package learning

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func lockRoster(ctx context.Context, tx pgx.Tx, class, user string) error {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT true FROM classrooms c JOIN classroom_memberships m ON m.classroom_id=c.id AND m.user_id=$2::uuid WHERE c.id=$1::uuid AND c.status='active' AND c.deleted_at IS NULL AND m.status='active' AND m.member_role='teacher' FOR UPDATE OF c FOR SHARE OF m`, class, user).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(403, "Class teacher access changed")
	}
	return err
}
func (h *Handler) Sections(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	class := c.Params("id")
	if c.Method() == "GET" {
		rows, e := h.db.Query(c.UserContext(), `SELECT s.id::text,s.name,s.version,count(m.user_id) FILTER(WHERE m.status='active' AND m.member_role='student')::int FROM classroom_sections s LEFT JOIN classroom_memberships m ON m.classroom_id=s.classroom_id AND m.section_id=s.id WHERE s.classroom_id=$1::uuid GROUP BY s.id ORDER BY lower(s.name),s.id`, class)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, name string
			var version, count int
			if e = rows.Scan(&id, &name, &version, &count); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "name": name, "version": version, "students": count})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		return respond(c, 200, items)
	}
	var req struct {
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid section")
	}
	req.Name = strings.TrimSpace(req.Name)
	if c.Method() != "DELETE" && (len([]rune(req.Name)) < 1 || len([]rune(req.Name)) > 60 || strings.ContainsAny(req.Name, "\r\n\x00")) {
		return fail(400, "Section name requires 1–60 characters")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = lockRoster(c.UserContext(), tx, class, actor); err != nil {
		return err
	}
	var id string
	if c.Method() == "POST" {
		var count int
		if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_sections WHERE classroom_id=$1::uuid`, class).Scan(&count); err != nil {
			return err
		}
		if count >= 50 {
			return fail(409, "A class supports up to 50 sections")
		}
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_sections(classroom_id,name) VALUES($1::uuid,$2) RETURNING id::text`, class, req.Name).Scan(&id)
	} else {
		if validID(c.Params("sectionID")) != nil || req.Version < 1 {
			return fail(400, "Invalid section version")
		}
		id = c.Params("sectionID")
		var tag pgconn.CommandTag
		if c.Method() == "DELETE" {
			var used bool
			err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND section_id=$2::uuid AND status='active') OR EXISTS(SELECT 1 FROM(SELECT audience FROM classroom_exams WHERE classroom_id=$1::uuid UNION ALL SELECT audience FROM classroom_assignments WHERE classroom_id=$1::uuid UNION ALL SELECT audience FROM classroom_materials WHERE classroom_id=$1::uuid UNION ALL SELECT audience FROM classroom_stream_posts WHERE classroom_id=$1::uuid UNION ALL SELECT audience FROM classroom_announcement_drafts WHERE classroom_id=$1::uuid)p WHERE p.audience->'section_ids' ? ($2::uuid)::text)`, class, id).Scan(&used)
			if err != nil {
				return err
			}
			if used {
				return fail(409, "Section is in use. Move its students and update targeted content first")
			}
			if _, err = tx.Exec(c.UserContext(), `UPDATE classroom_memberships SET section_id=NULL WHERE classroom_id=$1::uuid AND section_id=$2::uuid AND status<>'active'`, class, id); err != nil {
				return err
			}
			tag, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_sections WHERE classroom_id=$1::uuid AND id=$2::uuid AND version=$3`, class, id, req.Version)
		} else {
			tag, err = tx.Exec(c.UserContext(), `UPDATE classroom_sections SET name=$3,version=version+1 WHERE classroom_id=$1::uuid AND id=$2::uuid AND version=$4`, class, id, req.Name, req.Version)
		}
		if err == nil && tag.RowsAffected() == 0 {
			return fail(409, "Section changed. Reload before saving")
		}
	}
	if err != nil {
		var pg *pgconn.PgError
		if errors.As(err, &pg) && pg.Code == "23505" {
			return fail(409, "Section name already exists")
		}
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"id": id})
}

type rosterStudent struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Roll    string `json:"roll"`
	Section string `json:"section_id"`
	Version int    `json:"version"`
}

func (h *Handler) SectionRoster(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if c.Method() == "GET" {
		offset, e := strconv.Atoi(c.Query("offset", "0"))
		if e != nil || offset < 0 || offset > 10000 {
			return fail(400, "Invalid page")
		}
		q := strings.TrimSpace(c.Query("q"))
		if len(q) > 200 {
			return fail(400, "Search is too long")
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),u.email,COALESCE(m.student_roll,''),COALESCE(m.section_id::text,''),m.roster_version FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL AND ($2='' OR position(lower($2) in lower(u.email||' '||u.first_name||' '||u.last_name||' '||COALESCE(m.student_roll,'')))>0) ORDER BY m.student_roll,u.id LIMIT 51 OFFSET $3`, c.Params("id"), q, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []rosterStudent{}
		for rows.Next() {
			var r rosterStudent
			if e = rows.Scan(&r.ID, &r.Name, &r.Email, &r.Roll, &r.Section, &r.Version); e != nil {
				return e
			}
			items = append(items, r)
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
		Version int    `json:"version"`
		Section string `json:"section_id"`
		Reason  string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 || validID(c.Params("studentID")) != nil {
		return fail(400, "Invalid roster change")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = lockRoster(c.UserContext(), tx, c.Params("id"), actor); err != nil {
		return err
	}
	if err = updateRoster(c.UserContext(), tx, c.Params("id"), actor, c.Params("studentID"), nil, req.Section, req.Version, req.Reason); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
func updateRoster(ctx context.Context, tx pgx.Tx, class, actor, user string, roll *string, section string, version int, reason string) error {
	if len(strings.TrimSpace(reason)) < 3 || len(reason) > 1000 {
		return fail(400, "Provide a reason for the roster change")
	}
	if section != "" {
		var exists bool
		if validID(section) != nil {
			return fail(400, "Invalid section")
		}
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM classroom_sections WHERE classroom_id=$1::uuid AND id=$2::uuid)`, class, section).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return fail(400, "Section belongs to another class")
		}
	}
	var oldRoll, oldSection string
	var current int
	err := tx.QueryRow(ctx, `SELECT COALESCE(student_roll,''),COALESCE(section_id::text,''),roster_version FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active' AND member_role='student' FOR UPDATE`, class, user).Scan(&oldRoll, &oldSection, &current)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && current != version {
		return fail(409, "Student roster changed. Preview again")
	}
	if err != nil {
		return err
	}
	nextRoll := oldRoll
	if roll != nil {
		r, e := audience.Normalize(&audience.Rule{Mode: "custom", Rolls: []string{*roll}})
		if e != nil {
			return fail(400, e.Error())
		}
		nextRoll = r.Rolls[0]
		if oldRoll != nextRoll {
			var locked bool
			err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.classroom_id=$1::uuid AND a.student_id=$2::uuid) OR EXISTS(SELECT 1 FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND s.student_id=$2::uuid)`, class, user).Scan(&locked)
			if err != nil {
				return err
			}
			if locked {
				return fail(409, "Roll changes are locked after participation; section transfers remain available")
			}
		}
	}
	if nextRoll == oldRoll && section == oldSection {
		return nil
	}
	var beforeName, afterName string
	if err = tx.QueryRow(ctx, `SELECT COALESCE((SELECT name FROM classroom_sections WHERE id=NULLIF($1,'')::uuid),''),COALESCE((SELECT name FROM classroom_sections WHERE id=NULLIF($2,'')::uuid),'')`, oldSection, section).Scan(&beforeName, &afterName); err != nil {
		return err
	}
	before, _ := json.Marshal(fiber.Map{"roll": oldRoll, "section_id": oldSection, "section_name": beforeName})
	after, _ := json.Marshal(fiber.Map{"roll": nextRoll, "section_id": section, "section_name": afterName})
	_, err = tx.Exec(ctx, `UPDATE classroom_memberships SET student_roll=NULLIF($3,''),section_id=NULLIF($4,'')::uuid,updated_at=now() WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, class, user, nextRoll, section)
	if err != nil {
		var pg *pgconn.PgError
		if errors.As(err, &pg) && pg.Code == "23505" {
			return fail(409, "This roll is already assigned")
		}
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO classroom_roster_events(classroom_id,user_id,actor_id,before_value,after_value,reason) VALUES($1::uuid,$2::uuid,$3::uuid,$4::jsonb,$5::jsonb,$6)`, class, user, actor, before, after, strings.TrimSpace(reason))
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,before_value,after_value,reason) SELECT $1::uuid,$2::uuid,trim(first_name||' '||last_name),'roster_change',$3,'Student section / roll update',$4::jsonb,$5::jsonb,$6 FROM users WHERE id=$2::uuid`, class, actor, user, before, after, strings.TrimSpace(reason))
	return err
}

func selectionFilter(c *fiber.Ctx) ([]byte, error) {
	var rule *audience.Rule
	if raw := c.Query("audience"); raw != "" {
		if len(raw) > 131072 || json.Unmarshal([]byte(raw), &rule) != nil {
			return nil, fail(400, "Invalid audience filter")
		}
	}
	encoded, e := audience.Encode(rule)
	if e != nil {
		return nil, fail(400, e.Error())
	}
	return encoded, nil
}

func registerSections(app *fiber.App, h *Handler) {
	g := app.Group("/classrooms/:id", authMiddleware.JWTProtected())
	g.Get("/sections", h.Sections)
	g.Post("/sections", h.Sections)
	g.Patch("/sections/:sectionID", h.Sections)
	g.Delete("/sections/:sectionID", h.Sections)
	g.Get("/roster", h.SectionRoster)
	g.Put("/roster/:studentID", h.SectionRoster)
	g.Post("/roster/import", h.ImportRoster)
	g.Post("/roster/bulk-section", h.BulkSection)
	g.Get("/student-view", h.StudentView)
}
