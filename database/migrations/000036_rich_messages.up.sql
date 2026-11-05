ALTER TABLE classroom_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','emoji','voice')),
 ADD COLUMN emoji_size INTEGER NOT NULL DEFAULT 1 CHECK(emoji_size BETWEEN 1 AND 3),
 ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0 CHECK(duration_ms BETWEEN 0 AND 120000);
CREATE TABLE classroom_message_stars(user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,message_id BIGINT NOT NULL REFERENCES classroom_messages(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(user_id,message_id));
