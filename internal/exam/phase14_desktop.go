package exam

// Phase 14C: desktop companion telemetry. Pairing is strictly attempt-scoped,
// high-entropy, short-lived and can be used only once. The desktop agent only
// reports foreground app names and Windows clipboard change metadata, not contents.

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func RegisterPhase14(g fiber.Router, h *Handler) {
	g.Post("/:examID/desktop-pair", h.CreateDesktopPair)
	g.Post("/:examID/desktop-preflight-pair", h.DesktopPreflightPair)
	g.Get("/:examID/desktop-preflight-status", h.DesktopPreflightStatus)
	g.Get("/:examID/desktop-status", h.DesktopStatus)
	g.Get("/:examID/desktop-report/:attemptID", h.DesktopReport)
}

// This group deliberately DOES NOT use browser JWT middleware: the companion
// authenticates with a one-time pairing secret followed by a scoped bearer.
func RegisterPhase14Client(app *fiber.App, h *Handler) {
	g := app.Group("/desktop-monitor")
	g.Post("/connect", h.DesktopConnect)
	g.Post("/heartbeat", h.DesktopHeartbeat)
	g.Post("/events", h.DesktopEvents)
	g.Post("/stop", h.DesktopStop)
}

func desktopSecret() (string, []byte, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", nil, err
	}
	s := hex.EncodeToString(b)
	digest := sha256.Sum256([]byte(s))
	return s, digest[:], nil
}

func digestSecret(secret string) []byte {
	d := sha256.Sum256([]byte(secret))
	return d[:]
}

func (h *Handler) CreateDesktopPair(c *fiber.Ctx) error {
	aid, _, err := h.studentMonitorAttempt(c)
	if err != nil {
		return err
	}
	code, digest, err := desktopSecret()
	if err != nil {
		return err
	}
	// A fresh pair code invalidates the previous client and pending code.
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO classroom_exam_desktop_sessions
     (attempt_id,pair_hash,pair_expires_at,client_hash,client_expires_at,stopped_at)
     VALUES($1::uuid,$2,now()+interval '5 minutes',NULL,NULL,NULL)
     ON CONFLICT(attempt_id) DO UPDATE SET pair_hash=EXCLUDED.pair_hash,
     pair_expires_at=EXCLUDED.pair_expires_at,client_hash=NULL,
     client_expires_at=NULL,stopped_at=NULL,last_seen=NULL,connected_at=NULL`, aid, digest)
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"pair_code": code, "expires_in_seconds": 300})
}

func (h *Handler) DesktopStatus(c *fiber.Ctx) error {
	aid, _, err := h.studentMonitorAttempt(c)
	if err != nil {
		return err
	}
	var connected bool
	var platform string
	var last *time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT
      (client_hash IS NOT NULL AND stopped_at IS NULL AND client_expires_at>now() AND last_seen>now()-interval '25 seconds'),
      COALESCE(platform,''),last_seen
      FROM classroom_exam_desktop_sessions WHERE attempt_id=$1::uuid`, aid).Scan(&connected, &platform, &last)
	if errors.Is(err, pgx.ErrNoRows) {
		return result(c, 200, fiber.Map{"connected": false})
	}
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"connected": connected, "platform": platform, "last_seen": last})
}

type desktopConnectRequest struct {
	PairCode string `json:"pair_code"`
	Platform string `json:"platform"`
}

