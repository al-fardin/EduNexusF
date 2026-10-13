package service

import (
	"context"
	"errors"
	"time"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/auth/dto"
)

func (s *UserService) ForgotPassword(
	ctx context.Context,
	req dto.ForgotPasswordRequest,
) error {

	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return errors.New("user not found")
	}

	uid := user.ID

	_ = s.resetRepo.DeleteUserTokens(ctx, uid)

	token, err := security.GenerateRefreshToken()
	if err != nil {
		return err
	}

	expires := pgtype.Timestamptz{
		Time:  time.Now().Add(24 * time.Hour),
		Valid: true,
	}

	_, err = s.resetRepo.Create(
		ctx,
		db.CreatePasswordResetTokenParams{
			UserID:    uid,
			Token:     token,
			ExpiresAt: expires,
		},
	)
	if err != nil {
		return err
	}

link := "http://localhost:3000/reset-password?token=" + token

	body := `
<h2>Reset your password</h2>
<p>Click the link below to reset your password.</p>
<p><a href="` + link + `">Reset Password</a></p>
`

	if err := s.mailer.Send(
		user.Email,
		"Reset your password",
		body,
	); err != nil {
		return err
	}

	return nil
}
