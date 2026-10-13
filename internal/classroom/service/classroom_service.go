package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/repository"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
)

var (
	ErrClassroomNotFound = errors.New(
		"classroom not found",
	)

	ErrForbidden = errors.New(
		"insufficient permissions",
	)

	ErrInvalidInput = errors.New(
		"invalid classroom input",
	)

	ErrClassCodeGeneration = errors.New(
		"failed to generate class code",
	)
)

const (
	classCodeLength   = 6
	classCodeAttempts = 5
	classCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
)

type ClassroomService struct {
	repo           *repository.ClassroomRepository
	membershipRepo *repository.MembershipRepository
}

type normalizedClassroomInput struct {
	name        string
	section     string
	subject     string
	room        string
	description string
}

func New(
	repo *repository.ClassroomRepository,
	membershipRepo *repository.MembershipRepository,
) *ClassroomService {
	return &ClassroomService{
		repo:           repo,
		membershipRepo: membershipRepo,
	}
}

func (s *ClassroomService) Create(
	ctx context.Context,
	userID string,
	req dto.CreateClassroomRequest,
) (dto.ClassroomResponse, error) {
	ownerID, err := parseUUID(userID)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	input, err := normalizeInput(
		req.Name,
		req.Section,
		req.Subject,
		req.Room,
		req.Description,
	)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	for attempt := 0; attempt < classCodeAttempts; attempt++ {
		classCode, err := generateClassCode(
			classCodeLength,
		)
		if err != nil {
			return dto.ClassroomResponse{}, err
		}

		classroom, err := s.repo.Create(
			ctx,
			db.CreateClassroomParams{
				OwnerID: ownerID,
				Name:    input.name,

				Section: textValue(
					input.section,
				),

				Subject: textValue(
					input.subject,
				),

				Room: textValue(
					input.room,
				),

				Description: textValue(
					input.description,
				),

				ClassCode: classCode,
			},
		)

		if err == nil {
			return mapClassroom(classroom), nil
		}

		if isUniqueViolation(err) {
			continue
		}

		return dto.ClassroomResponse{}, err
	}

	return dto.ClassroomResponse{},
		ErrClassCodeGeneration
}

func (s *ClassroomService) ListMine(
	ctx context.Context,
	userID string,
	page int,
	limit int,
) ([]dto.ClassroomResponse, int, int, error) {
	ownerID, err := parseUUID(userID)
	if err != nil {
		return nil, page, limit, err
	}

	page, limit, queryLimit, offset :=
		normalizePagination(page, limit)

	classrooms, err := s.repo.ListByOwner(
		ctx,
		db.ListClassroomsByOwnerParams{
			OwnerID: ownerID,
			Limit:   queryLimit,
			Offset:  offset,
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

func (s *ClassroomService) GetMine(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) (dto.ClassroomResponse, error) {
	_, classroom, err :=
		s.getManageableClassroom(
			ctx,
			userID,
			role,
			classroomID,
		)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	return mapClassroom(classroom), nil
}

func (s *ClassroomService) Update(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
	req dto.UpdateClassroomRequest,
) (dto.ClassroomResponse, error) {
	id, _, err := s.getManageableClassroom(
		ctx,
		userID,
		role,
		classroomID,
	)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	input, err := normalizeInput(
		req.Name,
		req.Section,
		req.Subject,
		req.Room,
		req.Description,
	)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	classroom, err := s.repo.Update(
		ctx,
		db.UpdateClassroomParams{
			ID:   id,
			Name: input.name,

			Section: textValue(
				input.section,
			),

			Subject: textValue(
				input.subject,
			),

			Room: textValue(
				input.room,
			),

			Description: textValue(
				input.description,
			),
		},
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ClassroomResponse{},
				ErrClassroomNotFound
		}

		return dto.ClassroomResponse{}, err
	}

	return mapClassroom(classroom), nil
}

func (s *ClassroomService) Archive(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) (dto.ClassroomResponse, error) {
	id, _, err := s.getManageableClassroom(
		ctx,
		userID,
		role,
		classroomID,
	)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	classroom, err := s.repo.Archive(
		ctx,
		id,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ClassroomResponse{},
				ErrClassroomNotFound
		}

		return dto.ClassroomResponse{}, err
	}

	return mapClassroom(classroom), nil
}

func (s *ClassroomService) Unarchive(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) (dto.ClassroomResponse, error) {
	id, _, err := s.getManageableClassroom(
		ctx,
		userID,
		role,
		classroomID,
	)
	if err != nil {
		return dto.ClassroomResponse{}, err
	}

	classroom, err := s.repo.Unarchive(
		ctx,
		id,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.ClassroomResponse{},
				ErrClassroomNotFound
		}

		return dto.ClassroomResponse{}, err
	}

	return mapClassroom(classroom), nil
}

func (s *ClassroomService) Delete(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) error {
	id, _, err := s.getManageableClassroom(
		ctx,
		userID,
		role,
		classroomID,
	)
	if err != nil {
		return err
	}

	rows, err := s.repo.Delete(
		ctx,
		id,
	)
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrClassroomNotFound
	}

	return nil
}

