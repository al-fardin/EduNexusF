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

	return response.Error(
		c,
		code,
		err.Error(),
		nil,
	)
}