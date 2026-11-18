package exam

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"time"
)

type ReadinessIssue struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	QuestionID string `json:"question_id,omitempty"`
	Field      string `json:"field"`
	Severity   string `json:"severity"`
}
type ReadinessReport struct {
	Ready  bool             `json:"ready"`
	Total  int              `json:"total_points"`
	Issues []ReadinessIssue `json:"issues"`
}

func inspectExam(req CreateRequest, now time.Time) ReadinessReport {
	r := ReadinessReport{Ready: true, Issues: []ReadinessIssue{}}
	add := func(code, message, field, qid, severity string) {
		r.Issues = append(r.Issues, ReadinessIssue{code, message, qid, field, severity})
		if severity == "error" {
			r.Ready = false
		}
	}
	if len(req.Title) < 3 || len(req.Title) > 200 {
		add("title", "Title requires 3–200 bytes", "title", "", "error")
	}
	if len(req.Description) > 5000 {
		add("description", "Instructions exceed 5,000 bytes", "description", "", "error")
	}
	validWindow := !req.StartsAt.IsZero() && req.EndsAt.After(req.StartsAt) && req.EndsAt.Sub(req.StartsAt) <= 30*24*time.Hour
	if !validWindow {
		add("window", "Choose an exam window of at most 30 days", "starts_at", "", "error")
	} else if !req.EndsAt.After(now) {
		add("ended", "Exam window has already ended", "ends_at", "", "error")
	} else {
		if req.StartsAt.Before(now) {
			add("started", "This window is already open; publishing makes it available immediately", "starts_at", "", "warning")
		}
		if time.Duration(req.DurationMinutes)*time.Minute > req.EndsAt.Sub(req.StartsAt) {
			add("short_window", "The window is shorter than the requested duration; attempts end when the window closes", "duration_minutes", "", "warning")
		}
	}
	if req.DurationMinutes < 1 || req.DurationMinutes > 240 {
		add("duration", "Duration must be 1–240 minutes", "duration_minutes", "", "error")
	}
	if len(req.Questions) < 1 || len(req.Questions) > 40 {
		add("count", "Use 1–40 questions", "questions", "", "error")
	}
	for _, q := range req.Questions {
		r.Total += q.Points
	}
	if _, combinedErr := normalizeQuestions(req.Questions); combinedErr != nil {
		// The ordinary valid path decodes images once. Detail invalid questions only
		// within the same combined pixel budget used by saves/publication.
		add("questions", combinedErr.Error(), "questions", "", "error")
		pixels := 0
		if len(req.Questions) <= 40 {
			for i, q := range req.Questions {
				if _, err := normalizeQuestions([]Question{q}); err != nil {
					add("question", fmt.Sprintf("Question %d: %s", i+1, err.Error()), "question", q.ID, "error")
				}
				pixels += questionImagePixels(q)
				if pixels > 32_000_000 {
					break
				}
			}
		}
	}
	if req.AllowMobileMCQ && !mcqOnly(req.Questions) {
		add("mobile", "Phone access requires MCQ-only questions", "allow_mobile_mcq", "", "error")
	}
	return r
}
func (h *Handler) ExamReadiness(c *fiber.Ctx) error {
	if _, e := h.member(c, true); e != nil {
		return e
	}
	var req CreateRequest
	if c.Method() == "GET" {
		e, qs, err := h.examWithKeys(c)
		if err != nil {
			return err
		}
		req = CreateRequest{Title: e.Title, Description: e.Description, StartsAt: e.StartsAt, EndsAt: e.EndsAt, DurationMinutes: e.DurationMinutes, Questions: qs, AllowMobileMCQ: e.AllowMobileMCQ}
	} else if len(c.Body()) > 3*1024*1024 || c.BodyParser(&req) != nil {
		return failure(c, 400, "Invalid readiness preview")
	}
	r := inspectExam(req, time.Now())
	for _, q := range req.Questions {
		if q.Tester == nil {
			continue
		}
		var found bool
		e := h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_question_testers WHERE id::text=$1 AND classroom_id=$2::uuid)`, q.Tester.ID, c.Params("id")).Scan(&found)
		if e != nil {
			return e
		}
		if !found {
			r.Ready = false
			r.Issues = append(r.Issues, ReadinessIssue{"tester", "Attached case tester is no longer available", q.ID, "question", "error"})
		}
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, r)
}

// Validate under the same row lock used for publication, avoiding a check/edit race.
func validatePublishingExam(c *fiber.Ctx, tx pgx.Tx, id string) error {
	var req CreateRequest
	var raw []byte
	var status string
	e := tx.QueryRow(c.UserContext(), `SELECT title,description,starts_at,ends_at,duration_minutes,questions,allow_mobile_mcq,status FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, id, c.Params("id")).Scan(&req.Title, &req.Description, &req.StartsAt, &req.EndsAt, &req.DurationMinutes, &raw, &req.AllowMobileMCQ, &status)
	if errors.Is(e, pgx.ErrNoRows) {
		return fiber.NewError(404, "Exam not found")
	}
	if e != nil {
		return e
	}
	if status != "draft" {
		return fiber.NewError(409, "Exam is already published")
	}
	if e = json.Unmarshal(raw, &req.Questions); e != nil {
		return e
	}
	r := inspectExam(req, time.Now())
	if !r.Ready {
		for _, issue := range r.Issues {
			if issue.Severity == "error" {
				return fiber.NewError(400, "Readiness check: "+issue.Message)
			}
		}
	}
	for _, q := range req.Questions {
		if q.Tester != nil {
			var found bool
			if e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_question_testers WHERE id::text=$1 AND classroom_id=$2::uuid)`, q.Tester.ID, c.Params("id")).Scan(&found); e != nil {
				return e
			}
			if !found {
				return fiber.NewError(400, "Readiness check: attached case tester unavailable")
			}
		}
	}
	return nil
}
