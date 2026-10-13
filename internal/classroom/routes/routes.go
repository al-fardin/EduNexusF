package routes

import (
	"github.com/gofiber/fiber/v2"

	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	classroomHandler "github.com/edunexus/edunexus/internal/classroom/handler"
)

func Register(
	app *fiber.App,
	handler *classroomHandler.ClassroomHandler,
	membershipHandler *classroomHandler.MembershipHandler,
	streamHandler *classroomHandler.StreamHandler,
	materialHandler *classroomHandler.MaterialHandler,
    enrollment *classroomHandler.EnrollmentPhase5,
) {
	classrooms := app.Group(
		"/classrooms",
	)

	/*
		Student classroom membership routes.

		Static routes stay before the dynamic
		/:id classroom routes.
	*/
	classrooms.Post(
		"/join",
		authMiddleware.JWTProtected(),
		enrollment.Join,
	)

	classrooms.Get(
		"/joined",
		authMiddleware.JWTProtected(),
		membershipHandler.ListJoined,
	)

	classrooms.Get(
		"/joined/:id",
		authMiddleware.JWTProtected(),
		membershipHandler.GetJoined,
	)

	classrooms.Post("/join/lookup",authMiddleware.JWTProtected(),enrollment.LookupCode)
// Instructor classroom routes.
	classrooms.Get(
		"/mine",
		authMiddleware.JWTProtected(),
		handler.ListMine,
	)

	classrooms.Post(
		"/",
		authMiddleware.JWTProtected(),
		handler.Create,
	)

	/*
		Classroom Stream routes.

		Instructor and student may list the
		stream after membership verification.
	*/
	classrooms.Get(
		"/:id/stream",
		authMiddleware.JWTProtected(),
		streamHandler.List,
	)

	/*
		Only instructor accounts with an active
		teacher membership may manage posts.
	*/
	classrooms.Post(
		"/:id/stream/announcements",
		authMiddleware.JWTProtected(),
		streamHandler.CreateAnnouncement,
	)

	classrooms.Put(
		"/:id/stream/announcements/:postID",
		authMiddleware.JWTProtected(),
		streamHandler.UpdateAnnouncement,
	)

	classrooms.Patch(
		"/:id/stream/posts/:postID/pin",
		authMiddleware.JWTProtected(),
		streamHandler.Pin,
	)

	classrooms.Patch(
		"/:id/stream/posts/:postID/unpin",
		authMiddleware.JWTProtected(),
		streamHandler.Unpin,
	)

	classrooms.Delete(
		"/:id/stream/posts/:postID",
		authMiddleware.JWTProtected(),
		streamHandler.Delete,
	)

	// Protected learning material endpoints. A file is never served from /public.
	classrooms.Post("/:id/materials", authMiddleware.JWTProtected(), materialHandler.Upload)
	classrooms.Get("/:id/materials", authMiddleware.JWTProtected(), materialHandler.List)
	classrooms.Get("/:id/materials/:materialID/download", authMiddleware.JWTProtected(), materialHandler.Download)
	classrooms.Delete("/:id/materials/:materialID", authMiddleware.JWTProtected(), materialHandler.Remove)

	    classrooms.Get("/:id/my-roll",authMiddleware.JWTProtected(),enrollment.MyRoll)
    classrooms.Put("/:id/my-roll",authMiddleware.JWTProtected(),enrollment.SetMyRoll)
    classrooms.Get("/:id/course-code",authMiddleware.JWTProtected(),enrollment.GetCourseCode)
    classrooms.Put("/:id/course-code",authMiddleware.JWTProtected(),enrollment.SetCourseCode)
// Classroom people-management routes.
	classrooms.Get(
		"/:id/members",
		authMiddleware.JWTProtected(),
		membershipHandler.ListMembers,
	)

	classrooms.Delete(
		"/:id/members/:userID",
		authMiddleware.JWTProtected(),
		membershipHandler.RemoveMember,
	)

	classrooms.Get(
		"/:id",
		authMiddleware.JWTProtected(),
		handler.GetMine,
	)

	classrooms.Put(
		"/:id",
		authMiddleware.JWTProtected(),
		handler.Update,
	)

	classrooms.Patch(
		"/:id/archive",
		authMiddleware.JWTProtected(),
		handler.Archive,
	)

	classrooms.Patch(
		"/:id/unarchive",
		authMiddleware.JWTProtected(),
		handler.Unarchive,
	)

	classrooms.Delete(
		"/:id",
		authMiddleware.JWTProtected(),
		handler.Delete,
	)
}
