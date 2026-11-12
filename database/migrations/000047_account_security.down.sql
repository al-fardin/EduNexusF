DROP TABLE account_security;
ALTER TABLE realtime_tickets DROP COLUMN auth_session_id,DROP COLUMN issued_at;
ALTER TABLE refresh_tokens DROP COLUMN session_id;
DROP TABLE auth_sessions;
