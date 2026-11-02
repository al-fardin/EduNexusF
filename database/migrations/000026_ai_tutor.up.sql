CREATE TABLE IF NOT EXISTS classroom_tutor_sources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 created_by UUID NOT NULL REFERENCES users(id),
 material_id UUID REFERENCES classroom_materials(id) ON DELETE CASCADE,
 title VARCHAR(200) NOT NULL,
 content TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL CHECK(kind IN ('text','pdf')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(classroom_id,material_id)
);
CREATE INDEX IF NOT EXISTS tutor_source_class ON classroom_tutor_sources(classroom_id);
CREATE TABLE IF NOT EXISTS classroom_tutor_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,
 question TEXT NOT NULL,
 answer TEXT NOT NULL DEFAULT '',
 citations JSONB NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(classroom_id,user_id,request_id)
);
CREATE INDEX IF NOT EXISTS tutor_user_history ON classroom_tutor_messages(classroom_id,user_id,created_at DESC);
