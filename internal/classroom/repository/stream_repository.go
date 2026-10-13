package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

type StreamRepository struct {
	queries *db.Queries
}

func NewStreamRepository(
	queries *db.Queries,
) *StreamRepository {
	return &StreamRepository{
		queries: queries,
	}
}

func (r *StreamRepository) CreateAnnouncement(
	ctx context.Context,
	params db.CreateClassroomAnnouncementParams,
) (db.ClassroomStreamPost, error) {
	return r.queries.CreateClassroomAnnouncement(
		ctx,
		params,
	)
}

func (r *StreamRepository) List(
	ctx context.Context,
	params db.ListClassroomStreamPostsParams,
) ([]db.ListClassroomStreamPostsRow, error) {
	return r.queries.ListClassroomStreamPosts(
		ctx,
		params,
	)
}

func (r *StreamRepository) UpdateAnnouncement(
	ctx context.Context,
	params db.UpdateClassroomAnnouncementParams,
) (db.ClassroomStreamPost, error) {
	return r.queries.UpdateClassroomAnnouncement(
		ctx,
		params,
	)
}

func (r *StreamRepository) Pin(
	ctx context.Context,
	params db.PinClassroomStreamPostParams,
) (db.ClassroomStreamPost, error) {
	return r.queries.PinClassroomStreamPost(
		ctx,
		params,
	)
}

func (r *StreamRepository) Unpin(
	ctx context.Context,
	params db.UnpinClassroomStreamPostParams,
) (db.ClassroomStreamPost, error) {
	return r.queries.UnpinClassroomStreamPost(
		ctx,
		params,
	)
}

func (r *StreamRepository) Delete(
	ctx context.Context,
	params db.DeleteClassroomStreamPostParams,
) (int64, error) {
	return r.queries.DeleteClassroomStreamPost(
		ctx,
		params,
	)
}
