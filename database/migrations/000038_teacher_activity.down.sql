DROP TRIGGER IF EXISTS activity_assignment_grade ON classroom_assignment_submissions;
DROP TRIGGER IF EXISTS activity_exam_grade ON classroom_exam_question_marks;
DROP TRIGGER IF EXISTS activity_assignment_deadline ON classroom_assignments;
DROP TRIGGER IF EXISTS activity_exam_schedule ON classroom_exams;
DROP TRIGGER IF EXISTS activity_material_deleted ON classroom_materials;
DROP FUNCTION IF EXISTS record_classroom_activity();
DROP TABLE IF EXISTS classroom_activity;
