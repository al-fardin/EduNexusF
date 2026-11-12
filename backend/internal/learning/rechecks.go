package learning

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) RecheckCandidates(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return fail(403, "Student permission required")
	}
	rows, err := h.db.Query(c.UserContext(), `WITH latest AS(SELECT DISTINCT ON(s.assignment_id) s.id,s.assignment_id,s.awarded_points,s.version FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND a.status='published' AND s.student_id=$2::uuid ORDER BY s.assignment_id,s.version DESC) SELECT s.id::text,'assignment',a.title FROM latest s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE s.awarded_points IS NOT NULL UNION ALL SELECT a.id::text,'exam',e.title FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id JOIN classroom_exam_result_publications p ON p.attempt_id=a.id WHERE e.classroom_id=$1::uuid AND a.student_id=$2::uuid ORDER BY 2,3 LIMIT 401`, c.Params("id"), user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, kind, title string
		if err = rows.Scan(&id, &kind, &title); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "kind": kind, "title": title})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(out) > 400 {
		return fail(422, "Recheck candidate list supports up to 400 results")
	}
	return respond(c, 200, out)
}
func (h *Handler) recheckGrade(ctx context.Context, class, user, kind, id string) (string, map[string]any, error) {
	if kind == "assignment" {
		var title, assignment, feedback string
		var score, max, version int
		var at time.Time
		var criteria json.RawMessage
		err := h.db.QueryRow(ctx, `SELECT a.title,a.id::text,s.awarded_points,a.max_points,s.version,s.feedback,s.graded_at,s.rubric_scores FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE s.id=$1::uuid AND a.classroom_id=$2::uuid AND s.student_id=$3::uuid AND a.status='published' AND s.awarded_points IS NOT NULL AND s.version=(SELECT max(version) FROM classroom_assignment_submissions WHERE assignment_id=a.id AND student_id=s.student_id)`, id, class, user).Scan(&title, &assignment, &score, &max, &version, &feedback, &at, &criteria)
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil, fail(409, "The latest graded submission is required")
		}
		if err != nil {
			return "", nil, err
		}
		return title, map[string]any{"score": score, "maximum": max, "version": version, "graded_at": at, "feedback": feedback, "criteria": criteria, "assignment_id": assignment}, nil
	}
	var title, exam string
	var score, max int
	var published time.Time
	var complete bool
	var marks json.RawMessage
	err := h.db.QueryRow(ctx, `SELECT e.title,e.id::text,COALESCE(sum(COALESCE(m.awarded_points,CASE WHEN q->>'kind'='mcq' THEN CASE WHEN a.answers->>(q->>'id')=q->>'correct_option' THEN (q->>'points')::int ELSE 0 END WHEN trim(COALESCE(a.answers->>(q->>'id'),''))='' THEN 0 END)),0)::int,sum((q->>'points')::int)::int,p.published_at,bool_and(q->>'kind'='mcq' OR m.awarded_points IS NOT NULL OR trim(COALESCE(a.answers->>(q->>'id'),''))=''),jsonb_agg(jsonb_build_object('question',q->>'id','points',m.awarded_points,'feedback',COALESCE(m.feedback,''),'at',m.updated_at) ORDER BY q->>'id') FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id JOIN classroom_exam_result_publications p ON p.attempt_id=a.id CROSS JOIN LATERAL jsonb_array_elements(e.questions) q LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id AND m.question_id=q->>'id' WHERE a.id=$1::uuid AND e.classroom_id=$2::uuid AND a.student_id=$3::uuid AND (a.status='submitted' OR a.expires_at<=now() OR e.ends_at<=now()) GROUP BY a.id,e.id,p.published_at`, id, class, user).Scan(&title, &exam, &score, &max, &published, &complete, &marks)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, fail(409, "A published exam result is required")
	}
	if err != nil {
		return "", nil, err
	}
	if !complete {
		return "", nil, fail(409, "Result grading is incomplete")
	}
	return title, map[string]any{"score": score, "maximum": max, "published_at": published, "marks": marks, "exam_id": exam}, nil
}
func (h *Handler) Rechecks(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if c.Method() == "POST" {
		if role != "student" {
			return fail(403, "Students create recheck requests")
		}
		var req struct {
			Kind     string `json:"kind"`
			Resource string `json:"resource_id"`
			Reason   string `json:"reason"`
		}
		if c.BodyParser(&req) != nil || (req.Kind != "assignment" && req.Kind != "exam") || validID(req.Resource) != nil || len([]rune(strings.TrimSpace(req.Reason))) < 20 || len([]rune(req.Reason)) > 2000 {
			return fail(400, "Choose a graded result and explain the request in 20–2000 characters")
		}
		title, summary, err := h.recheckGrade(c.UserContext(), c.Params("id"), user, req.Kind, req.Resource)
		if err != nil {
			return err
		}
		snapshot := snapshotHash(summary)
		tx, err := h.db.Begin(c.UserContext())
		if err != nil {
			return err
		}
		defer tx.Rollback(c.UserContext())
		if _, err = tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); err != nil {
			return err
		}
		var previous string
		err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_rechecks WHERE student_id=$1::uuid AND resource_kind=$2 AND resource_id=$3::uuid AND grade_snapshot=$4`, user, req.Kind, req.Resource, snapshot).Scan(&previous)
		if err == nil {
			return respond(c, 200, fiber.Map{"id": previous, "existing": true})
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		var open, total int
		if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FILTER(WHERE classroom_id=$2::uuid AND status IN ('open','reviewing'))::int,count(*) FILTER(WHERE resource_kind=$3 AND resource_id=$4::uuid)::int FROM classroom_rechecks WHERE student_id=$1::uuid`, user, c.Params("id"), req.Kind, req.Resource).Scan(&open, &total); err != nil {
			return err
		}
		if open >= 3 || total >= 10 {
			return fail(409, "Resolve open requests first; each result supports at most ten grade review rounds")
		}
		raw, _ := json.Marshal(summary)
		var id string
		if err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_rechecks(classroom_id,student_id,resource_kind,resource_id,title,grade_snapshot,grade_summary,reason) VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7::jsonb,$8) RETURNING id::text`, c.Params("id"), user, req.Kind, req.Resource, title, snapshot, raw, strings.TrimSpace(req.Reason)).Scan(&id); err != nil {
			return err
		}
		if err = recordRecheckEvent(c.UserContext(), tx, id, user, "open", strings.TrimSpace(req.Reason)); err != nil {
			return err
		}
		if _, err = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,$3,'recheck',$4,'A student requested a review of their marks.','results&review=1','teacher')`, c.Params("id"), user, "recheck:"+id, "Review requested: "+title); err != nil {
			return err
		}
		if err = tx.Commit(c.UserContext()); err != nil {
			return err
		}
		return respond(c, 201, fiber.Map{"id": id})
	}
	state := c.Query("state", "active")
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 10000 || (state != "active" && state != "closed" && state != "all") {
		return fail(400, "Invalid review filter or page")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT r.id::text,r.student_id::text,trim(u.first_name||' '||u.last_name),r.resource_kind,r.resource_id::text,r.title,r.grade_summary,r.reason,r.status,r.version,r.created_at,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ev.id,'actor',ev.actor_name,'status',ev.status,'reason',ev.reason,'at',ev.created_at) ORDER BY ev.id) FROM classroom_recheck_events ev WHERE ev.request_id=r.id),'[]'::jsonb) FROM classroom_rechecks r JOIN users u ON u.id=r.student_id WHERE r.classroom_id=$1::uuid AND ($2='teacher' OR r.student_id=$3::uuid) AND ($4='all' OR ($4='active' AND r.status IN ('open','reviewing')) OR ($4='closed' AND r.status NOT IN ('open','reviewing'))) ORDER BY r.created_at DESC,r.id DESC LIMIT 51 OFFSET $5`, c.Params("id"), role, user, state, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, student, name, kind, resource, title, reason, status string
		var summary, events json.RawMessage
		var version int
		var at time.Time
		if err = rows.Scan(&id, &student, &name, &kind, &resource, &title, &summary, &reason, &status, &version, &at, &events); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "student_id": student, "student_name": name, "kind": kind, "resource_id": resource, "title": title, "grade": summary, "reason": reason, "status": status, "version": version, "created_at": at, "events": events})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(out) > 50 {
		out = out[:50]
		next = offset + 50
	}
	return respond(c, 200, fiber.Map{"items": out, "next_offset": next, "scope": role})
}
func recordRecheckEvent(ctx context.Context, tx pgx.Tx, id, actor, status, reason string) error {
	_, err := tx.Exec(ctx, `INSERT INTO classroom_recheck_events(request_id,actor_id,actor_name,status,reason) SELECT $1::uuid,id,trim(first_name||' '||last_name),$3,$4 FROM users WHERE id=$2::uuid`, id, actor, status, reason)
	return err
}
func (h *Handler) RespondRecheck(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if validID(c.Params("requestID")) != nil {
		return fail(400, "Invalid request")
	}
	var req struct {
		Status  string `json:"status"`
		Reason  string `json:"reason"`
		Version int    `json:"version"`
	}
	if c.BodyParser(&req) != nil || len([]rune(strings.TrimSpace(req.Reason))) < 10 || len([]rune(req.Reason)) > 2000 || req.Version < 1 {
		return fail(400, "Provide a response of 10–2000 characters")
	}
	if role == "teacher" {
		if req.Status != "reviewing" && req.Status != "resolved" && req.Status != "rejected" {
			return fail(400, "Choose reviewing, resolved or rejected")
		}
	} else if req.Status != "withdrawn" {
		return fail(403, "Students may only withdraw their own request")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var student, title string
	err = tx.QueryRow(c.UserContext(), `SELECT student_id::text,title FROM classroom_rechecks WHERE id=$1::uuid AND classroom_id=$2::uuid AND version=$3 AND status IN ('open','reviewing') AND ($4='teacher' OR student_id=$5::uuid) FOR UPDATE`, c.Params("requestID"), c.Params("id"), req.Version, role, user).Scan(&student, &title)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(409, "Request changed, is closed or is not available to you")
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `UPDATE classroom_rechecks SET status=$2,version=version+1,updated_at=now() WHERE id=$1::uuid`, c.Params("requestID"), req.Status); err != nil {
		return err
	}
	if err = recordRecheckEvent(c.UserContext(), tx, c.Params("requestID"), user, req.Status, strings.TrimSpace(req.Reason)); err != nil {
		return err
	}
	if role == "teacher" {
		if _, err = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,$3,'recheck',$4,$5,'results&review=1','student',$6::uuid)`, c.Params("id"), user, "recheck:"+c.Params("requestID")+":"+req.Status+":"+strconv.Itoa(req.Version+1), "Review update: "+title, req.Reason, student); err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
