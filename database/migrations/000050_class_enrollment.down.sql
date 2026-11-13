DROP TABLE classroom_invitation_events;
DROP TABLE classroom_student_invitations;
DROP TABLE classroom_join_request_events;
DROP TABLE classroom_join_requests;
ALTER TABLE classrooms DROP COLUMN join_mode,DROP COLUMN code_join_enabled,DROP COLUMN class_code_expires_at,DROP COLUMN join_settings_version;
