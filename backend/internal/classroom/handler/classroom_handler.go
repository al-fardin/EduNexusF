package handler

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/service"
)

type ClassroomHandler struct {
	service *service.ClassroomService
}

func New(
	classroomService *service.ClassroomService,
) *ClassroomHandler {
	return &ClassroomHandler{
		service: classroomService,
	}
}

func (h *ClassroomHandler) Create(
	c *fiber.Ctx,
) error {
	var req dto.CreateClassroomRequest

	if err := c.BodyParser(&req); err != nil {
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			"invalid request body",
		)
	}

	userID, _, err := currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err := h.service.Create(
		c.UserContext(),
		userID,
		req,
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.Status(
		fiber.StatusCreated,
	).JSON(fiber.Map{
		"success": true,
		"message": "Classroom created successfully",
		"data":    classroom,
	})
}

func (h *ClassroomHandler) ListMine(
	c *fiber.Ctx,
) error {
	page, limit, err := pagination(c)
	if err != nil {
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			err.Error(),
		)
	}

	userID, _, err := currentIdentity(c)
	if err != nil {
		return err
	}

	classrooms, page, limit, err :=
		h.service.ListMine(
			c.UserContext(),
			userID,
			page,
			limit,
		)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Teaching classrooms",
		"data": fiber.Map{
			"items": classrooms,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *ClassroomHandler) GetMine(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err := h.service.GetMine(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom details",
		"data":    classroom,
	})
}

func (h *ClassroomHandler) Update(
	c *fiber.Ctx,
) error {
	var req dto.UpdateClassroomRequest

	if err := c.BodyParser(&req); err != nil {
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			"invalid request body",
		)
	}

	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err := h.service.Update(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
		req,
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom updated successfully",
		"data":    classroom,
	})
}

func (h *ClassroomHandler) Archive(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err := h.service.Archive(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom archived successfully",
		"data":    classroom,
	})
}

func (h *ClassroomHandler) Unarchive(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err := h.service.Unarchive(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom restored successfully",
		"data":    classroom,
	})
}

func (h *ClassroomHandler) Delete(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	err = h.service.Delete(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
	)
	if err != nil {
		return handleServiceError(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom deleted successfully",
	})
}

func pagination(
	c *fiber.Ctx,
) (int, int, error) {
	page, err := strconv.Atoi(
		c.Query("page", "1"),
	)
	if err != nil {
		return 0, 0,
			errors.New(
				"page must be a number",
			)
	}

	limit, err := strconv.Atoi(
		c.Query("limit", "10"),
	)
	if err != nil {
		return 0, 0,
			errors.New(
				"limit must be a number",
			)
	}

	return page, limit, nil
}

func currentIdentity(
	c *fiber.Ctx,
) (string, string, error) {
	userID, userOK :=
		c.Locals("user_id").(string)

	role, roleOK :=
		c.Locals("role").(string)

	if !userOK ||
		userID == "" ||
		!roleOK ||
		role == "" {
		return "", "",
			fiber.NewError(
				fiber.StatusUnauthorized,
				"authentication required",
			)
	}

	return userID, role, nil
}

func handleServiceError(
	c *fiber.Ctx,
	err error,
) error {
	switch {
	case errors.Is(
		err,
		service.ErrInvalidInput,
	):
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			err.Error(),
		)

	case errors.Is(
		err,
		service.ErrClassroomNotFound,
	):
		return errorResponse(
			c,
			fiber.StatusNotFound,
			"classroom not found",
		)

	case errors.Is(
		err,
		service.ErrForbidden,
	):
		return errorResponse(
			c,
			fiber.StatusForbidden,
			"insufficient permissions",
		)

	default:
		return errorResponse(
			c,
			fiber.StatusInternalServerError,
			"internal server error",
		)
	}
}

func errorResponse(
	c *fiber.Ctx,
	status int,
	message string,
) error {
	return c.Status(status).JSON(
		fiber.Map{
			"success": false,
			"message": message,
		},
	)
}
