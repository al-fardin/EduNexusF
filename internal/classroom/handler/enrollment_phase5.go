package handler

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EnrollmentPhase5 implements two-step classroom joining, unique per-class roll
// and teacher-maintained course code. Never accept teacher roles from the client.
type EnrollmentPhase5 struct{ db *pgxpool.Pool }

func NewEnrollmentPhase5(db *pgxpool.Pool) *EnrollmentPhase5 { return &EnrollmentPhase5{db: db} }

var rollPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_/-]{0,31}$`)
var coursePattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9 -]{1,39}$`)

func phase5User(c *fiber.Ctx) (string, error) {
	s, ok := c.Locals("user_id").(string)
	if !ok || s == "" {
		return "", fiber.NewError(401, "authentication required")
	}
	if _, err := uuid.Parse(s); err != nil {
		return "", fiber.NewError(401, "invalid user")
	}
	return s, nil
}
func phase5Error(c *fiber.Ctx, code int, message string) error {
	return c.Status(code).JSON(fiber.Map{"success": false, "message": message})
}
func rollConflict(err error) bool {
	var e *pgconn.PgError
	return errors.As(err, &e) && e.Code == "23505" && e.ConstraintName == "uq_active_classroom_student_roll"
}
func validRoll(value string) (string, bool) {
	r := strings.ToUpper(strings.TrimSpace(value))
	return r, rollPattern.MatchString(r)
}

type lookupCodeRequest struct {
	ClassCode string `json:"class_code"`
}

func (h *EnrollmentPhase5) LookupCode(c *fiber.Ctx) error {
	if _, err := phase5User(c); err != nil {
		return err
	}
	var req lookupCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return phase5Error(c, 400, "invalid request")
	}
	code := strings.ToUpper(strings.TrimSpace(req.ClassCode))
	if len(code) < 6 || len(code) > 8 {
		return phase5Error(c, 400, "enter a valid 6-8 character class code")
	}
	var id, name string
	var course, section *string
	err := h.db.QueryRow(c.UserContext(), `SELECT id::text,name,course_code,section FROM classrooms WHERE class_code=$1 AND status='active' AND deleted_at IS NULL`, code).Scan(&id, &name, &course, &section)
	if errors.Is(err, pgx.ErrNoRows) {
		return phase5Error(c, 404, "class code not found")
	}
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"id": id, "name": name, "course_code": course, "section": section}})
}

type joinPhase5Request struct {
	ClassCode   string `json:"class_code"`
	StudentRoll string `json:"student_roll"`
}

