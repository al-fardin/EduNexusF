package middleware

import (
	"log"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"
	recovermw "github.com/gofiber/fiber/v2/middleware/recover"
)

func Recover(app *fiber.App) {
	app.Use(recovermw.New(recovermw.Config{
		EnableStackTrace: true,
		StackTraceHandler: func(c *fiber.Ctx, e interface{}) {
			log.Printf("PANIC request_id=%q\n%s", c.GetRespHeader("X-Request-ID"), debug.Stack())
		},
	}))
}
