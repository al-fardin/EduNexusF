ALTER TABLE users
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student';

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('student', 'instructor', 'admin'));

CREATE INDEX idx_users_role
ON users(role);