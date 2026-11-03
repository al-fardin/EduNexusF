DROP TABLE IF EXISTS conversation_message_themes,classroom_message_themes,classroom_messaging_restrictions,classroom_messaging_policy;
DELETE FROM classroom_messages WHERE body='';
ALTER TABLE classroom_messages DROP CONSTRAINT classroom_messages_body_check;
ALTER TABLE classroom_messages ADD CONSTRAINT classroom_messages_body_check CHECK(char_length(body) BETWEEN 1 AND 4000);
ALTER TABLE classroom_messages DROP COLUMN file_name,DROP COLUMN file_size,DROP COLUMN media_type,DROP COLUMN storage_key,DROP COLUMN file_hash;
