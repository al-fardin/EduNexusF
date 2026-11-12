package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ClassroomRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func New(
	queries *db.Queries,
	pool *pgxpool.Pool,
) *ClassroomRepository {
	return &ClassroomRepository{
		queries: queries,
		pool:    pool,
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
	rows, err := r.pool.Query(ctx, `SELECT cl.id,cl.owner_id,cl.name,cl.section,cl.subject,cl.room,cl.description,cl.class_code,cl.status,cl.created_at,cl.updated_at,cl.archived_at,cl.deleted_at FROM classrooms cl WHERE cl.deleted_at IS NULL AND (cl.owner_id=$1 OR EXISTS(SELECT 1 FROM classroom_memberships m WHERE m.classroom_id=cl.id AND m.user_id=$1 AND m.member_role='teacher' AND m.status='active')) ORDER BY CASE WHEN cl.status='active' THEN 0 ELSE 1 END,cl.created_at DESC,cl.id LIMIT $2 OFFSET $3`, params.OwnerID, params.Limit, params.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []db.Classroom{}
	for rows.Next() {
		var item db.Classroom
		if err = rows.Scan(&item.ID, &item.OwnerID, &item.Name, &item.Section, &item.Subject, &item.Room, &item.Description, &item.ClassCode, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.ArchivedAt, &item.DeletedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
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
