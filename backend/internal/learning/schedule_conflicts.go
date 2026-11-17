package learning

import (
	"encoding/json"
	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/gofiber/fiber/v2"
	"time"
)

// This is advisory. Only classes the actor teaches are examined; it never
// reveals other teachers' private coursework or changes a publication decision.
func (h *Handler) ScheduleConflicts(c *fiber.Ctx) error {
	actor, _, e := h.member(c, true)
	if e != nil {
		return e
	}
	var req struct {
		Kind     string         `json:"kind"`
		Start    time.Time      `json:"starts_at"`
		End      time.Time      `json:"ends_at"`
		Due      time.Time      `json:"due_at"`
		ID       string         `json:"resource_id"`
		Audience *audience.Rule `json:"audience"`
	}
	if c.BodyParser(&req) != nil || (req.Kind != "exam" && req.Kind != "assignment") || req.ID != "" && validID(req.ID) != nil {
		return fail(400, "Invalid schedule check")
	}
	if req.Kind == "assignment" {
		req.Start = req.Due
		req.End = req.Due
	}
	if req.Start.IsZero() || req.End.Before(req.Start) || req.Kind == "exam" && !req.End.After(req.Start) || req.End.Sub(req.Start) > 30*24*time.Hour {
		return fail(400, "Choose a valid exam window or assignment deadline")
	}
	raw, e := audience.Encode(req.Audience)
	if e != nil {
		return fail(400, e.Error())
	}
	var valid bool
	e = h.db.QueryRow(c.UserContext(), `SELECT NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE($2::jsonb->'section_ids','[]'::jsonb)) s WHERE NOT EXISTS(SELECT 1 FROM classroom_sections WHERE classroom_id=$1::uuid AND id=s::uuid))`, c.Params("id"), raw).Scan(&valid)
	if e != nil {
		return e
	}
	if !valid {
		return fail(400, "Select sections from this class")
	}
	if req.ID != "" {
		e = h.db.QueryRow(c.UserContext(), `SELECT CASE WHEN $3='exam' THEN EXISTS(SELECT 1 FROM classroom_exams WHERE classroom_id=$1::uuid AND id=$2::uuid) ELSE EXISTS(SELECT 1 FROM classroom_assignments WHERE classroom_id=$1::uuid AND id=$2::uuid) END`, c.Params("id"), req.ID, req.Kind).Scan(&valid)
		if e != nil {
			return e
		}
		if !valid {
			return fail(400, "The current item belongs to another class")
		}
	}
	// Candidate dates use class schedules. Per-student extensions are not silently
	// substituted for a teacher's proposed dates. Results are bounded and explicit.
	rows, e := h.db.Query(c.UserContext(), `WITH access AS(
 SELECT cl.id,cl.name FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$1::uuid LEFT JOIN classroom_staff_permissions sp ON sp.classroom_id=cl.id AND sp.user_id=m.user_id WHERE cl.status='active' AND cl.deleted_at IS NULL AND m.status='active' AND m.member_role='teacher' AND(cl.owner_id=$1::uuid OR sp.user_id IS NULL OR COALESCE((sp.permissions->>'coursework')::boolean,false))
 ),target AS MATERIALIZED(
 SELECT m.user_id FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$5::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL AND edunexus_audience_matches($6::jsonb,m.student_roll,m.section_id)
 ),candidates AS(
 SELECT e.id,e.classroom_id,'exam'::text kind,e.title,e.starts_at at,e.ends_at,cl.name classroom_name,e.audience FROM classroom_exams e JOIN access cl ON cl.id=e.classroom_id WHERE e.closed_at IS NULL AND(e.status='published' OR(e.status='draft' AND EXISTS(SELECT 1 FROM classroom_content_schedules s WHERE s.exam_id=e.id AND s.state='scheduled'))) AND e.ends_at>$2::timestamptz-interval '24 hours' AND e.starts_at<$3::timestamptz+interval '24 hours'
 UNION ALL SELECT a.id,a.classroom_id,'assignment',a.title,a.due_at,a.due_at,cl.name,a.audience FROM classroom_assignments a JOIN access cl ON cl.id=a.classroom_id WHERE(a.status='published' OR(a.status='draft' AND EXISTS(SELECT 1 FROM classroom_content_schedules s WHERE s.assignment_id=a.id AND s.state='scheduled'))) AND a.due_at BETWEEN $2::timestamptz-interval '24 hours' AND $3::timestamptz+interval '24 hours'
 ),bounded AS(SELECT * FROM candidates WHERE id<>COALESCE(NULLIF($7,'')::uuid,'00000000-0000-0000-0000-000000000000'::uuid) AND($4='assignment' OR kind='assignment' OR(ends_at>$2 AND at<$3)) ORDER BY at,kind,id LIMIT 101)
 SELECT b.id::text,b.classroom_id::text,b.kind,b.title,b.at,b.ends_at,b.classroom_name,
 (SELECT count(*)::int FROM target JOIN classroom_memberships other ON other.user_id=target.user_id AND other.classroom_id=b.classroom_id WHERE other.member_role='student' AND other.status='active' AND(edunexus_audience_matches(b.audience,other.student_roll,other.section_id) OR(b.kind='exam' AND EXISTS(SELECT 1 FROM classroom_exam_attempts WHERE exam_id=b.id AND student_id=target.user_id)) OR(b.kind='assignment' AND EXISTS(SELECT 1 FROM classroom_assignment_submissions WHERE assignment_id=b.id AND student_id=target.user_id)))) FROM bounded b ORDER BY b.at,b.kind,b.id`, actor, req.Start, req.End, req.Kind, c.Params("id"), raw, req.ID)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, class, kind, title, name string
		var start, end time.Time
		var shared int
		if e = rows.Scan(&id, &class, &kind, &title, &start, &end, &name, &shared); e != nil {
			return e
		}
		warning := "Nearby deadline"
		if req.Kind == "exam" && kind == "exam" {
			warning = "Overlapping exams"
		} else if kind == "exam" {
			warning = "Deadline near an exam"
		}
		items = append(items, fiber.Map{"id": id, "classroom_id": class, "kind": kind, "title": title, "classroom_name": name, "starts_at": start, "ends_at": end, "shared_students": shared, "warning": warning})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	truncated := len(items) > 100
	if truncated {
		items = items[:100]
	}
	c.Set("Cache-Control", "no-store")
	// Keep the normalized selection in the response for an inspectable preview.
	return respond(c, 200, fiber.Map{"items": items, "truncated": truncated, "audience": json.RawMessage(raw)})
}
