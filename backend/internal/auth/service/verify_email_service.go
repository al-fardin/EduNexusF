package service

import (
	"context"
	"errors"
	"html"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/auth/dto"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
)

func (s *UserService) VerifyEmail(
	ctx context.Context,
	req dto.VerifyEmailRequest,
) error {
	if strings.HasPrefix(req.Token, "sha256:") {
		return errors.New("invalid verification token")
	}
	if s.pool != nil {
		return s.consumeVerification(ctx, req.Token)
	}

	tokenData, err := s.verifyRepo.GetByToken(ctx, tokenHash(req.Token))
	if errors.Is(err, pgx.ErrNoRows) {
		tokenData, err = s.verifyRepo.GetByToken(ctx, req.Token)
	}
	if err != nil {
		return errors.New("invalid verification token")
	}

	if tokenData.Verified {
		return errors.New("email already verified")
	}

	if !tokenData.ExpiresAt.Valid ||
		tokenData.ExpiresAt.Time.Before(time.Now()) {
		return errors.New("verification token expired")
	}

	if err := s.verifyRepo.VerifyToken(
		ctx,
		tokenData.Token,
	); err != nil {
		return err
	}

	if err := s.verifyRepo.MarkUserVerified(
		ctx,
		tokenData.UserID,
	); err != nil {
		return err
	}

	if err := s.verifyRepo.DeleteUserTokens(
		ctx,
		tokenData.UserID,
	); err != nil {
		return err
	}

	return nil
}

// Lock the account before consuming its capability so concurrent verification,
// expiry and account changes cannot produce a successful partial verification.
func (s *UserService) consumeVerification(ctx context.Context, token string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var user string
	err = tx.QueryRow(ctx, `SELECT user_id::text FROM email_verification_tokens WHERE token=$1 OR token=$2`, tokenHash(token), token).Scan(&user)
	if errors.Is(err, pgx.ErrNoRows) {
		return errors.New("invalid verification token")
	}
	if err != nil {
		return err
	}
	var verified bool
	err = tx.QueryRow(ctx, `SELECT email_verified FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR UPDATE`, user).Scan(&verified)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && verified) {
		return errors.New("invalid verification token")
	}
	if err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM email_verification_tokens WHERE user_id=$1::uuid AND (token=$2 OR token=$3) AND NOT verified AND expires_at>now()`, user, tokenHash(token), token)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errors.New("invalid or expired verification token")
	}
	if _, err = tx.Exec(ctx, `UPDATE users SET email_verified=true,updated_at=now() WHERE id=$1::uuid`, user); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM email_verification_tokens WHERE user_id=$1::uuid`, user); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *UserService) ResendVerification(
	ctx context.Context,
	req dto.ResendVerificationRequest,
) error {
	page, originErr := verificationPage()
	if originErr != nil {
		return originErr
	}

	user, err := s.repo.GetUserByEmail(
		ctx,
		req.Email,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}

	if user.EmailVerified || user.Status != "active" || user.DeletedAt.Valid {
		return nil
	}

	id, err := uuid.FromBytes(user.ID.Bytes[:])
	if err != nil {
		return err
	}

	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true

	if err := s.verifyRepo.DeleteUserTokens(
		ctx,
		uid,
	); err != nil {
		return err
	}

	token, err := security.GenerateRefreshToken()
	if err != nil {
		return err
	}

	expires := pgtype.Timestamptz{
		Time:  time.Now().Add(24 * time.Hour),
		Valid: true,
	}

	_, err = s.verifyRepo.Create(
		ctx,
		db.CreateEmailVerificationTokenParams{
			UserID:    uid,
			Token:     tokenHash(token),
			ExpiresAt: expires,
		},
	)
	if err != nil {
		return err
	}

	page.RawQuery = url.Values{"token": {token}}.Encode()
	link := html.EscapeString(page.String())

	body := `
<h2>Verify your email</h2>
<p>Click below to verify your email.</p>
<p><a href="` + link + `">Verify Email</a></p>
`

	return s.mailer.Send(
		user.Email,
		"Verify your email",
		body,
	)
}
