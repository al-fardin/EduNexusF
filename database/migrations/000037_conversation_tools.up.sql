CREATE TABLE conversation_preferences (
 conversation_id UUID NOT NULL REFERENCES classroom_conversations(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 muted_until TIMESTAMPTZ,
 PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE conversation_pins (
 conversation_id UUID NOT NULL REFERENCES classroom_conversations(id) ON DELETE CASCADE,
 message_id BIGINT NOT NULL REFERENCES classroom_messages(id) ON DELETE CASCADE,
 pinned_by UUID NOT NULL REFERENCES users(id),
 pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(conversation_id,message_id)
);
CREATE FUNCTION conversation_tools_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t UUID; c UUID; recipients UUID[];
BEGIN
 t:=COALESCE(NEW.conversation_id,OLD.conversation_id);
 SELECT classroom_id,ARRAY[user_low,user_high] INTO c,recipients FROM classroom_conversations WHERE id=t;
 IF TG_TABLE_NAME='conversation_preferences' THEN recipients:=ARRAY[COALESCE(NEW.user_id,OLD.user_id)]; END IF;
 PERFORM pg_notify('edunexus_realtime',json_build_object('kind','conversation_tools','classroom_id',c,'conversation_id',t,'users',recipients)::text);
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER realtime_preferences AFTER INSERT OR UPDATE OR DELETE ON conversation_preferences FOR EACH ROW EXECUTE FUNCTION conversation_tools_event();
CREATE TRIGGER realtime_pins AFTER INSERT OR DELETE ON conversation_pins FOR EACH ROW EXECUTE FUNCTION conversation_tools_event();
CREATE FUNCTION remove_deleted_message_pin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL THEN DELETE FROM conversation_pins WHERE message_id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER remove_message_pin AFTER UPDATE OF deleted_at ON classroom_messages FOR EACH ROW EXECUTE FUNCTION remove_deleted_message_pin();
