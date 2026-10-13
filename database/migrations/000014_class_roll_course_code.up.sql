-- Additive: per-classroom student roll, course identifier. Existing records are preserved.
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS course_code VARCHAR(40);
ALTER TABLE classroom_memberships ADD COLUMN IF NOT EXISTS student_roll VARCHAR(32);
-- Case-insensitive and trim-normalized roll uniqueness within one classroom.
-- Includes removed memberships to preserve historical result identity.
-- No uniqueness across different classrooms.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_classroom_student_roll
ON classroom_memberships (classroom_id, upper(btrim(student_roll)))
WHERE member_role = 'student' AND student_roll IS NOT NULL;
