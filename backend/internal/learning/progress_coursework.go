package learning

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// Coursework includes only published assignments and the selected student's latest submission.
func (h *Handler) ProgressCoursework(c *fiber.Ctx) error {
	user, role, err := h.member(c, false)
	if err != nil {
		return err
	}
	student := c.Params("studentID")
	if validID(student) != nil {
		return fail(400, "Invalid student")
	}
	if role != "teacher" && student != user {
		return fail(403, "Your own progress only")
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 || offset > 10000 {
		return fail(400, "Invalid page")
	}
	var found bool
	err = h.db.QueryRow(c.UserContext(), `SELECT true FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL`, c.Params("id"), student).Scan(&found)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Student not found")
	}
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT a.id::text,a.title,a.due_at,a.max_points,a.rubric,s.awarded_points,COALESCE(s.feedback,''),COALESCE(s.rubric_scores,'{}'::jsonb),s.submitted_at,
 CASE WHEN s.awarded_points IS NOT NULL THEN 'graded' WHEN s.id IS NOT NULL THEN 'submitted' WHEN a.due_at<now() THEN 'missing' ELSE 'upcoming' END state
 FROM classroom_assignments a LEFT JOIN LATERAL (SELECT id,awarded_points,feedback,rubric_scores,submitted_at FROM classroom_assignment_submissions WHERE assignment_id=a.id AND student_id=$2::uuid ORDER BY version DESC LIMIT 1) s ON true
 WHERE a.classroom_id=$1::uuid AND a.status='published' AND edunexus_resource_visible(a.classroom_id,'assignment',a.id,$2::uuid) ORDER BY (s.id IS NULL AND a.due_at<now()) DESC,a.due_at DESC,a.id LIMIT 51 OFFSET $3`, c.Params("id"), student, offset)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, title, feedback, state string
		var due time.Time
		var submitted *time.Time
		var maximum int
		var points *int
		var rubric, scores any
		if err = rows.Scan(&id, &title, &due, &maximum, &rubric, &points, &feedback, &scores, &submitted, &state); err != nil {
			return err
		}
		items = append(items, fiber.Map{"id": id, "title": title, "due_at": due, "maximum": maximum, "rubric": rubric, "score": points, "feedback": feedback, "rubric_scores": scores, "submitted_at": submitted, "state": state})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
}
