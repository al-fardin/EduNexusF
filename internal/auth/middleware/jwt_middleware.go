package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/platform/security"
)

var jwtService *security.JWTService

func SetJWTService(
	service *security.JWTService,
) {
	jwtService = service
}

func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")

		if header == "" {
			return fiber.NewError(
				fiber.StatusUnauthorized,
				"missing authorization header",
			)
		}

		if !strings.HasPrefix(
			header,
			"Bearer ",
		) {
			return fiber.NewError(
				fiber.StatusUnauthorized,
				"invalid authorization header",
			)
		}

		tokenString := strings.TrimSpace(
			strings.TrimPrefix(
				header,
				"Bearer ",
			),
		)

		if tokenString == "" {
			return fiber.NewError(
				fiber.StatusUnauthorized,
				"missing access token",
			)
		}

		if jwtService == nil {
			return fiber.NewError(
				fiber.StatusInternalServerError,
				"JWT service is not initialized",
			)
		}

		claims, err :=
			jwtService.ParseToken(tokenString)
		if err != nil {
			return fiber.NewError(
				fiber.StatusUnauthorized,
				"invalid token",
			)
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}
