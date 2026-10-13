package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/auth/service"
	"github.com/edunexus/edunexus/internal/platform/response"
	validatorpkg "github.com/edunexus/edunexus/internal/platform/validator"
)

type UserHandler struct {
	service *service.UserService
}

func New(service *service.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}

// Register godoc
// @Summary Register a new user
// @Description Create a new EduNexus account
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.RegisterRequest true "Register Request"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Router /auth/register [post]
func (h *UserHandler) Register(c *fiber.Ctx) error {

	var req dto.RegisterRequest

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

	user, err := h.service.Register(
		c.Context(),
		req,
	)
	if err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusCreated,
		"User registered successfully",
		user,
	)
}

// Login godoc
// @Summary Login
// @Description Login using email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.LoginRequest true "Login Request"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/login [post]
func (h *UserHandler) Login(c *fiber.Ctx) error {

	var req dto.LoginRequest

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

	login, err := h.service.Login(
		c.Context(),
		req,
	)
	if err != nil {
		return fiber.NewError(
			fiber.StatusUnauthorized,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusOK,
		"Login successful",
		login,
	)
}

// UpdateProfile godoc
// @Summary Update profile
// @Description Update authenticated user's profile
// @Tags User
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body dto.UpdateProfileRequest true "Update Profile"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/profile [put]
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var req dto.UpdateProfileRequest

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

	user, err := h.service.UpdateProfile(
		c.Context(),
		userID,
		req,
	)
	if err != nil {
		return fiber.NewError(
			fiber.StatusBadRequest,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusOK,
		"Profile updated successfully",
		user,
	)
}

// ChangePassword godoc
// @Summary Change password
// @Description Change authenticated user's password
// @Tags User
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body dto.ChangePasswordRequest true "Change Password"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/password [put]
func (h *UserHandler) ChangePassword(c *fiber.Ctx) error {

	userID := c.Locals("user_id").(string)

	var req dto.ChangePasswordRequest

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

	if err := h.service.ChangePassword(
		c.Context(),
		userID,
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
		"Password changed successfully",
		nil,
	)
}

// Refresh godoc
// @Summary Refresh access token
// @Description Generate a new access token using refresh token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body dto.RefreshTokenRequest true "Refresh Token"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /auth/refresh [post]
func (h *UserHandler) Refresh(c *fiber.Ctx) error {

	var req dto.RefreshTokenRequest

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

	res, err := h.service.Refresh(
		c.Context(),
		req,
	)
	if err != nil {
		return fiber.NewError(
			fiber.StatusUnauthorized,
			err.Error(),
		)
	}

	return response.Success(
		c,
		fiber.StatusOK,
		"Token refreshed successfully",
		res,
	)
}