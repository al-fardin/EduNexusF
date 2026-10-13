-- V12: mandatory explicit consent before a monitored exam attempt is created.
CREATE TABLE IF NOT EXISTS classroom_exam_monitor_admissions (
  exam_id UUID NOT NULL REFERENCES classroom_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_monitor_admissions_recent ON classroom_exam_monitor_admissions(consented_at);

-- Apply the new required-monitoring rule to existing exams. Historical
-- evidence, results, and submissions are not changed.
INSERT INTO classroom_exam_monitor_policy(exam_id, enabled, flag_after_exits)
SELECT e.id, true, 2 FROM classroom_exams e
WHERE true
ON CONFLICT (exam_id) DO UPDATE SET enabled=true, updated_at=now();

-- All future exams receive an enabled monitoring policy automatically.
CREATE OR REPLACE FUNCTION edunexus_default_exam_monitoring() RETURNS trigger AS $$
BEGIN
  INSERT INTO classroom_exam_monitor_policy(exam_id,enabled,flag_after_exits)
  VALUES(NEW.id,true,2)
  ON CONFLICT (exam_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_edunexus_default_exam_monitoring ON classroom_exams;
CREATE TRIGGER tr_edunexus_default_exam_monitoring
AFTER INSERT ON classroom_exams
FOR EACH ROW EXECUTE FUNCTION edunexus_default_exam_monitoring();
