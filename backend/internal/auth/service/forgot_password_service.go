package service

import (
	"context"
	"errors"
	"html"
	"time"

	"github.com/edunexus/edunexus/internal/auth/dto"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *UserService) ForgotPassword(
	ctx context.Context,
	req dto.ForgotPasswordRequest,
) error {

	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}

	uid := user.ID

	page, err := verificationPage()
	if err != nil {
		return err
	}
	page.Path = "/reset-password"
	if err = s.resetRepo.DeleteUserTokens(ctx, uid); err != nil {
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

	_, err = s.resetRepo.Create(
		ctx,
		db.CreatePasswordResetTokenParams{
			UserID:    uid,
			Token:     tokenHash(token),
			ExpiresAt: expires,
		},
	)
	if err != nil {
		return err
	}

	query := page.Query()
	query.Set("token", token)
	page.RawQuery = query.Encode()
	link := html.EscapeString(page.String())

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
