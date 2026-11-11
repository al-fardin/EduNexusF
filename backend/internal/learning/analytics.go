package learning

import (
	"github.com/gofiber/fiber/v2"
	"time"
)

// Read-only projections. Student queries require publication and student ownership.
func (h *Handler) Analytics(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	var students, exams, assignments int
	err = h.db.QueryRow(c.UserContext(), `SELECT (SELECT count(*) FROM classroom_memberships WHERE classroom_id=$1::uuid AND member_role='student' AND status='active'),(SELECT count(*) FROM classroom_exams WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published')),(SELECT count(*) FROM classroom_assignments WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published'))`, c.Params("id"), role).Scan(&students, &exams, &assignments)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `WITH question_scores AS(
 SELECT e.id,e.title,e.starts_at,a.id attempt_id,a.student_id,q->>'id' question_id,q->>'kind' kind,COALESCE(NULLIF(q->>'topic',''),'General') topic,q->>'prompt' prompt,(q->>'points')::int maximum,
 CASE WHEN m.awarded_points IS NOT NULL THEN m.awarded_points WHEN q->>'kind'='mcq' THEN CASE WHEN a.answers->>(q->>'id')=q->>'correct_option' THEN (q->>'points')::int ELSE 0 END ELSE NULL END awarded
 FROM classroom_exams e JOIN classroom_exam_attempts a ON a.exam_id=e.id CROSS JOIN LATERAL jsonb_array_elements(e.questions) q
 LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id AND m.question_id=q->>'id'
 LEFT JOIN classroom_exam_result_publications p ON p.attempt_id=a.id
 WHERE e.classroom_id=$1::uuid AND (a.status='submitted' OR a.expires_at<now() OR e.ends_at<now())
 AND ($2='teacher' OR (a.student_id=$3::uuid AND p.attempt_id IS NOT NULL))
 ) SELECT id::text,title,question_id,kind,topic,prompt,maximum,count(*)::int,count(awarded)::int,avg(awarded)::float8
 FROM question_scores GROUP BY id,title,question_id,kind,topic,prompt,maximum ORDER BY title,question_id LIMIT 2000`, c.Params("id"), role, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	questions := make([]fiber.Map, 0)
	var earned, max float64
	gradedCount := 0
	for rows.Next() {
		var exam, title, id, kind, topic, prompt string
		var maximum, attempts, graded int
		var avg *float64
		if err = rows.Scan(&exam, &title, &id, &kind, &topic, &prompt, &maximum, &attempts, &graded, &avg); err != nil {
			return err
		}
		var percent *float64
		if avg != nil {
			v := 100 * (*avg) / float64(maximum)
			percent = &v
			earned += (*avg) * float64(graded)
			max += float64(maximum * graded)
			gradedCount += graded
		}
		questions = append(questions, fiber.Map{"exam_id": exam, "exam_title": title, "question_id": id, "kind": kind, "topic": topic, "prompt": prompt, "maximum": maximum, "attempts": attempts, "graded": graded, "average": avg, "percent": percent})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	rows.Close()
	trendRows, err := h.db.Query(c.UserContext(), `WITH exam_scores AS(
 SELECT e.id,e.title,e.starts_at at,a.id attempt_id,sum((q->>'points')::int) maximum,
 sum(COALESCE(m.awarded_points,CASE WHEN q->>'kind'='mcq' THEN CASE WHEN a.answers->>(q->>'id')=q->>'correct_option' THEN (q->>'points')::int ELSE 0 END END)) score,
 count(*)=count(COALESCE(m.awarded_points,CASE WHEN q->>'kind'='mcq' THEN 0 END)) complete
 FROM classroom_exams e JOIN classroom_exam_attempts a ON a.exam_id=e.id CROSS JOIN LATERAL jsonb_array_elements(e.questions)q
 LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id AND m.question_id=q->>'id'
 LEFT JOIN classroom_exam_result_publications p ON p.attempt_id=a.id
 WHERE e.classroom_id=$1::uuid AND (a.status='submitted' OR a.expires_at<now() OR e.ends_at<now()) AND ($2='teacher' OR (a.student_id=$3::uuid AND p.attempt_id IS NOT NULL)) GROUP BY e.id,a.id
 )SELECT title,at,count(*)::int,avg(100.0*score/NULLIF(maximum,0))::float8 FROM exam_scores WHERE complete GROUP BY id,title,at ORDER BY at LIMIT 100`, c.Params("id"), role, user)
	if err != nil {
		return err
	}
	defer trendRows.Close()
	trend := make([]fiber.Map, 0)
	for trendRows.Next() {
		var title string
		var at time.Time
		var count int
		var percent *float64
		if err = trendRows.Scan(&title, &at, &count, &percent); err != nil {
			return err
		}
		trend = append(trend, fiber.Map{"title": title, "at": at, "attempts": count, "percent": percent})
	}
	if err = trendRows.Err(); err != nil {
		return err
	}
	trendRows.Close()
	var submitted, gradedAssignments int
	var assignmentPercent *float64
	err = h.db.QueryRow(c.UserContext(), `WITH latest AS(SELECT DISTINCT ON(s.assignment_id,s.student_id) s.assignment_id,s.student_id,s.awarded_points,a.max_points FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND ($2='teacher' OR (a.status='published' AND s.student_id=$3::uuid)) ORDER BY s.assignment_id,s.student_id,s.version DESC)
 SELECT count(*)::int,count(awarded_points)::int,avg(100.0*awarded_points/max_points)::float8 FROM latest`, c.Params("id"), role, user).Scan(&submitted, &gradedAssignments, &assignmentPercent)
	if err != nil {
		return err
	}
	var examPercent *float64
	if max > 0 {
		v := 100 * earned / max
		examPercent = &v
	}
	return respond(c, 200, fiber.Map{"scope": role, "students": students, "exams": exams, "assignments": assignments, "graded_question_responses": gradedCount, "exam_percent": examPercent, "assignment_submissions": submitted, "graded_assignments": gradedAssignments, "assignment_percent": assignmentPercent, "questions": questions, "trend": trend})
}
