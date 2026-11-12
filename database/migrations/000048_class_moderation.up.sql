CREATE TABLE classroom_staff_permissions (
 classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 permissions JSONB NOT NULL CHECK(jsonb_typeof(permissions)='object'),updated_by UUID REFERENCES users(id) ON DELETE SET NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(classroom_id,user_id)
);
CREATE TABLE conversation_blocks (
 conversation_id UUID REFERENCES classroom_conversations(id) ON DELETE CASCADE,user_id UUID REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE classroom_message_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 message_id BIGINT NOT NULL REFERENCES classroom_messages(id) ON DELETE CASCADE,reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,message_text TEXT NOT NULL,file_name TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL CHECK(char_length(reason) BETWEEN 10 AND 2000),status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
 decision TEXT NOT NULL DEFAULT '',reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),reviewed_at TIMESTAMPTZ,version INTEGER NOT NULL DEFAULT 1,
 UNIQUE(reporter_id,message_id)
);
CREATE INDEX classroom_message_reports_page ON classroom_message_reports(classroom_id,status,created_at DESC);
CREATE TABLE classroom_message_report_events (
 id BIGSERIAL PRIMARY KEY,report_id UUID NOT NULL REFERENCES classroom_message_reports(id) ON DELETE CASCADE,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,status TEXT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
