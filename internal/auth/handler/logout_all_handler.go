

package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/platform/response"
)

// LogoutAll godoc
// @Summary Logout from all devices
// @Description Revoke all refresh tokens
// @Tags Authentication
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/logout-all [post]
func (h *UserHandler) LogoutAll(c *fiber.Ctx) error {

	userID, ok := c.Locals("user_id").(string)
	if !ok {
		return fiber.NewError(
			fiber.StatusUnauthorized,
			"invalid user",
		)
	}

	err := h.service.LogoutAll(
		c.Context(),
		userID,
	)
	if err != nil {
		return fiber.NewError(
			fiber.StatusInternalServerError,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusOK,
		"Logged out from all devices",
		nil,
	)
}