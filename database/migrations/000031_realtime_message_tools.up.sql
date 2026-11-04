ALTER TABLE classroom_messages ADD COLUMN reply_to_id BIGINT REFERENCES classroom_messages(id) ON DELETE SET NULL, ADD COLUMN edited_at TIMESTAMPTZ, ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX messages_conversation_reply ON classroom_messages(conversation_id,reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE TABLE realtime_tickets(ticket_hash TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,session_expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX realtime_ticket_expiry ON realtime_tickets(expires_at);
CREATE OR REPLACE FUNCTION edunexus_realtime_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c UUID; t UUID; recipients UUID[]; kind TEXT; actor UUID; target UUID; title TEXT;
BEGIN
 kind:=TG_TABLE_NAME;
 IF TG_TABLE_NAME='classroom_messages' THEN t:=NEW.conversation_id;actor:=NEW.sender_id;
 ELSIF TG_TABLE_NAME='classroom_message_reactions' THEN SELECT conversation_id INTO t FROM classroom_messages WHERE id=COALESCE(NEW.message_id,OLD.message_id);
 ELSIF TG_TABLE_NAME='conversation_shared_message_themes' THEN t:=COALESCE(NEW.conversation_id,OLD.conversation_id);
 ELSIF TG_TABLE_NAME='classroom_conversations' THEN t:=NEW.id;
 ELSIF TG_TABLE_NAME='user_notifications' THEN c:=NEW.classroom_id;recipients:=ARRAY[NEW.user_id];
 ELSE c:=COALESCE(NEW.classroom_id,OLD.classroom_id);
 END IF;
 IF t IS NOT NULL THEN
  SELECT classroom_id,ARRAY[user_low,user_high] INTO c,recipients FROM classroom_conversations WHERE id=t;
 END IF;
 IF c IS NOT NULL THEN
  SELECT array_agg(m.user_id) INTO recipients FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=c AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND (recipients IS NULL OR m.user_id=ANY(recipients));
 END IF;
 IF cardinality(recipients)>0 THEN PERFORM pg_notify('edunexus_events',json_build_object('users',recipients,'classroom_id',c,'conversation_id',t,'kind',kind)::text); END IF;
 IF TG_TABLE_NAME='classroom_messages' AND TG_OP='INSERT' THEN
  SELECT name INTO title FROM classrooms WHERE id=c;
  SELECT u INTO target FROM unnest(recipients) u WHERE u<>actor LIMIT 1;
  IF target IS NOT NULL THEN
   INSERT INTO user_notifications(user_id,classroom_id,event_key,kind,title,body,url,email_status) VALUES(target,c,'message:'||NEW.id,'message','New message in '||left(title,150),'You have a new class message.','/messages?class='||c||'&thread='||t,'skipped') ON CONFLICT(user_id,event_key) DO NOTHING;
  END IF;
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER realtime_messages AFTER INSERT OR UPDATE ON classroom_messages FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_reactions AFTER INSERT OR UPDATE OR DELETE ON classroom_message_reactions FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_conversation_theme AFTER INSERT OR UPDATE OR DELETE ON conversation_shared_message_themes FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_class_theme AFTER INSERT OR UPDATE OR DELETE ON classroom_shared_message_themes FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_class_policy AFTER INSERT OR UPDATE OR DELETE ON classroom_messaging_policy FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_student_policy AFTER INSERT OR UPDATE OR DELETE ON classroom_messaging_restrictions FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_reads AFTER UPDATE OF low_last_read,high_last_read ON classroom_conversations FOR EACH ROW WHEN(OLD.low_last_read IS DISTINCT FROM NEW.low_last_read OR OLD.high_last_read IS DISTINCT FROM NEW.high_last_read) EXECUTE FUNCTION edunexus_realtime_event();
CREATE TRIGGER realtime_notifications AFTER INSERT OR UPDATE ON user_notifications FOR EACH ROW EXECUTE FUNCTION edunexus_realtime_event();
