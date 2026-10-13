package middleware

import "github.com/gofiber/fiber/v2"

func Register(app *fiber.App) {
	Recover(app)
	RequestID(app)
	CORS(app)
	Logger(app)
}