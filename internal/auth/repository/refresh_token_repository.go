package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

type RefreshTokenRepository struct {
	queries *db.Queries
}

func NewRefreshTokenRepository(q *db.Queries) *RefreshTokenRepository {
	return &RefreshTokenRepository{
		queries: q,
	}
}

func (r *RefreshTokenRepository) Create(
	ctx context.Context,
	params db.CreateRefreshTokenParams,
) (db.RefreshToken, error) {

	return r.queries.CreateRefreshToken(ctx, params)
}

func (r *RefreshTokenRepository) GetByToken(
	ctx context.Context,
	token string,
) (db.RefreshToken, error) {

	return r.queries.GetRefreshToken(ctx, token)
}

func (r *RefreshTokenRepository) Revoke(
	ctx context.Context,
	token string,
) error {

	return r.queries.RevokeRefreshToken(ctx, token)
}

func (r *RefreshTokenRepository) RevokeAll(
	ctx context.Context,
	userID pgtype.UUID,
) error {

	return r.queries.RevokeAllUserRefreshTokens(ctx, userID)
}