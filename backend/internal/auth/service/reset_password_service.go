package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/auth/dto"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *UserService) ResetPassword(
	ctx context.Context,
	req dto.ResetPasswordRequest,
) error {

	if strings.HasPrefix(req.Token, "sha256:") {
		return errors.New("invalid reset token")
	}
	tokenData, err := s.resetRepo.GetByToken(ctx, tokenHash(req.Token))
	// Existing emailed links remain usable until their original expiry.
	if errors.Is(err, pgx.ErrNoRows) {
		tokenData, err = s.resetRepo.GetByToken(ctx, req.Token)
	}
	if err != nil {
		return errors.New("invalid reset token")
	}

	if tokenData.Used || !tokenData.ExpiresAt.Valid ||
		tokenData.ExpiresAt.Time.Before(time.Now()) {
		return errors.New("reset token expired")
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return err
	}

	if s.pool != nil {
		return s.securePassword(ctx, uuid.UUID(tokenData.UserID.Bytes).String(), hash, tokenData.Token, "")
	}
	err = s.repo.UpdatePassword(
		ctx,
		db.UpdatePasswordParams{
			ID:           tokenData.UserID,
			PasswordHash: hash,
		},
	)
	if err != nil {
		return err
	}

	return s.resetRepo.DeleteUserTokens(
		ctx,
		tokenData.UserID,
	)
}
