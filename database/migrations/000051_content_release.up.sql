CREATE TABLE classroom_content_schedules (
 resource_id UUID PRIMARY KEY,
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('assignment','material')),
 assignment_id UUID UNIQUE REFERENCES classroom_assignments(id) ON DELETE CASCADE,
 material_id UUID UNIQUE REFERENCES classroom_materials(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 publish_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL DEFAULT 'scheduled' CHECK(state IN ('scheduled','published','cancelled','blocked')),
 version INTEGER NOT NULL DEFAULT 1,
 error TEXT NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(assignment_id,material_id)=1 AND resource_id=COALESCE(assignment_id,material_id) AND ((kind='assignment')=(assignment_id IS NOT NULL)))
);
CREATE INDEX content_schedule_due ON classroom_content_schedules(publish_at,resource_id) WHERE state='scheduled';
CREATE INDEX content_schedule_class ON classroom_content_schedules(classroom_id,updated_at DESC,resource_id);
CREATE INDEX progress_active_roster ON classroom_memberships(classroom_id,student_roll,user_id) WHERE status='active' AND member_role='student';
