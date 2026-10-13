

package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/platform/response"
)

// Logout godoc
// @Summary Logout
// @Description Logout current refresh token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.LogoutRequest true "Logout Request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/logout [post]
func (h *UserHandler) Logout(c *fiber.Ctx) error {

	var req dto.LogoutRequest

	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			"invalid request body",
		)
	}

	if err := h.service.Logout(
		c.Context(),
		req,
	); err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusOK,
		"Logged out successfully",
		nil,
	)
}