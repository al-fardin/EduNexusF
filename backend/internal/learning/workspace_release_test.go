package learning

import (
	"errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"sync"
	"testing"
	"time"
)

func releaseApp(h *Handler) *fiber.App {
	app := reviewApp(h)
	app.Get("/workspace/tasks", h.TaskInbox)
	app.Get("/workspace/storage", h.Storage)
	g := app.Group("/classrooms/:id")
	g.Get("/storage", h.StorageFiles)
	g.Put("/storage", h.StorageFiles)
	g.Get("/reports", h.AcademicReports)
	g.Post("/reports", h.AcademicReports)
	g.Get("/reports/:reportID", h.AcademicReport)
	g.Post("/reports/:reportID/status", h.AcademicReport)
	g.Get("/staff-permissions", h.StaffPermissions)
	g.Put("/staff-permissions/:staffID", h.StaffPermissions)
	g.Post("/staff-permissions", h.StaffPermissions)
	g.Delete("/staff-permissions/:staffID", h.StaffPermissions)
	return app
}
func TestTaskInboxMembershipPendingAndCompletedWork(t *testing.T) {
	f := testsupport.Database(t)
	app := releaseApp(&Handler{db: f.DB})
	base := "/classrooms/" + f.ClassID
	work := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Inbox assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+work+"/publish", nil, 200)
	items := func(user string) []any {
		return call(t, app, user, "GET", "/workspace/tasks?kind=assignment", nil, 200)["data"].(map[string]any)["items"].([]any)
	}
	if len(items(f.Student)) != 1 || len(items(f.Outsider)) != 0 {
		t.Fatal("inbox membership filter failed")
	}
	submitFile(t, app, f.Student, base+"/assignments/"+work+"/submit", uuid.NewString(), 0)
	if len(items(f.Student)) != 0 || len(items(f.Teacher)) != 1 {
		t.Fatal("submission did not move task to teacher grading")
	}
}
func TestStorageQuotaSerializesConcurrentUploads(t *testing.T) {
	f := testsupport.Database(t)
	app := releaseApp(&Handler{db: f.DB})
	base := "/classrooms/" + f.ClassID
	call(t, app, f.Student, "PUT", base+"/storage", fiber.Map{"quota": 10485760}, 403)
	call(t, app, f.Teacher, "PUT", base+"/storage", fiber.Map{"quota": 10485760}, 200)
	_, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_materials(classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,'Existing file','fixture.txt',$3,9437184,'text/plain')`, f.ClassID, f.Teacher, uuid.NewString())
	if e != nil {
		t.Fatal(e)
	}
	var mu sync.Mutex
	accepted, rejected := 0, 0
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_materials(classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,'Concurrent file','fixture.txt',$3,1048576,'text/plain')`, f.ClassID, f.Teacher, uuid.NewString())
			mu.Lock()
			defer mu.Unlock()
			if err == nil {
				accepted++
				return
			}
			var p *pgconn.PgError
			if errors.As(err, &p) && p.ConstraintName == "edunexus_storage_quota" {
				rejected++
			} else {
				t.Errorf("unexpected insert failure: %v", err)
			}
		})
	}
	wg.Wait()
	if accepted != 1 || rejected != 1 {
		t.Fatalf("quota race: accepted %d rejected %d", accepted, rejected)
	}
	call(t, app, f.Teacher, "PUT", base+"/storage", fiber.Map{"quota": 10485759}, 400)
}
func TestAcademicReportPreviewPublicationPrivacyAndSnapshot(t *testing.T) {
	f := testsupport.Database(t)
	app := releaseApp(&Handler{db: f.DB})
	base := "/classrooms/" + f.ClassID
	exam, attempt := uuid.NewString(), uuid.NewString()
	_, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Unpublished marks',now()-interval '1 hour',now()+interval '1 hour',60,'published','[{"id":"q","kind":"mcq","prompt":"Choose","points":10,"options":["A","B"],"correct_option":0}]');`, exam, f.ClassID, f.Teacher)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,status,expires_at,answers) VALUES($1::uuid,$2::uuid,$3::uuid,'submitted',now()+interval '1 hour','{"q":"0"}')`, attempt, exam, f.Student); e != nil {
		t.Fatal(e)
	}
	payload := fiber.Map{"student_id": f.Student, "request_id": uuid.NewString(), "note": "Progress discussion"}
	call(t, app, f.Student, "POST", base+"/reports", payload, 403)
	id := call(t, app, f.Teacher, "POST", base+"/reports", payload, 201)["data"].(map[string]any)["id"].(string)
	if got := call(t, app, f.Teacher, "POST", base+"/reports", payload, 200)["data"].(map[string]any)["id"]; got != id {
		t.Fatal("report retry created duplicate")
	}
	path := base + "/reports/" + id
	call(t, app, f.Student, "GET", path, nil, 404)
	snapshot := call(t, app, f.Teacher, "GET", path, nil, 200)["data"].(map[string]any)["snapshot"].(map[string]any)
	if snapshot["student"].(map[string]any)["graded"] != float64(0) {
		t.Fatal("unpublished exam marks leaked into snapshot")
	}
	call(t, app, f.Teacher, "POST", path+"/status", fiber.Map{"status": "published", "version": 1, "reason": "Reviewed and approved this report snapshot."}, 200)
	call(t, app, f.Student, "GET", path, nil, 200)
	call(t, app, f.Outsider, "GET", path, nil, 403)
	if _, e = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_result_publications(attempt_id,published_by) VALUES($1::uuid,$2::uuid)`, attempt, f.Teacher); e != nil {
		t.Fatal(e)
	}
	snapshot = call(t, app, f.Student, "GET", path, nil, 200)["data"].(map[string]any)["snapshot"].(map[string]any)
	if snapshot["student"].(map[string]any)["graded"] != float64(0) {
		t.Fatal("published report changed after later marks publication")
	}
	call(t, app, f.Teacher, "POST", path+"/status", fiber.Map{"status": "withdrawn", "version": 1, "reason": "Withdraw obsolete report with reason."}, 409)
	call(t, app, f.Teacher, "POST", path+"/status", fiber.Map{"status": "withdrawn", "version": 2, "reason": "Withdraw obsolete report with reason."}, 200)
	call(t, app, f.Student, "GET", path, nil, 404)
}
func TestCoTeacherCapabilitiesCannotAlterOwnerOrPromoteStudent(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := releaseApp(h)
	base := "/classrooms/" + f.ClassID
	_, e := f.DB.Exec(t.Context(), `UPDATE users SET role='instructor' WHERE id=$1::uuid`, f.Outsider)
	if e != nil {
		t.Fatal(e)
	}
	call(t, app, f.Student, "POST", base+"/staff-permissions", fiber.Map{"email": f.Outsider + "@example.invalid"}, 403)
	call(t, app, f.Teacher, "POST", base+"/staff-permissions", fiber.Map{"email": f.Outsider + "@example.invalid"}, 200)
	policy := StaffPolicy(f.DB)
	if policy(t.Context(), f.Outsider, base+"/gradebook", "GET") == nil {
		t.Fatal("new staff had implicit grading permission")
	}
	permissions := map[string]bool{}
	for _, key := range staffCapabilities {
		permissions[key] = key == "grading"
	}
	call(t, app, f.Teacher, "PUT", base+"/staff-permissions/"+f.Teacher, fiber.Map{"permissions": permissions}, 409)
	call(t, app, f.Teacher, "PUT", base+"/staff-permissions/"+f.Outsider, fiber.Map{"permissions": permissions}, 200)
	if e = policy(t.Context(), f.Outsider, base+"/gradebook", "GET"); e != nil {
		t.Fatal(e)
	}
	for _, path := range []string{base, base + "/archive", base + "/course-code"} {
		if policy(t.Context(), f.Outsider, path, "DELETE") == nil {
			t.Fatal("co-teacher could change owner-only class settings")
		}
	}
	if policy(t.Context(), f.Outsider, base+"/materials", "POST") == nil {
		t.Fatal("coursework permission bypassed")
	}
	for _, path := range []string{base + "/join-settings", base + "/enrollment/requests", base + "/enrollment/invitations"} {
		if policy(t.Context(), f.Outsider, path, "GET") == nil {
			t.Fatal("enrollment permissions bypassed")
		}
	}
	if policy(t.Context(), f.Teacher, base+"/materials", "POST") != nil {
		t.Fatal("owner lost permission")
	}
	call(t, app, f.Teacher, "DELETE", base+"/staff-permissions/"+f.Outsider, nil, 200)
	if _, e = f.DB.Exec(t.Context(), `UPDATE users SET role='instructor' WHERE id=$1::uuid`, f.Student); e != nil {
		t.Fatal(e)
	}
	call(t, app, f.Teacher, "POST", base+"/staff-permissions", fiber.Map{"email": f.Student + "@example.invalid"}, 409)
}
