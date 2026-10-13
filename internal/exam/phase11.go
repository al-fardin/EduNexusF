package exam

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Phase 11 is explicitly opt-in. Evidence is not a cheating verdict.
func RegisterPhase11(g fiber.Router, h *Handler) {
	RegisterPhase14(g, h)
	g.Get("/:examID/monitor-policy", h.MonitorPolicy)
	g.Post("/:examID/monitor-admission", h.MonitorAdmission)
	g.Put("/:examID/monitor-policy", h.SetMonitorPolicy)
	g.Post("/:examID/monitor-heartbeat", h.MonitorHeartbeat)
	g.Post("/:examID/monitor-events", h.RecordMonitorEvents)
	g.Get("/:examID/monitor-live", h.LiveMonitor)
	g.Get("/:examID/monitor-report/:attemptID", h.MonitorReport)
}

func (h *Handler) monitorExam(c *fiber.Ctx, teacher bool) (string, string, bool, int, error) {
	role, err := h.member(c, teacher)
	if err != nil {
		return "", "", false, 0, err
	}
	eid, err := examID(c)
	if err != nil {
		return "", "", false, 0, err
	}
	var enabled bool
	var threshold int
	err = h.db.QueryRow(c.UserContext(), `SELECT COALESCE(m.enabled,false),COALESCE(m.flag_after_exits,2)
      FROM classroom_exams e LEFT JOIN classroom_exam_monitor_policy m ON m.exam_id=e.id
      WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid`, eid, c.Params("id")).Scan(&enabled, &threshold)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", false, 0, fiber.NewError(404, "exam not found")
	}
	return eid, role, enabled, threshold, err
}

func (h *Handler) MonitorPolicy(c *fiber.Ctx) error {
	_, role, enabled, threshold, err := h.monitorExam(c, false)
	if err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"enabled": enabled, "flag_after_exits": threshold, "editable": role == "teacher"})
}

func (h *Handler) SetMonitorPolicy(c *fiber.Ctx) error {
	eid, _, _, _, err := h.monitorExam(c, true)
	if err != nil {
		return err
	}
	var req struct {
		Enabled        bool `json:"enabled"`
		FlagAfterExits int  `json:"flag_after_exits"`
	}
	if len(c.Body()) > 1000 || c.BodyParser(&req) != nil || req.FlagAfterExits < 1 || req.FlagAfterExits > 10 {
		return failure(c, 400, "enabled and flag_after_exits (1-10) required")
	}
	if !req.Enabled {
		return failure(c, 409, "browser monitoring is required for exams")
	}
	// Serialize policy changes with exam start, and never alter monitoring rules mid-exam.
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var status string
	err = tx.QueryRow(c.UserContext(), `SELECT status FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, eid, c.Params("id")).Scan(&status)
	if err != nil {
		return err
	}
	var attempts int
	err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_exam_attempts WHERE exam_id=$1::uuid`, eid).Scan(&attempts)
	if err != nil {
		return err
	}
	if attempts > 0 {
		return failure(c, 409, "Monitoring settings are locked after the first exam attempt")
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_monitor_policy(exam_id,enabled,flag_after_exits)
      VALUES($1::uuid,$2,$3) ON CONFLICT(exam_id) DO UPDATE SET enabled=EXCLUDED.enabled,
      flag_after_exits=EXCLUDED.flag_after_exits,updated_at=now()`, eid, req.Enabled, req.FlagAfterExits)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"enabled": req.Enabled, "flag_after_exits": req.FlagAfterExits})
}

func (h *Handler) studentMonitorAttempt(c *fiber.Ctx) (string, bool, error) {
	eid, role, enabled, _, err := h.monitorExam(c, false)
	if err != nil {
		return "", false, err
	}
	if role != "student" {
		return "", false, fiber.NewError(403, "student only")
	}
	if !enabled {
		return "", false, fiber.NewError(409, "enhanced monitoring is not enabled for this exam")
	}
	uid, err := identity(c)
	if err != nil {
		return "", false, err
	}
	var aid string
	err = h.db.QueryRow(c.UserContext(), `SELECT a.id::text FROM classroom_exam_attempts a
      JOIN classroom_exams e ON e.id=a.exam_id
      WHERE e.id=$1::uuid AND a.student_id=$2::uuid AND a.status='in_progress'
        AND e.status='published' AND now() < e.ends_at AND now() < a.expires_at`, eid, uid).Scan(&aid)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, fiber.NewError(409, "active exam attempt required")
	}
	return aid, true, err
}

func (h *Handler) MonitorHeartbeat(c *fiber.Ctx) error {
	aid, _, err := h.studentMonitorAttempt(c)
	if err != nil {
		return err
	}
	var req struct {
		Consented          bool `json:"consented"`
		ExtensionConnected bool `json:"extension_connected"`
	}
	if len(c.Body()) > 500 || c.BodyParser(&req) != nil || !req.Consented {
		return failure(c, 400, "explicit consent required")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var prev time.Time
	err = tx.QueryRow(c.UserContext(), `SELECT last_seen FROM classroom_exam_monitor_heartbeats
      WHERE attempt_id=$1::uuid FOR UPDATE`, aid).Scan(&prev)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err == nil && time.Since(prev) > 35*time.Second {
		duration := int(time.Since(prev).Seconds())
		if duration > 86400 {
			duration = 86400
		}
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_monitor_events
          (id,attempt_id,event_kind,source,duration_seconds) VALUES($1,$2::uuid,'session_interruption','server',$3)`, uuid.New(), aid, duration)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_monitor_heartbeats(attempt_id,extension_connected)
      VALUES($1::uuid,$2) ON CONFLICT(attempt_id) DO UPDATE SET
        last_seen=now(),extension_connected=EXCLUDED.extension_connected`, aid, req.ExtensionConnected)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"ok": true})
}

type monitorEvent struct {
	ID              string     `json:"id"`
	Kind            string     `json:"kind"`
	Source          string     `json:"source"`
	Domain          string     `json:"domain"`
	Text            string     `json:"text"`
	DurationSeconds int        `json:"duration_seconds"`
	At              *time.Time `json:"at"`
}

var monitorDomain = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$`)
var monitorKinds = map[string]bool{
	"tab_switched": true, "site_active": true, "window_blur": true, "window_focus": true,
	"window_minimized": true, "exam_tab_closed": true, "exam_tab_returned": true,
	"extension_started": true, "extension_stopped": true, "page_hidden": true, "page_visible": true,
	"search_query": true, "ai_prompt": true, "external_copy": true, "exam_paste": true,
}

