package learning

import (
	"github.com/edunexus/edunexus/internal/platform/contentrelease"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
	"time"
)

func TestBulkSectionsAtomicAndAudienceExclusions(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Post("/classrooms/:id/sections", h.Sections)
	app.Post("/classrooms/:id/roster/bulk-section", h.BulkSection)
	app.Post("/classrooms/:id/audience/preview", h.AudiencePreview)
	section := call(t, app, f.Teacher, "POST", base+"/sections", fiber.Map{"name": "A"}, 200)["data"].(map[string]any)["id"]
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','002')`, f.ClassID, f.Outsider); e != nil {
		t.Fatal(e)
	}
	students := []fiber.Map{{"id": f.Student, "version": 1}, {"id": f.Outsider, "version": 2}}
	payload := fiber.Map{"section_id": section, "reason": "Section transfer", "students": students}
	call(t, app, f.Student, "POST", base+"/roster/bulk-section", payload, 403)
	call(t, app, f.Teacher, "POST", base+"/roster/bulk-section", payload, 409)
	var changed int
	if e := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_memberships WHERE classroom_id=$1::uuid AND section_id IS NOT NULL`, f.ClassID).Scan(&changed); e != nil || changed != 0 {
		t.Fatal("partial transfer", changed, e)
	}
	students[1]["version"] = 1
	call(t, app, f.Teacher, "POST", base+"/roster/bulk-section", payload, 200)
	result := call(t, app, f.Teacher, "POST", base+"/audience/preview?selection=excluded", fiber.Map{"mode": "odd", "section_ids": []any{section}}, 200)["data"].(map[string]any)
	if result["eligible"] != float64(1) || result["total"] != float64(2) || result["students"].([]any)[0].(map[string]any)["roll"] != "002" {
		t.Fatal(result)
	}
	call(t, app, f.Teacher, "POST", base+"/audience/preview?offset=-1", fiber.Map{"mode": "all"}, 400)
	result = call(t, app, f.Teacher, "POST", base+"/audience/preview", fiber.Map{"mode": "all"}, 200)["data"].(map[string]any)
	if result["eligible"] != float64(2) {
		t.Fatal("Everyone changed", result)
	}
}

func TestPersonalTimingDeadlinesAndCAS(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/accommodations", h.Accommodations)
	app.Put("/classrooms/:id/accommodations", h.Accommodations)
	due := time.Now().Add(-time.Hour)
	extended := time.Now().Add(time.Hour)
	id := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Personal deadline work", DueAt: due, MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+id+"/publish", nil, 200)
	payload := fiber.Map{"resource_id": id, "kind": "assignment", "student_roll": "001", "due_at": extended, "version": 0, "reason": "Approved extension"}
	call(t, app, f.Student, "PUT", base+"/accommodations", payload, 403)
	call(t, app, f.Teacher, "PUT", base+"/accommodations", payload, 200)
	call(t, app, f.Teacher, "PUT", base+"/accommodations", payload, 409)
	list := call(t, app, f.Student, "GET", base+"/assignments", nil, 200)["data"].([]any)[0].(map[string]any)
	at, e := time.Parse(time.RFC3339Nano, list["due_at"].(string))
	if e != nil || at.Sub(extended) > time.Second || at.Before(due.Add(time.Minute)) {
		t.Fatal("personal deadline", list)
	}
	submitFile(t, app, f.Student, base+"/assignments/"+id+"/submit", uuid.NewString(), 0)
	rows := call(t, app, f.Teacher, "GET", base+"/assignments/"+id+"/submissions", nil, 200)["data"].([]any)
	if rows[0].(map[string]any)["late"] != false {
		t.Fatal("extension marked late", rows)
	}
	tasks := call(t, app, f.Student, "GET", "/workspace/calendar?from="+time.Now().Add(-time.Minute).UTC().Format(time.RFC3339)+"&to="+time.Now().Add(2*time.Hour).UTC().Format(time.RFC3339), nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(tasks) != 1 {
		t.Fatal("calendar ignores extension", tasks)
	}
	eid := uuid.NewString()
	if _, e = f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Extra time exam',now()+interval '1 hour',now()+interval '3 hours',60,'[]')`, eid, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	extra := fiber.Map{"resource_id": eid, "kind": "exam", "student_roll": "001", "extra_minutes": 30, "version": 0, "reason": "Approved extra time"}
	call(t, app, f.Teacher, "PUT", base+"/accommodations", extra, 200)
	var minutes int
	if e = f.DB.QueryRow(t.Context(), `SELECT edunexus_exam_duration($1::uuid,$2::uuid)`, eid, f.Student).Scan(&minutes); e != nil || minutes != 90 {
		t.Fatal(minutes, e)
	}
	if e = f.DB.QueryRow(t.Context(), `SELECT edunexus_exam_duration($1::uuid,$2::uuid)`, eid, f.Outsider).Scan(&minutes); e != nil || minutes != 60 {
		t.Fatal("other student changed", minutes, e)
	}
	f.DB.Exec(t.Context(), `UPDATE classroom_exams SET starts_at=now()-interval '1 minute' WHERE id=$1::uuid`, eid)
	extra["version"] = 1
	call(t, app, f.Teacher, "PUT", base+"/accommodations", extra, 409)
}

