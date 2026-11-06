package learning

import (
	"encoding/json"
	"errors"
	"github.com/edunexus/edunexus/internal/activity"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"io"
	"mime"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Assignment struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Instructions  string    `json:"instructions"`
	DueAt         time.Time `json:"due_at"`
	MaxPoints     int       `json:"max_points"`
	AllowLate     bool      `json:"allow_late"`
	AllowResubmit bool      `json:"allow_resubmit"`
	Status        string    `json:"status"`
	Reason        string    `json:"reason,omitempty"`
}

func validAssignment(a Assignment) error {
	if len(strings.TrimSpace(a.Title)) < 3 || len(a.Title) > 200 || len(a.Instructions) > 20000 || a.DueAt.IsZero() || a.MaxPoints < 1 || a.MaxPoints > 1000 {
		return fail(400, "provide a title, due date and 1-1000 points")
	}
	return nil
}
func (h *Handler) ListAssignments(c *fiber.Ctx) error {
	_, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,title,instructions,due_at,max_points,allow_late,allow_resubmit,status FROM classroom_assignments WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published') ORDER BY due_at DESC LIMIT 200`, c.Params("id"), role)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]Assignment, 0)
	for rows.Next() {
		var a Assignment
		if err = rows.Scan(&a.ID, &a.Title, &a.Instructions, &a.DueAt, &a.MaxPoints, &a.AllowLate, &a.AllowResubmit, &a.Status); err != nil {
			return err
		}
		out = append(out, a)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, out)
}
func (h *Handler) SaveAssignment(c *fiber.Ctx) error {
	user, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	var a Assignment
	if err = c.BodyParser(&a); err != nil {
		return fail(400, "invalid assignment")
	}
	if err = validAssignment(a); err != nil {
		return err
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = activity.SetActor(c.UserContext(), tx, user, a.Reason); err != nil {
		return err
	}
	if c.Params("assignmentID") == "" {
		err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_assignments(classroom_id,created_by,title,instructions,due_at,max_points,allow_late,allow_resubmit) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8) RETURNING id::text`, c.Params("id"), user, strings.TrimSpace(a.Title), a.Instructions, a.DueAt, a.MaxPoints, a.AllowLate, a.AllowResubmit).Scan(&a.ID)
	} else {
		if err = validID(c.Params("assignmentID")); err != nil {
			return err
		}
		a.ID = c.Params("assignmentID")
		if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, a.ID, c.Params("id")); err != nil {
			return err
		}
		tag, e := tx.Exec(c.UserContext(), `UPDATE classroom_assignments SET title=$3,instructions=$4,due_at=$5,max_points=$6,allow_late=$7,allow_resubmit=$8 WHERE id=$1::uuid AND classroom_id=$2::uuid AND NOT EXISTS(SELECT 1 FROM classroom_assignment_submissions WHERE assignment_id=$1::uuid)`, a.ID, c.Params("id"), strings.TrimSpace(a.Title), a.Instructions, a.DueAt, a.MaxPoints, a.AllowLate, a.AllowResubmit)
		err = e
		if err == nil && tag.RowsAffected() == 0 {
			return fail(409, "assignment is unavailable or already has submissions")
		}
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"id": a.ID})
}
func (h *Handler) PublishAssignment(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if err := validID(c.Params("assignmentID")); err != nil {
		return err
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_assignments SET status='published' WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='draft'`, c.Params("assignmentID"), c.Params("id"))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "assignment is unavailable or already published")
	}
	return respond(c, 200, fiber.Map{"published": true})
}

var assignmentExt = map[string]bool{".pdf": true, ".txt": true, ".md": true, ".zip": true, ".docx": true, ".png": true, ".jpg": true, ".jpeg": true, ".py": true, ".cpp": true, ".c": true, ".h": true, ".java": true, ".js": true, ".ts": true, ".go": true, ".rs": true}

