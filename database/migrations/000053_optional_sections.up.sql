CREATE TABLE classroom_sections(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,name TEXT NOT NULL CHECK(char_length(name) BETWEEN 1 AND 60),version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(classroom_id,id));
CREATE UNIQUE INDEX classroom_section_name ON classroom_sections(classroom_id,lower(name));
ALTER TABLE classroom_memberships ADD COLUMN section_id UUID,ADD COLUMN roster_version INTEGER NOT NULL DEFAULT 1,ADD CONSTRAINT membership_section FOREIGN KEY(classroom_id,section_id) REFERENCES classroom_sections(classroom_id,id);
CREATE INDEX classroom_section_roster ON classroom_memberships(classroom_id,section_id,user_id) WHERE status='active' AND member_role='student';
CREATE TABLE classroom_roster_events(id BIGSERIAL PRIMARY KEY,classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,user_id UUID REFERENCES users(id) ON DELETE SET NULL,actor_id UUID REFERENCES users(id) ON DELETE SET NULL,before_value JSONB NOT NULL,after_value JSONB NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX classroom_roster_history ON classroom_roster_events(classroom_id,created_at DESC,id DESC);
CREATE OR REPLACE FUNCTION edunexus_audience_matches(policy JSONB,roll TEXT,section UUID) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE mode TEXT:=COALESCE(policy->>'mode','all'); value TEXT:=upper(trim(COALESCE(roll,''))); digits TEXT; n NUMERIC; numeric_match BOOLEAN:=false; parity TEXT;
BEGIN
 IF COALESCE(policy->'exclude_rolls','[]'::jsonb) ? value THEN RETURN false; END IF;
 IF jsonb_array_length(COALESCE(policy->'section_ids','[]'::jsonb))>0 AND (section IS NULL OR NOT(policy->'section_ids' ? section::text)) THEN RETURN false; END IF;
 IF mode='sections' THEN RETURN jsonb_array_length(COALESCE(policy->'section_ids','[]'::jsonb))>0;END IF;
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

CREATE OR REPLACE FUNCTION edunexus_audience_matches(policy JSONB,roll TEXT) RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$ SELECT edunexus_audience_matches(policy,roll,NULL::uuid) $$;
CREATE OR REPLACE FUNCTION edunexus_resource_visible(class UUID,kind TEXT,resource UUID,viewer UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE role TEXT; roll TEXT; section UUID; policy JSONB; ref_kind TEXT; ref UUID;
BEGIN
 SELECT member_role,student_roll,section_id INTO role,roll,section FROM classroom_memberships WHERE classroom_id=class AND user_id=viewer AND status='active';
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
 IF policy IS NOT NULL AND kind='exam' AND EXISTS(SELECT 1 FROM classroom_exam_attempts WHERE exam_id=resource AND student_id=viewer) THEN RETURN true;END IF;
 IF policy IS NOT NULL AND kind='assignment' AND EXISTS(SELECT 1 FROM classroom_assignment_submissions WHERE assignment_id=resource AND student_id=viewer) THEN RETURN true;END IF;
 RETURN policy IS NOT NULL AND edunexus_audience_matches(policy,roll,section);
END $$;


CREATE FUNCTION edunexus_roster_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (NEW.student_roll,NEW.section_id) IS DISTINCT FROM (OLD.student_roll,OLD.section_id) THEN NEW.roster_version:=OLD.roster_version+1;END IF;RETURN NEW;END $$;
CREATE TRIGGER roster_version BEFORE UPDATE OF student_roll,section_id ON classroom_memberships FOR EACH ROW EXECUTE FUNCTION edunexus_roster_version();
