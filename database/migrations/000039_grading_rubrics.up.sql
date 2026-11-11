ALTER TABLE classroom_assignments ADD COLUMN rubric JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(rubric)='array');
ALTER TABLE classroom_assignment_submissions ADD COLUMN rubric_scores JSONB NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(rubric_scores)='object');
CREATE TABLE classroom_grading_templates(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('rubric','feedback')),title TEXT NOT NULL CHECK(char_length(title) BETWEEN 1 AND 120),
 payload JSONB NOT NULL,created_by UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX grading_template_title ON classroom_grading_templates(classroom_id,kind,lower(title));
CREATE FUNCTION record_rubric_grade() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.rubric_scores IS DISTINCT FROM OLD.rubric_scores THEN
  INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,before_value,after_value,reason)
  SELECT a.classroom_id,NEW.graded_by,trim(u.first_name||' '||u.last_name),'assignment_rubric',NEW.id::text,a.title,
  jsonb_build_object('criteria',OLD.rubric_scores),jsonb_build_object('criteria',NEW.rubric_scores),COALESCE(current_setting('edunexus.activity_reason',true),'')
  FROM classroom_assignments a JOIN users u ON u.id=NEW.graded_by WHERE a.id=NEW.assignment_id;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER activity_rubric_grade AFTER UPDATE OF rubric_scores ON classroom_assignment_submissions FOR EACH ROW EXECUTE FUNCTION record_rubric_grade();
