package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/platform/response"
	validatorpkg "github.com/edunexus/edunexus/internal/platform/validator"
)

// VerifyEmail godoc
// @Summary Verify email
// @Description Verify user email
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.VerifyEmailRequest true "Verify Email"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/verify-email [post]
func (h *UserHandler) VerifyEmail(c *fiber.Ctx) error {

	var req dto.VerifyEmailRequest

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

	if err := h.service.VerifyEmail(
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
		"Email verified successfully",
		nil,
	)
}