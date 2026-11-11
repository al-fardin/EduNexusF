ALTER TABLE notification_preferences ADD COLUMN email_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK(email_frequency IN ('immediate','daily','weekly'));
ALTER TABLE notification_preferences ADD COLUMN email_digest_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE user_notifications DROP CONSTRAINT user_notifications_email_status_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_email_status_check CHECK(email_status IN ('pending','sending','sent','skipped','failed','digest'));
CREATE TABLE notification_email_digests(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly')),notification_ids UUID[] NOT NULL CHECK(cardinality(notification_ids) BETWEEN 1 AND 500),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','skipped','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,next_at TIMESTAMPTZ NOT NULL DEFAULT now(),lease UUID NOT NULL DEFAULT gen_random_uuid(),created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notification_one_active_digest ON notification_email_digests(user_id) WHERE state IN ('pending','sending');
CREATE INDEX notification_digest_due ON notification_email_digests(next_at) WHERE state IN ('pending','sending');
