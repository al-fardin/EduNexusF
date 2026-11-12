package learning

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) AcademicReports(c *fiber.Ctx) error {
	user, role, e := h.member(c, false)
	if e != nil {
		return e
	}
	if c.Method() == "POST" {
		if role != "teacher" {
			return fail(403, "Teacher permission required")
		}
		var req struct {
			Student string `json:"student_id"`
			Note    string `json:"note"`
			Request string `json:"request_id"`
		}
		if c.BodyParser(&req) != nil || validID(req.Student) != nil || validID(req.Request) != nil || len([]rune(req.Note)) > 2000 {
			return fail(400, "Choose a student and valid report request")
		}
		hash := snapshotHash(fiber.Map{"class": c.Params("id"), "student": req.Student, "note": req.Note})
		var old, oldHash string
		e = h.db.QueryRow(c.UserContext(), `SELECT id::text,payload_hash FROM classroom_academic_reports WHERE created_by=$1::uuid AND request_id=$2::uuid`, user, req.Request).Scan(&old, &oldHash)
		if e == nil {
			if hash != oldHash {
				return fail(409, "Report request ID was already used")
			}
			return respond(c, 200, fiber.Map{"id": old})
		}
		if !errors.Is(e, pgx.ErrNoRows) {
			return e
		}
		// Always use student visibility: unpublished exam marks never enter a report.
		progress, e := h.buildProgress(c.UserContext(), c.Params("id"), req.Student, "student")
		if e != nil {
			return e
		}
		if len(progress) != 1 {
			return fail(404, "Active student not found")
		}
		var name, teacher string
		if e = h.db.QueryRow(c.UserContext(), `SELECT cl.name,trim(u.first_name||' '||u.last_name) FROM classrooms cl JOIN users u ON u.id=$2::uuid WHERE cl.id=$1::uuid`, c.Params("id"), user).Scan(&name, &teacher); e != nil {
			return e
		}
		snapshot := fiber.Map{"class_name": name, "teacher_name": teacher, "generated_at": time.Now().UTC(), "student": progress[0], "note": strings.TrimSpace(req.Note)}
		raw, e := json.Marshal(snapshot)
		if e != nil {
			return e
		}
		if len(raw) > 250000 {
			return fail(422, "Report is too large; reduce coursework history")
		}
		id := uuid.NewString()
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); e != nil {
			return e
		}
		var count int
		if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_academic_reports WHERE created_by=$1::uuid AND created_at>now()-interval '1 day'`, user).Scan(&count); e != nil {
			return e
		}
		if count >= 100 {
			return fail(429, "Daily report creation limit reached")
		}
		tag, e := tx.Exec(c.UserContext(), `INSERT INTO classroom_academic_reports(id,classroom_id,student_id,created_by,request_id,payload_hash,snapshot) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::jsonb) ON CONFLICT(created_by,request_id) DO NOTHING`, id, c.Params("id"), req.Student, user, req.Request, hash, raw)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "Report request is already being processed; reload the report list")
		}
		if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_academic_report_events(report_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,'draft','Created for teacher preview')`, id, user); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 201, fiber.Map{"id": id})
	}
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid page")
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT id::text,student_id::text,snapshot->'student'->>'name',status,version,created_at,published_at FROM classroom_academic_reports WHERE classroom_id=$1::uuid AND ($2='teacher' OR (student_id=$3::uuid AND status='published')) ORDER BY created_at DESC,id LIMIT 51 OFFSET $4`, c.Params("id"), role, user, offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, student, name, status string
		var version int
		var at time.Time
		var published *time.Time
		if e = rows.Scan(&id, &student, &name, &status, &version, &at, &published); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "student_id": student, "student_name": name, "status": status, "version": version, "created_at": at, "published_at": published})
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
	return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
}
func (h *Handler) AcademicReport(c *fiber.Ctx) error {
	user, role, e := h.member(c, false)
	if e != nil {
		return e
	}
	if validID(c.Params("reportID")) != nil {
		return fail(400, "Invalid report")
	}
	if c.Method() == "POST" {
		if role != "teacher" {
			return fail(403, "Teacher permission required")
		}
		var req struct {
			Status  string `json:"status"`
			Version int    `json:"version"`
			Reason  string `json:"reason"`
		}
		if c.BodyParser(&req) != nil || req.Version < 1 || (req.Status != "published" && req.Status != "withdrawn") || len([]rune(strings.TrimSpace(req.Reason))) < 10 || len([]rune(req.Reason)) > 2000 {
			return fail(400, "Provide a report decision and reason")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		var student string
		e = tx.QueryRow(c.UserContext(), `UPDATE classroom_academic_reports SET status=$4,version=version+1,published_at=CASE WHEN $4='published' THEN now() ELSE published_at END WHERE id=$1::uuid AND classroom_id=$2::uuid AND version=$3 AND ((status='draft' AND $4='published') OR (status='published' AND $4='withdrawn')) RETURNING student_id::text`, c.Params("reportID"), c.Params("id"), req.Version, req.Status).Scan(&student)
		if errors.Is(e, pgx.ErrNoRows) {
			return fail(409, "Report changed or this transition is unavailable")
		}
		if e != nil {
			return e
		}
		if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_academic_report_events(report_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,$3,$4)`, c.Params("reportID"), user, req.Status, req.Reason); e != nil {
			return e
		}
		if req.Status == "published" {
			if _, e = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,'academic-report:'||$3,'report','Academic report available','Your teacher published an academic report.','results&reports=1','student',$4::uuid)`, c.Params("id"), user, c.Params("reportID"), student); e != nil {
				return e
			}
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	var snapshot any
	var status string
	var version int
	e = h.db.QueryRow(c.UserContext(), `SELECT snapshot,status,version FROM classroom_academic_reports WHERE id=$1::uuid AND classroom_id=$2::uuid AND ($3='teacher' OR (student_id=$4::uuid AND status='published'))`, c.Params("reportID"), c.Params("id"), role, user).Scan(&snapshot, &status, &version)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(404, "Report not found")
	}
	if e != nil {
		return e
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"id": c.Params("reportID"), "status": status, "version": version, "snapshot": snapshot})
}
