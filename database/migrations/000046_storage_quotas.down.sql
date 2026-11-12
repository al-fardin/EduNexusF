DROP TRIGGER storage_material ON classroom_materials;
DROP TRIGGER storage_message ON classroom_messages;
DROP TRIGGER storage_submission ON classroom_assignment_submissions;
DROP TRIGGER storage_tester ON classroom_question_testers;
DROP FUNCTION edunexus_enforce_storage_quota();
DROP FUNCTION edunexus_storage_used(UUID);
ALTER TABLE classrooms DROP COLUMN storage_quota_bytes;
