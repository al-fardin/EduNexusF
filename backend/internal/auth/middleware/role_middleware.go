package middleware

import "github.com/gofiber/fiber/v2"

const (
	RoleStudent    = "student"
	RoleInstructor = "instructor"
	RoleAdmin      = "admin"
)

// RequireRole allows only users whose role is
// included in allowedRoles.
func RequireRole(
	allowedRoles ...string,
) fiber.Handler {
	allowed := make(
		map[string]struct{},
		len(allowedRoles),
	)

	for _, role := range allowedRoles {
		allowed[role] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		role, ok :=
			c.Locals("role").(string)

		if !ok || role == "" {
			return fiber.NewError(
				fiber.StatusUnauthorized,
				"user role is missing",
			)
		}

		if _, exists := allowed[role]; !exists {
			return fiber.NewError(
				fiber.StatusForbidden,
				"insufficient permissions",
			)
		}

		return c.Next()
	}
}
