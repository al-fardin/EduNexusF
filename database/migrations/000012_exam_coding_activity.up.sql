-- Phase 3 additive tables. No existing users, exams or submissions modified.
CREATE TABLE IF NOT EXISTS classroom_exam_activity_events (
  id BIGSERIAL PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(64),
  event_kind VARCHAR(32) NOT NULL CHECK (event_kind IN ('paste','editor_edit','visibility_hidden','visibility_visible')),
  magnitude INTEGER NOT NULL DEFAULT 0 CHECK (magnitude BETWEEN 0 AND 20000),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_activity_attempt_time ON classroom_exam_activity_events(attempt_id,recorded_at);
CREATE TABLE IF NOT EXISTS classroom_exam_code_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL,
  language VARCHAR(24) NOT NULL,
  source_sha256 VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  stdout_preview TEXT NOT NULL DEFAULT '',
  stderr_preview TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_code_runs_attempt_time ON classroom_exam_code_runs(attempt_id,created_at DESC);
-- Exactly one in-flight run per student attempt, even across concurrent HTTP requests.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_code_runs_one_running ON classroom_exam_code_runs(attempt_id) WHERE status='running';
