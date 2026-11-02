CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 app_enabled BOOLEAN NOT NULL DEFAULT true,
 email_enabled BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS user_notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 event_key TEXT NOT NULL,
 kind TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 url TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 read_at TIMESTAMPTZ,
 email_status TEXT NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','sent','skipped','failed')),
 email_attempts INTEGER NOT NULL DEFAULT 0,
 email_next_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 email_sent_at TIMESTAMPTZ,
 UNIQUE(user_id,event_key)
);
CREATE INDEX IF NOT EXISTS notifications_user_recent ON user_notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_email_pending ON user_notifications(email_next_at) WHERE email_status IN ('pending','sending');

CREATE OR REPLACE FUNCTION edunexus_notify(p_class UUID,p_actor UUID,p_key TEXT,p_kind TEXT,p_title TEXT,p_body TEXT,p_tab TEXT,p_audience TEXT DEFAULT 'all',p_user UUID DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO user_notifications(user_id,classroom_id,event_key,kind,title,body,url,email_status)
 SELECT m.user_id,p_class,p_key,p_kind,left(p_title,200),left(p_body,2000),
   '/'||CASE WHEN m.member_role='teacher' THEN 'instructor' ELSE 'student' END||'/classrooms/'||p_class||'?tab='||p_tab,
   CASE WHEN COALESCE(pref.email_enabled,true) THEN 'pending' ELSE 'skipped' END
 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id
 LEFT JOIN notification_preferences pref ON pref.user_id=m.user_id
 WHERE m.classroom_id=p_class AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL
   AND (p_actor IS NULL OR m.user_id<>p_actor) AND (p_user IS NULL OR m.user_id=p_user)
   AND (p_audience='all' OR m.member_role=p_audience)
 ON CONFLICT(user_id,event_key) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION edunexus_learning_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a RECORD; e RECORD;
BEGIN
 IF TG_TABLE_NAME='classroom_exams' THEN
   IF NEW.status='published' AND OLD.status='draft' THEN PERFORM edunexus_notify(NEW.classroom_id,NEW.created_by,'exam:'||NEW.id,'exam','Exam published: '||NEW.title,'Check the exam schedule and complete entry setup.','exam');END IF;
 ELSIF TG_TABLE_NAME='classroom_assignments' THEN
   IF NEW.status='published' AND OLD.status='draft' THEN PERFORM edunexus_notify(NEW.classroom_id,NEW.created_by,'assignment:'||NEW.id,'assignment','Assignment: '||NEW.title,'A new assignment is available.','classwork');END IF;
 ELSIF TG_TABLE_NAME='classroom_materials' THEN
   PERFORM edunexus_notify(NEW.classroom_id,NEW.uploaded_by,'material:'||NEW.id,'material','New material: '||NEW.title,'A learning resource was added.','classwork');
 ELSIF TG_TABLE_NAME='classroom_stream_posts' THEN
   IF NEW.post_type='announcement' THEN PERFORM edunexus_notify(NEW.classroom_id,NEW.author_id,'announcement:'||NEW.id,'announcement',COALESCE(NEW.title,'Class announcement'),NEW.content,'stream');END IF;
 ELSIF TG_TABLE_NAME='classroom_exam_result_publications' THEN
   SELECT ex.classroom_id,ex.title,at.student_id INTO e FROM classroom_exam_attempts at JOIN classroom_exams ex ON ex.id=at.exam_id WHERE at.id=NEW.attempt_id;
   PERFORM edunexus_notify(e.classroom_id,NEW.published_by,'result:'||NEW.attempt_id||':'||NEW.published_at,'result','Result available: '||e.title,'Your exam result has been published.','results','student',e.student_id);
 ELSIF TG_TABLE_NAME='classroom_assignment_submissions' THEN
   SELECT * INTO a FROM classroom_assignments WHERE id=NEW.assignment_id;
   IF TG_OP='INSERT' THEN PERFORM edunexus_notify(a.classroom_id,NEW.student_id,'submission:'||NEW.id,'submission','New submission: '||a.title,'A student submitted version '||NEW.version||'.','classwork','teacher');
   ELSIF NEW.graded_at IS NOT NULL AND NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
     PERFORM edunexus_notify(a.classroom_id,NEW.graded_by,'grade:'||NEW.id||':'||NEW.graded_at,'grade','Feedback available: '||a.title,'Your assignment has been graded.','classwork','student',NEW.student_id);
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER notify_exam_published AFTER UPDATE OF status ON classroom_exams FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
CREATE OR REPLACE TRIGGER notify_assignment_published AFTER UPDATE OF status ON classroom_assignments FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
CREATE OR REPLACE TRIGGER notify_material_added AFTER INSERT ON classroom_materials FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
CREATE OR REPLACE TRIGGER notify_announcement_added AFTER INSERT ON classroom_stream_posts FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
CREATE OR REPLACE TRIGGER notify_result_published AFTER INSERT OR UPDATE ON classroom_exam_result_publications FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
CREATE OR REPLACE TRIGGER notify_assignment_submission AFTER INSERT OR UPDATE ON classroom_assignment_submissions FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