func (h *Handler) DesktopConnect(c *fiber.Ctx) error {
	if len(c.Body()) > 400 {
		return failure(c, 413, "payload too large")
	}
	var body desktopConnectRequest
	if c.BodyParser(&body) != nil || len(body.PairCode) != 64 ||
		(body.Platform != "windows" && body.Platform != "macos" && body.Platform != "linux") {
		return failure(c, 400, "invalid pairing request")
	}
	secret, hash, err := desktopSecret()
	if err != nil {
		return err
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var aid string
	// Consume once, bound to a currently running, monitored exam attempt.
	err = tx.QueryRow(c.UserContext(), `SELECT s.attempt_id::text FROM classroom_exam_desktop_sessions s
        JOIN classroom_exam_attempts a ON a.id=s.attempt_id
        JOIN classroom_exams e ON e.id=a.exam_id
        JOIN classroom_exam_monitor_policy p ON p.exam_id=e.id
        WHERE s.pair_hash=$1 AND s.pair_expires_at>now()
          AND a.status='in_progress' AND now()<a.expires_at
          AND e.status='published' AND now()<e.ends_at AND p.enabled
        FOR UPDATE OF s`, digestSecret(body.PairCode)).Scan(&aid)
	preflight := false
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(c.UserContext(), `SELECT p.exam_id::text FROM classroom_exam_desktop_preflight p
          JOIN classroom_exams e ON e.id=p.exam_id
          WHERE p.pair_hash=$1 AND p.pair_expires_at>now()
          AND e.status='published' AND now()>=e.starts_at AND now()<e.ends_at
          FOR UPDATE OF p`, digestSecret(body.PairCode)).Scan(&aid)
		preflight = err == nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 403, "pair code expired or invalid")
	}
	if err != nil {
		return err
	}
	if preflight {
		var expiry time.Time
		err = tx.QueryRow(c.UserContext(), `UPDATE classroom_exam_desktop_preflight p SET
          pair_hash=NULL,pair_expires_at=NULL,client_hash=$2,platform=$3,
          client_expires_at=LEAST(now()+interval '4 hours',
              (SELECT ends_at FROM classroom_exams WHERE id=p.exam_id)),
          last_seen=now(),stopped_at=NULL
          WHERE p.exam_id=$1::uuid AND p.pair_hash=$4 RETURNING client_expires_at`, aid, hash, body.Platform, digestSecret(body.PairCode)).Scan(&expiry)
		if err != nil {
			return err
		}
		if err = tx.Commit(c.UserContext()); err != nil {
			return err
		}
		c.Set("Cache-Control", "no-store")
		return result(c, 200, fiber.Map{"session_token": secret, "heartbeat_seconds": 8,
			"expires_at": expiry, "active": false})
	}
	var sessionEnds time.Time
	err = tx.QueryRow(c.UserContext(), `UPDATE classroom_exam_desktop_sessions SET
       pair_hash=NULL,pair_expires_at=NULL,client_hash=$2,platform=$3,
       client_expires_at=LEAST(now()+interval '4 hours',
          (SELECT LEAST(a.expires_at,e.ends_at) FROM classroom_exam_attempts a
           JOIN classroom_exams e ON e.id=a.exam_id WHERE a.id=$1::uuid)),
       connected_at=now(),last_seen=now(),stopped_at=NULL WHERE attempt_id=$1::uuid
       RETURNING client_expires_at`, aid, hash, body.Platform).Scan(&sessionEnds)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"session_token": secret, "heartbeat_seconds": 8, "expires_at": sessionEnds, "active": true})
}

func desktopBearer(c *fiber.Ctx) (string, error) {
	auth := c.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return "", fiber.NewError(401, "device session required")
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	if len(token) != 64 {
		return "", fiber.NewError(401, "invalid device session")
	}
	return token, nil
}
func (h *Handler) desktopAttempt(c *fiber.Ctx) (string, error) {
	token, err := desktopBearer(c)
	if err != nil {
		return "", err
	}
	var aid string
	err = h.db.QueryRow(c.UserContext(), `SELECT s.attempt_id::text
      FROM classroom_exam_desktop_sessions s
      JOIN classroom_exam_attempts a ON a.id=s.attempt_id
      JOIN classroom_exams e ON e.id=a.exam_id
      WHERE s.client_hash=$1 AND s.stopped_at IS NULL
        AND s.client_expires_at>now() AND a.status='in_progress'
        AND e.status='published' AND now()<a.expires_at AND now()<e.ends_at`, digestSecret(token)).Scan(&aid)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", fiber.NewError(401, "desktop exam session expired")
	}
	return aid, err
}

func (h *Handler) DesktopHeartbeat(c *fiber.Ctx) error {
	aid, err := h.desktopAttempt(c)
	if err == nil {
		_, err = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_desktop_sessions SET last_seen=now() WHERE attempt_id=$1::uuid`, aid)
		if err != nil {
			return err
		}
		return result(c, 200, fiber.Map{"ok": true, "active": true})
	}
	eid, uid, err := h.desktopPreflightToken(c)
	if err != nil {
		return err
	}
	token, _ := desktopBearer(c)
	_, err = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_desktop_preflight
      SET last_seen=now() WHERE exam_id=$1::uuid AND student_id=$2::uuid AND client_hash=$3`,
		eid, uid, digestSecret(token))
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"ok": true, "active": false})
}

type desktopEvent struct {
	ID      string `json:"id"`
	Kind    string `json:"kind"`
	AppName string `json:"app_name"`
	At      string `json:"at"`
}

