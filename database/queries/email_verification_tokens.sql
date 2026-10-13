-- name: CreateEmailVerificationToken :one
INSERT INTO email_verification_tokens (
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

-- name: GetEmailVerificationToken :one
SELECT *
FROM email_verification_tokens
WHERE token = $1
LIMIT 1;

-- name: VerifyEmailToken :exec
UPDATE email_verification_tokens
SET verified = TRUE
WHERE token = $1;

-- name: MarkUserEmailVerified :exec
UPDATE users
SET
    email_verified = TRUE,
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteUserEmailVerificationTokens :exec
DELETE FROM email_verification_tokens
WHERE user_id = $1;