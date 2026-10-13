package middleware

import (
	"github.com/gofiber/fiber/v2"
	corsmw "github.com/gofiber/fiber/v2/middleware/cors"
)

func CORS(app *fiber.App) {
	app.Use(corsmw.New())
}