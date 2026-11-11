package learning

import (
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
	"time"
)

func TestGradebookIsolationLatestVersionAndMissing(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	app.Get("/classrooms/:id/gradebook", h.Gradebook)
	base := "/classrooms/" + f.ClassID
	call(t, app, f.Student, "GET", base+"/gradebook", nil, 403)
	call(t, app, f.Outsider, "GET", base+"/gradebook", nil, 403)
	created := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Versioned gradebook work", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, AllowLate: true, AllowResubmit: true}, 200)["data"].(map[string]any)["id"].(string)
	path := base + "/assignments/" + created
	call(t, app, f.Teacher, "POST", path+"/publish", nil, 200)
	first := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 0)["id"].(string)
	call(t, app, f.Teacher, "PUT", path+"/submissions/"+first+"/grade", fiber.Map{"points": 100}, 200)
	latest := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 1)["id"].(string)
	data := call(t, app, f.Teacher, "GET", base+"/gradebook", nil, 200)["data"].(map[string]any)
	students := data["students"].([]any)
	if len(students) != 1 {
		t.Fatal("class membership leaked", students)
	}
	s := students[0].(map[string]any)
	cell := s["cells"].(map[string]any)["assignment:"+created].(map[string]any)
	if cell["score"] != nil || cell["status"] != "needs_grading" || cell["version"] != float64(2) {
		t.Fatal("older grade replaced latest", cell)
	}
	call(t, app, f.Teacher, "PUT", path+"/submissions/"+latest+"/grade", fiber.Map{"points": 0}, 200)
	missing := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(id,classroom_id,created_by,title,due_at,max_points,status) VALUES($1::uuid,$2::uuid,$3::uuid,'Missing work',now()-interval '1 day',10,'published')`, missing, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	data = call(t, app, f.Teacher, "GET", base+"/gradebook", nil, 200)["data"].(map[string]any)
	s = data["students"].([]any)[0].(map[string]any)
	cells := s["cells"].(map[string]any)
	if cells["assignment:"+created].(map[string]any)["score"] != float64(0) || cells["assignment:"+missing].(map[string]any)["status"] != "missing" || s["missing"] != float64(1) {
		t.Fatal(s)
	}
}
