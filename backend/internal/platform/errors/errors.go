package errors

import (
	"errors"
	"github.com/edunexus/edunexus/internal/platform/response"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
)

func Handler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	message := err.Error()
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.ConstraintName == "edunexus_storage_quota" {
		code = fiber.StatusRequestEntityTooLarge
		message = "Class storage is full. Ask the class owner to free space or increase its quota."
	}
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