func assignmentFileName(name string) (string, error) {
	name = filepath.Base(name)
	if len(name) > 180 || strings.ContainsAny(name, "\\/\r\n\x00") || !assignmentExt[strings.ToLower(filepath.Ext(name))] {
		return "", fail(400, "unsupported submission file; use a document, image, source file or ZIP")
	}
	return name, nil
}
func (h *Handler) SubmitAssignment(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return fail(403, "students only")
	}
	if err = validID(c.Params("assignmentID")); err != nil {
		return err
	}
	requestID := c.FormValue("request_id")
	if err = validID(requestID); err != nil {
		return err
	}
	answer := strings.TrimSpace(c.FormValue("answer"))
	if len(answer) > 20000 {
		return fail(400, "answer exceeds 20000 bytes")
	}
	var bytes []byte
	name := ""
	if file, e := c.FormFile("file"); e == nil {
		if file.Size < 1 || file.Size > 15*1024*1024 {
			return fail(413, "file limit is 15 MB")
		}
		name, err = assignmentFileName(file.Filename)
		if err != nil {
			return err
		}
		reader, e := file.Open()
		if e != nil {
			return e
		}
		bytes, err = io.ReadAll(io.LimitReader(reader, 15*1024*1024+1))
		reader.Close()
		if err != nil {
			return err
		}
		if len(bytes) > 15*1024*1024 {
			return fail(413, "file limit is 15 MB")
		}
	}
	if answer == "" && len(bytes) == 0 {
		return fail(400, "provide an answer or file")
	}
	expected, err := strconv.Atoi(c.FormValue("expected_version", "0"))
	if err != nil || expected < 0 {
		return fail(400, "invalid submission version")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var due time.Time
	var late, resubmit bool
	err = tx.QueryRow(c.UserContext(), `SELECT due_at,allow_late,allow_resubmit FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='published' FOR UPDATE`, c.Params("assignmentID"), c.Params("id")).Scan(&due, &late, &resubmit)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "assignment not found")
	}
	if err != nil {
		return err
	}
	var existing string
	err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_assignment_submissions WHERE assignment_id=$1::uuid AND student_id=$2::uuid AND request_id=$3::uuid`, c.Params("assignmentID"), user, requestID).Scan(&existing)
	if err == nil {
		return respond(c, 200, fiber.Map{"id": existing, "confirmed": true})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var previous int
	if err = tx.QueryRow(c.UserContext(), `SELECT COALESCE(max(version),0) FROM classroom_assignment_submissions WHERE assignment_id=$1::uuid AND student_id=$2::uuid`, c.Params("assignmentID"), user).Scan(&previous); err != nil {
		return err
	}
	if previous != expected {
		return fail(409, "a newer submission exists; refresh before resubmitting")
	}
	if previous >= 10 || previous > 0 && !resubmit {
		return fail(409, "resubmission is not available")
	}
	if time.Now().After(due) && !late {
		return fail(409, "assignment deadline has passed")
	}
	var id string
	err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_assignment_submissions(assignment_id,student_id,version,request_id,answer,file_name,file_bytes) VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7) RETURNING id::text`, c.Params("assignmentID"), user, previous+1, requestID, answer, name, bytes).Scan(&id)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 201, fiber.Map{"id": id, "version": previous + 1})
}
func (h *Handler) AssignmentSubmissions(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if err = validID(c.Params("assignmentID")); err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT s.id::text,s.student_id::text,trim(u.first_name||' '||u.last_name),s.version,s.answer,s.file_name,s.submitted_at,s.submitted_at>a.due_at,s.awarded_points,s.feedback,s.graded_at
 FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id JOIN users u ON u.id=s.student_id
 WHERE a.id=$1::uuid AND a.classroom_id=$2::uuid AND ($3='teacher' OR (a.status='published' AND s.student_id=$4::uuid)) ORDER BY s.submitted_at DESC LIMIT 1000`, c.Params("assignmentID"), c.Params("id"), role, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, student, name, answer, file, feedback string
		var version int
		var submitted time.Time
		var late bool
		var score *int
		var graded *time.Time
		if err = rows.Scan(&id, &student, &name, &version, &answer, &file, &submitted, &late, &score, &feedback, &graded); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "student_id": student, "student_name": name, "version": version, "answer": answer, "file_name": file, "submitted_at": submitted, "late": late, "awarded_points": score, "feedback": feedback, "graded_at": graded})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, out)
}
func (h *Handler) GradeAssignment(c *fiber.Ctx) error {
	user, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if err = validID(c.Params("assignmentID")); err != nil {
		return err
	}
	if err = validID(c.Params("submissionID")); err != nil {
		return err
	}
	var req struct {
		Points   int    `json:"points"`
		Feedback string `json:"feedback"`
		Reason   string `json:"reason"`
	}
	if err = json.Unmarshal(c.Body(), &req); err != nil || req.Points < 0 || len(req.Feedback) > 5000 {
		return fail(400, "invalid grade or feedback")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = activity.SetActor(c.UserContext(), tx, user, req.Reason); err != nil {
		return err
	}
	tag, err := tx.Exec(c.UserContext(), `UPDATE classroom_assignment_submissions s SET awarded_points=$4,feedback=$5,graded_by=$6::uuid,graded_at=now() FROM classroom_assignments a WHERE s.id=$1::uuid AND s.assignment_id=$2::uuid AND a.id=s.assignment_id AND a.classroom_id=$3::uuid AND $4<=a.max_points`, c.Params("submissionID"), c.Params("assignmentID"), c.Params("id"), req.Points, req.Feedback, user)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(400, "submission not found or points exceed assignment maximum")
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"graded": true})
}
func (h *Handler) AssignmentFile(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if err = validID(c.Params("assignmentID")); err != nil {
		return err
	}
	if err = validID(c.Params("submissionID")); err != nil {
		return err
	}
	var name string
	var data []byte
	err = h.db.QueryRow(c.UserContext(), `SELECT s.file_name,s.file_bytes FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE s.id=$1::uuid AND a.id=$2::uuid AND a.classroom_id=$3::uuid AND ($4='teacher' OR (a.status='published' AND s.student_id=$5::uuid))`, c.Params("submissionID"), c.Params("assignmentID"), c.Params("id"), role, user).Scan(&name, &data)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && len(data) == 0 {
		return fail(404, "submission file not found")
	}
	if err != nil {
		return err
	}
	c.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": name}))
	c.Set("Content-Type", "application/octet-stream")
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Cache-Control", "no-store")
	return c.Send(data)
}
