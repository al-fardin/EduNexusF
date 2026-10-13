-- Phase 14B: separate pre-exam desktop readiness. Does not create an exam attempt
-- and never stores foreground application events before the exam starts.
CREATE TABLE IF NOT EXISTS classroom_exam_desktop_preflight (
  exam_id UUID NOT NULL REFERENCES classroom_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_hash BYTEA,
  pair_expires_at TIMESTAMPTZ,
  client_hash BYTEA,
  client_expires_at TIMESTAMPTZ,
  platform VARCHAR(20),
  last_seen TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  PRIMARY KEY(exam_id, student_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_desktop_preflight_pair
  ON classroom_exam_desktop_preflight(pair_hash) WHERE pair_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_desktop_preflight_token
  ON classroom_exam_desktop_preflight(client_hash) WHERE client_hash IS NOT NULL;
