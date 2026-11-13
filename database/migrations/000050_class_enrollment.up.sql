ALTER TABLE classrooms
 ADD COLUMN join_mode TEXT NOT NULL DEFAULT 'direct' CHECK(join_mode IN ('direct','approval')),
 ADD COLUMN code_join_enabled BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN class_code_expires_at TIMESTAMPTZ,
 ADD COLUMN join_settings_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE classroom_join_requests(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,student_roll TEXT NOT NULL CHECK(student_roll ~ '^[A-Z0-9][A-Z0-9_/-]{0,31}$'),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
 version INTEGER NOT NULL DEFAULT 1,reason TEXT NOT NULL DEFAULT '',reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(classroom_id,user_id)
);
CREATE INDEX classroom_join_requests_review ON classroom_join_requests(classroom_id,status,updated_at DESC);
CREATE INDEX classroom_join_requests_student ON classroom_join_requests(user_id,updated_at DESC);
CREATE TABLE classroom_join_request_events(id BIGSERIAL PRIMARY KEY,request_id UUID NOT NULL REFERENCES classroom_join_requests(id) ON DELETE CASCADE,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,status TEXT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX classroom_join_request_daily ON classroom_join_request_events(actor_id,created_at) WHERE status='pending';

CREATE TABLE classroom_student_invitations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 email TEXT NOT NULL CHECK(email=lower(email)),invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','revoked')),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '7 days',version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 email_status TEXT NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','sent','failed','skipped')),
 email_attempts INTEGER NOT NULL DEFAULT 0,email_next_at TIMESTAMPTZ NOT NULL DEFAULT now(),email_lease UUID,email_sent_at TIMESTAMPTZ,
 UNIQUE(classroom_id,email)
);
CREATE INDEX classroom_student_invitation_recipient ON classroom_student_invitations(email,status,expires_at);
CREATE INDEX classroom_student_invitation_mail ON classroom_student_invitations(email_next_at) WHERE email_status IN ('pending','sending');
CREATE TABLE classroom_invitation_events(id BIGSERIAL PRIMARY KEY,invitation_id UUID NOT NULL REFERENCES classroom_student_invitations(id) ON DELETE CASCADE,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX classroom_invitation_daily ON classroom_invitation_events(actor_id,created_at) WHERE status='pending';
