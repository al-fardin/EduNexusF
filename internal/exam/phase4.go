package exam

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Phase 4 routes preserve existing exam endpoints and per-classroom membership checks.
func RegisterPhase4(g fiber.Router, h *Handler) {
	g.Put("/:examID/manage", h.EditExam)
	g.Post("/:examID/close", h.CloseExam)
	g.Get("/:examID/grades", h.Grades)
	g.Put("/:examID/grades/:attemptID", h.SetGrade)
	g.Post("/:examID/results/publish", h.PublishExamResults)
	g.Post("/:examID/results/retract", h.RetractExamResults)
	g.Get("/:examID/results/me", h.MyResult)
	g.Get("/:examID/results/marksheet.pdf", h.MarksheetPDF)
	g.Get("/results/public", h.PublicResults)
	g.Post("/:examID/results/regenerate-marksheet", h.RegenerateMarksheet)
}

func (h *Handler) checkedTeacherExam(c *fiber.Ctx) (Exam, []Question, error) {
	if _, err := h.member(c, true); err != nil {
		return Exam{}, nil, err
	}
	return h.examWithKeys(c)
}

// Exam edit is fully available before the first student attempt; after that,
// changes to questions, schedule or duration would make existing attempts unfair.
func (h *Handler) EditExam(c *fiber.Ctx) error {
	e, _, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if e.Status == "closed" {
		return failure(c, 409, "closed exams cannot be edited")
	}
	var req CreateRequest
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid exam JSON")
	}
	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	if len(req.Title) < 3 || len(req.Title) > 200 || len(req.Description) > 5000 || req.DurationMinutes < 1 || req.DurationMinutes > 240 || req.StartsAt.IsZero() || !req.EndsAt.After(req.StartsAt) || req.EndsAt.Sub(req.StartsAt) > 30*24*time.Hour {
		return failure(c, 400, "invalid exam details")
	}
	raw, err := normalizeQuestions(req.Questions)
	if err != nil {
		return failure(c, 400, err.Error())
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_exams SET title=$3,description=$4,starts_at=$5,ends_at=$6,duration_minutes=$7,questions=$8::jsonb
        WHERE id=$1::uuid AND classroom_id=$2::uuid AND closed_at IS NULL
          AND NOT EXISTS(SELECT 1 FROM classroom_exam_attempts WHERE exam_id=$1::uuid)`, e.ID, c.Params("id"), req.Title, req.Description, req.StartsAt, req.EndsAt, req.DurationMinutes, raw)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return failure(c, 409, "exam already has student attempts; question/schedule editing is locked")
	}
	return result(c, 200, fiber.Map{"updated": true})
}

// Closing early prevents new joins and further answer updates because existing
// handlers already enforce ends_at on all student submissions.
func (h *Handler) CloseExam(c *fiber.Ctx) error {
	e, _, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if e.Status != "published" {
		return failure(c, 409, "only an open/published exam can be closed")
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_exams SET ends_at=CASE WHEN now() <= starts_at THEN starts_at + interval '1 second' ELSE LEAST(ends_at,now()) END,closed_at=now() WHERE id=$1::uuid AND classroom_id=$2::uuid AND closed_at IS NULL AND status='published'`, e.ID, c.Params("id"))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return failure(c, 409, "exam already closed")
	}
	return result(c, 200, fiber.Map{"closed": true})
}

type markRow struct {
	QuestionID string `json:"question_id"`
	Points     int    `json:"points"`
	Feedback   string `json:"feedback"`
	Grader     string `json:"grader"`
}

