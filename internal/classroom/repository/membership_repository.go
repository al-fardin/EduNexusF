package repository

import (
	"context"

	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

type MembershipRepository struct {
	queries *db.Queries
}

func NewMembershipRepository(
	queries *db.Queries,
) *MembershipRepository {
	return &MembershipRepository{
		queries: queries,
	}
}

func (r *MembershipRepository) Create(
	ctx context.Context,
	params db.CreateClassroomMembershipParams,
) (db.ClassroomMembership, error) {
	return r.queries.CreateClassroomMembership(
		ctx,
		params,
	)
}

func (r *MembershipRepository) Get(
	ctx context.Context,
	params db.GetClassroomMembershipParams,
) (db.ClassroomMembership, error) {
	return r.queries.GetClassroomMembership(
		ctx,
		params,
	)
}

func (r *MembershipRepository) GetActive(
	ctx context.Context,
	params db.GetActiveClassroomMembershipParams,
) (db.ClassroomMembership, error) {
	return r.queries.GetActiveClassroomMembership(
		ctx,
		params,
	)
}

func (r *MembershipRepository) Restore(
	ctx context.Context,
	params db.RestoreClassroomMembershipParams,
) (db.ClassroomMembership, error) {
	return r.queries.RestoreClassroomMembership(
		ctx,
		params,
	)
}

func (r *MembershipRepository) ListJoined(
	ctx context.Context,
	params db.ListJoinedClassroomsParams,
) ([]db.Classroom, error) {
	return r.queries.ListJoinedClassrooms(
		ctx,
		params,
	)
}

func (r *MembershipRepository) ListMembers(
	ctx context.Context,
	params db.ListClassroomMembersParams,
) ([]db.ListClassroomMembersRow, error) {
	return r.queries.ListClassroomMembers(
		ctx,
		params,
	)
}

func (r *MembershipRepository) Remove(
	ctx context.Context,
	params db.RemoveClassroomMembershipParams,
) (int64, error) {
	return r.queries.RemoveClassroomMembership(
		ctx,
		params,
	)
}

func (r *MembershipRepository) Delete(
	ctx context.Context,
	params db.DeleteClassroomMembershipParams,
) (int64, error) {
	return r.queries.DeleteClassroomMembership(
		ctx,
		params,
	)
}
