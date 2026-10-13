

package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/platform/response"
	validatorpkg "github.com/edunexus/edunexus/internal/platform/validator"
)
// ResetPassword godoc
// @Summary Reset password
// @Description Reset password using reset token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.ResetPasswordRequest true "Reset Password"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/reset-password [post]
func (h *UserHandler) ResetPassword(c *fiber.Ctx) error {

	var req dto.ResetPasswordRequest

	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			"invalid request body",
		)
	}

	if err := validatorpkg.Validate(req); err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			err.Error(),
		)
	}

	if err := h.service.ResetPassword(
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
		"Password reset successfully",
		nil,
	)
}