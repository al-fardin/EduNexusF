ALTER TABLE classroom_exams ADD COLUMN audience JSONB NOT NULL DEFAULT '{"mode":"all"}' CHECK(jsonb_typeof(audience)='object');
ALTER TABLE classroom_assignments ADD COLUMN audience JSONB NOT NULL DEFAULT '{"mode":"all"}' CHECK(jsonb_typeof(audience)='object');
ALTER TABLE classroom_materials ADD COLUMN audience JSONB NOT NULL DEFAULT '{"mode":"all"}' CHECK(jsonb_typeof(audience)='object');
ALTER TABLE classroom_stream_posts ADD COLUMN audience JSONB NOT NULL DEFAULT '{"mode":"all"}' CHECK(jsonb_typeof(audience)='object');
ALTER TABLE classroom_announcement_drafts ADD COLUMN audience JSONB NOT NULL DEFAULT '{"mode":"all"}' CHECK(jsonb_typeof(audience)='object');

CREATE FUNCTION edunexus_audience_matches(policy JSONB,roll TEXT) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE mode TEXT:=COALESCE(policy->>'mode','all'); value TEXT:=upper(trim(COALESCE(roll,''))); digits TEXT; n NUMERIC; numeric_match BOOLEAN:=false; parity TEXT;
BEGIN
 IF COALESCE(policy->'exclude_rolls','[]'::jsonb) ? value THEN RETURN false; END IF;
 IF mode='all' THEN RETURN true; END IF;
 IF value='' THEN RETURN false; END IF;
 IF mode='custom' THEN RETURN COALESCE(policy->'rolls','[]'::jsonb) ? value; END IF;
 digits:=substring(value from '([0-9]+)$');
 IF digits IS NOT NULL THEN
  n:=digits::numeric;parity:=CASE WHEN mode IN ('odd','even') THEN mode ELSE COALESCE(policy->>'parity','any') END;
  numeric_match:=(parity='any' OR (parity='odd' AND mod(n,2)=1) OR (parity='even' AND mod(n,2)=0));
  IF mode='ranges' OR (mode='mixed' AND jsonb_array_length(COALESCE(policy->'ranges','[]'::jsonb))>0) THEN
   numeric_match:=numeric_match AND EXISTS(SELECT 1 FROM jsonb_array_elements(policy->'ranges') r WHERE n BETWEEN (r->>'from')::numeric AND (r->>'to')::numeric);
  ELSIF mode='mixed' AND parity='any' THEN numeric_match:=false;
  END IF;
 END IF;
 RETURN numeric_match OR (mode='mixed' AND COALESCE(policy->'rolls','[]'::jsonb) ? value);
END $$;

CREATE FUNCTION edunexus_resource_visible(class UUID,kind TEXT,resource UUID,viewer UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE role TEXT; roll TEXT; policy JSONB; ref_kind TEXT; ref UUID;
BEGIN
 SELECT member_role,student_roll INTO role,roll FROM classroom_memberships WHERE classroom_id=class AND user_id=viewer AND status='active';
 IF role IS NULL THEN RETURN false; END IF;
 IF role='teacher' THEN RETURN true; END IF;
 CASE kind
 WHEN 'assignment' THEN SELECT audience INTO policy FROM classroom_assignments WHERE id=resource AND classroom_id=class;
 WHEN 'exam' THEN SELECT audience INTO policy FROM classroom_exams WHERE id=resource AND classroom_id=class;
 WHEN 'material' THEN SELECT audience INTO policy FROM classroom_materials WHERE id=resource AND classroom_id=class;
 WHEN 'post','announcement' THEN
  SELECT audience,reference_type,reference_id INTO policy,ref_kind,ref FROM classroom_stream_posts WHERE id=resource AND classroom_id=class AND deleted_at IS NULL;
  IF ref IS NOT NULL AND ref_kind IN ('material','assignment','exam') AND NOT edunexus_resource_visible(class,ref_kind,ref,viewer) THEN RETURN false; END IF;
 WHEN 'event' THEN RETURN true;
 ELSE RETURN false;
 END CASE;
 RETURN policy IS NOT NULL AND edunexus_audience_matches(policy,roll);
END $$;

-- Existing notification callers retain their signature; new coursework events are recipient-scoped.
CREATE OR REPLACE FUNCTION edunexus_notify(p_class UUID,p_actor UUID,p_key TEXT,p_kind TEXT,p_title TEXT,p_body TEXT,p_tab TEXT,p_audience TEXT DEFAULT 'all',p_user UUID DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE resource_kind TEXT:=split_part(p_key,':',1); resource_text TEXT:=split_part(p_key,':',2);
BEGIN
 INSERT INTO user_notifications(user_id,classroom_id,event_key,kind,title,body,url,email_status)
 SELECT m.user_id,p_class,p_key,p_kind,left(p_title,200),left(p_body,2000),
 '/'||CASE WHEN m.member_role='teacher' THEN 'instructor' ELSE 'student' END||'/classrooms/'||p_class||'?tab='||p_tab,
 CASE WHEN COALESCE(pref.email_enabled,true) THEN 'pending' ELSE 'skipped' END
 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id LEFT JOIN notification_preferences pref ON pref.user_id=m.user_id
 WHERE m.classroom_id=p_class AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL
 AND (p_actor IS NULL OR m.user_id<>p_actor) AND (p_user IS NULL OR m.user_id=p_user) AND (p_audience='all' OR m.member_role=p_audience)
 AND CASE WHEN resource_kind IN ('exam','assignment','material','announcement') AND resource_text ~ '^[a-fA-F0-9-]{36}$' THEN edunexus_resource_visible(p_class,resource_kind,resource_text::uuid,m.user_id) ELSE true END
 ON CONFLICT(user_id,event_key) DO NOTHING;
END $$;

-- A material notification belongs to publication, not to a private scheduled upload.
DROP TRIGGER IF EXISTS notify_material_added ON classroom_materials;
CREATE FUNCTION edunexus_material_publication_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.reference_type='material' AND NEW.reference_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
  PERFORM edunexus_notify(NEW.classroom_id,NEW.author_id,'material:'||NEW.reference_id,'material','New material: '||COALESCE(NEW.title,'Learning material'),'A learning resource was added.','classwork');
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER notify_material_published AFTER INSERT ON classroom_stream_posts FOR EACH ROW EXECUTE FUNCTION edunexus_material_publication_notification();

CREATE FUNCTION edunexus_notification_visible(class UUID,event TEXT,viewer UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE kind TEXT:=split_part(event,':',1); resource TEXT:=split_part(event,':',2);
BEGIN
 IF kind='calendar' THEN kind:=split_part(event,':',2);resource:=split_part(event,':',3);END IF;
 IF kind='missing' THEN kind:='assignment';END IF;
 IF kind IN ('exam','assignment','material','announcement') AND resource ~ '^[a-fA-F0-9-]{36}$' THEN RETURN edunexus_resource_visible(class,kind,resource::uuid,viewer);END IF;
 RETURN true;
END $$;
