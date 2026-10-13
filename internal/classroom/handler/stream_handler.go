package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/service"
)

type StreamHandler struct {
	service *service.StreamService
}

func NewStream(
	streamService *service.StreamService,
) *StreamHandler {
	return &StreamHandler{
		service: streamService,
	}
}

func (h *StreamHandler) CreateAnnouncement(
	c *fiber.Ctx,
) error {
	var req dto.CreateAnnouncementRequest

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

	post, err :=
		h.service.CreateAnnouncement(
			c.UserContext(),
			userID,
			role,
			c.Params("id"),
			req,
		)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.Status(
		fiber.StatusCreated,
	).JSON(fiber.Map{
		"success": true,
		"message": "Announcement created successfully",
		"data":    post,
	})
}

func (h *StreamHandler) List(
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

	userID, role, err :=
		currentIdentity(c)

	if err != nil {
		return err
	}

	posts, page, limit, err :=
		h.service.List(
			c.UserContext(),
			userID,
			role,
			c.Params("id"),
			page,
			limit,
		)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom stream",
		"data": fiber.Map{
			"items": posts,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *StreamHandler) UpdateAnnouncement(
	c *fiber.Ctx,
) error {
	var req dto.UpdateAnnouncementRequest

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

	post, err :=
		h.service.UpdateAnnouncement(
			c.UserContext(),
			userID,
			role,
			c.Params("id"),
			c.Params("postID"),
			req,
		)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Announcement updated successfully",
		"data":    post,
	})
}

func (h *StreamHandler) Pin(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)

	if err != nil {
		return err
	}

	post, err := h.service.Pin(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
		c.Params("postID"),
	)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Stream post pinned successfully",
		"data":    post,
	})
}

func (h *StreamHandler) Unpin(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)

	if err != nil {
		return err
	}

	post, err := h.service.Unpin(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
		c.Params("postID"),
	)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Stream post unpinned successfully",
		"data":    post,
	})
}

func (h *StreamHandler) Delete(
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
		c.Params("postID"),
	)

	if err != nil {
		return handleStreamError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Stream post deleted successfully",
	})
}

func handleStreamError(
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
		service.ErrStreamPostNotFound,
	):
		return errorResponse(
			c,
			fiber.StatusNotFound,
			"classroom stream post not found",
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