func (h *Handler) DesktopEvents(c *fiber.Ctx) error {
	aid, err := h.desktopAttempt(c)
	if err != nil {
		return err
	}
	if len(c.Body()) > 16000 {
		return failure(c, 413, "payload too large")
	}
	var p struct {
		Events []desktopEvent `json:"events"`
	}
	if c.BodyParser(&p) != nil || len(p.Events) < 1 || len(p.Events) > 25 {
		return failure(c, 400, "1-25 events required")
	}
	for _, event := range p.Events {
		if _, err = uuid.Parse(event.ID); err != nil {
			return failure(c, 400, "invalid event id")
		}
		switch event.Kind {
		case "foreground_app", "clipboard_changed", "client_started", "client_stopped", "monitor_gap", "capability_unavailable":
		default:
			return failure(c, 400, "invalid event type")
		}
		if len([]rune(event.AppName)) > 160 || len(event.AppName) > 500 {
			return failure(c, 400, "app name too long")
		}
		if event.Kind != "foreground_app" && event.Kind != "clipboard_changed" && event.AppName != "" {
			return failure(c, 400, "unexpected app name")
		}
		if strings.ContainsAny(event.AppName, "\n\r\x00") {
			return failure(c, 400, "invalid app name")
		}
		if event.Kind == "clipboard_changed" && strings.TrimSpace(event.AppName) == "" {
			return failure(c, 400, "clipboard change requires foreground app")
		}
		if event.At != "" {
			observed, parseErr := time.Parse(time.RFC3339Nano, event.At)
			if parseErr != nil || observed.After(time.Now().Add(2*time.Minute)) || observed.Before(time.Now().Add(-5*time.Minute)) {
				return failure(c, 400, "invalid client observation time")
			}
		}
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	for _, ev := range p.Events {
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_desktop_events(id,attempt_id,kind,app_name,observed_at)
          VALUES($1::uuid,$2::uuid,$3,NULLIF($4::text,''),COALESCE(NULLIF($5::text,'')::timestamptz,now())) ON CONFLICT(id) DO NOTHING`, ev.ID, aid, ev.Kind, ev.AppName, ev.At)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(c.UserContext(), `UPDATE classroom_exam_desktop_sessions SET last_seen=now() WHERE attempt_id=$1::uuid`, aid)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"recorded": len(p.Events)})
}

func (h *Handler) DesktopStop(c *fiber.Ctx) error {
	aid, err := h.desktopAttempt(c)
	if err != nil {
		eid, uid, preErr := h.desktopPreflightToken(c)
		if preErr != nil {
			return preErr
		}
		_, preErr = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_desktop_preflight
          SET stopped_at=now(),client_hash=NULL WHERE exam_id=$1::uuid AND student_id=$2::uuid`, eid, uid)
		if preErr != nil {
			return preErr
		}
		return result(c, 200, fiber.Map{"stopped": true})
	}
	_, err = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_desktop_sessions
      SET stopped_at=now(),client_hash=NULL WHERE attempt_id=$1::uuid`, aid)
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"stopped": true})
}

func (h *Handler) DesktopReport(c *fiber.Ctx) error {
	aid, _, err := h.teacherMonitorAttempt(c)
	if err != nil {
		return err
	}
	var platform string
	var connected bool
	var last *time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT COALESCE(platform,''),
       (client_hash IS NOT NULL AND stopped_at IS NULL AND client_expires_at>now()
        AND last_seen>now()-interval '25 seconds'),last_seen
       FROM classroom_exam_desktop_sessions WHERE attempt_id=$1::uuid`, aid).Scan(&platform, &connected, &last)
	if errors.Is(err, pgx.ErrNoRows) {
		platform = ""
		connected = false
		last = nil
	} else if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT kind,COALESCE(app_name,''),COALESCE(observed_at,recorded_at)
       FROM classroom_exam_desktop_events WHERE attempt_id=$1::uuid ORDER BY COALESCE(observed_at,recorded_at) DESC LIMIT 150`, aid)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var kind, app string
		var at time.Time
		if err = rows.Scan(&kind, &app, &at); err != nil {
			return err
		}
		items = append(items, fiber.Map{"kind": kind, "app_name": app, "recorded_at": at})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"platform": platform, "connected": connected, "last_seen": last,
		"events": items, "notice": "Windows clipboard-change events show the foreground application, not verified copy activity or clipboard contents. macOS/Linux clipboard-source detection is unavailable in this preview. Signals are incomplete and not proof of cheating."})
}