func (h *EnrollmentPhase5) Join(c *fiber.Ctx) error {
	user, err := phase5User(c)
	if err != nil {
		return err
	}
	var req joinPhase5Request
	if err = c.BodyParser(&req); err != nil {
		return phase5Error(c, 400, "invalid request")
	}
	code := strings.ToUpper(strings.TrimSpace(req.ClassCode))
	roll, ok := validRoll(req.StudentRoll)
	if len(code) < 6 || len(code) > 8 {
		return phase5Error(c, 400, "invalid class code")
	}
	if !ok {
		return phase5Error(c, 400, "Student ID / roll required (1-32 letters, digits, hyphen, underscore or slash)")
	}
	// Database unique index guarantees roll uniqueness even for concurrent joins.
	// Atomic INSERT/restore, so another student's roll can never be reserved partially.
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var classID, owner, name, status string
	var section, subject, room, description, course *string
	err = tx.QueryRow(c.UserContext(), `SELECT id::text,owner_id::text,name,status,section,subject,room,description,course_code FROM classrooms WHERE class_code=$1 AND status='active' AND deleted_at IS NULL FOR SHARE`, code).
		Scan(&classID, &owner, &name, &status, &section, &subject, &room, &description, &course)
	if errors.Is(err, pgx.ErrNoRows) {
		return phase5Error(c, 404, "class code not found")
	}
	if err != nil {
		return err
	}
	if user == owner {
		return phase5Error(c, 409, "you are the teacher of this classroom")
	}
	var memberID string
	var joinedAt time.Time
	err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll)
      VALUES($1::uuid,$2::uuid,'student','active',$3)
      ON CONFLICT(classroom_id,user_id) DO UPDATE SET
        status='active',member_role='student',student_roll=EXCLUDED.student_roll,
        removed_at=NULL,updated_at=now(),joined_at=now()
      WHERE classroom_memberships.status='removed' AND classroom_memberships.member_role='student'
      RETURNING id::text,joined_at`, classID, user, roll).Scan(&memberID, &joinedAt)
	if rollConflict(err) {
		return phase5Error(c, 409, "Student ID / roll already exists in this classroom")
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return phase5Error(c, 409, "you already joined this classroom")
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return c.Status(201).JSON(fiber.Map{"success": true, "message": "Classroom joined successfully", "data": fiber.Map{
		"membership_id": memberID, "student_roll": roll, "member_role": "student", "joined_at": joinedAt,
		"classroom": fiber.Map{"id": classID, "owner_id": owner, "name": name, "status": status, "section": section, "subject": subject, "room": room, "description": description, "course_code": course, "class_code": code},
	}})
}

// Legacy accounts already joined before rollout must claim a roll before entering class UI.
func (h *EnrollmentPhase5) MyRoll(c *fiber.Ctx) error {
	user, err := phase5User(c)
	if err != nil {
		return err
	}
	if _, err = uuid.Parse(c.Params("id")); err != nil {
		return phase5Error(c, 400, "invalid classroom id")
	}
	var roll *string
	err = h.db.QueryRow(c.UserContext(), `SELECT m.student_roll FROM classroom_memberships m
    JOIN classrooms cl ON cl.id=m.classroom_id
    WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.status='active' AND m.member_role='student' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&roll)
	if errors.Is(err, pgx.ErrNoRows) {
		return phase5Error(c, 403, "active student membership required")
	}
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"student_roll": roll}})
}
func (h *EnrollmentPhase5) SetMyRoll(c *fiber.Ctx) error {
	user, err := phase5User(c)
	if err != nil {
		return err
	}
	if _, err = uuid.Parse(c.Params("id")); err != nil {
		return phase5Error(c, 400, "invalid classroom id")
	}
	var req struct {
		StudentRoll string `json:"student_roll"`
	}
	if err = c.BodyParser(&req); err != nil {
		return phase5Error(c, 400, "invalid request")
	}
	roll, ok := validRoll(req.StudentRoll)
	if !ok {
		return phase5Error(c, 400, "invalid Student ID / Roll")
	}
	// A roll is an enrollment identifier; existing assigned rolls are immutable.
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_memberships SET student_roll=$3,updated_at=now()
       WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active' AND member_role='student' AND student_roll IS NULL`, c.Params("id"), user, roll)
	if rollConflict(err) {
		return phase5Error(c, 409, "Student ID / roll already exists in this classroom")
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return phase5Error(c, 409, "roll already set or student membership not found")
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"student_roll": roll}})
}

func (h *EnrollmentPhase5) GetCourseCode(c *fiber.Ctx) error {
	user, err := phase5User(c)
	if err != nil {
		return err
	}
	var code *string
	err = h.db.QueryRow(c.UserContext(), `SELECT cl.course_code FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id
       WHERE cl.id=$1::uuid AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&code)
	if errors.Is(err, pgx.ErrNoRows) {
		return phase5Error(c, 403, "teacher membership required")
	}
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"course_code": code}})
}
func (h *EnrollmentPhase5) SetCourseCode(c *fiber.Ctx) error {
	user, err := phase5User(c)
	if err != nil {
		return err
	}
	var req struct {
		CourseCode string `json:"course_code"`
	}
	if err = c.BodyParser(&req); err != nil {
		return phase5Error(c, 400, "invalid request")
	}
	code := strings.ToUpper(strings.TrimSpace(req.CourseCode))
	if !coursePattern.MatchString(code) {
		return phase5Error(c, 400, "course code must be 2-40 letters, digits, spaces or hyphens")
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classrooms cl SET course_code=$3,updated_at=now()
       WHERE cl.id=$1::uuid AND cl.deleted_at IS NULL AND EXISTS(SELECT 1 FROM classroom_memberships m
       WHERE m.classroom_id=cl.id AND m.user_id=$2::uuid AND m.member_role='teacher' AND m.status='active')`, c.Params("id"), user, code)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return phase5Error(c, 403, "teacher membership required")
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"course_code": code}})
}
