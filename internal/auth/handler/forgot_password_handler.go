

package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/platform/response"
	validatorpkg "github.com/edunexus/edunexus/internal/platform/validator"
)

// ForgotPassword godoc
// @Summary Forgot password
// @Description Send password reset email
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.ForgotPasswordRequest true "Forgot Password"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/forgot-password [post]
func (h *UserHandler) ForgotPassword(c *fiber.Ctx) error {

	var req dto.ForgotPasswordRequest

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

	if err := h.service.ForgotPassword(
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
		"Password reset email sent",
		nil,
	)
}