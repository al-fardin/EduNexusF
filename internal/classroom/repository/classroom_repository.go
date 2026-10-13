package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
)

type ClassroomRepository struct {
	queries *db.Queries
}

func New(
	queries *db.Queries,
) *ClassroomRepository {
	return &ClassroomRepository{
		queries: queries,
	}
}

func (r *ClassroomRepository) Create(
	ctx context.Context,
	params db.CreateClassroomParams,
) (db.Classroom, error) {
	return r.queries.CreateClassroom(
		ctx,
		params,
	)
}

func (r *ClassroomRepository) GetByID(
	ctx context.Context,
	id pgtype.UUID,
) (db.Classroom, error) {
	return r.queries.GetClassroomByID(
		ctx,
		id,
	)
}

func (r *ClassroomRepository) GetByCode(
	ctx context.Context,
	classCode string,
) (db.Classroom, error) {
	return r.queries.GetClassroomByCode(
		ctx,
		classCode,
	)
}

func (r *ClassroomRepository) ListByOwner(
	ctx context.Context,
	params db.ListClassroomsByOwnerParams,
) ([]db.Classroom, error) {
	return r.queries.ListClassroomsByOwner(
		ctx,
		params,
	)
}

func (r *ClassroomRepository) Update(
	ctx context.Context,
	params db.UpdateClassroomParams,
) (db.Classroom, error) {
	return r.queries.UpdateClassroom(
		ctx,
		params,
	)
}

func (r *ClassroomRepository) Archive(
	ctx context.Context,
	id pgtype.UUID,
) (db.Classroom, error) {
	return r.queries.ArchiveClassroom(
		ctx,
		id,
	)
}

func (r *ClassroomRepository) Unarchive(
	ctx context.Context,
	id pgtype.UUID,
) (db.Classroom, error) {
	return r.queries.UnarchiveClassroom(
		ctx,
		id,
	)
}

func (r *ClassroomRepository) Delete(
	ctx context.Context,
	id pgtype.UUID,
) (int64, error) {
	return r.queries.DeleteClassroom(
		ctx,
		id,
	)
}
