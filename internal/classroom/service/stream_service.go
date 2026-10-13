package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/repository"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

var (
	ErrStreamPostNotFound = errors.New(
		"classroom stream post not found",
	)
)

type StreamService struct {
	repo             *repository.StreamRepository
	classroomRepo    *repository.ClassroomRepository
	membershipRepo   *repository.MembershipRepository
	classroomService *ClassroomService
}

type normalizedAnnouncementInput struct {
	title   string
	content string
}

func NewStream(
	repo *repository.StreamRepository,
	classroomRepo *repository.ClassroomRepository,
	membershipRepo *repository.MembershipRepository,
	classroomService *ClassroomService,
) *StreamService {
	return &StreamService{
		repo:             repo,
		classroomRepo:    classroomRepo,
		membershipRepo:   membershipRepo,
		classroomService: classroomService,
	}
}

func (s *StreamService) CreateAnnouncement(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	req dto.CreateAnnouncementRequest,
) (dto.StreamPostResponse, error) {
	classroomUUID, _, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)

	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	authorUUID, err := parseUUID(userID)
	if err != nil {
		return dto.StreamPostResponse{},
			ErrForbidden
	}

	input, err := normalizeAnnouncement(
		req.Title,
		req.Content,
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	post, err := s.repo.CreateAnnouncement(
		ctx,
		db.CreateClassroomAnnouncementParams{
			ClassroomID: classroomUUID,
			AuthorID:    authorUUID,
			Title:       textValue(input.title),
			Content:     input.content,
		},
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	return mapStreamPost(post), nil
}

func (s *StreamService) List(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	page int,
	limit int,
) (
	[]dto.StreamPostResponse,
	int,
	int,
	error,
) {
	classroomUUID, err :=
		s.requireStreamAccess(
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

	posts, err := s.repo.List(
		ctx,
		db.ListClassroomStreamPostsParams{
			ClassroomID: classroomUUID,
			Limit:       queryLimit,
			Offset:      offset,
		},
	)
	if err != nil {
		return nil, page, limit, err
	}

	return mapStreamPosts(posts),
		page,
		limit,
		nil
}

func (s *StreamService) UpdateAnnouncement(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	postID string,
	req dto.UpdateAnnouncementRequest,
) (dto.StreamPostResponse, error) {
	classroomUUID, _, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)

	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	postUUID, err := parseStreamPostUUID(
		postID,
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	input, err := normalizeAnnouncement(
		req.Title,
		req.Content,
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	post, err := s.repo.UpdateAnnouncement(
		ctx,
		db.UpdateClassroomAnnouncementParams{
			ID:          postUUID,
			ClassroomID: classroomUUID,
			Title:       textValue(input.title),
			Content:     input.content,
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.StreamPostResponse{},
				ErrStreamPostNotFound
		}

		return dto.StreamPostResponse{}, err
	}

	return mapStreamPost(post), nil
}

func (s *StreamService) Pin(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	postID string,
) (dto.StreamPostResponse, error) {
	classroomUUID, _, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)

	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	postUUID, err := parseStreamPostUUID(
		postID,
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	post, err := s.repo.Pin(
		ctx,
		db.PinClassroomStreamPostParams{
			ID:          postUUID,
			ClassroomID: classroomUUID,
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.StreamPostResponse{},
				ErrStreamPostNotFound
		}

		return dto.StreamPostResponse{}, err
	}

	return mapStreamPost(post), nil
}

func (s *StreamService) Unpin(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	postID string,
) (dto.StreamPostResponse, error) {
	classroomUUID, _, err :=
		s.classroomService.
			getManageableClassroom(
				ctx,
				userID,
				role,
				classroomID,
			)

	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	postUUID, err := parseStreamPostUUID(
		postID,
	)
	if err != nil {
		return dto.StreamPostResponse{}, err
	}

	post, err := s.repo.Unpin(
		ctx,
		db.UnpinClassroomStreamPostParams{
			ID:          postUUID,
			ClassroomID: classroomUUID,
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.StreamPostResponse{},
				ErrStreamPostNotFound
		}

		return dto.StreamPostResponse{}, err
	}

	return mapStreamPost(post), nil
}

func (s *StreamService) Delete(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	postID string,
) error {
	classroomUUID, _, err :=
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

	postUUID, err := parseStreamPostUUID(
		postID,
	)
	if err != nil {
		return err
	}

	rows, err := s.repo.Delete(
		ctx,
		db.DeleteClassroomStreamPostParams{
			ID:          postUUID,
			ClassroomID: classroomUUID,
		},
	)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrStreamPostNotFound
	}

	return nil
}

func (s *StreamService) requireStreamAccess(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) (pgtype.UUID, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return pgtype.UUID{}, ErrForbidden
	}

	classroomUUID, err := parseUUID(classroomID)
	if err != nil {
		return pgtype.UUID{}, validationError("invalid classroom id")
	}

	// Membership is authoritative; the account's JWT role is not.
	membership, err := s.membershipRepo.GetActive(
		ctx,
		db.GetActiveClassroomMembershipParams{
			ClassroomID: classroomUUID,
			UserID:      userUUID,
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgtype.UUID{}, ErrForbidden
		}
		return pgtype.UUID{}, err
	}
	if membership.MemberRole != "student" && membership.MemberRole != "teacher" {
		return pgtype.UUID{}, ErrForbidden
	}

	classroom, err := s.classroomRepo.GetByID(ctx, classroomUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgtype.UUID{}, ErrClassroomNotFound
		}
		return pgtype.UUID{}, err
	}
	if classroom.Status != "active" {
		return pgtype.UUID{}, ErrClassroomNotFound
	}
	return classroomUUID, nil
}