func (h *Handler) RecordMonitorEvents(c *fiber.Ctx) error {
	aid, _, err := h.studentMonitorAttempt(c)
	if err != nil {
		return err
	}
	if len(c.Body()) > 262144 {
		return failure(c, 413, "monitor event batch too large")
	}
	var payload struct {
		Events []monitorEvent `json:"events"`
	}
	if err = c.BodyParser(&payload); err != nil || len(payload.Events) < 1 || len(payload.Events) > 25 {
		return failure(c, 400, "1-25 events required")
	}
	for i := range payload.Events {
		ev := &payload.Events[i]
		if _, err = uuid.Parse(ev.ID); err != nil {
			return failure(c, 400, "invalid event id")
		}
		if !monitorKinds[ev.Kind] || (ev.Source != "extension" && ev.Source != "page") {
			return failure(c, 400, "unknown event type")
		}
		if ev.Source == "page" && ev.Kind != "page_hidden" && ev.Kind != "page_visible" {
			return failure(c, 400, "page event kind not permitted")
		}
		if ev.Kind != "site_active" && ev.Kind != "search_query" && ev.Kind != "ai_prompt" && ev.Kind != "external_copy" && ev.Domain != "" {
			return failure(c, 400, "domain only valid for site_active")
		}
		ev.Domain = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(ev.Domain)), ".")
		if ev.Domain != "" && (!monitorDomain.MatchString(ev.Domain) || strings.Contains(ev.Domain, "..")) {
			return failure(c, 400, "invalid domain")
		}
		// Only explicit evidence kinds may contain text; never accept content from arbitrary event types.
		// Preserve indentation in submitted source code and prompts.
		contentKind := ev.Kind == "search_query" || ev.Kind == "ai_prompt" || ev.Kind == "external_copy" || ev.Kind == "exam_paste"
		if (ev.Text != "" && !contentKind) || len([]rune(ev.Text)) > 2000 || len(ev.Text) > 8000 {
			return failure(c, 400, "invalid evidence text")
		}
		if ev.Kind == "exam_paste" && ev.Domain != "" {
			return failure(c, 400, "exam paste must not specify external domain")
		}
		if contentKind && ev.Source != "extension" {
			return failure(c, 400, "text evidence must originate in extension")
		}
		if ev.DurationSeconds < 0 || ev.DurationSeconds > 86400 {
			return failure(c, 400, "duration out of range")
		}
		if ev.At != nil && (ev.At.After(time.Now().Add(2*time.Minute)) || ev.At.Before(time.Now().Add(-5*time.Hour))) {
			return failure(c, 400, "event time outside accepted range")
		}
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var total int
	err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid`, aid).Scan(&total)
	if err != nil {
		return err
	}
	if total+len(payload.Events) > 3000 {
		return failure(c, 429, "maximum monitoring events reached")
	}
	for _, ev := range payload.Events {
		// IDs make resending queued extension events idempotent.
		_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exam_monitor_events(id,attempt_id,event_kind,source,domain,duration_seconds,reported_at,event_text)
          VALUES($1::uuid,$2::uuid,$3,$4,NULLIF($5::text,''),$6,$7,NULLIF($8::text,''))
          ON CONFLICT(id) DO NOTHING`, ev.ID, aid, ev.Kind, ev.Source, ev.Domain, ev.DurationSeconds, ev.At, ev.Text)
		if err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"recorded": len(payload.Events)})
}

