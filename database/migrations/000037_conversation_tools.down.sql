DROP TRIGGER IF EXISTS remove_message_pin ON classroom_messages;
DROP FUNCTION IF EXISTS remove_deleted_message_pin();
DROP TABLE IF EXISTS conversation_pins,conversation_preferences;
DROP FUNCTION IF EXISTS conversation_tools_event();
