package errors

import (
	"github.com/edunexus/edunexus/internal/platform/response"
	"github.com/gofiber/fiber/v2"
)

func Handler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	message := err.Error()
	if code >= 500 {
		message = "Service unavailable. Try again; include the request ID when reporting this issue."
	}

	return response.Error(
		c,
		code,
		message,
		nil,
	)
}
