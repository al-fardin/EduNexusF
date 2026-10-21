-- Phase 15 M1: additive server revisions for conflict-resistant autosave.
-- Existing exam answers, attempts and submitted marks remain untouched.
ALTER TABLE classroom_exam_attempts
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'classroom_exam_attempts'::regclass AND conname = 'exam_attempt_revision_nonnegative') THEN
    ALTER TABLE classroom_exam_attempts
      ADD CONSTRAINT exam_attempt_revision_nonnegative CHECK (revision >= 0);
  END IF;
END $$;
