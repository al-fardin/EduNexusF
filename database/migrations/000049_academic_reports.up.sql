CREATE TABLE classroom_academic_reports(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 request_id UUID NOT NULL,payload_hash TEXT NOT NULL,snapshot JSONB NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','withdrawn')),version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),published_at TIMESTAMPTZ,UNIQUE(created_by,request_id)
);
CREATE INDEX academic_reports_class ON classroom_academic_reports(classroom_id,created_at DESC,id);
CREATE INDEX academic_reports_student ON classroom_academic_reports(student_id,classroom_id,created_at DESC);
CREATE TABLE classroom_academic_report_events(id BIGSERIAL PRIMARY KEY,report_id UUID NOT NULL REFERENCES classroom_academic_reports(id) ON DELETE CASCADE,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,status TEXT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
