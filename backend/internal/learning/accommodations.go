package learning

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

// Personal timing changes never change targeting, device or admission rules.
// Exam changes are configured before the exam starts and never reopen attempts.
func (h *Handler) Accommodations(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	class := c.Params("id")
	if c.Method() == "GET" {
		offset, e := strconv.Atoi(c.Query("offset", "0"))
		if e != nil || offset < 0 || offset > 10000 {
			return fail(400, "Invalid page")
		}
		resources := []fiber.Map{}
		rows, e := h.db.Query(c.UserContext(), `SELECT id::text,kind,title FROM (SELECT id,'exam'::text kind,title,created_at FROM classroom_exams WHERE classroom_id=$1::uuid UNION ALL SELECT id,'assignment',title,created_at FROM classroom_assignments WHERE classroom_id=$1::uuid)r ORDER BY created_at DESC,id LIMIT 401`, class)
		if e != nil {
			return e
		}
		for rows.Next() {
			var id, kind, title string
			if e = rows.Scan(&id, &kind, &title); e != nil {
				rows.Close()
				return e
			}
			resources = append(resources, fiber.Map{"id": id, "kind": kind, "title": title})
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if len(resources) > 400 {
			return fail(422, "Timing tools support up to 400 coursework items per class")
		}
		rows, e = h.db.Query(c.UserContext(), `SELECT a.resource_id::text,a.kind,a.student_id::text,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,''),a.extra_minutes,a.due_at,a.version FROM classroom_accommodations a JOIN users u ON u.id=a.student_id JOIN classroom_memberships m ON m.classroom_id=a.classroom_id AND m.user_id=a.student_id WHERE a.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' ORDER BY m.student_roll,a.resource_id,a.student_id LIMIT 51 OFFSET $2`, class, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, kind, user, name, roll string
			var extra, version int
			var due *time.Time
			if e = rows.Scan(&id, &kind, &user, &name, &roll, &extra, &due, &version); e != nil {
				return e
			}
			items = append(items, fiber.Map{"resource_id": id, "kind": kind, "student_id": user, "name": name, "roll": roll, "extra_minutes": extra, "due_at": due, "version": version})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		c.Set("Cache-Control", "no-store")
		return respond(c, 200, fiber.Map{"resources": resources, "items": items, "next_offset": next})
	}
	var req struct {
		ID      string     `json:"resource_id"`
		Kind    string     `json:"kind"`
		Roll    string     `json:"student_roll"`
		Extra   int        `json:"extra_minutes"`
		Due     *time.Time `json:"due_at"`
		Version int        `json:"version"`
		Reason  string     `json:"reason"`
	}
	if c.BodyParser(&req) != nil || validID(req.ID) != nil || (req.Kind != "exam" && req.Kind != "assignment") || req.Version < 0 || req.Extra < 0 || req.Extra > 239 || len(strings.TrimSpace(req.Reason)) < 3 || len(req.Reason) > 1000 {
		return fail(400, "Provide valid personal timing settings and a reason")
	}
	req.Roll = strings.ToUpper(strings.TrimSpace(req.Roll))
	if len(req.Roll) < 1 || len(req.Roll) > 32 {
		return fail(400, "Enter the full student roll")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var access bool
	err = tx.QueryRow(c.UserContext(), `SELECT true FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid WHERE cl.id=$1::uuid AND cl.status='active' AND cl.deleted_at IS NULL AND m.member_role='teacher' AND m.status='active' FOR SHARE OF cl,m`, class, actor).Scan(&access)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(403, "Class teacher access changed")
	}
	if err != nil {
		return err
	}
	var student string
	err = tx.QueryRow(c.UserContext(), `SELECT m.user_id::text FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.student_roll=$2 AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL FOR SHARE OF m`, class, req.Roll).Scan(&student)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "No active student has that roll")
	}
	if err != nil {
		return err
	}
	title := ""
	if req.Kind == "exam" {
		var starts time.Time
		var duration int
		var attempted bool
		err = tx.QueryRow(c.UserContext(), `SELECT title,starts_at,duration_minutes,EXISTS(SELECT 1 FROM classroom_exam_attempts WHERE exam_id=e.id AND student_id=$3::uuid) FROM classroom_exams e WHERE id=$1::uuid AND classroom_id=$2::uuid AND closed_at IS NULL FOR UPDATE`, req.ID, class, student).Scan(&title, &starts, &duration, &attempted)
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(404, "Exam not found")
		}
		if err != nil {
			return err
		}
		if !time.Now().Before(starts) || attempted {
			return fail(409, "Configure extra time before the exam starts; existing attempts cannot be reopened")
		}
		if req.Due != nil || duration+req.Extra > 240 {
			return fail(400, "Total exam time must be within 240 minutes; the class exam closing time still applies")
		}
	} else {
		var due time.Time
		err = tx.QueryRow(c.UserContext(), `SELECT title,due_at FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, req.ID, class).Scan(&title, &due)
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(404, "Assignment not found")
		}
		if err != nil {
			return err
		}
		if req.Extra != 0 || req.Due != nil && (req.Due.Before(due) || req.Due.After(due.Add(30*24*time.Hour))) {
			return fail(400, "Personal deadline must extend the class deadline by at most 30 days")
		}
	}
	var before json.RawMessage
	err = tx.QueryRow(c.UserContext(), `SELECT to_jsonb(a) FROM classroom_accommodations a WHERE resource_id=$1::uuid AND student_id=$2::uuid FOR UPDATE`, req.ID, student).Scan(&before)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if before == nil {
		before = json.RawMessage(`{}`)
	}
	var version int
	if req.Version == 0 {
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_accommodations(classroom_id,resource_id,kind,exam_id,assignment_id,student_id,extra_minutes,due_at) VALUES($1::uuid,$2::uuid,$3,CASE WHEN $3='exam' THEN $2::uuid END,CASE WHEN $3='assignment' THEN $2::uuid END,$4::uuid,$5,$6) ON CONFLICT DO NOTHING RETURNING version`, class, req.ID, req.Kind, student, req.Extra, req.Due).Scan(&version)
	} else {
		err = tx.QueryRow(c.UserContext(), `UPDATE classroom_accommodations SET extra_minutes=$4,due_at=$5,version=version+1 WHERE resource_id=$1::uuid AND student_id=$2::uuid AND version=$3 RETURNING version`, req.ID, student, req.Version, req.Extra, req.Due).Scan(&version)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(409, "Timing settings changed. Reload before saving")
	}
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,before_value,after_value,reason) SELECT $1::uuid,id,trim(first_name||' '||last_name),'personal_timing',$3,$4,$5::jsonb,jsonb_build_object('student_id',$6::text,'extra_minutes',$7::int,'due_at',$8::timestamptz),$9 FROM users WHERE id=$2::uuid`, class, actor, req.ID, title, before, student, req.Extra, req.Due, strings.TrimSpace(req.Reason))
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"version": version})
}
