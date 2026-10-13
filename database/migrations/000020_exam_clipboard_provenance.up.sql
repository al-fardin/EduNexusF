-- Phase 14C: keep server receipt timestamps and separate client observation time.
-- No clipboard contents are stored in desktop telemetry.
ALTER TABLE classroom_exam_desktop_events
  ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ;
ALTER TABLE classroom_exam_desktop_events DROP CONSTRAINT IF EXISTS classroom_exam_desktop_events_kind_check;
ALTER TABLE classroom_exam_desktop_events ADD CONSTRAINT classroom_exam_desktop_events_kind_check
  CHECK (kind IN ('client_started','foreground_app','clipboard_changed','client_stopped','monitor_gap','capability_unavailable'));
CREATE INDEX IF NOT EXISTS idx_desktop_observed_attempt
  ON classroom_exam_desktop_events(attempt_id, observed_at DESC);
