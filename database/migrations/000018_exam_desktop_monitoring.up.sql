-- Phase 14A: additive and exam-scoped desktop monitoring.
CREATE TABLE IF NOT EXISTS classroom_exam_desktop_sessions (
 attempt_id UUID PRIMARY KEY REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
 pair_hash BYTEA,
 pair_expires_at TIMESTAMPTZ,
 client_hash BYTEA,
 client_expires_at TIMESTAMPTZ,
 platform VARCHAR(20),
 connected_at TIMESTAMPTZ,
 last_seen TIMESTAMPTZ,
 stopped_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS classroom_exam_desktop_events (
 id UUID PRIMARY KEY,
 attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
 kind VARCHAR(32) NOT NULL CHECK(kind IN ('client_started','foreground_app','client_stopped','monitor_gap','capability_unavailable')),
 app_name VARCHAR(160),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_desktop_events_attempt_time ON classroom_exam_desktop_events(attempt_id, recorded_at DESC);
