package middleware

import (
	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/gofiber/fiber/v2"
)

func Register(app *fiber.App, cfg *config.Config) {
	Recover(app)
	RequestID(app)
	app.Use(IdentityRequestBody)
	CORS(app, cfg)
	Logger(app)
}
