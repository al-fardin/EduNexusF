package learning

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/activity"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

type importGrade struct {
	Submission string         `json:"submission_id"`
	Version    int            `json:"version"`
	Points     int            `json:"points"`
	Feedback   string         `json:"feedback"`
	Criteria   map[string]int `json:"criteria"`
	Previous   *int           `json:"previous"`
	Student    string         `json:"student"`
}

func parseGradeCSV(raw string) ([]importGrade, error) {
	if len(raw) > 1024*1024 {
		return nil, fail(400, "CSV is limited to 1 MB")
	}
	reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(raw, "\ufeff")))
	reader.FieldsPerRecord = -1
	header, err := reader.Read()
	if err != nil {
		return nil, fail(400, "CSV header is required")
	}
	expected := []string{"submission_id", "version", "points", "feedback", "criteria"}
	if len(header) != 5 && len(header) != 8 {
		return nil, fail(400, "Use the provided CSV template")
	}
	if len(header) == 8 {
		expected = append(expected, "student_name", "student_roll", "student_id")
	}
	for i := range header {
		if strings.TrimSpace(header[i]) != expected[i] {
			return nil, fail(400, "CSV headers must be submission_id,version,points,feedback,criteria")
		}
	}
	out := make([]importGrade, 0)
	seen := map[string]bool{}
	for {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil || len(row) != len(header) {
			return nil, fail(400, "Invalid CSV row")
		}
		g := importGrade{Submission: strings.TrimSpace(row[0]), Feedback: row[3], Criteria: map[string]int{}}
		g.Version, err = strconv.Atoi(row[1])
		if err != nil || g.Version < 1 {
			return nil, fail(400, "Invalid submission version")
		}
		g.Points, err = strconv.Atoi(row[2])
		if err != nil || g.Points < 0 || validID(g.Submission) != nil || len(g.Feedback) > 5000 || seen[g.Submission] {
			return nil, fail(400, "Invalid or repeated submission row")
		}
		if row[4] != "" && (json.Unmarshal([]byte(row[4]), &g.Criteria) != nil || g.Criteria == nil) {
			return nil, fail(400, "Criteria must be a JSON object")
		}
		seen[g.Submission] = true
		out = append(out, g)
		if len(out) > 500 {
			return nil, fail(400, "Import at most 500 submissions at a time")
		}
	}
	if len(out) == 0 {
		return nil, fail(400, "CSV has no grades")
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Submission < out[j].Submission })
	return out, nil
}
func digestBytes(value []byte) string { sum := sha256.Sum256(value); return hex.EncodeToString(sum[:]) }
func (h *Handler) ImportGrades(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	var req struct {
		CSV      string `json:"csv"`
		Confirm  bool   `json:"confirm"`
		Request  string `json:"request_id"`
		Revision string `json:"revision"`
		Reason   string `json:"reason"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid import")
	}
	grades, err := parseGradeCSV(req.CSV)
	if err != nil {
		return err
	}
	if req.Confirm && validID(req.Request) != nil {
		return fail(400, "A request identifier is required")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE`, c.Params("id")); err != nil {
		return err
	}
	hash := digestBytes([]byte(c.Params("assignmentID") + ":" + req.CSV))
	if req.Confirm {
		var previousActor, previousHash string
		var result json.RawMessage
		err = tx.QueryRow(c.UserContext(), `SELECT actor_id::text,payload_hash,result FROM classroom_bulk_operations WHERE classroom_id=$1::uuid AND request_id=$2::uuid`, c.Params("id"), req.Request).Scan(&previousActor, &previousHash, &result)
		if err == nil {
			if previousActor != actor || previousHash != hash {
				return fail(409, "Request identifier already used")
			}
			return respond(c, 200, result)
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
	}
	var max int
	var criteria []RubricCriterion
	err = tx.QueryRow(c.UserContext(), `SELECT max_points,rubric FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, c.Params("assignmentID"), c.Params("id")).Scan(&max, &criteria)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Assignment not found")
	}
	if err != nil {
		return err
	}
	snapshots := make([]string, 0, len(grades))
	for i := range grades {
		g := &grades[i]
		var version int
		var gradedAt *time.Time
		err = tx.QueryRow(c.UserContext(), `SELECT s.version,s.awarded_points,s.graded_at,trim(u.first_name||' '||u.last_name) FROM classroom_assignment_submissions s JOIN users u ON u.id=s.student_id JOIN classroom_memberships m ON m.user_id=s.student_id AND m.classroom_id=$2::uuid AND m.member_role='student' AND m.status='active' WHERE s.id=$1::uuid AND s.assignment_id=$3::uuid AND s.version=(SELECT max(v.version) FROM classroom_assignment_submissions v WHERE v.assignment_id=s.assignment_id AND v.student_id=s.student_id) FOR UPDATE OF s`, g.Submission, c.Params("id"), c.Params("assignmentID")).Scan(&version, &g.Previous, &gradedAt, &g.Student)
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(409, "A submission is missing, inactive or no longer the latest version")
		}
		if err != nil {
			return err
		}
		if version != g.Version {
			return fail(409, "Submission version changed")
		}
		total, e := rubricTotal(criteria, g.Criteria)
		if e != nil {
			return e
		}
		if len(criteria) > 0 {
			g.Points = total
		}
		if g.Points > max {
			return fail(400, "Points exceed assignment maximum")
		}
		snap, _ := json.Marshal([]any{g.Submission, version, g.Previous, gradedAt})
		snapshots = append(snapshots, string(snap))
	}
	raw, _ := json.Marshal([]any{hash, snapshots})
	revision := digestBytes(raw)
	if !req.Confirm {
		return respond(c, 200, fiber.Map{"rows": grades, "revision": revision, "maximum": max})
	}
	if req.Revision != revision {
		return fail(409, "Grades changed after preview. Preview the CSV again")
	}
	if err = activity.SetActor(c.UserContext(), tx, actor, req.Reason); err != nil {
		return err
	}
	for _, g := range grades {
		scores, _ := json.Marshal(g.Criteria)
		if _, err = tx.Exec(c.UserContext(), `UPDATE classroom_assignment_submissions SET awarded_points=$2,feedback=$3,rubric_scores=$4::jsonb,graded_by=$5::uuid,graded_at=now() WHERE id=$1::uuid`, g.Submission, g.Points, g.Feedback, scores, actor); err != nil {
			return err
		}
	}
	result := fiber.Map{"imported": len(grades)}
	encoded, _ := json.Marshal(result)
	if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_bulk_operations(classroom_id,request_id,actor_id,payload_hash,result) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb)`, c.Params("id"), req.Request, actor, hash, encoded); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, result)
}
func (h *Handler) SubmissionBundle(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT DISTINCT ON(s.student_id) s.id::text,s.version,s.answer,s.file_name,s.file_bytes FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND a.id=$2::uuid ORDER BY s.student_id,s.version DESC LIMIT 501`, c.Params("id"), c.Params("assignmentID"))
	if err != nil {
		return err
	}
	defer rows.Close()
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	size, count := 0, 0
	for rows.Next() {
		var id, answer, name string
		var version int
		var file []byte
		if err = rows.Scan(&id, &version, &answer, &name, &file); err != nil {
			return err
		}
		count++
		size += len(file) + len(answer)
		if count > 500 || size > 50*1024*1024 {
			return fail(422, "Bundle is limited to 500 submissions and 50 MB")
		}
		prefix := fmt.Sprintf("%s-v%d/", id, version)
		entry, e := writer.Create(prefix + "answer.txt")
		if e != nil {
			return e
		}
		if _, e = io.WriteString(entry, answer); e != nil {
			return e
		}
		if len(file) > 0 {
			safe := filepath.Base(strings.ReplaceAll(name, `\`, "/"))
			safe = strings.Map(func(r rune) rune {
				if r < 32 || strings.ContainsRune(`<>:"|?*`, r) {
					return '_'
				}
				return r
			}, safe)
			if safe == "." || safe == ".." || safe == "" || safe == "answer.txt" {
				safe = "attachment.bin"
			}
			entry, e = writer.Create(prefix + safe)
			if e != nil {
				return e
			}
			if _, e = entry.Write(file); e != nil {
				return e
			}
		}
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if count == 0 {
		return fail(404, "No submissions to download")
	}
	if err = writer.Close(); err != nil {
		return err
	}
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", `attachment; filename="submissions.zip"`)
	c.Set("Cache-Control", "no-store")
	return c.Send(buffer.Bytes())
}
func (h *Handler) RemindStudents(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	var req struct {
		Students []string `json:"students"`
	}
	if c.BodyParser(&req) != nil || len(req.Students) < 1 || len(req.Students) > 200 {
		return fail(400, "Select 1–200 students")
	}
	for _, id := range req.Students {
		if validID(id) != nil {
			return fail(400, "Invalid student")
		}
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var title string
	err = tx.QueryRow(c.UserContext(), `SELECT title FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='published'`, c.Params("assignmentID"), c.Params("id")).Scan(&title)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Published assignment not found")
	}
	if err != nil {
		return err
	}
	rows, err := tx.Query(c.UserContext(), `SELECT m.user_id::text FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.user_id=ANY($2::uuid[]) AND m.status='active' AND m.member_role='student' AND u.status='active' AND u.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM classroom_assignment_submissions s WHERE s.assignment_id=$3::uuid AND s.student_id=m.user_id)`, c.Params("id"), req.Students, c.Params("assignmentID"))
	if err != nil {
		return err
	}
	users := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		users = append(users, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(users) == 0 {
		return fail(409, "Selected students have already submitted or are no longer enrolled")
	}
	// A stable per-day key deduplicates repeated clicks and lost-response retries.
	key := "missing:" + c.Params("assignmentID") + ":" + time.Now().UTC().Format("2006-01-02")
	for _, user := range users {
		if _, err = tx.Exec(c.UserContext(), `SELECT edunexus_notify($1::uuid,$2::uuid,$3,'reminder',$4,'Please review and submit your assignment.',$5,'student',$6::uuid)`, c.Params("id"), actor, key, "Submission reminder: "+title, "classwork&assignment="+c.Params("assignmentID"), user); err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"eligible": len(users), "deduplicated_daily": true})
}
