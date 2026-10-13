-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (
    user_id,
    token,
    expires_at
)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: GetPasswordResetToken :one
SELECT *
FROM password_reset_tokens
WHERE token = $1
LIMIT 1;

-- name: UsePasswordResetToken :exec
UPDATE password_reset_tokens
SET used = TRUE
WHERE token = $1;

-- name: DeleteUserPasswordResetTokens :exec
DELETE
FROM password_reset_tokens
WHERE user_id = $1;