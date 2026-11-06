CREATE TABLE classroom_activity (
 id BIGSERIAL PRIMARY KEY,
 classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 actor_name TEXT NOT NULL,
 action TEXT NOT NULL,
 target_id TEXT NOT NULL,
 title TEXT NOT NULL,
 before_value JSONB NOT NULL DEFAULT '{}',
 after_value JSONB NOT NULL DEFAULT '{}',
 reason TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX classroom_activity_page ON classroom_activity(classroom_id,id DESC);

CREATE FUNCTION record_classroom_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cl UUID; actor UUID; label TEXT; target TEXT; event TEXT;
 previous JSONB := '{}'; following JSONB := '{}'; why TEXT;
BEGIN
 actor := NULLIF(current_setting('edunexus.actor_id',true),'')::uuid;
 why := COALESCE(NULLIF(current_setting('edunexus.activity_reason',true),''),'');
 IF TG_TABLE_NAME='classroom_assignment_submissions' THEN
  IF NEW.awarded_points IS NOT DISTINCT FROM OLD.awarded_points AND NEW.feedback IS NOT DISTINCT FROM OLD.feedback THEN RETURN NEW; END IF;
  SELECT classroom_id,title INTO cl,label FROM classroom_assignments WHERE id=NEW.assignment_id;
  actor := NEW.graded_by; target := NEW.id::text; event := 'assignment_grade';
  previous := jsonb_build_object('points',OLD.awarded_points,'feedback',OLD.feedback,'student_id',OLD.student_id,'version',OLD.version);
  following := jsonb_build_object('points',NEW.awarded_points,'feedback',NEW.feedback,'student_id',NEW.student_id,'version',NEW.version);
 ELSIF TG_TABLE_NAME='classroom_exam_question_marks' THEN
  IF NEW.grader_kind<>'teacher' OR (TG_OP='UPDATE' AND NEW.awarded_points IS NOT DISTINCT FROM OLD.awarded_points AND NEW.feedback IS NOT DISTINCT FROM OLD.feedback AND OLD.grader_kind='teacher') THEN RETURN NEW; END IF;
  SELECT e.classroom_id,e.title INTO cl,label FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE a.id=NEW.attempt_id;
  actor := NEW.graded_by; target := NEW.attempt_id::text||':'||NEW.question_id; event := 'exam_grade';
  IF TG_OP='UPDATE' THEN previous := jsonb_build_object('points',OLD.awarded_points,'feedback',OLD.feedback); END IF;
  following := jsonb_build_object('points',NEW.awarded_points,'feedback',NEW.feedback);
 ELSIF TG_TABLE_NAME='classroom_assignments' THEN
  IF NEW.due_at IS NOT DISTINCT FROM OLD.due_at THEN RETURN NEW; END IF;
  cl:=NEW.classroom_id; label:=NEW.title; target:=NEW.id::text; event:='assignment_deadline';
  previous:=jsonb_build_object('due_at',OLD.due_at); following:=jsonb_build_object('due_at',NEW.due_at);
 ELSIF TG_TABLE_NAME='classroom_exams' THEN
  IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at AND NEW.closed_at IS NOT DISTINCT FROM OLD.closed_at THEN RETURN NEW; END IF;
  cl:=NEW.classroom_id; label:=NEW.title; target:=NEW.id::text; event:='exam_schedule';
  previous:=jsonb_build_object('starts_at',OLD.starts_at,'ends_at',OLD.ends_at,'closed_at',OLD.closed_at);
  following:=jsonb_build_object('starts_at',NEW.starts_at,'ends_at',NEW.ends_at,'closed_at',NEW.closed_at);
 ELSIF TG_TABLE_NAME='classroom_materials' THEN
  cl:=OLD.classroom_id; label:=OLD.title; target:=OLD.id::text; event:='material_deleted';
  previous:=jsonb_build_object('title',OLD.title,'file_name',OLD.original_filename);
 END IF;
 -- Maintenance without a user context must never be attributed to the owner.
 IF actor IS NOT NULL AND EXISTS(SELECT 1 FROM classrooms WHERE id=cl) THEN
  INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,before_value,after_value,reason)
  SELECT cl,actor,trim(first_name||' '||last_name),event,target,label,previous,following,left(why,1000) FROM users WHERE id=actor;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activity_assignment_grade AFTER UPDATE OF awarded_points,feedback ON classroom_assignment_submissions FOR EACH ROW EXECUTE FUNCTION record_classroom_activity();
CREATE TRIGGER activity_exam_grade AFTER INSERT OR UPDATE ON classroom_exam_question_marks FOR EACH ROW EXECUTE FUNCTION record_classroom_activity();
CREATE TRIGGER activity_assignment_deadline AFTER UPDATE OF due_at ON classroom_assignments FOR EACH ROW EXECUTE FUNCTION record_classroom_activity();
CREATE TRIGGER activity_exam_schedule AFTER UPDATE OF starts_at,ends_at,closed_at ON classroom_exams FOR EACH ROW EXECUTE FUNCTION record_classroom_activity();
CREATE TRIGGER activity_material_deleted AFTER DELETE ON classroom_materials FOR EACH ROW EXECUTE FUNCTION record_classroom_activity();
