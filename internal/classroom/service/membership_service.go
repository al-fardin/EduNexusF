package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/repository"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

var (
	ErrAlreadyClassroomMember = errors.New(
		"user already joined this classroom",
	)

	ErrMembershipNotFound = errors.New(
		"classroom membership not found",
	)

	ErrCannotJoinOwnClassroom = errors.New(
		"classroom owner cannot join as student",
	)

	ErrCannotRemoveOwner = errors.New(
		"classroom owner cannot be removed",
	)

	ErrCannotRemoveTeacher = errors.New(
		"teacher membership cannot be removed from this endpoint",
	)
)

type MembershipService struct {
	classroomRepo    *repository.ClassroomRepository
	membershipRepo   *repository.MembershipRepository
	classroomService *ClassroomService
}

func NewMembership(
	classroomRepo *repository.ClassroomRepository,
	membershipRepo *repository.MembershipRepository,
	classroomService *ClassroomService,
) *MembershipService {
	return &MembershipService{
		classroomRepo:    classroomRepo,
		membershipRepo:   membershipRepo,
		classroomService: classroomService,
	}
}

func (s *MembershipService) Join(
	ctx context.Context,
	userID string,
	req dto.JoinClassroomRequest,
) (dto.JoinClassroomResponse, error) {
	classCode := strings.ToUpper(
		strings.TrimSpace(
			req.ClassCode,
		),
	)

	if len(classCode) < 6 ||
		len(classCode) > 8 {
		return dto.JoinClassroomResponse{},
			validationError(
				"invalid class code",
			)
	}

	userUUID, err := parseUUID(userID)
	if err != nil {
		return dto.JoinClassroomResponse{},
			err
	}

	classroom, err :=
		s.classroomRepo.GetByCode(
			ctx,
			classCode,
		)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.JoinClassroomResponse{},
				ErrClassroomNotFound
		}

		return dto.JoinClassroomResponse{},
			err
	}

	if classroom.OwnerID.Valid &&
		classroom.OwnerID.Bytes ==
			userUUID.Bytes {
		return dto.JoinClassroomResponse{},
			ErrCannotJoinOwnClassroom
	}

	params := db.GetClassroomMembershipParams{
		ClassroomID: classroom.ID,
		UserID:      userUUID,
	}

	existing, err :=
		s.membershipRepo.Get(
			ctx,
			params,
		)

	if err == nil {
		if existing.Status == "active" {
			return dto.JoinClassroomResponse{},
				ErrAlreadyClassroomMember
		}

		restored, restoreErr :=
			s.membershipRepo.Restore(
				ctx,
				db.RestoreClassroomMembershipParams{
					ClassroomID: classroom.ID,
					UserID:      userUUID,
					MemberRole:  "student",
				},
			)
		if restoreErr != nil {
			return dto.JoinClassroomResponse{},
				restoreErr
		}

		return mapJoinResponse(
			classroom,
			restored,
		), nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return dto.JoinClassroomResponse{},
			err
	}

	membership, err :=
		s.membershipRepo.Create(
			ctx,
			db.CreateClassroomMembershipParams{
				ClassroomID: classroom.ID,
				UserID:      userUUID,
				MemberRole:  "student",
			},
		)
	if err != nil {
		if isUniqueViolation(err) {
			return dto.JoinClassroomResponse{},
				ErrAlreadyClassroomMember
		}

		return dto.JoinClassroomResponse{},
			err
	}

	return mapJoinResponse(
		classroom,
		membership,
	), nil
}

func (s *MembershipService) ListJoined(
	ctx context.Context,
	userID string,
	page int,
	limit int,
) (
	[]dto.ClassroomResponse,
	int,
	int,
	error,
) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return nil, page, limit, err
	}

	page, limit, queryLimit, offset :=
		normalizePagination(
			page,
			limit,
		)

	classrooms, err :=
		s.membershipRepo.ListJoined(
			ctx,
			db.ListJoinedClassroomsParams{
				UserID: userUUID,
				Limit:  queryLimit,
				Offset: offset,
			},
		)
	if err != nil {
		return nil, page, limit, err
	}

	return mapClassrooms(classrooms),
		page,
		limit,
		nil
}

