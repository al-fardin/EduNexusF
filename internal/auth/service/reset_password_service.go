package service

import (
	"context"
	"errors"
	"time"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/platform/security"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

func (s *UserService) ResetPassword(
	ctx context.Context,
	req dto.ResetPasswordRequest,
) error {

	tokenData, err := s.resetRepo.GetByToken(
		ctx,
		req.Token,
	)
	if err != nil {
		return errors.New("invalid reset token")
	}

	if !tokenData.ExpiresAt.Valid ||
		tokenData.ExpiresAt.Time.Before(time.Now()) {
		return errors.New("reset token expired")
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return err
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