func TestTrashRestorePermissionsWindowAndAudience(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/trash", h.TrashContent)
	app.Post("/classrooms/:id/trash/:kind/:resourceID/restore", h.TrashContent)
	app.Get("/workspace/trash", h.TrashClasses)
	app.Post("/workspace/trash/:classID/restore", h.TrashClasses)
	id := uuid.NewString()
	_, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_stream_posts(id,classroom_id,author_id,post_type,title,content,audience,deleted_at) VALUES($1::uuid,$2::uuid,$3::uuid,'announcement','Deleted odd notice','Hello','{"mode":"even"}',now())`, id, f.ClassID, f.Teacher)
	if e != nil {
		t.Fatal(e)
	}
	call(t, app, f.Student, "GET", base+"/trash", nil, 403)
	item := call(t, app, f.Teacher, "GET", base+"/trash", nil, 200)["data"].(map[string]any)["items"].([]any)[0].(map[string]any)
	req := fiber.Map{"deleted_at": item["deleted_at"], "reason": "Recover accidental deletion"}
	call(t, app, f.Outsider, "POST", base+"/trash/post/"+id+"/restore", req, 403)
	call(t, app, f.Teacher, "POST", base+"/trash/post/"+id+"/restore", req, 200)
	call(t, app, f.Teacher, "POST", base+"/trash/post/"+id+"/restore", req, 409)
	var visible bool
	if e = f.DB.QueryRow(t.Context(), `SELECT edunexus_resource_visible($1::uuid,'post',$2::uuid,$3::uuid)`, f.ClassID, id, f.Student).Scan(&visible); e != nil || visible {
		t.Fatal("restoration widened audience", e)
	}
	if _, e = f.DB.Exec(t.Context(), `UPDATE classrooms SET deleted_at=now() WHERE id=$1::uuid`, f.ClassID); e != nil {
		t.Fatal(e)
	}
	item = call(t, app, f.Teacher, "GET", "/workspace/trash", nil, 200)["data"].(map[string]any)["items"].([]any)[0].(map[string]any)
	req["deleted_at"] = item["deleted_at"]
	call(t, app, f.Student, "POST", "/workspace/trash/"+f.ClassID+"/restore", req, 409)
	call(t, app, f.Teacher, "POST", "/workspace/trash/"+f.ClassID+"/restore", req, 200)
	var status string
	if e = f.DB.QueryRow(t.Context(), `SELECT status FROM classrooms WHERE id=$1::uuid`, f.ClassID).Scan(&status); e != nil || status != "archived" {
		t.Fatal(status, e)
	}
	f.DB.Exec(t.Context(), `UPDATE classrooms SET deleted_at=now()-interval '31 days' WHERE id=$1::uuid`, f.ClassID)
	call(t, app, f.Teacher, "POST", "/workspace/trash/"+f.ClassID+"/restore", req, 409)
}

func TestScheduledExamPublicationAndStaleVersion(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Put("/classrooms/:id/content-schedules", h.ContentSchedules)
	app.Get("/classrooms/:id/content-schedules", h.ContentSchedules)
	id := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Scheduled exam',now()+interval '2 hours',now()+interval '3 hours',60,'[]')`, id, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	req := fiber.Map{"id": id, "kind": "exam", "action": "schedule", "version": 0, "publish_at": time.Now().Add(time.Hour)}
	call(t, app, f.Student, "PUT", base+"/content-schedules", req, 403)
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", req, 200)
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", req, 409)
	items := call(t, app, f.Teacher, "GET", base+"/content-schedules", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["kind"] != "exam" {
		t.Fatal(items)
	}
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_content_schedules SET publish_at=now()-interval '1 minute' WHERE resource_id=$1::uuid`, id); e != nil {
		t.Fatal(e)
	}
	if e := contentrelease.PublishOne(t.Context(), f.DB); e != nil {
		t.Fatal(e)
	}
	var status string
	if e := f.DB.QueryRow(t.Context(), `SELECT status FROM classroom_exams WHERE id=$1::uuid`, id).Scan(&status); e != nil || status != "published" {
		t.Fatal(status, e)
	}
	req["action"] = "cancel"
	req["version"] = 1
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", req, 409)
}

func TestMaterialTrashRestoresOnlyItsLinksAndKeepsAudience(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/trash", h.TrashContent)
	app.Post("/classrooms/:id/trash/:kind/:resourceID/restore", h.TrashContent)
	id, post := uuid.NewString(), uuid.NewString()
	at := time.Now().UTC().Truncate(time.Microsecond)
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type,audience) VALUES($1::uuid,$2::uuid,$3::uuid,'Retained notes','notes.txt',$4,5,'text/plain','{"mode":"even"}')`, id, f.ClassID, f.Teacher, uuid.NewString()); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_stream_posts(id,classroom_id,author_id,post_type,title,content,reference_type,reference_id,deleted_at) VALUES($1::uuid,$2::uuid,$3::uuid,'material','Retained notes','Notes','material',$4::uuid,$5)`, post, f.ClassID, f.Teacher, id, at); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_material_trash(material_id,deleted_at,post_ids) VALUES($1::uuid,$2,ARRAY[$3::uuid])`, id, at, post); e != nil {
		t.Fatal(e)
	}
	var visible bool
	if e := f.DB.QueryRow(t.Context(), `SELECT edunexus_resource_visible($1::uuid,'material',$2::uuid,$3::uuid)`, f.ClassID, id, f.Teacher).Scan(&visible); e != nil || visible {
		t.Fatal("teacher can download trash", e)
	}
	req := fiber.Map{"deleted_at": at, "reason": "Recover lesson notes"}
	call(t, app, f.Teacher, "POST", base+"/trash/material/"+id+"/restore", req, 200)
	if e := f.DB.QueryRow(t.Context(), `SELECT edunexus_resource_visible($1::uuid,'material',$2::uuid,$3::uuid)`, f.ClassID, id, f.Student).Scan(&visible); e != nil || visible {
		t.Fatal("material audience widened", e)
	}
	var restored bool
	if e := f.DB.QueryRow(t.Context(), `SELECT deleted_at IS NULL FROM classroom_stream_posts WHERE id=$1::uuid`, post).Scan(&restored); e != nil || !restored {
		t.Fatal("original material link not restored", e)
	}
}

func TestPlannerIncludesStillOpenExamsWithoutOldDeadlines(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,'Still open exam',now()-interval '2 days',now()+interval '1 hour',60,'published','[]')`, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	query := "/workspace/calendar?from=" + time.Now().UTC().Format(time.RFC3339) + "&to=" + time.Now().Add(7*24*time.Hour).UTC().Format(time.RFC3339)
	normal := call(t, app, f.Student, "GET", query, nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(normal) != 0 {
		t.Fatal("normal calendar changed", normal)
	}
	planner := call(t, app, f.Student, "GET", query+"&include_open=1", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(planner) != 1 {
		t.Fatal("open exam missing", planner)
	}
}
