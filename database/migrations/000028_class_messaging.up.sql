CREATE TABLE IF NOT EXISTS classroom_conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 user_low UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 user_high UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 low_last_read BIGINT NOT NULL DEFAULT 0,
 high_last_read BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(user_low < user_high),
 UNIQUE(classroom_id,user_low,user_high)
);
CREATE INDEX IF NOT EXISTS classroom_conversations_low_idx ON classroom_conversations(user_low,classroom_id);
CREATE INDEX IF NOT EXISTS classroom_conversations_high_idx ON classroom_conversations(user_high,classroom_id);
CREATE TABLE IF NOT EXISTS classroom_messages (
 id BIGSERIAL PRIMARY KEY,
 conversation_id UUID NOT NULL REFERENCES classroom_conversations(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_request_id UUID NOT NULL,
 body TEXT NOT NULL CHECK(char_length(body) BETWEEN 1 AND 4000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(sender_id,client_request_id)
);
CREATE INDEX IF NOT EXISTS classroom_messages_history_idx ON classroom_messages(conversation_id,id DESC);
CREATE INDEX IF NOT EXISTS classroom_messages_sender_idx ON classroom_messages(sender_id,created_at DESC);
