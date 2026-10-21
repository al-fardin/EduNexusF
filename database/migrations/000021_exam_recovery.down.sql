ALTER TABLE classroom_exam_attempts DROP CONSTRAINT IF EXISTS exam_attempt_revision_nonnegative;
ALTER TABLE classroom_exam_attempts DROP COLUMN IF EXISTS last_saved_at;
ALTER TABLE classroom_exam_attempts DROP COLUMN IF EXISTS revision;
