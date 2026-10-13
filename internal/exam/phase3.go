package exam

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// RegisterPhase3 is called from the existing Phase 2 Register function. Routes
// inherit the existing JWT middleware and classroom/exam authorization.
func RegisterPhase3(g fiber.Router, h *Handler) {
	g.Post("/:examID/run", h.RunCode)
    g.Post("/:examID/run-workspace", h.RunWorkspace)
	g.Post("/:examID/activity", h.LogActivity)
	g.Get("/:examID/activity/:attemptID", h.ActivityReport)
}

type activityEvent struct {
	Kind       string `json:"kind"`
	QuestionID string `json:"question_id"`
	Magnitude  int    `json:"magnitude"`
}
type activityPayload struct {
	Events []activityEvent `json:"events"`
}

func checkEvent(ev activityEvent, questions []Question) error {
	switch ev.Kind {
	case "paste", "editor_edit", "visibility_hidden", "visibility_visible":
	default:
		return errors.New("invalid activity event")
	}
	if ev.Magnitude < 0 || ev.Magnitude > 20000 {
		return errors.New("invalid magnitude")
	}
	if ev.Kind == "paste" || ev.Kind == "editor_edit" {
		found := false
		for _, q := range questions {
			if q.ID == ev.QuestionID && q.Kind == "coding" {
				found = true
				break
			}
		}
		if !found {
			return errors.New("activity question must be a coding question")
		}
	} else if ev.QuestionID != "" {
		return errors.New("visibility event must not include question id")
	}
	return nil
}

func (h *Handler) activeAttempt(c *fiber.Ctx) (string, []Question, error) {
	role, err := h.member(c, false)
	if err != nil {
		return "", nil, err
	}
	if role != "student" {
		return "", nil, fiber.NewError(403, "student membership required")
	}
	user, _ := identity(c)
	exam, questions, err := h.examWithKeys(c)
	if err != nil {
		return "", nil, err
	}
	if exam.Status != "published" || time.Now().Before(exam.StartsAt) || !time.Now().Before(exam.EndsAt) {
		return "", nil, fiber.NewError(409, "exam is not live")
	}
	var attemptID string
	err = h.db.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_exam_attempts
    WHERE exam_id=$1::uuid AND student_id=$2::uuid AND status='in_progress'
     AND now()<expires_at`, exam.ID, user).Scan(&attemptID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, fiber.NewError(409, "join an active exam first")
	}
	if err != nil {
		return "", nil, err
	}
	return attemptID, questions, nil
}

func (h *Handler) LogActivity(c *fiber.Ctx) error {
	attemptID, questions, err := h.activeAttempt(c)
	if err != nil {
		return err
	}
	var req activityPayload
	if len(c.Body()) > 4500 {
		return failure(c, 413, "activity batch too large")
	}
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid activity JSON")
	}
	if len(req.Events) < 1 || len(req.Events) > 20 {
		return failure(c, 400, "1-20 events required")
	}
	for _, ev := range req.Events {
		if err = checkEvent(ev, questions); err != nil {
			return failure(c, 400, err.Error())
		}
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var count int
	err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_exam_activity_events WHERE attempt_id=$1::uuid`, attemptID).Scan(&count)
	if err != nil {
		return err
	}
	if count+len(req.Events) > 5000 {
		return failure(c, 429, "activity event quota reached")
	}
	for _, ev := range req.Events {
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_activity_events(attempt_id,question_id,event_kind,magnitude) VALUES ($1::uuid, NULLIF($2::text,''),$3,$4)`, attemptID, ev.QuestionID, ev.Kind, ev.Magnitude)
		if err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"recorded": len(req.Events)})
}

type runPayload struct {
	QuestionID string `json:"question_id"`
	Code       string `json:"code"`
	Stdin      string `json:"stdin"`
}

var codeRunSlots = make(chan struct{}, 4)

func (h *Handler) RunCode(c *fiber.Ctx) error {
	attemptID, questions, err := h.activeAttempt(c)
	if err != nil {
		return err
	}
	if len(c.Body()) > 27000 {
		return failure(c, 413, "code request too large")
	}
	var req runPayload
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid run JSON")
	}
	if strings.TrimSpace(req.Code) == "" || len(req.Code) > 20000 || len(req.Stdin) > 4096 {
		return failure(c, 400, "code must be 1-20000 bytes and input up to 4096 bytes")
	}
	var language string
	for _, q := range questions {
		if q.ID == req.QuestionID && q.Kind == "coding" {
			language = q.Language
			break
		}
	}
	if language == "" {
		return failure(c, 400, "coding question or language not found")
	}
	canonical, _, _, _, ok := compilerSpec(language)
	if !ok {
		return failure(c, 422, "compiler for this language is not available; answer can still be saved")
	}
	// Avoid reserving a run when Docker execution is explicitly disabled.
	if !runnerEnabled() {
		return failure(c, 503, errRunnerDisabled.Error())
	}
	select {
	case codeRunSlots <- struct{}{}:
		defer func() { <-codeRunSlots }()
	default:
		return failure(c, 429, "sandbox is busy; try again shortly")
	}
	// A previous abrupt backend exit may have left a stale in-flight DB record.
	_, err = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_code_runs SET status='interrupted' WHERE attempt_id=$1::uuid AND status='running' AND created_at < now()-interval '45 seconds'`, attemptID)
	if err != nil {
		return err
	}
	hash := sha256.Sum256([]byte(req.Code))
	var runID string
	// One in-flight run per attempt, plus a 5-second cooldown and 35-run cap.
	err = h.db.QueryRow(c.UserContext(), `INSERT INTO classroom_exam_code_runs(attempt_id,question_id,language,source_sha256)
   SELECT $1::uuid,$2,$3,$4 WHERE
     (SELECT count(*) FROM classroom_exam_code_runs WHERE attempt_id=$1::uuid)<35 AND
     NOT EXISTS (SELECT 1 FROM classroom_exam_code_runs WHERE attempt_id=$1::uuid AND created_at>now()-interval '5 seconds')
   RETURNING id::text`, attemptID, req.QuestionID, canonical, hex.EncodeToString(hash[:])).Scan(&runID)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 429, "wait 5 seconds between runs (max 35 runs per attempt)")
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return failure(c, 429, "another run is already in progress")
		}
		return err
	}
	out, runErr := runSandbox(c.UserContext(), canonical, req.Code, req.Stdin)
	if runErr != nil {
		out.Status = "unavailable"
		out.Stderr = runErr.Error()
	}
	_, dbErr := h.db.Exec(c.UserContext(), `UPDATE classroom_exam_code_runs SET status=$2,duration_ms=$3,stdout_preview=$4,stderr_preview=$5 WHERE id=$1::uuid`, runID, out.Status, out.DurationMS, out.Stdout, out.Stderr)
	if dbErr != nil {
		return dbErr
	}
	if runErr != nil {
		return failure(c, 503, out.Stderr)
	}
	return result(c, 200, out)
}