func normalizeAnnouncement(
	title string,
	content string,
) (normalizedAnnouncementInput, error) {
	title = strings.TrimSpace(title)
	content = strings.TrimSpace(content)

	if len([]rune(title)) > 200 {
		return normalizedAnnouncementInput{},
			validationError(
				"announcement title cannot exceed 200 characters",
			)
	}

	if content == "" {
		return normalizedAnnouncementInput{},
			validationError(
				"announcement content is required",
			)
	}

	return normalizedAnnouncementInput{
		title:   title,
		content: content,
	}, nil
}

func parseStreamPostUUID(
	value string,
) (pgtype.UUID, error) {
	id, err := parseUUID(value)
	if err != nil {
		return pgtype.UUID{},
			validationError(
				"invalid stream post id",
			)
	}

	return id, nil
}

func mapStreamPosts(
	posts []db.ListClassroomStreamPostsRow,
) []dto.StreamPostResponse {
	result := make(
		[]dto.StreamPostResponse,
		0,
		len(posts),
	)

	for _, post := range posts {
		result = append(
			result,
			mapStreamPostRow(post),
		)
	}

	return result
}

func mapStreamPost(
	post db.ClassroomStreamPost,
) dto.StreamPostResponse {
	var createdAt time.Time
	if post.CreatedAt.Valid {
		createdAt = post.CreatedAt.Time
	}

	var updatedAt time.Time
	if post.UpdatedAt.Valid {
		updatedAt = post.UpdatedAt.Time
	}

	authorID := streamUUIDPointer(
		post.AuthorID,
	)

	var author *dto.StreamAuthorResponse
	if authorID != nil {
		author = &dto.StreamAuthorResponse{
			ID: authorID,
		}
	}

	return dto.StreamPostResponse{
		ID: uuid.UUID(
			post.ID.Bytes,
		).String(),

		ClassroomID: uuid.UUID(
			post.ClassroomID.Bytes,
		).String(),

		AuthorID: authorID,

		PostType: post.PostType,

		Title: textPointer(
			post.Title,
		),

		Content: post.Content,

		ReferenceType: textPointer(
			post.ReferenceType,
		),

		ReferenceID: streamUUIDPointer(
			post.ReferenceID,
		),

		IsPinned:  post.IsPinned,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
		Author:    author,
	}
}

func mapStreamPostRow(
	post db.ListClassroomStreamPostsRow,
) dto.StreamPostResponse {
	var createdAt time.Time
	if post.CreatedAt.Valid {
		createdAt = post.CreatedAt.Time
	}

	var updatedAt time.Time
	if post.UpdatedAt.Valid {
		updatedAt = post.UpdatedAt.Time
	}

	authorID := streamUUIDPointer(
		post.AuthorID,
	)

	return dto.StreamPostResponse{
		ID: uuid.UUID(
			post.ID.Bytes,
		).String(),

		ClassroomID: uuid.UUID(
			post.ClassroomID.Bytes,
		).String(),

		AuthorID: authorID,

		PostType: post.PostType,

		Title: textPointer(
			post.Title,
		),

		Content: post.Content,

		ReferenceType: textPointer(
			post.ReferenceType,
		),

		ReferenceID: streamUUIDPointer(
			post.ReferenceID,
		),

		IsPinned:  post.IsPinned,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,

		Author: mapStreamAuthor(
			post,
		),
	}
}

func mapStreamAuthor(
	post db.ListClassroomStreamPostsRow,
) *dto.StreamAuthorResponse {
	authorID := streamUUIDPointer(
		post.AuthorID,
	)

	if authorID == nil &&
		!post.Email.Valid &&
		!post.Username.Valid &&
		!post.FirstName.Valid &&
		!post.LastName.Valid &&
		!post.AvatarUrl.Valid {
		return nil
	}

	return &dto.StreamAuthorResponse{
		ID: authorID,

		Email: textPointer(
			post.Email,
		),

		Username: textPointer(
			post.Username,
		),

		FirstName: textPointer(
			post.FirstName,
		),

		LastName: textPointer(
			post.LastName,
		),

		AvatarURL: textPointer(
			post.AvatarUrl,
		),
	}
}

func streamUUIDPointer(
	value pgtype.UUID,
) *string {
	if !value.Valid {
		return nil
	}

	result := uuid.UUID(
		value.Bytes,
	).String()

	return &result
}

// AuthorizeMaterialAccess applies the same classroom-level membership rules used by Stream.
// A user with a student account role may still teach a classroom they created.
func (s *StreamService) AuthorizeMaterialAccess(ctx context.Context, userID, role, classroomID string, teacherOnly bool) error {
	if teacherOnly {
		_, _, err := s.classroomService.getManageableClassroom(ctx, userID, role, classroomID)
		return err
	}
	_, err := s.requireStreamAccess(ctx, userID, role, classroomID)
	return err
}
