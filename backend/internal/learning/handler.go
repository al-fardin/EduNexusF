package learning

import (
	"errors"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http"
)

type Handler struct {
	db            *pgxpool.Pool
	tutorHTTP     *http.Client
	tutorEndpoint string
}

func Register(app *fiber.App, db *pgxpool.Pool) {
	h := &Handler{db: db}
	topic := app.Group("/classrooms/:id/topics", authMiddleware.JWTProtected())
	topic.Get("/", h.Topics)
	topic.Post("/", h.SaveTopic)
	topic.Patch("/:topicID", h.SaveTopic)
	topic.Delete("/:topicID", h.SaveTopic)
	topic.Put("/resources/:kind/:resourceID", h.MoveTopicResource)
	app.Get("/classrooms/:id/grading-templates", authMiddleware.JWTProtected(), h.GradingTemplates)
	app.Post("/classrooms/:id/grading-templates", authMiddleware.JWTProtected(), h.GradingTemplates)
	app.Delete("/classrooms/:id/grading-templates/:templateID", authMiddleware.JWTProtected(), h.GradingTemplates)
	app.Get("/classrooms/:id/classwork", authMiddleware.JWTProtected(), h.Classwork)
	app.Post("/classrooms/:id/coursework/:kind/:resourceID/duplicate", authMiddleware.JWTProtected(), h.DuplicateCoursework)
	app.Get("/classrooms/:id/announcement-drafts", authMiddleware.JWTProtected(), h.Announcements)
	app.Put("/classrooms/:id/announcement-drafts", authMiddleware.JWTProtected(), h.Announcements)
	app.Post("/classrooms/:id/announcement-drafts/:draftID/publish", authMiddleware.JWTProtected(), h.PublishAnnouncement)
	registerScheduledAnnouncements(app, h)
	registerTutor(app, h)
	app.Get("/classrooms/:id/gradebook", authMiddleware.JWTProtected(), h.Gradebook)
	app.Get("/classrooms/:id/activity", authMiddleware.JWTProtected(), h.Activity)
	app.Get("/workspace", authMiddleware.JWTProtected(), h.Workspace)
	app.Get("/workspace/files", authMiddleware.JWTProtected(), h.WorkspaceFiles)
	app.Get("/classrooms/:id/details", authMiddleware.JWTProtected(), h.ClassroomDetails)
	app.Post("/classrooms/:id/leave", authMiddleware.JWTProtected(), h.LeaveClassroom)
	app.Get("/classrooms/:id/analytics", authMiddleware.JWTProtected(), h.Analytics)
	g := app.Group("/classrooms/:id/assignments", authMiddleware.JWTProtected())
	g.Get("/", h.ListAssignments)
	g.Post("/", h.SaveAssignment)
	g.Put("/:assignmentID", h.SaveAssignment)
	g.Patch("/:assignmentID/deadline", h.AssignmentDeadline)
	g.Post("/:assignmentID/publish", h.PublishAssignment)
	g.Post("/:assignmentID/submit", h.SubmitAssignment)
	g.Get("/:assignmentID/submissions", h.AssignmentSubmissions)
	g.Put("/:assignmentID/submissions/:submissionID/grade", h.GradeAssignment)
	g.Get("/:assignmentID/submissions/:submissionID/file", h.AssignmentFile)
}
func respond(c *fiber.Ctx, status int, data any) error {
	return c.Status(status).JSON(fiber.Map{"success": true, "data": data})
}
func fail(status int, message string) error { return fiber.NewError(status, message) }
func (h *Handler) member(c *fiber.Ctx, teacher bool) (string, string, error) {
	user, ok := c.Locals("user_id").(string)
	if !ok {
		return "", "", fail(401, "authentication required")
	}
	if _, err := uuid.Parse(user); err != nil {
		return "", "", fail(401, "invalid identity")
	}
	if _, err := uuid.Parse(c.Params("id")); err != nil {
		return "", "", fail(400, "invalid classroom")
	}
	var role string
	err := h.db.QueryRow(c.UserContext(), `SELECT m.member_role FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id
 WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", fail(403, "active classroom membership required")
	}
	if err != nil {
		return "", "", err
	}
	if teacher && role != "teacher" {
		return "", "", fail(403, "classroom teacher permission required")
	}
	return user, role, nil
}
func validID(value string) error {
	if _, err := uuid.Parse(value); err != nil {
		return fail(400, "invalid identifier")
	}
	return nil
}