func (s *MembershipService) GetJoined(
	ctx context.Context,
	userID string,
	classroomID string,
) (dto.ClassroomResponse, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	classroomUUID, err :=
		parseUUID(classroomID)
	if err != nil {
		return dto.ClassroomResponse{},
			validationError(
				"invalid classroom id",
			)
	}

	_, err = s.membershipRepo.GetActive(
		ctx,
		db.GetActiveClassroomMembershipParams{
			ClassroomID: classroomUUID,
			UserID:      userUUID,
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ClassroomResponse{},
				ErrMembershipNotFound
		}

		return dto.ClassroomResponse{}, err
	}

	classroom, err :=
		s.classroomRepo.GetByID(
			ctx,
			classroomUUID,
		)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ClassroomResponse{},
				ErrClassroomNotFound
		}

		return dto.ClassroomResponse{}, err
	}

	if classroom.Status != "active" {
		return dto.ClassroomResponse{},
			ErrClassroomNotFound
	}

	return mapClassroom(classroom), nil
}

func (s *MembershipService) ListMembers(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	page int,
	limit int,
) (
	[]dto.ClassroomMemberResponse,
	int,
	int,
	error,
) {
	classroomUUID, _, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)
	if err != nil {
		return nil, page, limit, err
	}

	page, limit, queryLimit, offset :=
		normalizePagination(
			page,
			limit,
		)

	members, err :=
		s.membershipRepo.ListMembers(
			ctx,
			db.ListClassroomMembersParams{
				ClassroomID: classroomUUID,
				Limit:       queryLimit,
				Offset:      offset,
			},
		)
	if err != nil {
		return nil, page, limit, err
	}

	return mapMembers(members),
		page,
		limit,
		nil
}

func (s *MembershipService) RemoveMember(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	memberUserID string,
) error {
	classroomUUID, classroom, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)
	if err != nil {
		return err
	}

	memberUUID, err :=
		parseUUID(memberUserID)
	if err != nil {
		return validationError(
			"invalid member user id",
		)
	}

	if classroom.OwnerID.Valid &&
		classroom.OwnerID.Bytes ==
			memberUUID.Bytes {
		return ErrCannotRemoveOwner
	}

	membership, err :=
		s.membershipRepo.GetActive(
			ctx,
			db.GetActiveClassroomMembershipParams{
				ClassroomID: classroomUUID,
				UserID:      memberUUID,
			},
		)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrMembershipNotFound
		}

		return err
	}

	if membership.MemberRole == "teacher" {
		return ErrCannotRemoveTeacher
	}

	rows, err := s.membershipRepo.Remove(
		ctx,
		db.RemoveClassroomMembershipParams{
			ClassroomID: classroomUUID,
			UserID:      memberUUID,
		},
	)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrMembershipNotFound
	}

	return nil
}

func mapJoinResponse(
	classroom db.Classroom,
	membership db.ClassroomMembership,
) dto.JoinClassroomResponse {
	var joinedAt time.Time

	if membership.JoinedAt.Valid {
		joinedAt = membership.JoinedAt.Time
	}

	return dto.JoinClassroomResponse{
		MembershipID: uuid.UUID(
			membership.ID.Bytes,
		).String(),

		MemberRole: membership.MemberRole,
		JoinedAt:   joinedAt,
		Classroom:  mapClassroom(classroom),
	}
}

func mapMembers(
	members []db.ListClassroomMembersRow,
) []dto.ClassroomMemberResponse {
	result := make(
		[]dto.ClassroomMemberResponse,
		0,
		len(members),
	)

	for _, member := range members {
		result = append(
			result,
			mapMember(member),
		)
	}

	return result
}

func mapMember(
	member db.ListClassroomMembersRow,
) dto.ClassroomMemberResponse {
	var joinedAt time.Time
	if member.JoinedAt.Valid {
		joinedAt = member.JoinedAt.Time
	}

	var avatarURL *string
	if member.AvatarUrl.Valid {
		value := member.AvatarUrl.String
		avatarURL = &value
	}

	return dto.ClassroomMemberResponse{
		MembershipID: uuid.UUID(
			member.ID.Bytes,
		).String(),

		ClassroomID: uuid.UUID(
			member.ClassroomID.Bytes,
		).String(),

		UserID: uuid.UUID(
			member.UserID.Bytes,
		).String(),

		MemberRole: member.MemberRole,
		Status:     member.Status,
		JoinedAt:   joinedAt,
		Email:      member.Email,
		Username:   member.Username,
		FirstName:  member.FirstName,
		LastName:   member.LastName,
		AvatarURL:  avatarURL,
	}
}
