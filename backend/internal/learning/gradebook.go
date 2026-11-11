package learning

import (
	"github.com/gofiber/fiber/v2"
	"time"
)

type gradeColumn struct {
	ID      string    `json:"id"`
	Kind    string    `json:"kind"`
	Title   string    `json:"title"`
	Maximum int       `json:"maximum"`
	Due     time.Time `json:"due_at"`
}
type gradeCell struct {
	Score     *int   `json:"score"`
	Status    string `json:"status"`
	Published bool   `json:"published"`
	Version   int    `json:"version"`
	Late      bool   `json:"late"`
}
type gradeStudent struct {
	ID           string               `json:"id"`
	Name         string               `json:"name"`
	Roll         string               `json:"roll"`
	Cells        map[string]gradeCell `json:"cells"`
	Missing      int                  `json:"missing"`
	NeedsGrading int                  `json:"needs_grading"`
}

func (h *Handler) Gradebook(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	ctx := c.UserContext()
	class := c.Params("id")
	columns := make([]gradeColumn, 0)
	rows, err := h.db.Query(ctx, `SELECT id::text,kind,title,maximum,due_at FROM (
 SELECT id,'assignment' kind,title,max_points maximum,due_at FROM classroom_assignments WHERE classroom_id=$1::uuid AND status='published'
 UNION ALL SELECT id,'exam',title,(SELECT COALESCE(sum((q->>'points')::int),0)::int FROM jsonb_array_elements(questions) q),ends_at FROM classroom_exams WHERE classroom_id=$1::uuid AND status='published'
 ) work ORDER BY due_at,id LIMIT 201`, class)
	if err != nil {
		return err
	}
	for rows.Next() {
		var col gradeColumn
		if err = rows.Scan(&col.ID, &col.Kind, &col.Title, &col.Maximum, &col.Due); err != nil {
			rows.Close()
			return err
		}
		columns = append(columns, col)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(columns) > 200 {
		return fail(422, "Gradebook supports up to 200 published coursework items per class")
	}
	students := make([]gradeStudent, 0)
	positions := map[string]int{}
	rows, err = h.db.Query(ctx, `SELECT u.id::text,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,'') FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL ORDER BY m.student_roll NULLS LAST,u.first_name,u.last_name,u.id LIMIT 5001`, class)
	if err != nil {
		return err
	}
	for rows.Next() {
		var s gradeStudent
		if err = rows.Scan(&s.ID, &s.Name, &s.Roll); err != nil {
			rows.Close()
			return err
		}
		s.Cells = map[string]gradeCell{}
		positions[s.ID] = len(students)
		students = append(students, s)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(students) > 5000 {
		return fail(422, "Gradebook supports up to 5000 active students per class")
	}
	rows, err = h.db.Query(ctx, `SELECT DISTINCT ON(s.assignment_id,s.student_id) s.assignment_id::text,s.student_id::text,s.awarded_points,s.version,s.submitted_at>a.due_at FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND a.status='published' ORDER BY s.assignment_id,s.student_id,s.version DESC`, class)
	if err != nil {
		return err
	}
	for rows.Next() {
		var assignment, student string
		var cell gradeCell
		if err = rows.Scan(&assignment, &student, &cell.Score, &cell.Version, &cell.Late); err != nil {
			rows.Close()
			return err
		}
		if index, ok := positions[student]; ok {
			cell.Published = cell.Score != nil
			cell.Status = "needs_grading"
			if cell.Score != nil {
				cell.Status = "graded"
			}
			students[index].Cells["assignment:"+assignment] = cell
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	rows, err = h.db.Query(ctx, `SELECT a.exam_id::text,a.student_id::text,
 (a.status='submitted' OR a.expires_at<=now() OR e.ends_at<=now()),p.attempt_id IS NOT NULL,
 COALESCE(sum(COALESCE(m.awarded_points,CASE WHEN q->>'kind'='mcq' THEN CASE WHEN a.answers->>(q->>'id')=q->>'correct_option' THEN (q->>'points')::int ELSE 0 END WHEN trim(COALESCE(a.answers->>(q->>'id'),''))='' THEN 0 END)),0)::int,
 bool_and(q->>'kind'='mcq' OR m.awarded_points IS NOT NULL OR trim(COALESCE(a.answers->>(q->>'id'),''))='')
 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id CROSS JOIN LATERAL jsonb_array_elements(e.questions) q
 LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id AND m.question_id=q->>'id'
 LEFT JOIN classroom_exam_result_publications p ON p.attempt_id=a.id
 WHERE e.classroom_id=$1::uuid AND e.status='published' GROUP BY a.id,e.id,p.attempt_id`, class)
	if err != nil {
		return err
	}
	for rows.Next() {
		var exam, student string
		var completed, ready, published bool
		var score int
		if err = rows.Scan(&exam, &student, &completed, &published, &score, &ready); err != nil {
			rows.Close()
			return err
		}
		if index, ok := positions[student]; ok {
			cell := gradeCell{Status: "in_progress", Published: published}
			if completed {
				cell.Status = "needs_grading"
				if ready {
					cell.Score = &score
					cell.Status = "graded"
				}
			}
			students[index].Cells["exam:"+exam] = cell
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	now := time.Now()
	for i := range students {
		for _, col := range columns {
			key := col.Kind + ":" + col.ID
			cell, ok := students[i].Cells[key]
			if !ok {
				cell.Status = "pending"
				if now.After(col.Due) {
					cell.Status = "missing"
				}
			}
			if cell.Status == "missing" {
				students[i].Missing++
			}
			if cell.Status == "needs_grading" {
				students[i].NeedsGrading++
			}
			students[i].Cells[key] = cell
		}
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"columns": columns, "students": students, "generated_at": now})
}
