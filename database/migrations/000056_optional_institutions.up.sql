CREATE TABLE institutions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(char_length(name) BETWEEN 2 AND 140),version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX institution_owner ON institutions(owner_id,id);
CREATE TABLE institution_members (
 institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('owner','admin','teacher','student')),active BOOLEAN NOT NULL DEFAULT true,version INTEGER NOT NULL DEFAULT 1,
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(institution_id,user_id)
);
CREATE UNIQUE INDEX institution_one_owner ON institution_members(institution_id) WHERE role='owner' AND active;
CREATE INDEX institution_member_workspaces ON institution_members(user_id,institution_id) WHERE active;
CREATE TABLE institution_departments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(char_length(name) BETWEEN 1 AND 80),version INTEGER NOT NULL DEFAULT 1,UNIQUE(institution_id,id)
);
CREATE UNIQUE INDEX institution_department_name ON institution_departments(institution_id,lower(name));
CREATE TABLE institution_terms (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(char_length(name) BETWEEN 2 AND 100),starts_on DATE NOT NULL,ends_on DATE NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,UNIQUE(institution_id,id),CHECK(ends_on>=starts_on AND ends_on-starts_on<=730)
);
CREATE UNIQUE INDEX institution_term_name ON institution_terms(institution_id,lower(name),starts_on);
-- No new columns on classrooms: all existing classes remain standalone.
CREATE TABLE institution_classrooms (
 classroom_id UUID PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,department_id UUID,term_id UUID,version INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(institution_id,department_id) REFERENCES institution_departments(institution_id,id),
 FOREIGN KEY(institution_id,term_id) REFERENCES institution_terms(institution_id,id),
 CHECK(institution_id IS NOT NULL OR(department_id IS NULL AND term_id IS NULL))
);
CREATE INDEX institution_class_catalogue ON institution_classrooms(institution_id,department_id,term_id,classroom_id) WHERE institution_id IS NOT NULL;
CREATE TABLE institution_invitations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
 email TEXT NOT NULL CHECK(char_length(email) BETWEEN 3 AND 254),role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
 invited_by UUID REFERENCES users(id) ON DELETE SET NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','revoked','expired')),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT now()+interval '7 days',version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX institution_pending_invite ON institution_invitations(institution_id,email) WHERE status='pending';
CREATE INDEX institution_invite_inbox ON institution_invitations(email,expires_at,id) WHERE status='pending';
CREATE INDEX institution_invite_staff ON institution_invitations(institution_id,created_at DESC,id);
CREATE TABLE institution_activity (
 id BIGSERIAL PRIMARY KEY,institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,actor_name TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT NOT NULL,
 before_value JSONB NOT NULL DEFAULT '{}',after_value JSONB NOT NULL DEFAULT '{}',reason TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX institution_activity_page ON institution_activity(institution_id,id DESC);
