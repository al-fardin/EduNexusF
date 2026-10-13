package repository

import (
	"context"
	"errors"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type UserRepository struct {
	queries *db.Queries
}

func New(queries *db.Queries) *UserRepository {
	return &UserRepository{
		queries: queries,
	}
}

func (r *UserRepository) CreateUser(
	ctx context.Context,
	params db.CreateUserParams,
) (db.User, error) {
	return r.queries.CreateUser(ctx, params)
}

func (r *UserRepository) GetUserByEmail(
	ctx context.Context,
	email string,
) (db.User, error) {

	user, err := r.queries.GetUserByEmail(ctx, email)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.User{}, pgx.ErrNoRows
		}
		return db.User{}, err
	}

	return user, nil
}

func (r *UserRepository) GetUserByID(
	ctx context.Context,
	id pgtype.UUID,
) (db.User, error) {

	user, err := r.queries.GetUserByID(ctx, id)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.User{}, pgx.ErrNoRows
		}
		return db.User{}, err
	}

	return user, nil
}

func (r *UserRepository) UpdateUserProfile(
	ctx context.Context,
	params db.UpdateUserProfileParams,
) (db.User, error) {

	user, err := r.queries.UpdateUserProfile(ctx, params)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.User{}, pgx.ErrNoRows
		}
		return db.User{}, err
	}

	return user, nil
}
func (r *UserRepository) UpdatePassword(
	ctx context.Context,
	params db.UpdatePasswordParams,
) error {

	return r.queries.UpdatePassword(ctx, params)
}