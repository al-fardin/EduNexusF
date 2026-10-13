-- name: CreateUser :one
INSERT INTO users (
    email,
    username,
    password_hash,
    first_name,
    last_name,
    phone,
    avatar_url
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1
LIMIT 1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1;
-- name: UpdateUserProfile :one
UPDATE users
SET
    first_name = $2,
    last_name = $3,
    phone = $4,
    avatar_url = $5,
    updated_at = NOW()
WHERE id = $1
RETURNING *;
-- name: UpdatePassword :exec
UPDATE users
SET
    password_hash = $2,
    updated_at = NOW()
WHERE id = $1;