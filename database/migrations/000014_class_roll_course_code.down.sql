-- CAUTION: dropping removes stored course codes and roll numbers.
DROP INDEX IF EXISTS uq_active_classroom_student_roll;
ALTER TABLE classroom_memberships DROP COLUMN IF EXISTS student_roll;
ALTER TABLE classrooms DROP COLUMN IF EXISTS course_code;
