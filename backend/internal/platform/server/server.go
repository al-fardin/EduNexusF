package server

import (
	"github.com/edunexus/edunexus/internal/platform/config"
	appErrors "github.com/edunexus/edunexus/internal/platform/errors"
	"github.com/edunexus/edunexus/internal/platform/middleware"
	"github.com/edunexus/edunexus/internal/platform/observability"
	"github.com/edunexus/edunexus/internal/platform/router"
	"github.com/edunexus/edunexus/internal/platform/security"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func New(
	cfg *config.Config,
	db *pgxpool.Pool,
	jwtService *security.JWTService,
) *fiber.App {

	app := fiber.New(fiber.Config{
		AppName:        cfg.AppName,
		BodyLimit:      18 * 1024 * 1024, // 15 MB attachments plus multipart overhead
		ErrorHandler:   appErrors.Handler,
		ReadTimeout:    120 * time.Second,
		WriteTimeout:   120 * time.Second,
		IdleTimeout:    60 * time.Second,
		ReadBufferSize: 16 * 1024,
	})

	app.Use(observability.Middleware)
	middleware.Register(app, cfg)
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("Cache-Control", "private, no-store")
		c.Set("Referrer-Policy", "no-referrer")
		return c.Next()
	})
	if cfg.AppEnv == "production" {
		app.Use(middleware.AuthBudgets(db, cfg.JWTSecret))
	}
	observability.Register(app, db)

	router.Register(
		app,
		db,
		cfg,
		jwtService,
	)

	return app
}
