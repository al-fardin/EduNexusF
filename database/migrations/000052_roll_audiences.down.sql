DROP FUNCTION IF EXISTS edunexus_notification_visible(UUID,TEXT,UUID);
DROP TRIGGER IF EXISTS notify_material_published ON classroom_stream_posts;
DROP FUNCTION IF EXISTS edunexus_material_publication_notification();
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
CREATE TRIGGER notify_material_added AFTER INSERT ON classroom_materials FOR EACH ROW EXECUTE FUNCTION edunexus_learning_notification();
DROP FUNCTION edunexus_resource_visible(UUID,TEXT,UUID,UUID);
DROP FUNCTION edunexus_audience_matches(JSONB,TEXT);
ALTER TABLE classroom_exams DROP COLUMN audience;
ALTER TABLE classroom_assignments DROP COLUMN audience;
ALTER TABLE classroom_materials DROP COLUMN audience;
ALTER TABLE classroom_stream_posts DROP COLUMN audience;
ALTER TABLE classroom_announcement_drafts DROP COLUMN audience;
