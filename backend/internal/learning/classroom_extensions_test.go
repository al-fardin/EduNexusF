package learning

import (
	"errors"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/platform/contentrelease"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func TestScheduledAssignmentsConcurrentPublicationAndCancellation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/content-schedules", h.ContentSchedules)
	app.Put("/classrooms/:id/content-schedules", h.ContentSchedules)
	at := time.Now().Add(time.Hour)
	a := Assignment{Title: "Scheduled assignment", DueAt: at.Add(time.Hour), MaxPoints: 100, PublishAt: &at}
	id := call(t, app, f.Teacher, "POST", base+"/assignments", a, 200)["data"].(map[string]any)["id"].(string)
	if len(call(t, app, f.Student, "GET", base+"/assignments", nil, 200)["data"].([]any)) != 0 {
		t.Fatal("scheduled assignment visible")
	}
	call(t, app, f.Student, "GET", base+"/content-schedules", nil, 403)
	list := call(t, app, f.Teacher, "GET", base+"/content-schedules", nil, 200)["data"].(map[string]any)["items"].([]any)
	item := list[0].(map[string]any)
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", fiber.Map{"id": id, "kind": "assignment", "action": "cancel", "version": 0}, 400)
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", fiber.Map{"id": id, "kind": "assignment", "action": "cancel", "version": item["version"]}, 200)
	call(t, app, f.Teacher, "PUT", base+"/content-schedules", fiber.Map{"id": id, "kind": "assignment", "action": "publish", "version": item["version"]}, 409)
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_content_schedules SET state='scheduled',publish_at=now()-interval '1 minute' WHERE resource_id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for range 2 {
		wg.Add(1)
		go func() { defer wg.Done(); results <- contentrelease.PublishOne(t.Context(), f.DB) }()
	}
	wg.Wait()
	close(results)
	for err := range results {
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			t.Fatal(err)
		}
	}
	if len(call(t, app, f.Student, "GET", base+"/assignments", nil, 200)["data"].([]any)) != 1 {
		t.Fatal("scheduled assignment not published")
	}
	if err := contentrelease.PublishOne(t.Context(), f.DB); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("repeated publication", err)
	}
	a.Title = "Blocked assignment"
	id = call(t, app, f.Teacher, "POST", base+"/assignments", a, 200)["data"].(map[string]any)["id"].(string)
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_content_schedules SET publish_at=now()-interval '1 minute' WHERE resource_id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE classrooms SET status='archived' WHERE id=$1::uuid`, f.ClassID); err != nil {
		t.Fatal(err)
	}
	if err := contentrelease.PublishOne(t.Context(), f.DB); err != nil {
		t.Fatal(err)
	}
	var state string
	if err := f.DB.QueryRow(t.Context(), `SELECT state FROM classroom_content_schedules WHERE resource_id=$1::uuid`, id).Scan(&state); err != nil || state != "blocked" {
		t.Fatal(state, err)
	}
}

func TestProgressCourseworkPrivacyFeedbackAndClassScopedSearch(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/progress/:studentID/coursework", h.ProgressCoursework)
	criterion := RubricCriterion{ID: uuid.NewString(), Title: "Accuracy", Maximum: 100, Description: "Explain each step"}
	a := Assignment{Title: "Class scoped algebra", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, Rubric: []RubricCriterion{criterion}}
	id := call(t, app, f.Teacher, "POST", base+"/assignments", a, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+id+"/publish", nil, 200)
	sub := submitFile(t, app, f.Student, base+"/assignments/"+id+"/submit", uuid.NewString(), 0)["id"].(string)
	call(t, app, f.Teacher, "PUT", base+"/assignments/"+id+"/submissions/"+sub+"/grade", fiber.Map{"criteria": fiber.Map{criterion.ID: 80}, "feedback": "Explain the final step"}, 200)
	path := base + "/progress/" + f.Student + "/coursework"
	items := call(t, app, f.Student, "GET", path, nil, 200)["data"].(map[string]any)["items"].([]any)
	item := items[0].(map[string]any)
	if item["feedback"] != "Explain the final step" || item["score"] != float64(80) {
		t.Fatal(item)
	}
	call(t, app, f.Outsider, "GET", path, nil, 403)
	call(t, app, f.Student, "GET", base+"/progress/"+f.Teacher+"/coursework", nil, 403)
	a.Title = "Private draft algebra"
	call(t, app, f.Teacher, "POST", base+"/assignments", a, 200)
	search := "/workspace/search?q=" + url.QueryEscape("algebra") + "&class=" + f.ClassID
	items = call(t, app, f.Student, "GET", search, nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatal("draft leak", items)
	}
	items = call(t, app, f.Student, "GET", strings.Replace(search, f.ClassID, f.OtherClassID, 1), nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 0 {
		t.Fatal("class filter ignored", items)
	}
	criterion.Description = strings.Repeat("x", 1001)
	if validRubric([]RubricCriterion{criterion}, 100) == nil {
		t.Fatal("oversized rubric description")
	}
}

func TestScheduledContentRechecksCoTeacherPermissions(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status) VALUES($1::uuid,$2::uuid,'teacher','active')`, f.ClassID, f.Outsider); err != nil {
		t.Fatal(err)
	}
	at := time.Now().Add(time.Hour)
	id := call(t, app, f.Outsider, "POST", "/classrooms/"+f.ClassID+"/assignments", Assignment{Title: "Co teacher scheduled work", MaxPoints: 100, DueAt: at.Add(time.Hour), PublishAt: &at}, 200)["data"].(map[string]any)["id"].(string)
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_staff_permissions(classroom_id,user_id,permissions) VALUES($1::uuid,$2::uuid,'{"coursework":false}'::jsonb)`, f.ClassID, f.Outsider); err != nil {
		t.Fatal(err)
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_content_schedules SET publish_at=now()-interval '1 minute' WHERE resource_id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	if err := contentrelease.PublishOne(t.Context(), f.DB); err != nil {
		t.Fatal(err)
	}
	var state string
	if err := f.DB.QueryRow(t.Context(), `SELECT state FROM classroom_content_schedules WHERE resource_id=$1::uuid`, id).Scan(&state); err != nil || state != "blocked" {
		t.Fatal(state, err)
	}
	app.Put("/classrooms/:id/announcement-drafts", h.Announcements)
	draft := call(t, app, f.Outsider, "PUT", "/classrooms/"+f.ClassID+"/announcement-drafts", fiber.Map{"title": "Co teacher post", "content": "Scheduled notice", "state": "scheduled", "publish_at": at}, 200)["data"].(map[string]any)["id"].(string)
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_announcement_drafts SET publish_at=now()-interval '1 minute' WHERE id=$1::uuid`, draft); err != nil {
		t.Fatal(err)
	}
	if err := h.publishScheduled(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := f.DB.QueryRow(t.Context(), `SELECT state FROM classroom_announcement_drafts WHERE id=$1::uuid`, draft).Scan(&state); err != nil || state != "blocked" {
		t.Fatal(state, err)
	}
	app.Get("/workspace/search", h.Search)
	items := call(t, app, f.Outsider, "GET", "/workspace/search?q=scheduled&class="+f.ClassID, nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 0 {
		t.Fatal("restricted co teacher search leak", items)
	}
}
