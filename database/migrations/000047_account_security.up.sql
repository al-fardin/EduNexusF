CREATE TABLE auth_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 device TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),expires_at TIMESTAMPTZ NOT NULL,
 revoked_at TIMESTAMPTZ,mfa_verified BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id,created_at DESC);
ALTER TABLE refresh_tokens ADD COLUMN session_id UUID REFERENCES auth_sessions(id) ON DELETE CASCADE;
CREATE INDEX refresh_tokens_session ON refresh_tokens(session_id);
ALTER TABLE realtime_tickets ADD COLUMN auth_session_id UUID REFERENCES auth_sessions(id) ON DELETE CASCADE,ADD COLUMN issued_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE account_security (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled BOOLEAN NOT NULL DEFAULT false,secret BYTEA,pending_secret BYTEA,pending_expires TIMESTAMPTZ,
 last_step BIGINT NOT NULL DEFAULT -1,recovery_hashes TEXT[] NOT NULL DEFAULT '{}',
 failures INTEGER NOT NULL DEFAULT 0,locked_until TIMESTAMPTZ,legacy_revoked_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
