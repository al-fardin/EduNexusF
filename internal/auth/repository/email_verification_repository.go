package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

type EmailVerificationRepository struct {
	queries *db.Queries
}

func NewEmailVerificationRepository(
	q *db.Queries,
) *EmailVerificationRepository {

	return &EmailVerificationRepository{
		queries: q,
	}
}

func (r *EmailVerificationRepository) Create(
	ctx context.Context,
	params db.CreateEmailVerificationTokenParams,
) (db.EmailVerificationToken, error) {

	return r.queries.CreateEmailVerificationToken(
		ctx,
		params,
	)
}

func (r *EmailVerificationRepository) GetByToken(
	ctx context.Context,
	token string,
) (db.EmailVerificationToken, error) {

	return r.queries.GetEmailVerificationToken(
		ctx,
		token,
	)
}

func (r *EmailVerificationRepository) VerifyToken(
	ctx context.Context,
	token string,
) error {

	return r.queries.VerifyEmailToken(
		ctx,
		token,
	)
}

func (r *EmailVerificationRepository) MarkUserVerified(
	ctx context.Context,
	userID pgtype.UUID,
) error {

	return r.queries.MarkUserEmailVerified(
		ctx,
		userID,
	)
}

func (r *EmailVerificationRepository) DeleteUserTokens(
	ctx context.Context,
	userID pgtype.UUID,
) error {

	return r.queries.DeleteUserEmailVerificationTokens(
		ctx,
		userID,
	)
}