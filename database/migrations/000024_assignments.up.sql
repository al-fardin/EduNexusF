CREATE TABLE IF NOT EXISTS classroom_assignments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 created_by UUID NOT NULL REFERENCES users(id),
 title VARCHAR(200) NOT NULL,
 instructions TEXT NOT NULL DEFAULT '',
 due_at TIMESTAMPTZ NOT NULL,
 max_points INTEGER NOT NULL CHECK(max_points BETWEEN 1 AND 1000),
 allow_late BOOLEAN NOT NULL DEFAULT false,
 allow_resubmit BOOLEAN NOT NULL DEFAULT true,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_class ON classroom_assignments(classroom_id,due_at);
CREATE TABLE IF NOT EXISTS classroom_assignment_submissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
 student_id UUID NOT NULL REFERENCES users(id),
 version INTEGER NOT NULL CHECK(version BETWEEN 1 AND 10),
 request_id UUID NOT NULL,
 answer TEXT NOT NULL DEFAULT '',
 file_name TEXT NOT NULL DEFAULT '',
 file_bytes BYTEA,
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 awarded_points INTEGER CHECK(awarded_points>=0),
 feedback TEXT NOT NULL DEFAULT '',
 graded_by UUID REFERENCES users(id),
 graded_at TIMESTAMPTZ,
 UNIQUE(assignment_id,student_id,version),
 UNIQUE(assignment_id,student_id,request_id),
 CHECK(file_bytes IS NULL OR octet_length(file_bytes)<=15728640)
);
CREATE INDEX IF NOT EXISTS assignment_student_history ON classroom_assignment_submissions(assignment_id,student_id,version DESC);
