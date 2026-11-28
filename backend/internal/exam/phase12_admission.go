package exam

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// A server-recorded, explicit consent prerequisite for monitored exams.
// The browser's extension health check is best-effort, not a cryptographic
// extension attestation or a guarantee that monitoring cannot be bypassed.
func (h *Handler) MonitorAdmission(c *fiber.Ctx) error {
	eid, role, enabled, _, err := h.monitorExam(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return failure(c, 403, "student only")
	}
	if !enabled {
		return failure(c, 409, "exam monitoring must be enabled")
	}

	var req struct {
		Consented      bool `json:"consented"`
		ExtensionReady bool `json:"extension_ready"`
	}
	if len(c.Body()) > 300 || c.BodyParser(&req) != nil || !req.Consented || !req.ExtensionReady {
		return failure(c, 400, "monitoring consent and extension check required")
	}
	uid, err := identity(c)
	if err != nil {
		return err
	}
	var available bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(
        SELECT 1 FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid
        AND status='published' AND closed_at IS NULL AND now() >= starts_at AND now() < ends_at
    )`, eid, c.Params("id")).Scan(&available)
	if err != nil {
		return err
	}
	if !available {
		return failure(c, 409, "exam is not currently open")
	}
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_monitor_admissions
        (exam_id, student_id, consented_at)
        VALUES($1::uuid,$2::uuid,now())
        ON CONFLICT(exam_id,student_id) DO UPDATE SET consented_at=EXCLUDED.consented_at`, eid, uid)
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"admitted": true})
}

func (h *Handler) requireMonitorAdmission(c *fiber.Ctx) error {
	eid, role, enabled, _, err := h.monitorExam(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return fiber.NewError(403, "student only")
	}
	if !enabled {
		return fiber.NewError(409, "teacher must enable exam monitoring")
	}
	uid, err := identity(c)
	if err != nil {
		return err
	}
	var when time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT consented_at FROM classroom_exam_monitor_admissions
        WHERE exam_id=$1::uuid AND student_id=$2::uuid`, eid, uid).Scan(&when)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(403, "agree to browser monitoring before entering this exam")
	}
	if err != nil {
		return err
	}
	if time.Since(when) > 15*time.Minute {
		var resume bool
		err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts a
          JOIN classroom_exams e ON e.id=a.exam_id WHERE a.exam_id=$1::uuid AND a.student_id=$2::uuid
          AND a.status='in_progress' AND a.expires_at>now() AND e.status='published' AND e.closed_at IS NULL AND e.ends_at>now())`, eid, uid).Scan(&resume)
		if err != nil {
			return err
		}
		if !resume {
			return fiber.NewError(403, "agree to browser monitoring before entering this exam")
		}
	}
	return nil
}

// Persisted consent belongs to this student and this active attempt, not a
// browser-storage flag. Resuming never starts a new attempt or extends its time.
func (h *Handler) MonitorAdmissionStatus(c *fiber.Ctx) error {
	eid, role, enabled, _, err := h.monitorExam(c, false)
	if err != nil {
		return err
	}
	if role != "student" {
		return failure(c, 403, "student only")
	}
	uid, err := identity(c)
	if err != nil {
		return err
	}
	if !enabled {
		return result(c, 200, fiber.Map{"admitted": false})
	}
	var attempt string
	var expires time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT a.id::text,LEAST(a.expires_at,e.ends_at)
       FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id
       JOIN classroom_exam_monitor_admissions m ON m.exam_id=a.exam_id AND m.student_id=a.student_id
       WHERE a.exam_id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress'
       AND a.expires_at>now() AND e.ends_at>now() AND e.closed_at IS NULL AND e.status='published'`, eid, uid).Scan(&attempt, &expires)
	if errors.Is(err, pgx.ErrNoRows) {
		return result(c, 200, fiber.Map{"admitted": false})
	}
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"admitted": true, "attempt_id": attempt, "expires_at": expires})
}
