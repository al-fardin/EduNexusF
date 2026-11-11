package learning

import (
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
	"time"
)

func TestRubricValidationTemplatesAndAuthoritativeScoring(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/grading-templates", h.GradingTemplates)
	app.Post("/classrooms/:id/grading-templates", h.GradingTemplates)
	app.Delete("/classrooms/:id/grading-templates/:templateID", h.GradingTemplates)
	criteria := []RubricCriterion{{ID: uuid.NewString(), Title: "Correctness", Maximum: 70}, {ID: uuid.NewString(), Title: "Explanation", Maximum: 30}}
	if validRubric(criteria, 90) == nil {
		t.Fatal("accepted mismatched rubric total")
	}
	call(t, app, f.Student, "GET", base+"/grading-templates", nil, 403)
	call(t, app, f.Outsider, "POST", base+"/grading-templates", fiber.Map{"kind": "feedback", "title": "Feedback", "text": "Private teacher template"}, 403)
	template := call(t, app, f.Teacher, "POST", base+"/grading-templates", fiber.Map{"kind": "rubric", "title": "Standard rubric", "criteria": criteria}, 201)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "DELETE", "/classrooms/"+f.OtherClassID+"/grading-templates/"+template, nil, 404)
	call(t, app, f.Teacher, "POST", base+"/grading-templates", fiber.Map{"kind": "rubric", "title": "Standard rubric", "criteria": criteria}, 409)
	created := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Rubric assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, Rubric: criteria}, 200)["data"].(map[string]any)["id"].(string)
	path := base + "/assignments/" + created
	call(t, app, f.Teacher, "POST", path+"/publish", nil, 200)
	submission := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 0)["id"].(string)
	grade := path + "/submissions/" + submission + "/grade"
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"points": 100}, 400)
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"criteria": fiber.Map{criteria[0].ID: 71, criteria[1].ID: 20}}, 400)
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"points": 100, "criteria": fiber.Map{criteria[0].ID: 60, criteria[1].ID: 20}, "reason": "Rubric review"}, 200)
	submissions := call(t, app, f.Student, "GET", path+"/submissions", nil, 200)["data"].([]any)
	if submissions[0].(map[string]any)["awarded_points"] != float64(80) {
		t.Fatal("client points bypassed rubric", submissions)
	}
	scores := submissions[0].(map[string]any)["rubric_scores"].(map[string]any)
	if scores[criteria[0].ID] != float64(60) {
		t.Fatal(scores)
	}
	call(t, app, f.Teacher, "DELETE", base+"/grading-templates/"+template, nil, 200)
	// Deleting a reusable template must not remove the assignment's frozen criteria.
	listing := call(t, app, f.Student, "GET", base+"/assignments", nil, 200)["data"].([]any)
	if len(listing[0].(map[string]any)["rubric"].([]any)) != 2 {
		t.Fatal("assignment rubric changed with template")
	}
}
