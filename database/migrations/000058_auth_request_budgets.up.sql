-- Shared, opaque request budgets; no email addresses or IPs are stored.
CREATE TABLE auth_request_budgets (
 key_hash text PRIMARY KEY CHECK (length(key_hash)=64),
 used integer NOT NULL CHECK (used>0),
 expires_at timestamptz NOT NULL
);
CREATE INDEX auth_request_budgets_expiry_idx ON auth_request_budgets(expires_at);
