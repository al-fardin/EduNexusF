-- Old clients cannot represent section restrictions. Keep them hidden for teacher review after rollback.
UPDATE classroom_exams SET audience=(audience-'section_ids')||'{"mode":"custom","rolls":[]}'::jsonb WHERE audience->>'mode'='sections' OR jsonb_array_length(COALESCE(audience->'section_ids','[]'::jsonb))>0;
UPDATE classroom_assignments SET audience=(audience-'section_ids')||'{"mode":"custom","rolls":[]}'::jsonb WHERE audience->>'mode'='sections' OR jsonb_array_length(COALESCE(audience->'section_ids','[]'::jsonb))>0;
UPDATE classroom_materials SET audience=(audience-'section_ids')||'{"mode":"custom","rolls":[]}'::jsonb WHERE audience->>'mode'='sections' OR jsonb_array_length(COALESCE(audience->'section_ids','[]'::jsonb))>0;
UPDATE classroom_stream_posts SET audience=(audience-'section_ids')||'{"mode":"custom","rolls":[]}'::jsonb WHERE audience->>'mode'='sections' OR jsonb_array_length(COALESCE(audience->'section_ids','[]'::jsonb))>0;
UPDATE classroom_announcement_drafts SET audience=(audience-'section_ids')||'{"mode":"custom","rolls":[]}'::jsonb WHERE audience->>'mode'='sections' OR jsonb_array_length(COALESCE(audience->'section_ids','[]'::jsonb))>0;
DROP TRIGGER roster_version ON classroom_memberships;
DROP FUNCTION edunexus_roster_version();
CREATE OR REPLACE FUNCTION edunexus_audience_matches(policy JSONB,roll TEXT) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
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

CREATE OR REPLACE FUNCTION edunexus_resource_visible(class UUID,kind TEXT,resource UUID,viewer UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
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

DROP FUNCTION edunexus_audience_matches(JSONB,TEXT,UUID);
DROP TABLE classroom_roster_events;
ALTER TABLE classroom_memberships DROP CONSTRAINT membership_section,DROP COLUMN section_id,DROP COLUMN roster_version;
DROP TABLE classroom_sections;