// These are heuristics for triage, never a calibrated cheating probability.
func heuristicFlags(pastes, largePastes, tabHides int) []string {
	flags := make([]string, 0)
	if largePastes >= 2 {
		flags = append(flags, "Multiple large pastes; review context and legitimate starter code")
	}
	if tabHides >= 4 {
		flags = append(flags, "Repeated page visibility changes; browser events are not proof of misconduct")
	}
	if pastes >= 8 {
		flags = append(flags, "Frequent code pastes; this can have legitimate explanations")
	}
	return flags
}
func (h *Handler) ActivityReport(c *fiber.Ctx) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	attempt := c.Params("attemptID")
	if _, parseErr := uuid.Parse(attempt); parseErr != nil {
		return failure(c, 400, "invalid attempt id")
	}
	examID, err := examID(c)
	if err != nil {
		return err
	}
	var exists bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(
   SELECT 1 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id
   WHERE a.id=$1::uuid AND e.id=$2::uuid AND e.classroom_id=$3::uuid
 )`, attempt, examID, c.Params("id")).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return failure(c, 404, "attempt not found in classroom")
	}
	var pastes, largePastes, tabHides, editBatches, runs, failedRuns int
	err = h.db.QueryRow(c.UserContext(), `SELECT
   count(*) FILTER(WHERE event_kind='paste'),
   count(*) FILTER(WHERE event_kind='paste' AND magnitude>=250),
   count(*) FILTER(WHERE event_kind='visibility_hidden'),
   count(*) FILTER(WHERE event_kind='editor_edit')
   FROM classroom_exam_activity_events WHERE attempt_id=$1::uuid`, attempt).Scan(&pastes, &largePastes, &tabHides, &editBatches)
	if err != nil {
		return err
	}
	err = h.db.QueryRow(c.UserContext(), `SELECT count(*),count(*) FILTER(WHERE status NOT IN ('ok','running'))
   FROM classroom_exam_code_runs WHERE attempt_id=$1::uuid`, attempt).Scan(&runs, &failedRuns)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT question_id,event_kind,magnitude,recorded_at FROM classroom_exam_activity_events
   WHERE attempt_id=$1::uuid ORDER BY recorded_at DESC LIMIT 100`, attempt)
	if err != nil {
		return err
	}
	events := make([]fiber.Map, 0)
	for rows.Next() {
		var question *string
		var kind string
		var size int
		var at time.Time
		if err = rows.Scan(&question, &kind, &size, &at); err != nil {
			rows.Close()
			return err
		}
		events = append(events, fiber.Map{"question_id": question, "kind": kind, "magnitude": size, "recorded_at": at})
	}
	if err = rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	return result(c, 200, fiber.Map{"summary": fiber.Map{"pastes": pastes, "large_pastes": largePastes, "tab_hides": tabHides, "edit_batches": editBatches, "code_runs": runs, "failed_runs": failedRuns}, "flags": heuristicFlags(pastes, largePastes, tabHides), "events": events,
		"notice": "Browser-side signals can be incomplete, blocked or manipulated. Review manually; no calibrated cheating probability is computed."})
}

// The compiler is deliberately opt-in (Docker itself must be available).
func runnerEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("EXAM_RUNNER_ENABLED")), "true")
}
