package middleware

import (
	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
)

func Logger(app *fiber.App) {
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "[${time}] ${status} | ${latency} | ${ip} | ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Asia/Dhaka",
	}))
}