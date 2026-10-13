

package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	validatorpkg "github.com/edunexus/edunexus/internal/platform/validator"
	"github.com/edunexus/edunexus/internal/platform/response"
)
// ResendVerification godoc
// @Summary Resend verification email
// @Description Send another verification email
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.ResendVerificationRequest true "Resend Verification"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/resend-verification [post]
func (h *UserHandler) ResendVerification(c *fiber.Ctx) error {

	var req dto.ResendVerificationRequest

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

	if err := h.service.ResendVerification(
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
		"Verification email resent",
		nil,
	)
}