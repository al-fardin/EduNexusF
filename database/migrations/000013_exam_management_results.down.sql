DROP TABLE IF EXISTS classroom_exam_marksheets;
DROP TABLE IF EXISTS classroom_exam_result_publications;
DROP TABLE IF EXISTS classroom_exam_question_marks;
ALTER TABLE classroom_exams DROP COLUMN IF EXISTS closed_at;
