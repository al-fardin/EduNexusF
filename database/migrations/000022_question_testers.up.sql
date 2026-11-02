CREATE TABLE IF NOT EXISTS classroom_question_testers (
    id UUID PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
    executable BYTEA NOT NULL CHECK (octet_length(executable) BETWEEN 64 AND 10485760),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_testers_classroom ON classroom_question_testers(classroom_id);
CREATE TABLE IF NOT EXISTS classroom_tester_tickets (
    token_hash TEXT PRIMARY KEY,
    tester_id UUID NOT NULL REFERENCES classroom_question_testers(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES classroom_exam_attempts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
