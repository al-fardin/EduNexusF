-- Phase 11: additive, exam-scoped, teacher-only review evidence.
CREATE TABLE IF NOT EXISTS classroom_exam_monitor_policy (
  exam_id UUID PRIMARY KEY REFERENCES classroom_exams(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  flag_after_exits SMALLINT NOT NULL DEFAULT 2 CHECK(flag_after_exits BETWEEN 1 AND 10),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS classroom_exam_monitor_heartbeats (
  attempt_id UUID PRIMARY KEY REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  extension_connected BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS classroom_exam_monitor_events (
  id UUID PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  event_kind VARCHAR(32) NOT NULL CHECK(event_kind IN (
    'tab_switched','site_active','window_blur','window_focus','window_minimized',
    'exam_tab_closed','exam_tab_returned','extension_started','extension_stopped',
    'session_interruption','page_hidden','page_visible'
  )),
  source VARCHAR(12) NOT NULL CHECK(source IN ('extension','page','server')),
  domain VARCHAR(253),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds BETWEEN 0 AND 86400),
  reported_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_monitor_events_attempt_time ON classroom_exam_monitor_events(attempt_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_monitor_events_attempt_kind ON classroom_exam_monitor_events(attempt_id,event_kind);
