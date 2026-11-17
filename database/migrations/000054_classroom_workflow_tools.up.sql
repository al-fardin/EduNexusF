CREATE TABLE classroom_accommodations (
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 resource_id UUID NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('exam','assignment')),
 exam_id UUID REFERENCES classroom_exams(id) ON DELETE CASCADE,
 assignment_id UUID REFERENCES classroom_assignments(id) ON DELETE CASCADE,
 student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 extra_minutes INTEGER NOT NULL DEFAULT 0 CHECK(extra_minutes BETWEEN 0 AND 239),
 due_at TIMESTAMPTZ,
 version INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(resource_id,student_id),
 CHECK((kind='exam' AND exam_id IS NOT NULL AND exam_id=resource_id AND assignment_id IS NULL AND due_at IS NULL) OR
       (kind='assignment' AND assignment_id IS NOT NULL AND assignment_id=resource_id AND exam_id IS NULL AND extra_minutes=0))
);
CREATE INDEX classroom_accommodations_class ON classroom_accommodations(classroom_id,kind,resource_id,student_id);
CREATE FUNCTION edunexus_assignment_due(resource UUID,student UUID) RETURNS TIMESTAMPTZ LANGUAGE SQL STABLE AS $$
 SELECT GREATEST(a.due_at,c.due_at) FROM classroom_assignments a LEFT JOIN classroom_accommodations c ON c.resource_id=a.id AND c.student_id=student WHERE a.id=resource
$$;
CREATE FUNCTION edunexus_exam_duration(resource UUID,student UUID) RETURNS INTEGER LANGUAGE SQL STABLE AS $$
 SELECT LEAST(240,e.duration_minutes+COALESCE(c.extra_minutes,0)) FROM classroom_exams e LEFT JOIN classroom_accommodations c ON c.resource_id=e.id AND c.student_id=student WHERE e.id=resource
$$;
CREATE TABLE classroom_material_trash (
 material_id UUID PRIMARY KEY REFERENCES classroom_materials(id) ON DELETE CASCADE,
 deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 post_ids UUID[] NOT NULL DEFAULT '{}'
);
CREATE INDEX classroom_material_trash_expiry ON classroom_material_trash(deleted_at,material_id);
ALTER TABLE classroom_content_schedules ADD COLUMN exam_id UUID UNIQUE REFERENCES classroom_exams(id) ON DELETE CASCADE;
ALTER TABLE classroom_content_schedules DROP CONSTRAINT classroom_content_schedules_kind_check, DROP CONSTRAINT classroom_content_schedules_check;
ALTER TABLE classroom_content_schedules ADD CONSTRAINT classroom_content_schedules_kind_check CHECK(kind IN ('assignment','material','exam')),
 ADD CONSTRAINT classroom_content_schedules_check CHECK(num_nonnulls(assignment_id,material_id,exam_id)=1 AND resource_id=COALESCE(assignment_id,material_id,exam_id) AND ((kind='assignment')=(assignment_id IS NOT NULL)) AND ((kind='material')=(material_id IS NOT NULL)) AND ((kind='exam')=(exam_id IS NOT NULL)));
-- Keep the established audience/participation rules, adding a universal trash gate.
CREATE OR REPLACE FUNCTION edunexus_resource_visible_before_trash(class UUID,kind TEXT,resource UUID,viewer UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
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
CREATE OR REPLACE FUNCTION edunexus_resource_visible(class UUID,kind TEXT,resource UUID,viewer UUID) RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT NOT(kind='material' AND EXISTS(SELECT 1 FROM classroom_material_trash WHERE material_id=resource))
 AND edunexus_resource_visible_before_trash(class,kind,resource,viewer)
$$;
