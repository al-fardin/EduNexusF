DROP TABLE IF EXISTS classroom_message_stars;
ALTER TABLE classroom_messages DROP COLUMN duration_ms,DROP COLUMN emoji_size,DROP COLUMN kind;
