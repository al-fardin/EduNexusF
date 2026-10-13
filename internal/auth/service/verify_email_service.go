package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/auth/dto"
	

    db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
    "github.com/edunexus/edunexus/internal/platform/security"
)

func (s *UserService) VerifyEmail(
	ctx context.Context,
	req dto.VerifyEmailRequest,
) error {

	tokenData, err := s.verifyRepo.GetByToken(
		ctx,
		req.Token,
	)
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
		req.Token,
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

func (s *UserService) ResendVerification(
	ctx context.Context,
	req dto.ResendVerificationRequest,
) error {

	user, err := s.repo.GetUserByEmail(
		ctx,
		req.Email,
	)
	if err != nil {
		return errors.New("user not found")
	}

	if user.EmailVerified {
		return errors.New("email already verified")
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
        Token:     token,
        ExpiresAt: expires,
    },
)
if err != nil {
    return err
}

link := "http://localhost:3000/verify-email?token=" + token

body := `
<h2>Verify your email</h2>
<p>Click below to verify your email.</p>
<p><a href="` + link + `">Verify Email</a></p>
`

_ = s.mailer.Send(
    user.Email,
    "Verify your email",
    body,
)

return nil
}