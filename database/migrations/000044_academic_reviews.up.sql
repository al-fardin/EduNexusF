CREATE TABLE classroom_rechecks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 resource_kind TEXT NOT NULL CHECK(resource_kind IN ('assignment','exam')),
 resource_id UUID NOT NULL,
 title TEXT NOT NULL,
 grade_snapshot TEXT NOT NULL,
 grade_summary JSONB NOT NULL,
 reason TEXT NOT NULL CHECK(char_length(reason) BETWEEN 20 AND 2000),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','rejected','withdrawn')),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(student_id,resource_kind,resource_id,grade_snapshot)
);
CREATE INDEX classroom_rechecks_page ON classroom_rechecks(classroom_id,created_at DESC);
CREATE TABLE classroom_recheck_events (
 id BIGSERIAL PRIMARY KEY,
 request_id UUID NOT NULL REFERENCES classroom_rechecks(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 actor_name TEXT NOT NULL,
 status TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX classroom_recheck_events_request ON classroom_recheck_events(request_id,id);
CREATE TABLE classroom_similarity_reviews (
 assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
 submission_low UUID NOT NULL REFERENCES classroom_assignment_submissions(id) ON DELETE CASCADE,
 submission_high UUID NOT NULL REFERENCES classroom_assignment_submissions(id) ON DELETE CASCADE,
 reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
 note TEXT NOT NULL CHECK(char_length(note) BETWEEN 5 AND 2000),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(submission_low<submission_high),
 PRIMARY KEY(assignment_id,submission_low,submission_high)
);