func (h *Handler) teacherMonitorAttempt(c *fiber.Ctx) (string, int, error) {
	eid, _, _, threshold, err := h.monitorExam(c, true)
	if err != nil {
		return "", 0, err
	}
	aid := c.Params("attemptID")
	if _, err = uuid.Parse(aid); err != nil {
		return "", 0, fiber.NewError(400, "invalid attempt id")
	}
	var found bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts
      WHERE id=$1::uuid AND exam_id=$2::uuid)`, aid, eid).Scan(&found)
	if err != nil {
		return "", 0, err
	}
	if !found {
		return "", 0, fiber.NewError(404, "attempt not found")
	}
	return aid, threshold, nil
}
func (h *Handler) MonitorReport(c *fiber.Ctx) error {
	aid, threshold, err := h.teacherMonitorAttempt(c)
	if err != nil {
		return err
	}
	var exits, sites, interruptions int
	var searches, prompts, pasted, copies int
	err = h.db.QueryRow(c.UserContext(), `WITH exits AS (
      SELECT COALESCE(reported_at,recorded_at) AS at,
        lag(COALESCE(reported_at,recorded_at)) OVER (ORDER BY COALESCE(reported_at,recorded_at)) AS previous
      FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid
        AND event_kind IN ('tab_switched','window_blur','window_minimized')
    ) SELECT
      (SELECT count(*) FROM exits WHERE previous IS NULL OR at-previous > interval '8 seconds'),
      (SELECT count(*) FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid AND event_kind='site_active'),
      (SELECT count(*) FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid AND event_kind='session_interruption')`, aid).Scan(&exits, &sites, &interruptions)
	if err != nil {
		return err
	}
	err = h.db.QueryRow(c.UserContext(), `SELECT
      count(*) FILTER(WHERE event_kind='search_query'),
      count(*) FILTER(WHERE event_kind='ai_prompt'),
      count(*) FILTER(WHERE event_kind='exam_paste'),
      count(*) FILTER(WHERE event_kind='external_copy')
      FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid`, aid).Scan(&searches, &prompts, &pasted, &copies)
	if err != nil {
		return err
	}
	// Deduplicate earlier reports as well as preventing duplicate new paste ingestion.
	// Keep original rows stored for audit; only collapse identical rapid repeats in the view.
	err = h.db.QueryRow(c.UserContext(), `WITH paste_order AS (
      SELECT COALESCE(reported_at,recorded_at) AS at,
      LAG(COALESCE(reported_at,recorded_at)) OVER (
        PARTITION BY event_text ORDER BY COALESCE(reported_at,recorded_at),id) AS previous
      FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid AND event_kind='exam_paste'
    ) SELECT COUNT(*) FROM paste_order WHERE previous IS NULL OR at-previous>interval '1200 milliseconds'`, aid).Scan(&pasted)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `WITH ordered AS (
      SELECT id,event_kind,source,domain,duration_seconds,COALESCE(reported_at,recorded_at) AS at,event_text,
      LAG(COALESCE(reported_at,recorded_at)) OVER (
        PARTITION BY event_kind,event_text ORDER BY COALESCE(reported_at,recorded_at),id) AS previous
      FROM classroom_exam_monitor_events WHERE attempt_id=$1::uuid
    ) SELECT event_kind,source,COALESCE(domain,''),duration_seconds,at,COALESCE(event_text,'')
      FROM ordered WHERE event_kind<>'exam_paste' OR previous IS NULL OR at-previous>interval '1200 milliseconds'
      ORDER BY at DESC LIMIT 120`, aid)
	if err != nil {
		return err
	}
	defer rows.Close()
	events := make([]fiber.Map, 0)
	for rows.Next() {
		var kind, source, domain, evidenceText string
		var dur int
		var at time.Time
		if err = rows.Scan(&kind, &source, &domain, &dur, &at, &evidenceText); err != nil {
			return err
		}
		events = append(events, fiber.Map{"kind": kind, "source": source, "domain": domain, "duration_seconds": dur, "recorded_at": at, "text": evidenceText})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	var consent, connected bool
	var last *time.Time
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_monitor_heartbeats WHERE attempt_id=$1::uuid),
      COALESCE((SELECT extension_connected FROM classroom_exam_monitor_heartbeats WHERE attempt_id=$1::uuid),false),
      (SELECT last_seen FROM classroom_exam_monitor_heartbeats WHERE attempt_id=$1::uuid)`, aid).Scan(&consent, &connected, &last)
	if err != nil {
		return err
	}
	current := last != nil && time.Since(*last) < 35*time.Second
	flags := make([]string, 0)
	if exits >= threshold {
		flags = append(flags, "Repeated exam/browser exits; investigate context")
	}
	if interruptions > 0 {
		flags = append(flags, "Exam connection interrupted; may be caused by network or browser closure")
	}
	if !consent {
		flags = append(flags, "No monitoring consent/heartbeat recorded")
	}
	return result(c, 200, fiber.Map{"summary": fiber.Map{"exits": exits, "external_sites": sites, "interruptions": interruptions, "searches": searches, "ai_prompts": prompts, "exam_pastes": pasted, "external_copies": copies,
		"consented": consent, "extension_connected": connected && current, "heartbeat_current": current, "last_seen": last,
		"red_flag_events": maxInt(0, exits-threshold+1)}, "flags": flags, "events": events,
		"notice": "These are incomplete browser-profile signals, not proof of cheating. Only search terms, newly submitted supported-AI prompts, supported-site selection copies and exam pastes are collected after explicit exam consent; coverage is incomplete. Events are not proof of cheating."})
}
func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (h *Handler) LiveMonitor(c *fiber.Ctx) error {
	eid, _, enabled, threshold, err := h.monitorExam(c, true)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT a.id::text,
      COALESCE(cm.student_roll,''),COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,''),
      a.status, hb.last_seen, COALESCE(hb.extension_connected,false),
      (SELECT count(*) FROM (
        SELECT COALESCE(ev.reported_at,ev.recorded_at) AS at,
          lag(COALESCE(ev.reported_at,ev.recorded_at)) OVER
          (ORDER BY COALESCE(ev.reported_at,ev.recorded_at)) AS previous
        FROM classroom_exam_monitor_events ev WHERE ev.attempt_id=a.id
          AND ev.event_kind IN ('tab_switched','window_blur','window_minimized')
      ) exit_events WHERE previous IS NULL OR at-previous > interval '8 seconds'),
      (SELECT count(*) FROM classroom_exam_monitor_events ev WHERE ev.attempt_id=a.id
        AND ev.event_kind='session_interruption')
      FROM classroom_exam_attempts a JOIN users u ON u.id=a.student_id
      LEFT JOIN classroom_memberships cm ON cm.user_id=a.student_id AND cm.classroom_id=$2::uuid
      LEFT JOIN classroom_exam_monitor_heartbeats hb ON hb.attempt_id=a.id
      WHERE a.exam_id=$1::uuid ORDER BY cm.student_roll ASC NULLS LAST LIMIT 300`, eid, c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var aid, roll, name, status string
		var last *time.Time
		var ext bool
		var exits, interrupts int
		if err = rows.Scan(&aid, &roll, &name, &status, &last, &ext, &exits, &interrupts); err != nil {
			return err
		}
		current := last != nil && time.Since(*last) < 35*time.Second
		items = append(items, fiber.Map{"attempt_id": aid, "roll": roll, "student_name": strings.TrimSpace(name),
			"status": status, "heartbeat_current": current, "extension_connected": ext && current,
			"exits": exits, "interruptions": interrupts, "red_flag_events": maxInt(0, exits-threshold+1)})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, 200, fiber.Map{"enabled": enabled, "flag_after_exits": threshold, "students": items})
}