func (h *Handler) syncAutoMarks(c *fiber.Ctx, exam string, questions []Question) error {
	for _, q := range questions {
		if q.Kind != "mcq" || q.CorrectOption == nil {
			continue
		}
		_, err := h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_question_marks(attempt_id,question_id,awarded_points,feedback,grader_kind)
            SELECT a.id,$2::text, CASE WHEN a.answers->>$2::text=$3::text THEN $4::int ELSE 0 END,
            CASE WHEN a.answers->>$2::text=$3::text THEN 'Correct' ELSE 'Incorrect or unanswered' END,'auto'
            FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id
            WHERE a.exam_id=$1::uuid AND (a.status='submitted' OR a.expires_at <= now() OR e.ends_at <= now())
            ON CONFLICT(attempt_id,question_id) DO NOTHING`, exam, q.ID, strconv.Itoa(*q.CorrectOption), q.Points)
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) Grades(c *fiber.Ctx) error {
	e, qs, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if err = h.syncAutoMarks(c, e.ID, qs); err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT a.id::text, trim(u.first_name||' '||u.last_name),a.status,a.expires_at,a.answers,
        (p.attempt_id IS NOT NULL) AS published
        FROM classroom_exam_attempts a JOIN users u ON u.id=a.student_id
        LEFT JOIN classroom_exam_result_publications p ON p.attempt_id=a.id
        WHERE a.exam_id=$1::uuid ORDER BY u.first_name,u.last_name`, e.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	var attempts []fiber.Map = make([]fiber.Map, 0)
	type gradeAttempt struct {
		id, name, status string
		expired          time.Time
		answer           []byte
		published        bool
	}
	var records []gradeAttempt
	for rows.Next() {
		var a gradeAttempt
		if err = rows.Scan(&a.id, &a.name, &a.status, &a.expired, &a.answer, &a.published); err != nil {
			return err
		}
		records = append(records, a)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	rows.Close() // Release the pool connection before fetching question marks.
	for _, a := range records {
		markRows, qerr := h.db.Query(c.UserContext(), `SELECT question_id,awarded_points,feedback,grader_kind FROM classroom_exam_question_marks WHERE attempt_id=$1::uuid`, a.id)
		if qerr != nil {
			return qerr
		}
		marks := make([]markRow, 0)
		total := 0
		for markRows.Next() {
			var m markRow
			if qerr = markRows.Scan(&m.QuestionID, &m.Points, &m.Feedback, &m.Grader); qerr != nil {
				break
			}
			total += m.Points
			marks = append(marks, m)
		}
		if qerr == nil {
			qerr = markRows.Err()
		}
		markRows.Close()
		if qerr != nil {
			return qerr
		}
		var answers map[string]string
		if err = json.Unmarshal(a.answer, &answers); err != nil {
			return err
		}
		ready := true
		for _, q := range qs {
			if q.Kind == "mcq" {
				continue
			}
			answered := strings.TrimSpace(answers[q.ID]) != ""
			if !answered {
				continue
			}
			found := false
			for _, m := range marks {
				if m.QuestionID == q.ID {
					found = true
					break
				}
			}
			if !found {
				ready = false
				break
			}
		}
		attempts = append(attempts, fiber.Map{"id": a.id, "student_name": a.name, "status": a.status, "eligible": a.status == "submitted" || time.Now().After(a.expired) || time.Now().After(e.EndsAt), "ready": ready, "marks": marks, "answers": answers, "total": total, "published": a.published})
	}
	max := 0
	for _, q := range qs {
		max += q.Points
	}
	return result(c, 200, fiber.Map{"exam": e, "questions": qs, "attempts": attempts, "max_points": max})
}

type gradeInput struct {
	QuestionID string `json:"question_id"`
	Points     int    `json:"points"`
	Feedback   string `json:"feedback"`
}

func (h *Handler) SetGrade(c *fiber.Ctx) error {
	e, qs, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	attemptID := c.Params("attemptID")
	if _, err = uuid.Parse(attemptID); err != nil {
		return failure(c, 400, "invalid attempt id")
	}
	var req gradeInput
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid marks")
	}
	found := false
	max := 0
	for _, q := range qs {
		if q.ID == req.QuestionID {
			found = true
			max = q.Points
			break
		}
	}
	if !found || req.Points < 0 || req.Points > max || len(req.Feedback) > 5000 {
		return failure(c, 400, "invalid question, marks or feedback")
	}
	var eligible bool
	var published bool
	err = h.db.QueryRow(c.UserContext(), `SELECT (a.status='submitted' OR a.expires_at<=now() OR e.ends_at<=now()),
        EXISTS(SELECT 1 FROM classroom_exam_result_publications p WHERE p.attempt_id=a.id)
        FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id
        WHERE a.id=$1::uuid AND e.id=$2::uuid`, attemptID, e.ID).Scan(&eligible, &published)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 404, "attempt not found")
	}
	if err != nil {
		return err
	}
	if !eligible {
		return failure(c, 409, "attempt still in progress")
	}
	if published {
		return failure(c, 409, "retract this student's published result before editing marks")
	}
	grader, _ := identity(c)
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_question_marks(attempt_id,question_id,awarded_points,feedback,grader_kind,graded_by)
    VALUES($1::uuid,$2,$3,$4,'teacher',$5::uuid)
    ON CONFLICT(attempt_id,question_id) DO UPDATE SET awarded_points=EXCLUDED.awarded_points,feedback=EXCLUDED.feedback,grader_kind='teacher',graded_by=EXCLUDED.graded_by,updated_at=now()`, attemptID, req.QuestionID, req.Points, strings.TrimSpace(req.Feedback), grader)
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"saved": true})
}

type publicationInput struct {
	AttemptIDs []string `json:"attempt_ids"`
}

func (h *Handler) updateMarksheet(c *fiber.Ctx, tx pgx.Tx, examID, classID, teacher string) error {
	rows, err := tx.Query(c.UserContext(), `SELECT COALESCE(membership.student_roll,''), trim(u.first_name||' '||u.last_name), COALESCE(SUM(m.awarded_points),0)::int
      FROM classroom_exam_result_publications p
      JOIN classroom_exam_attempts a ON a.id=p.attempt_id
      JOIN classroom_exams ex ON ex.id=a.exam_id
      JOIN users u ON u.id=a.student_id
      LEFT JOIN classroom_memberships membership ON membership.classroom_id=ex.classroom_id AND membership.user_id=a.student_id AND membership.member_role='student'
      LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id
      WHERE a.exam_id=$1::uuid GROUP BY p.attempt_id, membership.student_roll, u.first_name, u.last_name
      ORDER BY COALESCE(membership.student_roll,'zzzzzz'), u.first_name, u.last_name`, examID)
	if err != nil {
		return err
	}
	records := make([]markSheetRow, 0)
	for rows.Next() {
		var r markSheetRow
		if err = rows.Scan(&r.Roll, &r.Name, &r.Marks); err != nil {
			rows.Close()
			return err
		}
		records = append(records, r)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(records) == 0 {
		_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_exam_marksheets WHERE exam_id=$1::uuid`, examID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(c.UserContext(), `UPDATE classroom_stream_posts SET deleted_at=now() WHERE classroom_id=$1::uuid AND reference_type='exam' AND reference_id=$2::uuid AND title LIKE 'Exam results:%' AND deleted_at IS NULL`, classID, examID)
		return err
	}
	var title, courseName, courseCode, teacherName string
	var raw []byte
	err = tx.QueryRow(c.UserContext(), `SELECT e.title,e.questions,cl.name,COALESCE(cl.course_code,''),COALESCE(trim(u.first_name||' '||u.last_name),'')
      FROM classroom_exams e JOIN classrooms cl ON cl.id=e.classroom_id
      LEFT JOIN users u ON u.id=cl.owner_id
      WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid`, examID, classID).Scan(&title, &raw, &courseName, &courseCode, &teacherName)
	if err != nil {
		return err
	}
	var qs []Question
	if err = jsonUnmarshalQuestions(raw, &qs); err != nil {
		return err
	}
	max := 0
	for _, q := range qs {
		max += q.Points
	}
	pdf := buildStyledMarksPDF(courseName, courseCode, teacherName, title, records, max)
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_marksheets(exam_id,pdf_bytes) VALUES($1::uuid,$2)
      ON CONFLICT(exam_id) DO UPDATE SET pdf_bytes=EXCLUDED.pdf_bytes,generated_at=now()`, examID, pdf)
	if err != nil {
		return err
	}
	var postID string
	err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_stream_posts WHERE classroom_id=$1::uuid AND reference_type='exam' AND reference_id=$2::uuid AND title LIKE 'Exam results:%' AND deleted_at IS NULL LIMIT 1`, classID, examID).Scan(&postID)
	content := fmt.Sprintf("Published marksheet: %s. %d student(s) published. Download the PDF below. Detailed answers and feedback remain private.", title, len(records))
	if errors.Is(err, pgx.ErrNoRows) {
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id)
    VALUES($1::uuid,$2::uuid,'exam',$3,$4,'exam',$5::uuid)`, classID, teacher, "Exam results: "+title, content, examID)
	} else if err == nil {
		_, err = tx.Exec(c.UserContext(), `UPDATE classroom_stream_posts SET content=$2,updated_at=now() WHERE id=$1::uuid`, postID, content)
	}
	return err
}

func jsonUnmarshalQuestions(data []byte, out *[]Question) error { return json.Unmarshal(data, out) }

func (h *Handler) publishOrRetract(c *fiber.Ctx, retract bool) error {
	e, qs, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if err = h.syncAutoMarks(c, e.ID, qs); err != nil {
		return err
	}
	var req publicationInput
	if len(c.Body()) > 0 {
		if err = c.BodyParser(&req); err != nil {
			return failure(c, 400, "invalid student ids")
		}
	}
	if len(req.AttemptIDs) > 300 {
		return failure(c, 400, "too many student ids")
	}
	user, _ := identity(c)
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	// Per-exam row lock serializes publish/retract + generated public PDF.
	var lockID string
	if err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_exams WHERE id=$1::uuid FOR UPDATE`, e.ID).Scan(&lockID); err != nil {
		return err
	}

	if len(req.AttemptIDs) == 0 {
		if retract {
			return failure(c, 400, "select published student(s) to retract")
		}
		rows, queryErr := tx.Query(c.UserContext(), `SELECT id::text FROM classroom_exam_attempts WHERE exam_id=$1::uuid`, e.ID)
		if queryErr != nil {
			return queryErr
		}
		for rows.Next() {
			var id string
			if queryErr = rows.Scan(&id); queryErr != nil {
				break
			}
			req.AttemptIDs = append(req.AttemptIDs, id)
		}
		if queryErr == nil {
			queryErr = rows.Err()
		}
		rows.Close()
		if queryErr != nil {
			return queryErr
		}
	}
	published := 0
	skipped := []string{}
	for _, aid := range req.AttemptIDs {
		if _, parseErr := uuid.Parse(aid); parseErr != nil {
			return failure(c, 400, "invalid student attempt id")
		}
		var status string
		var expires time.Time
		var publishedAlready bool
		err = tx.QueryRow(c.UserContext(), `SELECT a.status,a.expires_at,EXISTS(SELECT 1 FROM classroom_exam_result_publications WHERE attempt_id=a.id)
         FROM classroom_exam_attempts a WHERE a.id=$1::uuid AND a.exam_id=$2::uuid`, aid, e.ID).Scan(&status, &expires, &publishedAlready)
		if errors.Is(err, pgx.ErrNoRows) {
			return failure(c, 404, "attempt does not belong to this exam")
		}
		if err != nil {
			return err
		}
		if retract {
			_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_exam_result_publications WHERE attempt_id=$1::uuid`, aid)
			if err != nil {
				return err
			}
			published++
			continue
		}
		if publishedAlready {
			continue
		}
		if status != "submitted" && time.Now().Before(expires) && time.Now().Before(e.EndsAt) {
			skipped = append(skipped, aid+": still active")
			continue
		}
		// Do not publish ungraded written/coding answers (even if expired).
		var raw []byte
		err = tx.QueryRow(c.UserContext(), `SELECT answers FROM classroom_exam_attempts WHERE id=$1::uuid`, aid).Scan(&raw)
		if err != nil {
			return err
		}
		var answers map[string]string
		if err = json.Unmarshal(raw, &answers); err != nil {
			return err
		}
		incomplete := false
		for _, q := range qs {
			if q.Kind == "mcq" || strings.TrimSpace(answers[q.ID]) == "" {
				continue
			}
			var marked bool
			err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_question_marks WHERE attempt_id=$1::uuid AND question_id=$2)`, aid, q.ID).Scan(&marked)
			if err != nil {
				return err
			}
			if !marked {
				incomplete = true
				break
			}
		}
		if incomplete {
			skipped = append(skipped, aid+": needs manual grading")
			continue
		}
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_result_publications(attempt_id,published_by)
         VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, aid, user)
		if err != nil {
			return err
		}
		published++
	}
	if err = h.updateMarksheet(c, tx, e.ID, c.Params("id"), user); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"processed": published, "skipped": skipped})
}
func (h *Handler) PublishExamResults(c *fiber.Ctx) error { return h.publishOrRetract(c, false) }
func (h *Handler) RetractExamResults(c *fiber.Ctx) error { return h.publishOrRetract(c, true) }

