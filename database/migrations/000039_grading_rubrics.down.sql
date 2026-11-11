DROP TRIGGER IF EXISTS activity_rubric_grade ON classroom_assignment_submissions;
DROP FUNCTION IF EXISTS record_rubric_grade();
DROP TABLE classroom_grading_templates;
ALTER TABLE classroom_assignment_submissions DROP COLUMN rubric_scores;
ALTER TABLE classroom_assignments DROP COLUMN rubric;
