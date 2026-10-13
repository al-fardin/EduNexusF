package router

import (
	_ "github.com/edunexus/edunexus/docs"

	authHandler "github.com/edunexus/edunexus/internal/auth/handler"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	authRepository "github.com/edunexus/edunexus/internal/auth/repository"
	authRoutes "github.com/edunexus/edunexus/internal/auth/routes"
	authService "github.com/edunexus/edunexus/internal/auth/service"

	classroomHandler "github.com/edunexus/edunexus/internal/classroom/handler"
	classroomRepository "github.com/edunexus/edunexus/internal/classroom/repository"
	classroomRoutes "github.com/edunexus/edunexus/internal/classroom/routes"
	classroomService "github.com/edunexus/edunexus/internal/classroom/service"

	"github.com/edunexus/edunexus/internal/exam"
	"github.com/edunexus/edunexus/internal/platform/config"
	dbsqlc "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/mail"
	"github.com/edunexus/edunexus/internal/platform/response"
	"github.com/edunexus/edunexus/internal/platform/security"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/swagger"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Register(
	app *fiber.App,
	dbPool *pgxpool.Pool,
	cfg *config.Config,
	jwtService *security.JWTService,
) {
	app.Get(
		"/health",
		func(c *fiber.Ctx) error {
			return response.Success(
				c,
				fiber.StatusOK,
				"Service is healthy",
				fiber.Map{
					"service": "EduNexus API",
					"status":  "ok",
				},
			)
		},
	)

	app.Get(
		"/panic",
		func(c *fiber.Ctx) error {
			return fiber.NewError(
				fiber.StatusBadRequest,
				"This is a test error",
			)
		},
	)

	app.Get(
		"/swagger/*",
		swagger.HandlerDefault,
	)

	authMiddleware.SetJWTService(
		jwtService,
	)

	queries := dbsqlc.New(
		dbPool,
	)

	// Authentication module.
	userRepo := authRepository.New(
		queries,
	)

	refreshRepo :=
		authRepository.NewRefreshTokenRepository(
			queries,
		)

	verifyRepo :=
		authRepository.NewEmailVerificationRepository(
			queries,
		)

	resetRepo :=
		authRepository.NewPasswordResetRepository(
			queries,
		)

	mailer := mail.NewSMTPMailer(
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPUsername,
		cfg.SMTPPassword,
		cfg.SMTPFrom,
	)

	authSvc := authService.New(
		userRepo,
		refreshRepo,
		verifyRepo,
		resetRepo,
		jwtService,
		mailer,
	)

	authH := authHandler.New(
		authSvc,
	)

	authRoutes.Register(
		app,
		authH,
	)

	// Classroom module.
	classroomRepo :=
		classroomRepository.New(
			queries,
		)

	membershipRepo :=
		classroomRepository.
			NewMembershipRepository(
				queries,
			)

	streamRepo :=
		classroomRepository.
			NewStreamRepository(
				queries,
			)

	classroomSvc :=
		classroomService.New(
			classroomRepo,
			membershipRepo,
		)

	membershipSvc :=
		classroomService.NewMembership(
			classroomRepo,
			membershipRepo,
			classroomSvc,
		)

	streamSvc :=
		classroomService.NewStream(
			streamRepo,
			classroomRepo,
			membershipRepo,
			classroomSvc,
		)

	classroomH :=
		classroomHandler.New(
			classroomSvc,
		)

	membershipH :=
		classroomHandler.NewMembership(
			membershipSvc,
		)

	streamH :=
		classroomHandler.NewStream(
			streamSvc,
		)

	exam.Register(app, dbPool)

	classroomRoutes.Register(
		app,
		classroomH,
		membershipH,
		streamH,
		classroomHandler.NewMaterial(dbPool, streamSvc),
        classroomHandler.NewEnrollmentPhase5(dbPool),
	)
}
