package learning

import (
	"fmt"
	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"net/url"
	"testing"
	"time"
)

func TestOptionalSectionsTransferFiltersAndRosterImport(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/sections", h.Sections)
	app.Post("/classrooms/:id/sections", h.Sections)
	app.Patch("/classrooms/:id/sections/:sectionID", h.Sections)
	app.Delete("/classrooms/:id/sections/:sectionID", h.Sections)
	app.Get("/classrooms/:id/roster", h.SectionRoster)
	app.Put("/classrooms/:id/roster/:studentID", h.SectionRoster)
	app.Post("/classrooms/:id/roster/import", h.ImportRoster)
	app.Get("/classrooms/:id/student-view", h.StudentView)
	app.Post("/classrooms/:id/audience/preview", h.AudiencePreview)
	app.Get("/classrooms/:id/gradebook", h.Gradebook)
	call(t, app, f.Student, "POST", base+"/sections", fiber.Map{"name": "A"}, 403)
	a := call(t, app, f.Teacher, "POST", base+"/sections", fiber.Map{"name": "A"}, 200)["data"].(map[string]any)["id"].(string)
	b := call(t, app, f.Teacher, "POST", base+"/sections", fiber.Map{"name": "B"}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/sections", fiber.Map{"name": "a"}, 409)
	roster := call(t, app, f.Teacher, "GET", base+"/roster", nil, 200)["data"].(map[string]any)["items"].([]any)[0].(map[string]any)
	version := roster["version"]
	other := call(t, app, f.Teacher, "POST", "/classrooms/"+f.OtherClassID+"/sections", fiber.Map{"name": "Other section"}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "PUT", base+"/roster/"+f.Student, fiber.Map{"section_id": other, "version": version, "reason": "Cross class attempt"}, 400)
	call(t, app, f.Teacher, "PUT", base+"/roster/"+f.Student, fiber.Map{"section_id": a, "version": version, "reason": "Initial section"}, 200)
	call(t, app, f.Teacher, "PUT", base+"/roster/"+f.Student, fiber.Map{"section_id": b, "version": version, "reason": "Stale transfer"}, 409)
	rule := &audience.Rule{Mode: "odd", Sections: []string{a}}
	work := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Section A odd assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, Audience: rule}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+work+"/publish", nil, 200)
	if len(call(t, app, f.Student, "GET", base+"/assignments", nil, 200)["data"].([]any)) != 1 {
		t.Fatal("section audience not visible")
	}
	submission := submitFile(t, app, f.Student, base+"/assignments/"+work+"/submit", uuid.NewString(), 0)["id"].(string)
	call(t, app, f.Teacher, "PUT", base+"/assignments/"+work+"/submissions/"+submission+"/grade", fiber.Map{"points": 80, "feedback": "Reviewed"}, 200)
	call(t, app, f.Teacher, "DELETE", base+"/sections/"+a, fiber.Map{"version": 1}, 409)
	roster = call(t, app, f.Teacher, "GET", base+"/roster", nil, 200)["data"].(map[string]any)["items"].([]any)[0].(map[string]any)
	call(t, app, f.Teacher, "PUT", base+"/roster/"+f.Student, fiber.Map{"section_id": b, "version": roster["version"], "reason": "Section transfer"}, 200)
	call(t, app, f.Student, "GET", base+"/assignments/"+work+"/submissions", nil, 200)
	filterA := url.QueryEscape(fmt.Sprintf(`{"mode":"all","section_ids":["%s"]}`, a))
	filterB := url.QueryEscape(fmt.Sprintf(`{"mode":"all","section_ids":["%s"]}`, b))
	if len(call(t, app, f.Teacher, "GET", base+"/progress?offset=0&audience="+filterA, nil, 200)["data"].(map[string]any)["students"].([]any)) != 0 {
		t.Fatal("old section filter")
	}
	if len(call(t, app, f.Teacher, "GET", base+"/gradebook?audience="+filterB, nil, 200)["data"].(map[string]any)["students"].([]any)) != 1 {
		t.Fatal("new section filter")
	}
	day := time.Now().Format("2006-01-02")
	if len(call(t, app, f.Teacher, "GET", base+"/attendance?day="+day+"&audience="+filterA, nil, 200)["data"].([]any)) != 0 {
		t.Fatal("attendance filter")
	}
	call(t, app, f.Teacher, "PUT", base+"/attendance?day="+day+"&audience="+filterA, fiber.Map{"rows": []fiber.Map{{"id": f.Student, "status": "present"}}}, 409)
	view := call(t, app, f.Teacher, "GET", base+"/student-view?roll=001", nil, 200)["data"].(map[string]any)
	if len(view["items"].([]any)) != 1 || !view["items"].([]any)[0].(map[string]any)["visible"].(bool) {
		t.Fatal("historical student view", view)
	}
	call(t, app, f.Student, "GET", base+"/student-view?roll=001", nil, 403)
	var email string
	f.DB.QueryRow(t.Context(), `SELECT email FROM users WHERE id=$1::uuid`, f.Student).Scan(&email)
	csv := "name,email,roll,section\nTest User," + email + ",001,A\n"
	preview := call(t, app, f.Teacher, "POST", base+"/roster/import", fiber.Map{"csv": csv, "action": "preview"}, 200)["data"].(map[string]any)
	if preview["ready"] != float64(1) {
		t.Fatal(preview)
	}
	call(t, app, f.Teacher, "POST", base+"/roster/import", fiber.Map{"csv": csv, "action": "commit", "revision": preview["revision"], "reason": "Imported section roster"}, 200)
	call(t, app, f.Teacher, "POST", base+"/roster/import", fiber.Map{"csv": csv, "action": "commit", "revision": preview["revision"], "reason": "Replay import"}, 409)
	csv = "name,email,roll,section\nTest User," + email + ",002,B\n"
	preview = call(t, app, f.Teacher, "POST", base+"/roster/import", fiber.Map{"csv": csv, "action": "preview"}, 200)["data"].(map[string]any)
	if preview["ready"] != float64(0) {
		t.Fatal("participating roll changed", preview)
	}
	var history int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_roster_events WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&history); err != nil || history != 3 {
		t.Fatal(history, err)
	}
}
