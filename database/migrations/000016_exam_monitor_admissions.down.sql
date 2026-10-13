DROP TRIGGER IF EXISTS tr_edunexus_default_exam_monitoring ON classroom_exams;
DROP FUNCTION IF EXISTS edunexus_default_exam_monitoring();
DROP TABLE IF EXISTS classroom_exam_monitor_admissions;
-- We intentionally do not revert exam policies; changing them would affect admissions.
