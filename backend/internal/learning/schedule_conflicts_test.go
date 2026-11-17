package learning

import (
	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
	"time"
)

func TestScheduleChecksAreAdvisoryScopedAndAudienceAware(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	app.Post("/classrooms/:id/schedule-conflicts", h.ScheduleConflicts)
	path := "/classrooms/" + f.ClassID + "/schedule-conflicts"
	start := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	end := start.Add(time.Hour)
	id := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','002')`, f.OtherClassID, f.Student); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions,audience) VALUES($1::uuid,$2::uuid,$3::uuid,'Other class even exam',$4,$5,60,'published','[]','{"mode":"even"}')`, id, f.OtherClassID, f.Teacher, start, end); e != nil {
		t.Fatal(e)
	}
	req := fiber.Map{"kind": "exam", "starts_at": start, "ends_at": end, "audience": audience.Rule{Mode: "odd"}}
	call(t, app, f.Student, "POST", path, req, 403)
	items := call(t, app, f.Teacher, "POST", path, req, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["shared_students"] != float64(1) {
		t.Fatal(items)
	}
	req["audience"] = audience.Rule{Mode: "even"}
	items = call(t, app, f.Teacher, "POST", path, req, 200)["data"].(map[string]any)["items"].([]any)
	if items[0].(map[string]any)["shared_students"] != float64(0) {
		t.Fatal("proposed audience ignored", items)
	}
	req["starts_at"] = end
	req["ends_at"] = end.Add(time.Hour)
	items = call(t, app, f.Teacher, "POST", path, req, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 0 {
		t.Fatal("adjacent exams counted as overlap", items)
	}
	req["starts_at"] = start
	req["ends_at"] = end
	privateClass := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classrooms(id,owner_id,name,class_code) VALUES($1::uuid,$2::uuid,'Hidden class',$3)`, privateClass, f.Outsider, uuid.NewString()[:6]); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { f.DB.Exec(t.Context(), `DELETE FROM classrooms WHERE id=$1::uuid`, privateClass) })
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,'Private exam never disclosed',$3,$4,60,'published','[]')`, privateClass, f.Outsider, start, end); e != nil {
		t.Fatal(e)
	}
	items = call(t, app, f.Teacher, "POST", path, req, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatal("another teacher's class leaked", items)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(classroom_id,created_by,title,due_at,max_points,status) VALUES($1::uuid,$2::uuid,'Nearby essay',$3,100,'published')`, f.ClassID, f.Teacher, end.Add(2*time.Hour)); e != nil {
		t.Fatal(e)
	}
	items = call(t, app, f.Teacher, "POST", path, fiber.Map{"kind": "assignment", "due_at": end}, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 2 {
		t.Fatal("deadline cluster not detected", items)
	}
	req["ends_at"] = start.Add(-time.Minute)
	call(t, app, f.Teacher, "POST", path, req, 400)
}

func TestScheduleChecksBoundLargeCandidateLists(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	app.Post("/classrooms/:id/schedule-conflicts", h.ScheduleConflicts)
	start := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	end := start.Add(time.Hour)
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) SELECT $1::uuid,$2::uuid,'Exam '||i,$3::timestamptz,$4::timestamptz,60,'published','[]'::jsonb FROM generate_series(1,102)i`, f.ClassID, f.Teacher, start, end); e != nil {
		t.Fatal(e)
	}
	result := call(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/schedule-conflicts", fiber.Map{"kind": "exam", "starts_at": start, "ends_at": end}, 200)["data"].(map[string]any)
	if result["truncated"] != true || len(result["items"].([]any)) != 100 {
		t.Fatal("unbounded conflict response", result["truncated"])
	}
}
