package learning

import (
	"errors"
	classroomDTO "github.com/edunexus/edunexus/internal/classroom/dto"
	"github.com/edunexus/edunexus/internal/classroom/repository"
	"github.com/edunexus/edunexus/internal/classroom/service"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	orgs "github.com/edunexus/edunexus/internal/platform/institutions"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"testing"
)

func institutionApp(h *Handler) *fiber.App {
	app := testApp(h)
	app.Get("/institutions", h.Institutions)
	app.Post("/institutions", h.Institutions)
	app.Get("/institutions/invitations", h.InstitutionInbox)
	app.Post("/institutions/invitations/:invitationID/respond", h.RespondInstitutionInvite)
	app.Get("/institutions/:institutionID", h.InstitutionWorkspace)
	app.Patch("/institutions/:institutionID", h.InstitutionWorkspace)
	app.Get("/institutions/:institutionID/classes", h.InstitutionClasses)
	app.Get("/institutions/:institutionID/members", h.InstitutionMembers)
	app.Patch("/institutions/:institutionID/members/:memberID", h.InstitutionMembers)
	app.Delete("/institutions/:institutionID/members/:memberID", h.InstitutionMembers)
	app.Get("/institutions/:institutionID/invitations", h.InstitutionInvitations)
	app.Post("/institutions/:institutionID/invitations", h.InstitutionInvitations)
	app.Delete("/institutions/:institutionID/invitations/:invitationID", h.InstitutionInvitations)
	app.Get("/institutions/:institutionID/activity", h.InstitutionActivity)
	app.Post("/institutions/:institutionID/:unitType", h.InstitutionUnits)
	app.Delete("/institutions/:institutionID/:unitType/:unitID", h.InstitutionUnits)
	app.Get("/classrooms/:id/institution", h.ClassInstitution)
	app.Put("/classrooms/:id/institution", h.ClassInstitution)
	return app
}
func TestOptionalInstitutionsPreserveStandaloneClassesAndEnrollment(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := institutionApp(h)
	query := db.New(f.DB)
	classes := service.New(repository.New(query, f.DB), repository.NewMembershipRepository(query))
	standalone, e := classes.Create(t.Context(), f.Teacher, classroomDTO.CreateClassroomRequest{Name: "Standalone class"})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { f.DB.Exec(t.Context(), `DELETE FROM classrooms WHERE id=$1::uuid`, standalone.ID) })
	var linked int
	if e = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM institution_classrooms WHERE classroom_id=$1::uuid`, standalone.ID).Scan(&linked); e != nil || linked != 0 {
		t.Fatal("standalone class requires institution", e)
	}
	org := call(t, app, f.Teacher, "POST", "/institutions", fiber.Map{"name": "Test University"}, 201)["data"].(map[string]any)["id"].(string)
	base := "/institutions/" + org
	call(t, app, f.Outsider, "GET", base, nil, 403)
	department := call(t, app, f.Teacher, "POST", base+"/departments", fiber.Map{"name": "Computer Science"}, 200)["data"].(map[string]any)["id"].(string)
	term := call(t, app, f.Teacher, "POST", base+"/terms", fiber.Map{"name": "Spring 2027", "starts_on": "2027-01-01", "ends_on": "2027-06-30"}, 200)["data"].(map[string]any)["id"].(string)
	inv := call(t, app, f.Teacher, "POST", base+"/invitations", fiber.Map{"email": f.Student + "@example.invalid", "role": "teacher"}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Outsider, "POST", "/institutions/invitations/"+inv+"/respond", fiber.Map{"version": 1, "action": "accept"}, 404)
	call(t, app, f.Student, "POST", "/institutions/invitations/"+inv+"/respond", fiber.Map{"version": 1, "action": "accept"}, 200)
	call(t, app, f.Student, "POST", "/institutions/invitations/"+inv+"/respond", fiber.Map{"version": 1, "action": "accept"}, 409)
	call(t, app, f.Student, "POST", base+"/departments", fiber.Map{"name": "Unauthorized unit"}, 403)
	p := &orgs.Placement{Institution: org, Department: department, Term: term}
	created, e := classes.Create(t.Context(), f.Student, classroomDTO.CreateClassroomRequest{Name: "Institution class", Institution: p})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { f.DB.Exec(t.Context(), `DELETE FROM classrooms WHERE id=$1::uuid`, created.ID) })
	var classRole string
	if e = f.DB.QueryRow(t.Context(), `SELECT member_role FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student).Scan(&classRole); e != nil || classRole != "student" {
		t.Fatal("institution role promoted classroom membership", e)
	}
	catalogue := call(t, app, f.Teacher, "GET", base+"/classes", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(catalogue) != 1 || catalogue[0].(map[string]any)["url"] != "" {
		t.Fatal("institution administrator received class content access", catalogue)
	}
	call(t, app, f.Teacher, "DELETE", base+"/departments/"+department, fiber.Map{"version": 1}, 409)
	call(t, app, f.Teacher, "PUT", "/classrooms/"+created.ID+"/institution", fiber.Map{"placement": nil, "version": 1}, 403)
	call(t, app, f.Student, "PUT", "/classrooms/"+created.ID+"/institution", fiber.Map{"placement": nil, "version": 1}, 200)
	call(t, app, f.Student, "PUT", "/classrooms/"+created.ID+"/institution", fiber.Map{"placement": p, "version": 1}, 409)
	call(t, app, f.Student, "PUT", "/classrooms/"+created.ID+"/institution", fiber.Map{"placement": p, "version": 2}, 200)
	call(t, app, f.Teacher, "DELETE", base+"/members/"+f.Student, fiber.Map{"version": 1, "reason": "Teaching membership ended"}, 200)
	current := call(t, app, f.Student, "GET", "/classrooms/"+created.ID+"/institution", nil, 200)["data"].(map[string]any)
	if current["placement"].(map[string]any)["institution_id"] != "" || current["version"] != float64(4) {
		t.Fatal("offboarding did not safely detach owned class", current)
	}
	var active bool
	if e = f.DB.QueryRow(t.Context(), `SELECT deleted_at IS NULL FROM classrooms WHERE id=$1::uuid`, created.ID).Scan(&active); e != nil || !active {
		t.Fatal("institution removal destroyed class", e)
	}
	before := 0
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classrooms WHERE owner_id=$1::uuid`, f.Outsider).Scan(&before)
	_, e = classes.Create(t.Context(), f.Outsider, classroomDTO.CreateClassroomRequest{Name: "Rejected placement", Institution: p})
	var forbidden *fiber.Error
	if !errors.As(e, &forbidden) || forbidden.Code != 403 {
		t.Fatal("unauthorized institution class accepted", e)
	}
	after := 0
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classrooms WHERE owner_id=$1::uuid`, f.Outsider).Scan(&after)
	if before != after {
		t.Fatal("failed optional placement left a partial class")
	}
}
