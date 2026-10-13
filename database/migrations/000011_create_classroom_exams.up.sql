-- Phase 2: additive Live Exam MVP. No existing table is dropped or changed.
CREATE TABLE classroom_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 240),
    status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    questions JSONB NOT NULL CHECK (jsonb_typeof(questions) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    CHECK (ends_at > starts_at),
    CHECK (char_length(trim(title)) > 0)
);
CREATE INDEX idx_classroom_exams_classroom ON classroom_exams(classroom_id, starts_at DESC);
CREATE TABLE classroom_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES classroom_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
    status VARCHAR(16) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted')),
    submitted_at TIMESTAMPTZ,
    UNIQUE(exam_id, student_id),
    CHECK (expires_at > started_at)
);
CREATE INDEX idx_classroom_exam_attempts_exam ON classroom_exam_attempts(exam_id, status);
