package learning

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func csvSafe(value string) string {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if len(trimmed) > 0 && strings.ContainsRune("=+-@", rune(trimmed[0])) || strings.HasPrefix(value, "\t") || strings.HasPrefix(value, "\r") {
		return "'" + value
	}
	return value
}
func (h *Handler) GradeImportTemplate(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	var criteria []RubricCriterion
	err := h.db.QueryRow(c.UserContext(), `SELECT rubric FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("assignmentID"), c.Params("id")).Scan(&criteria)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Assignment not found")
	}
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `WITH latest AS(SELECT DISTINCT ON(s.student_id) s.id,s.student_id,s.version,s.awarded_points,s.feedback,s.rubric_scores FROM classroom_assignment_submissions s JOIN classroom_memberships m ON m.user_id=s.student_id AND m.classroom_id=$2::uuid AND m.member_role='student' AND m.status='active' WHERE s.assignment_id=$1::uuid ORDER BY s.student_id,s.version DESC) SELECT s.id::text,s.student_id::text,s.version,s.awarded_points,s.feedback,s.rubric_scores,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,'') FROM latest s JOIN users u ON u.id=s.student_id JOIN classroom_memberships m ON m.user_id=s.student_id AND m.classroom_id=$2::uuid ORDER BY m.student_roll,u.first_name,u.id LIMIT 501`, c.Params("assignmentID"), c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	var out bytes.Buffer
	out.WriteString("\ufeff")
	writer := csv.NewWriter(&out)
	if err = writer.Write([]string{"submission_id", "version", "points", "feedback", "criteria", "student_name", "student_roll", "student_id"}); err != nil {
		return err
	}
	count := 0
	for rows.Next() {
		var id, student, feedback, name, roll string
		var version int
		var points *int
		var scores map[string]int
		if err = rows.Scan(&id, &student, &version, &points, &feedback, &scores, &name, &roll); err != nil {
			return err
		}
		count++
		if count > 500 {
			return fail(422, "Template supports up to 500 active students")
		}
		snapshot := map[string]int{}
		for _, criterion := range criteria {
			snapshot[criterion.ID] = scores[criterion.ID]
		}
		raw, _ := json.Marshal(snapshot)
		score := 0
		if points != nil {
			score = *points
		}
		if err = writer.Write([]string{id, strconv.Itoa(version), strconv.Itoa(score), csvSafe(feedback), string(raw), csvSafe(name), csvSafe(roll), student}); err != nil {
			return err
		}
		if out.Len() > 1024*1024 {
			return fail(422, "Template exceeds the 1 MB import limit")
		}
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if count == 0 {
		return fail(404, "No active student submissions")
	}
	writer.Flush()
	if err = writer.Error(); err != nil {
		return err
	}
	if out.Len() > 1024*1024 {
		return fail(422, "Template exceeds the 1 MB import limit")
	}
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", `attachment; filename="grade-import-template.csv"`)
	c.Set("Cache-Control", "no-store")
	return c.Send(out.Bytes())
}
