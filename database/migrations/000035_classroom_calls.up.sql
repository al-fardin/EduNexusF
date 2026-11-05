CREATE TABLE classroom_calls (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 conversation_id UUID NOT NULL REFERENCES classroom_conversations(id) ON DELETE CASCADE,
 caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_request_id UUID NOT NULL,
 caller_session UUID NOT NULL, callee_session UUID,
 media TEXT NOT NULL CHECK(media IN ('audio','video')),
 state TEXT NOT NULL DEFAULT 'ringing' CHECK(state IN ('ringing','active','ended')),
 reason TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), accepted_at TIMESTAMPTZ,
 connected_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
 caller_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), callee_seen_at TIMESTAMPTZ,
 UNIQUE(caller_id,client_request_id), CHECK(caller_id<>callee_id)
);
CREATE INDEX classroom_calls_thread ON classroom_calls(conversation_id,created_at DESC);
CREATE INDEX classroom_calls_live ON classroom_calls(created_at) WHERE state<>'ended';
CREATE TABLE classroom_call_signals (
 id BIGSERIAL PRIMARY KEY,call_id UUID NOT NULL REFERENCES classroom_calls(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id UUID NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('offer','answer','ice')),
 payload JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(call_id,sender_id,request_id)
);
CREATE INDEX classroom_call_signals_cursor ON classroom_call_signals(call_id,id);
CREATE UNIQUE INDEX classroom_call_description_once ON classroom_call_signals(call_id,kind) WHERE kind IN ('offer','answer');
CREATE FUNCTION edunexus_call_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE callrow classroom_calls;
BEGIN
 IF TG_TABLE_NAME='classroom_calls' THEN callrow:=NEW; ELSE SELECT * INTO callrow FROM classroom_calls WHERE id=NEW.call_id; END IF;
 PERFORM pg_notify('edunexus_events',json_build_object('kind','call','classroom_id',callrow.classroom_id,'conversation_id',callrow.conversation_id,'users',ARRAY[callrow.caller_id,callrow.callee_id])::text);
 IF TG_TABLE_NAME='classroom_calls' THEN
  IF TG_OP='INSERT' THEN
   INSERT INTO user_notifications(user_id,classroom_id,event_key,kind,title,body,url,email_status)
   VALUES(NEW.callee_id,NEW.classroom_id,'call:'||NEW.id,'call','Incoming '||NEW.media||' call','Open EduNexus to answer.','/messages?class='||NEW.classroom_id||'&thread='||NEW.conversation_id||'&call='||NEW.id,'skipped');
  ELSIF NEW.state='ended' THEN
   DELETE FROM classroom_call_signals WHERE call_id=NEW.id;
   UPDATE user_notifications SET read_at=COALESCE(read_at,now()) WHERE event_key='call:'||NEW.id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER classroom_call_changed AFTER INSERT OR UPDATE OF state,connected_at ON classroom_calls FOR EACH ROW EXECUTE FUNCTION edunexus_call_event();
CREATE TRIGGER classroom_call_signaled AFTER INSERT ON classroom_call_signals FOR EACH ROW EXECUTE FUNCTION edunexus_call_event();
