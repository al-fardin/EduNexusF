package learning

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"time"
)

func (h *Handler) Progress(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	student := c.Query("student")
	if role != "teacher" {
		if student != "" && student != user {
			return fail(403, "Your own progress only")
		}
		student = user
	}
	if student != "" && validID(student) != nil {
		return fail(400, "Invalid student")
	}
	out, err := h.buildProgress(c.UserContext(), c.Params("id"), student, role)
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"scope": role, "students": out})
}
func (h *Handler) buildProgress(ctx context.Context, class, student, role string) ([]fiber.Map, error) {
	rows, err := h.db.Query(ctx, `WITH roster AS (
 SELECT u.id,trim(u.first_name||' '||u.last_name) name,COALESCE(m.student_roll,'') roll FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL AND ($2='' OR u.id=NULLIF($2,'')::uuid)
 ), latest AS (
 SELECT DISTINCT ON(s.assignment_id,s.student_id) s.student_id,s.assignment_id,s.awarded_points,s.submitted_at,a.title,a.max_points FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id JOIN roster r ON r.id=s.student_id WHERE a.classroom_id=$1::uuid AND a.status='published' ORDER BY s.assignment_id,s.student_id,s.version DESC
 ), exam_scores AS (
 SELECT at.student_id,e.id,e.title,e.ends_at,COALESCE(sum(COALESCE(m.awarded_points,CASE WHEN q->>'kind'='mcq' THEN CASE WHEN at.answers->>(q->>'id')=q->>'correct_option' THEN (q->>'points')::int ELSE 0 END WHEN trim(COALESCE(at.answers->>(q->>'id'),''))='' THEN 0 END)),0)::int score,sum((q->>'points')::int)::int maximum,
 bool_and(q->>'kind'='mcq' OR m.awarded_points IS NOT NULL OR trim(COALESCE(at.answers->>(q->>'id'),''))='') complete
 FROM classroom_exam_attempts at JOIN roster r ON r.id=at.student_id JOIN classroom_exams e ON e.id=at.exam_id CROSS JOIN LATERAL jsonb_array_elements(e.questions) q
 LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=at.id AND m.question_id=q->>'id' LEFT JOIN classroom_exam_result_publications p ON p.attempt_id=at.id
 WHERE e.classroom_id=$1::uuid AND e.status='published' AND (at.status='submitted' OR at.expires_at<=now() OR e.ends_at<=now()) AND ($3='teacher' OR p.attempt_id IS NOT NULL) GROUP BY at.id,e.id
 ), scores AS (
 SELECT student_id,assignment_id id,'assignment'::text kind,title,submitted_at at,awarded_points score,max_points maximum FROM latest WHERE awarded_points IS NOT NULL
 UNION ALL SELECT student_id,id,'exam',title,ends_at,score,maximum FROM exam_scores WHERE complete
 ), aggregate_scores AS (SELECT student_id,avg(100.0*score/NULLIF(maximum,0))::float8 percent,count(*)::int graded FROM scores GROUP BY student_id),
 attendance AS (SELECT a.student_id,count(*) FILTER(WHERE status='present')::int present,count(*) FILTER(WHERE status IN ('present','absent'))::int total,count(*) FILTER(WHERE status='excused')::int excused FROM classroom_attendance a JOIN roster r ON r.id=a.student_id WHERE a.classroom_id=$1::uuid GROUP BY a.student_id)
 SELECT r.id::text,r.name,r.roll,s.percent,COALESCE(s.graded,0),
 (SELECT count(*)::int FROM classroom_assignments a WHERE a.classroom_id=$1::uuid AND a.status='published' AND a.due_at<now() AND NOT EXISTS(SELECT 1 FROM latest l WHERE l.assignment_id=a.id AND l.student_id=r.id))+
 (SELECT count(*)::int FROM classroom_exams e WHERE e.classroom_id=$1::uuid AND e.status='published' AND e.ends_at<now() AND NOT EXISTS(SELECT 1 FROM classroom_exam_attempts at WHERE at.exam_id=e.id AND at.student_id=r.id)),
 COALESCE(att.present,0),COALESCE(att.total,0),COALESCE(att.excused,0),
 CASE WHEN $2<>'' THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'kind',kind,'title',title,'at',at,'score',score,'maximum',maximum) ORDER BY at) FROM scores WHERE student_id=r.id),'[]'::jsonb) ELSE '[]'::jsonb END
 FROM roster r LEFT JOIN aggregate_scores s ON s.student_id=r.id LEFT JOIN attendance att ON att.student_id=r.id ORDER BY r.roll,r.name,r.id LIMIT 5001`, class, student, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name, roll string
		var percent *float64
		var graded, missing, present, total, excused int
		var trend any
		if err = rows.Scan(&id, &name, &roll, &percent, &graded, &missing, &present, &total, &excused, &trend); err != nil {
			return nil, err
		}
		out = append(out, fiber.Map{"id": id, "name": name, "roll": roll, "percent": percent, "graded": graded, "missing": missing, "present": present, "attendance_total": total, "excused": excused, "trend": trend})
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if len(out) > 5000 {
		return nil, fail(422, "Progress supports up to 5000 active students per class")
	}
	return out, nil
}
func (h *Handler) Attendance(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	day, err := time.Parse("2006-01-02", c.Query("day"))
	if err != nil || day.Format("2006-01-02") > time.Now().In(time.FixedZone("Asia/Dhaka", 6*60*60)).Format("2006-01-02") {
		return fail(400, "Choose an attendance date up to today")
	}
	if c.Method() == "GET" {
		rows, err := h.db.Query(c.UserContext(), `SELECT m.user_id::text,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,''),COALESCE(a.status,'') FROM classroom_memberships m JOIN users u ON u.id=m.user_id LEFT JOIN classroom_attendance a ON a.classroom_id=m.classroom_id AND a.student_id=m.user_id AND a.day=$2 WHERE m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL ORDER BY m.student_roll,u.first_name,u.id LIMIT 501`, c.Params("id"), day)
		if err != nil {
			return err
		}
		defer rows.Close()
		out := make([]fiber.Map, 0)
		for rows.Next() {
			var id, name, roll, status string
			if err = rows.Scan(&id, &name, &roll, &status); err != nil {
				return err
			}
			out = append(out, fiber.Map{"id": id, "name": name, "roll": roll, "status": status})
		}
		if err = rows.Err(); err != nil {
			return err
		}
		if len(out) > 500 {
			return fail(422, "Attendance entry supports up to 500 students")
		}
		return respond(c, 200, out)
	}
	var req struct {
		Rows []struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"rows"`
	}
	if c.BodyParser(&req) != nil || len(req.Rows) < 1 || len(req.Rows) > 500 {
		return fail(400, "Provide 1–500 attendance entries")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	seen := map[string]bool{}
	for _, r := range req.Rows {
		if validID(r.ID) != nil || seen[r.ID] || (r.Status != "present" && r.Status != "absent" && r.Status != "excused") {
			return fail(400, "Invalid or repeated attendance entry")
		}
		seen[r.ID] = true
		tag, err := tx.Exec(c.UserContext(), `INSERT INTO classroom_attendance(classroom_id,student_id,day,status,marked_by) SELECT classroom_id,user_id,$3,$4,$5::uuid FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active' AND member_role='student' ON CONFLICT(classroom_id,student_id,day) DO UPDATE SET status=excluded.status,marked_by=excluded.marked_by,updated_at=now()`, c.Params("id"), r.ID, day, r.Status, actor)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "Student membership changed. Reload the roster")
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": len(req.Rows)})
}