func (s *ClassroomService) getManageableClassroom(
	ctx context.Context,
	userID string,
	role string,
	classroomID string,
) (
	pgtype.UUID,
	db.Classroom,
	error,
) {

	// Classroom permissions are derived from active teacher membership, not the account role.

	classroomUUID, err := parseUUID(
		classroomID,
	)
	if err != nil {
		return pgtype.UUID{},
			db.Classroom{},
			validationError(
				"invalid classroom id",
			)
	}

	classroom, err := s.repo.GetByID(
		ctx,
		classroomUUID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgtype.UUID{},
				db.Classroom{},
				ErrClassroomNotFound
		}

		return pgtype.UUID{},
			db.Classroom{},
			err
	}

	currentUserID, err := parseUUID(
		userID,
	)
	if err != nil {
		return pgtype.UUID{},
			db.Classroom{},
			ErrForbidden
	}

	membership, err :=
		s.membershipRepo.GetActive(
			ctx,
			db.GetActiveClassroomMembershipParams{
				ClassroomID: classroomUUID,
				UserID:      currentUserID,
			},
		)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgtype.UUID{},
				db.Classroom{},
				ErrForbidden
		}

		return pgtype.UUID{},
			db.Classroom{},
			err
	}

	if membership.MemberRole != "teacher" {
		return pgtype.UUID{},
			db.Classroom{},
			ErrForbidden
	}

	return classroomUUID, classroom, nil
}

func normalizeInput(
	name string,
	section string,
	subject string,
	room string,
	description string,
) (normalizedClassroomInput, error) {
	name = strings.TrimSpace(name)
	section = strings.TrimSpace(section)
	subject = strings.TrimSpace(subject)
	room = strings.TrimSpace(room)

	description = strings.TrimSpace(
		description,
	)

	if name == "" {
		return normalizedClassroomInput{},
			validationError(
				"class name is required",
			)
	}

	if len([]rune(name)) > 150 {
		return normalizedClassroomInput{},
			validationError(
				"class name cannot exceed 150 characters",
			)
	}

	if len([]rune(section)) > 100 {
		return normalizedClassroomInput{},
			validationError(
				"section cannot exceed 100 characters",
			)
	}

	if len([]rune(subject)) > 150 {
		return normalizedClassroomInput{},
			validationError(
				"subject cannot exceed 150 characters",
			)
	}

	if len([]rune(room)) > 100 {
		return normalizedClassroomInput{},
			validationError(
				"room cannot exceed 100 characters",
			)
	}

	if len([]rune(description)) > 5000 {
		return normalizedClassroomInput{},
			validationError(
				"description cannot exceed 5000 characters",
			)
	}

	return normalizedClassroomInput{
		name:        name,
		section:     section,
		subject:     subject,
		room:        room,
		description: description,
	}, nil
}

func validationError(
	message string,
) error {
	return fmt.Errorf(
		"%w: %s",
		ErrInvalidInput,
		message,
	)
}

func parseUUID(
	value string,
) (pgtype.UUID, error) {
	id, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{},
			validationError(
				"invalid UUID",
			)
	}

	return pgtype.UUID{
		Bytes: id,
		Valid: true,
	}, nil
}

func textValue(
	value string,
) pgtype.Text {
	return pgtype.Text{
		String: value,
		Valid:  value != "",
	}
}

func generateClassCode(
	length int,
) (string, error) {
	randomBytes := make([]byte, length)

	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	code := make([]byte, length)

	for index, value := range randomBytes {
		code[index] = classCodeAlphabet[int(value)%len(classCodeAlphabet)]
	}

	return string(code), nil
}

func isUniqueViolation(
	err error,
) bool {
	var pgError *pgconn.PgError

	return errors.As(
		err,
		&pgError,
	) && pgError.Code == "23505"
}

func normalizePagination(
	page int,
	limit int,
) (int, int, int32, int32) {
	if page < 1 {
		page = 1
	}

	if limit < 1 {
		limit = 10
	}

	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	return page,
		limit,
		int32(limit),
		int32(offset)
}

func mapClassrooms(
	classrooms []db.Classroom,
) []dto.ClassroomResponse {
	result := make(
		[]dto.ClassroomResponse,
		0,
		len(classrooms),
	)

	for _, classroom := range classrooms {
		result = append(
			result,
			mapClassroom(classroom),
		)
	}

	return result
}

func mapClassroom(
	classroom db.Classroom,
) dto.ClassroomResponse {
	var archivedAt *time.Time

	if classroom.ArchivedAt.Valid {
		value := classroom.ArchivedAt.Time
		archivedAt = &value
	}

	var createdAt time.Time

	if classroom.CreatedAt.Valid {
		createdAt = classroom.CreatedAt.Time
	}

	var updatedAt time.Time

	if classroom.UpdatedAt.Valid {
		updatedAt = classroom.UpdatedAt.Time
	}

	return dto.ClassroomResponse{
		ID: uuid.UUID(
			classroom.ID.Bytes,
		).String(),

		OwnerID: uuid.UUID(
			classroom.OwnerID.Bytes,
		).String(),

		Name: classroom.Name,

		Section: textPointer(
			classroom.Section,
		),

		Subject: textPointer(
			classroom.Subject,
		),

		Room: textPointer(
			classroom.Room,
		),

		Description: textPointer(
			classroom.Description,
		),

		ClassCode:  classroom.ClassCode,
		Status:     classroom.Status,
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
		ArchivedAt: archivedAt,
	}
}

func textPointer(
	value pgtype.Text,
) *string {
	if !value.Valid {
		return nil
	}

	result := value.String

	return &result
}
