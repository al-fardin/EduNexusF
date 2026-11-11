package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/service"
)

type MembershipHandler struct {
	service *service.MembershipService
}

func NewMembership(
	membershipService *service.MembershipService,
) *MembershipHandler {
	return &MembershipHandler{
		service: membershipService,
	}
}

func (h *MembershipHandler) Join(
	c *fiber.Ctx,
) error {
	var req dto.JoinClassroomRequest

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

	result, err := h.service.Join(
		c.UserContext(),
		userID,
		req,
	)
	if err != nil {
		return handleMembershipError(
			c,
			err,
		)
	}

	return c.Status(
		fiber.StatusCreated,
	).JSON(fiber.Map{
		"success": true,
		"message": "Classroom joined successfully",
		"data":    result,
	})
}

func (h *MembershipHandler) ListJoined(
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
		h.service.ListJoined(
			c.UserContext(),
			userID,
			page,
			limit,
		)
	if err != nil {
		return handleMembershipError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Joined classrooms",
		"data": fiber.Map{
			"items": classrooms,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *MembershipHandler) GetJoined(
	c *fiber.Ctx,
) error {
	userID, _, err := currentIdentity(c)
	if err != nil {
		return err
	}

	classroom, err :=
		h.service.GetJoined(
			c.UserContext(),
			userID,
			c.Params("id"),
		)
	if err != nil {
		return handleMembershipError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Joined classroom details",
		"data":    classroom,
	})
}

func (h *MembershipHandler) ListMembers(
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

	members, page, limit, err :=
		h.service.ListMembers(
			c.UserContext(),
			userID,
			role,
			c.Params("id"),
			page,
			limit,
		)
	if err != nil {
		return handleMembershipError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom members",
		"data": fiber.Map{
			"items": members,
			"page":  page,
			"limit": limit,
		},
	})
}

func (h *MembershipHandler) RemoveMember(
	c *fiber.Ctx,
) error {
	userID, role, err :=
		currentIdentity(c)
	if err != nil {
		return err
	}

	err = h.service.RemoveMember(
		c.UserContext(),
		userID,
		role,
		c.Params("id"),
		c.Params("userID"),
	)
	if err != nil {
		return handleMembershipError(
			c,
			err,
		)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Classroom member removed successfully",
	})
}

func handleMembershipError(
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
		service.ErrMembershipNotFound,
	):
		return errorResponse(
			c,
			fiber.StatusNotFound,
			"classroom membership not found",
		)

	case errors.Is(
		err,
		service.ErrAlreadyClassroomMember,
	):
		return errorResponse(
			c,
			fiber.StatusConflict,
			"user already joined this classroom",
		)

	case errors.Is(
		err,
		service.ErrCannotJoinOwnClassroom,
	):
		return errorResponse(
			c,
			fiber.StatusConflict,
			"classroom owner cannot join as student",
		)

	case errors.Is(
		err,
		service.ErrCannotRemoveOwner,
	):
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			"classroom owner cannot be removed",
		)

	case errors.Is(
		err,
		service.ErrCannotRemoveTeacher,
	):
		return errorResponse(
			c,
			fiber.StatusBadRequest,
			"teacher cannot be removed from this endpoint",
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
