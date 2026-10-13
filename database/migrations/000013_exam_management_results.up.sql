-- Additive only: teacher controls and per-student result publication.
ALTER TABLE classroom_exams ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS classroom_exam_question_marks (
  attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  awarded_points INTEGER NOT NULL CHECK (awarded_points >= 0),
  feedback TEXT NOT NULL DEFAULT '',
  grader_kind VARCHAR(16) NOT NULL CHECK (grader_kind IN ('auto', 'teacher')),
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS classroom_exam_result_publications (
  attempt_id UUID PRIMARY KEY REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
  published_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS classroom_exam_marksheets (
  exam_id UUID PRIMARY KEY REFERENCES classroom_exams(id) ON DELETE CASCADE,
  pdf_bytes BYTEA NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_results_published ON classroom_exam_result_publications(published_at DESC);