func (h *Handler) PublicResults(c *fiber.Ctx) error {
	if _, err := h.member(c, false); err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT e.id::text,e.title,a.id::text,trim(u.first_name||' '||u.last_name),COALESCE(membership.student_roll,''),
      COALESCE(SUM(m.awarded_points),0)::int,p.published_at,e.questions
      FROM classroom_exam_result_publications p JOIN classroom_exam_attempts a ON a.id=p.attempt_id
      JOIN classroom_exams e ON e.id=a.exam_id JOIN users u ON u.id=a.student_id
      LEFT JOIN classroom_memberships membership ON membership.classroom_id=e.classroom_id AND membership.user_id=a.student_id AND membership.member_role='student'
      LEFT JOIN classroom_exam_question_marks m ON m.attempt_id=a.id
      WHERE e.classroom_id=$1::uuid GROUP BY e.id,a.id,p.published_at,u.first_name,u.last_name,membership.student_roll
      ORDER BY e.starts_at DESC,u.first_name LIMIT 500`, c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var exam, title, attempt, name, roll string
		var total int
		var at time.Time
		var raw []byte
		if err = rows.Scan(&exam, &title, &attempt, &name, &roll, &total, &at, &raw); err != nil {
			return err
		}
		var qs []Question
		if err = json.Unmarshal(raw, &qs); err != nil {
			return err
		}
		max := 0
		for _, q := range qs {
			max += q.Points
		}
		out = append(out, fiber.Map{"exam_id": exam, "exam_title": title, "attempt_id": attempt, "student_name": name, "student_roll": roll, "total": total, "max_points": max, "published_at": at})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, 200, out)
}
func (h *Handler) MyResult(c *fiber.Ctx) error {
	role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return failure(c, 403, "student result only")
	}
	exam, err := examID(c)
	if err != nil {
		return err
	}
	user, _ := identity(c)
	var aid string
	var rawQ, rawAnswers []byte
	err = h.db.QueryRow(c.UserContext(), `SELECT a.id::text,e.questions,a.answers FROM classroom_exam_result_publications p
      JOIN classroom_exam_attempts a ON a.id=p.attempt_id JOIN classroom_exams e ON e.id=a.exam_id
      WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid AND a.student_id=$3::uuid`, exam, c.Params("id"), user).Scan(&aid, &rawQ, &rawAnswers)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 404, "result not published for you")
	}
	if err != nil {
		return err
	}
	var qs []Question
	var answers map[string]string
	if err = json.Unmarshal(rawQ, &qs); err != nil {
		return err
	}
	if err = json.Unmarshal(rawAnswers, &answers); err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT question_id,awarded_points,feedback FROM classroom_exam_question_marks WHERE attempt_id=$1::uuid`, aid)
	if err != nil {
		return err
	}
	marks := map[string]markRow{}
	for rows.Next() {
		var m markRow
		if err = rows.Scan(&m.QuestionID, &m.Points, &m.Feedback); err != nil {
			rows.Close()
			return err
		}
		marks[m.QuestionID] = m
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	detail := make([]fiber.Map, 0)
	total, max := 0, 0
	for _, q := range qs {
		m := marks[q.ID]
		total += m.Points
		max += q.Points
		detail = append(detail, fiber.Map{"question_id": q.ID, "prompt": q.Prompt, "kind": q.Kind, "awarded": m.Points, "maximum": q.Points, "answer": answers[q.ID], "feedback": m.Feedback})
	}
	return result(c, 200, fiber.Map{"total": total, "maximum": max, "questions": detail})
}
func (h *Handler) MarksheetPDF(c *fiber.Ctx) error {
	if _, err := h.member(c, false); err != nil {
		return err
	}
	exam, err := examID(c)
	if err != nil {
		return err
	}
	var pdf []byte
	err = h.db.QueryRow(c.UserContext(), `SELECT m.pdf_bytes FROM classroom_exam_marksheets m
      JOIN classroom_exams e ON e.id=m.exam_id WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid`, exam, c.Params("id")).Scan(&pdf)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 404, "published marksheet is not available")
	}
	if err != nil {
		return err
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `attachment; filename="exam-results.pdf"`)
	c.Set("Cache-Control", "private, no-store")
	return c.Status(200).Send(pdf)
}

