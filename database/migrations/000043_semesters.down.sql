DROP TABLE IF EXISTS classroom_rollovers;
ALTER TABLE classrooms DROP COLUMN syllabus;
ALTER TABLE classrooms DROP COLUMN term_id;
DROP TABLE academic_terms;
