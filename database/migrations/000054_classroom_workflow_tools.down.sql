-- Restoring the old visibility function while files remain in trash could expose them.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM classroom_material_trash) THEN RAISE EXCEPTION 'Restore or permanently remove trashed materials before rollback'; END IF; END $$;
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
DROP FUNCTION edunexus_resource_visible_before_trash(UUID,TEXT,UUID,UUID);
DROP TABLE classroom_material_trash;
DELETE FROM classroom_content_schedules WHERE kind='exam';
ALTER TABLE classroom_content_schedules DROP CONSTRAINT classroom_content_schedules_kind_check, DROP CONSTRAINT classroom_content_schedules_check, DROP COLUMN exam_id;
ALTER TABLE classroom_content_schedules ADD CONSTRAINT classroom_content_schedules_kind_check CHECK(kind IN ('assignment','material')),
 ADD CONSTRAINT classroom_content_schedules_check CHECK(num_nonnulls(assignment_id,material_id)=1 AND resource_id=COALESCE(assignment_id,material_id) AND ((kind='assignment')=(assignment_id IS NOT NULL)));
DROP FUNCTION edunexus_exam_duration(UUID,UUID);
DROP FUNCTION edunexus_assignment_due(UUID,UUID);
DROP TABLE classroom_accommodations;