// Small dependency-free PDF writer. Uses PDF core Helvetica; unsupported
// non-ASCII glyphs are replaced in the public sheet (not source records).
func buildSimplePDF(lines []string) []byte {
	clean := func(s string) string {
		var b strings.Builder
		for _, r := range s {
			if r < 32 || r > 126 {
				r = '?'
			}
			if r == '\\' || r == '(' || r == ')' {
				b.WriteByte('\\')
			}
			b.WriteRune(r)
		}
		return b.String()
	}
	perPage := 43
	pageCount := int(math.Ceil(float64(len(lines)) / float64(perPage)))
	if pageCount < 1 {
		pageCount = 1
	}
	objects := make([]string, 0, 3+2*pageCount)
	objects = append(objects, "<< /Type /Catalog /Pages 2 0 R >>")
	kids := make([]string, 0, pageCount)
	for i := 0; i < pageCount; i++ {
		kids = append(kids, fmt.Sprintf("%d 0 R", 4+2*i))
	}
	objects = append(objects, fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>", strings.Join(kids, " "), pageCount))
	objects = append(objects, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
	for p := 0; p < pageCount; p++ {
		start := p * perPage
		end := start + perPage
		if end > len(lines) {
			end = len(lines)
		}
		var content strings.Builder
		content.WriteString("BT /F1 11 Tf 50 784 Td 14 TL ")
		for _, line := range lines[start:end] {
			content.WriteString("(" + clean(line) + ") Tj T* ")
		}
		content.WriteString("ET")
		stream := content.String()
		pageObj := fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>", 5+2*p)
		objects = append(objects, pageObj)
		objects = append(objects, fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(stream), stream))
	}
	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")
	positions := []int{0}
	for i, obj := range objects {
		positions = append(positions, buf.Len())
		fmt.Fprintf(&buf, "%d 0 obj\n%s\nendobj\n", i+1, obj)
	}
	xref := buf.Len()
	fmt.Fprintf(&buf, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for _, off := range positions[1:] {
		fmt.Fprintf(&buf, "%010d 00000 n \n", off)
	}
	fmt.Fprintf(&buf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objects)+1, xref)
	return buf.Bytes()
}

// Regenerate existing public PDF after updating classroom course code or display metadata.
func (h *Handler) RegenerateMarksheet(c *fiber.Ctx) error {
	e, _, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	teacher, err := identity(c)
	if err != nil {
		return err
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var locked string
	if err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_exams WHERE id=$1::uuid FOR UPDATE`, e.ID).Scan(&locked); err != nil {
		return err
	}
	if err = h.updateMarksheet(c, tx, e.ID, c.Params("id"), teacher); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"regenerated": true})
}
