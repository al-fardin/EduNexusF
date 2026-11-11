package exam

// Phase 14B: authenticated pre-exam desktop pairing and heartbeat.
// Preflight events are intentionally NOT recorded; activity starts after /start.

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) preflightMember(c *fiber.Ctx) (string, string, error) {
	eid, role, enabled, _, err := h.monitorExam(c, false)
	if err != nil {
		return "", "", err
	}
	if role != "student" {
		return "", "", fiber.NewError(403, "student only")
	}
	if !enabled {
		return "", "", fiber.NewError(409, "exam monitoring is not enabled")
	}
	uid, err := identity(c)
	if err != nil {
		return "", "", err
	}
	var available bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exams
        WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='published'
        AND now()>=starts_at AND now()<ends_at)`, eid, c.Params("id")).Scan(&available)
	if err != nil {
		return "", "", err
	}
	if !available {
		return "", "", fiber.NewError(409, "exam is not open")
	}
	return eid, uid, nil
}

func (h *Handler) DesktopPreflightPair(c *fiber.Ctx) error {
	eid, uid, err := h.preflightMember(c)
	if err != nil {
		return err
	}
	// An attempt that already exists must use its own token (resume pathway).
	var existing bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts
      WHERE exam_id=$1::uuid AND student_id=$2::uuid AND status='in_progress'
      AND now()<expires_at)`, eid, uid).Scan(&existing)
	if err != nil {
		return err
	}
	if existing {
		return h.CreateDesktopPair(c)
	}
	code, digest, err := desktopSecret()
	if err != nil {
		return err
	}
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_desktop_preflight
      (exam_id,student_id,pair_hash,pair_expires_at)
      VALUES($1::uuid,$2::uuid,$3,now()+interval '5 minutes')
      ON CONFLICT(exam_id,student_id) DO UPDATE SET pair_hash=EXCLUDED.pair_hash,
        pair_expires_at=EXCLUDED.pair_expires_at,client_hash=NULL,client_expires_at=NULL,
        last_seen=NULL,stopped_at=NULL,platform=NULL`, eid, uid, digest)
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"pair_code": code, "expires_in_seconds": 300})
}

func (h *Handler) DesktopPreflightStatus(c *fiber.Ctx) error {
	eid, uid, err := h.preflightMember(c)
	if err != nil {
		return err
	}
	var connected bool
	var platform string
	var seen *time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT connected,platform,last_seen FROM (
      SELECT (s.client_hash IS NOT NULL AND s.stopped_at IS NULL AND
        s.client_expires_at>now() AND s.last_seen>now()-interval '25 seconds') AS connected,
        COALESCE(s.platform,'') AS platform,s.last_seen,1 AS priority
      FROM classroom_exam_desktop_sessions s JOIN classroom_exam_attempts a ON a.id=s.attempt_id
      WHERE a.exam_id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress'
      UNION ALL
      SELECT (p.client_hash IS NOT NULL AND p.stopped_at IS NULL AND
        p.client_expires_at>now() AND p.last_seen>now()-interval '25 seconds'),
        COALESCE(p.platform,''),p.last_seen,2
      FROM classroom_exam_desktop_preflight p WHERE p.exam_id=$1::uuid AND p.student_id=$2::uuid
      ) q ORDER BY connected DESC, priority ASC LIMIT 1`, eid, uid).Scan(&connected, &platform, &seen)
	if errors.Is(err, pgx.ErrNoRows) {
		return result(c, 200, fiber.Map{"connected": false})
	}
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"connected": connected, "platform": platform, "last_seen": seen})
}

func (h *Handler) requireDesktopPreflight(c *fiber.Ctx) error {
	eid, uid, err := h.preflightMember(c)
	if err != nil {
		return err
	}
	var ready bool
	err = h.db.QueryRow(c.UserContext(), `SELECT (
      EXISTS(SELECT 1 FROM classroom_exam_desktop_preflight p
        WHERE p.exam_id=$1::uuid AND p.student_id=$2::uuid AND p.client_hash IS NOT NULL
          AND p.stopped_at IS NULL AND p.client_expires_at>now() AND p.last_seen>now()-interval '25 seconds')
      OR EXISTS(SELECT 1 FROM classroom_exam_desktop_sessions s
        JOIN classroom_exam_attempts a ON a.id=s.attempt_id
        WHERE a.exam_id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress'
        AND s.client_hash IS NOT NULL AND s.stopped_at IS NULL
        AND s.client_expires_at>now() AND s.last_seen>now()-interval '25 seconds'))`, eid, uid).Scan(&ready)
	if err != nil {
		return err
	}
	if !ready {
		return fiber.NewError(403, "Connect the EduNexus Desktop Client before entering the exam")
	}
	return nil
}

func (h *Handler) promoteDesktopPreflight(c *fiber.Ctx, eid, uid, aid string) error {
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_desktop_sessions
      (attempt_id,client_hash,client_expires_at,platform,connected_at,last_seen)
      SELECT $3::uuid,p.client_hash,LEAST(p.client_expires_at,a.expires_at,e.ends_at),
             p.platform,now(),p.last_seen
      FROM classroom_exam_desktop_preflight p
      JOIN classroom_exam_attempts a ON a.id=$3::uuid
      JOIN classroom_exams e ON e.id=a.exam_id
      WHERE p.exam_id=$1::uuid AND p.student_id=$2::uuid AND p.client_hash IS NOT NULL
        AND p.stopped_at IS NULL AND p.client_expires_at>now()
        AND p.last_seen>now()-interval '25 seconds'
      ON CONFLICT(attempt_id) DO NOTHING`, eid, uid, aid)
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_exam_desktop_preflight
      WHERE exam_id=$1::uuid AND student_id=$2::uuid`, eid, uid)
	if err != nil {
		return err
	}
	return tx.Commit(c.UserContext())
}

// A preflight token may heartbeat, but it must never upload foreground events.
func (h *Handler) desktopPreflightToken(c *fiber.Ctx) (string, string, error) {
	token, err := desktopBearer(c)
	if err != nil {
		return "", "", err
	}
	var eid, uid string
	err = h.db.QueryRow(c.UserContext(), `SELECT p.exam_id::text,p.student_id::text
      FROM classroom_exam_desktop_preflight p JOIN classroom_exams e ON e.id=p.exam_id
      WHERE p.client_hash=$1 AND p.stopped_at IS NULL AND p.client_expires_at>now()
      AND e.status='published' AND now()>=e.starts_at AND now()<e.ends_at`, digestSecret(token)).Scan(&eid, &uid)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", fiber.NewError(401, "desktop session expired")
	}
	return eid, uid, err
}
