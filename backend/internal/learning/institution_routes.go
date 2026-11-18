package learning

import (
	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
)

func registerInstitutions(app *fiber.App, h *Handler) {
	g := app.Group("/institutions", auth.JWTProtected())
	g.Get("/", h.Institutions)
	g.Post("/", h.Institutions)
	g.Get("/invitations", h.InstitutionInbox)
	g.Post("/invitations/:invitationID/respond", h.RespondInstitutionInvite)
	g.Get("/:institutionID", h.InstitutionWorkspace)
	g.Patch("/:institutionID", h.InstitutionWorkspace)
	g.Get("/:institutionID/classes", h.InstitutionClasses)
	g.Post("/:institutionID/classes/:classID/detach", h.InstitutionDetach)
	g.Get("/:institutionID/members", h.InstitutionMembers)
	g.Patch("/:institutionID/members/:memberID", h.InstitutionMembers)
	g.Delete("/:institutionID/members/:memberID", h.InstitutionMembers)
	g.Get("/:institutionID/invitations", h.InstitutionInvitations)
	g.Post("/:institutionID/invitations", h.InstitutionInvitations)
	g.Delete("/:institutionID/invitations/:invitationID", h.InstitutionInvitations)
	g.Get("/:institutionID/activity", h.InstitutionActivity)
	g.Post("/:institutionID/:unitType", h.InstitutionUnits)
	g.Patch("/:institutionID/:unitType/:unitID", h.InstitutionUnits)
	g.Delete("/:institutionID/:unitType/:unitID", h.InstitutionUnits)
	app.Get("/classrooms/:id/institution", auth.JWTProtected(), h.ClassInstitution)
	app.Put("/classrooms/:id/institution", auth.JWTProtected(), h.ClassInstitution)
}
