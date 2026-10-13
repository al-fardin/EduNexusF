package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/platform/response"
)
// Me godoc
// @Summary Get current user
// @Description Get authenticated user's profile
// @Tags User
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/me [get]
func (h *UserHandler) Me(c *fiber.Ctx) error {

	userID, ok := c.Locals("user_id").(string)
	if !ok {
		return fiber.NewError(
			fiber.StatusUnauthorized,
			"invalid user",
		)
	}

	user, err := h.service.Me(
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
		"Current user",
		user,
	)
}