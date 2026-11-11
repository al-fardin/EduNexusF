UPDATE user_notifications SET email_status='pending' WHERE email_status='digest';
DROP TABLE notification_email_digests;
ALTER TABLE user_notifications DROP CONSTRAINT user_notifications_email_status_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_email_status_check CHECK(email_status IN ('pending','sending','sent','skipped','failed'));
ALTER TABLE notification_preferences DROP COLUMN email_frequency,DROP COLUMN email_digest_at;
