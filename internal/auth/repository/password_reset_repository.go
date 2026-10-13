package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

type PasswordResetRepository struct {
	queries *db.Queries
}

func NewPasswordResetRepository(
	q *db.Queries,
) *PasswordResetRepository {

	return &PasswordResetRepository{
		queries: q,
	}
}

func (r *PasswordResetRepository) Create(
	ctx context.Context,
	params db.CreatePasswordResetTokenParams,
) (db.PasswordResetToken, error) {

	return r.queries.CreatePasswordResetToken(
		ctx,
		params,
	)
}

func (r *PasswordResetRepository) GetByToken(
	ctx context.Context,
	token string,
) (db.PasswordResetToken, error) {

	return r.queries.GetPasswordResetToken(
		ctx,
		token,
	)
}

func (r *PasswordResetRepository) UseToken(
	ctx context.Context,
	token string,
) error {

	return r.queries.UsePasswordResetToken(
		ctx,
		token,
	)
}

func (r *PasswordResetRepository) DeleteUserTokens(
	ctx context.Context,
	userID pgtype.UUID,
) error {

	return r.queries.DeleteUserPasswordResetTokens(
		ctx,
		userID,
	)
}