package exam

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

func isPhoneAgent(ua string) bool {
	ua = strings.ToLower(ua)
	for _, token := range []string{"android", "iphone", "ipad", "ipod", "mobile", "edunexusandroid"} {
		if strings.Contains(ua, token) {
			return true
		}
	}
	return false
}
func mcqOnly(questions []Question) bool {
	if len(questions) == 0 {
		return false
	}
	for _, q := range questions {
		if q.Kind != "mcq" {
			return false
		}
	}
	return true
}
func (h *Handler) ExamAccess(c *fiber.Ctx) error {
	role, err := h.member(c, false)
	if err != nil {
		return err
	}
	e, questions, err := h.examWithKeys(c)
	if err != nil {
		return err
	}
	if role != "teacher" && e.Status != "published" {
		return failure(c, 404, "exam not found")
	}
	coding := false
	for _, q := range questions {
		coding = coding || q.Kind == "coding"
	}
	return result(c, 200, fiber.Map{"allow_mobile_mcq": e.AllowMobileMCQ && mcqOnly(questions), "mcq_only": mcqOnly(questions), "has_coding": coding})
}
func (h *Handler) startMobile(c *fiber.Ctx) error {
	role, err := h.member(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return failure(c, 403, "students only")
	}
	eid, err := examID(c)
	if err != nil {
		return err
	}
	user, _ := identity(c)
	var req struct {
		Consent bool `json:"mobile_rules_accepted"`
	}
	if c.BodyParser(&req) != nil || !req.Consent {
		return failure(c, 400, "accept the exam rules before starting")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var allowed bool
	var status string
	var starts, ends time.Time
	var duration int
	var raw []byte
	err = tx.QueryRow(c.UserContext(), `SELECT allow_mobile_mcq,status,starts_at,ends_at,duration_minutes,questions FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid AND closed_at IS NULL FOR UPDATE`, eid, c.Params("id")).Scan(&allowed, &status, &starts, &ends, &duration, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 404, "exam not found")
	}
	if err != nil {
		return err
	}
	var questions []Question
	if err = json.Unmarshal(raw, &questions); err != nil {
		return err
	}
	if !allowed || !mcqOnly(questions) {
		return failure(c, 403, "Phone access is not enabled for this exam. Use a desktop computer.")
	}
	if status != "published" || time.Now().Before(starts) || !time.Now().Before(ends) {
		return failure(c, 409, "exam is not currently open")
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_attempts(exam_id,student_id,expires_at,entry_mode) VALUES($1::uuid,$2::uuid,LEAST($3::timestamptz,now()+$4*interval '1 minute'),'mobile') ON CONFLICT(exam_id,student_id) DO NOTHING`, eid, user, ends, duration)
	if err != nil {
		return err
	}
	var mode string
	err = tx.QueryRow(c.UserContext(), `SELECT entry_mode FROM classroom_exam_attempts WHERE exam_id=$1::uuid AND student_id=$2::uuid`, eid, user).Scan(&mode)
	if err != nil {
		return err
	}
	if mode != "mobile" {
		return failure(c, 409, "Continue this attempt on the desktop where it was started")
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return h.attemptData(c, false)
}
func phoneAttemptAllowed(c *fiber.Ctx, e Exam, questions []Question, a Attempt) error {
	if isPhoneAgent(c.Get("User-Agent")) && (!e.AllowMobileMCQ || !mcqOnly(questions) || a.EntryMode != "mobile") {
		return fiber.NewError(403, "This exam attempt requires a desktop computer")
	}
	return nil
}
