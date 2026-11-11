CREATE TABLE classroom_calendar_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 200),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=4000),
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 CHECK(ends_at>=starts_at AND ends_at<=starts_at+interval '7 days')
);
CREATE INDEX calendar_events_class_time ON classroom_calendar_events(classroom_id,starts_at);
CREATE TABLE calendar_reminders (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('exam','assignment','event')),
 resource_id UUID NOT NULL,
 lead_minutes INTEGER NOT NULL CHECK(lead_minutes IN (15,60,1440)),
 sent_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,kind,resource_id)
);
CREATE INDEX calendar_reminders_pending ON calendar_reminders(classroom_id,resource_id) WHERE sent_at IS NULL;
CREATE TABLE classroom_attendance (
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day DATE NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('present','absent','excused')),
 marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(classroom_id,student_id,day)
);
CREATE TABLE classroom_bulk_operations (
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 payload_hash TEXT NOT NULL,
 result JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(classroom_id,request_id)
);
