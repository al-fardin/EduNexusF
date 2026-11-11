package learning

import (
	"errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"sync"
	"testing"
	"time"
)

func TestClassworkSearchCopyAndDraftPrivacy(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/classwork", h.Classwork)
	app.Post("/classrooms/:id/coursework/:kind/:resourceID/duplicate", h.DuplicateCoursework)
	original := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Private draft calculus", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	items := call(t, app, f.Student, "GET", base+"/classwork", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 0 {
		t.Fatal("student saw draft", items)
	}
	call(t, app, f.Outsider, "GET", base+"/classwork", nil, 403)
	call(t, app, f.Teacher, "GET", base+"/classwork?sort=title;DROP", nil, 400)
	copy := call(t, app, f.Teacher, "POST", base+"/coursework/assignment/"+original+"/duplicate", nil, 201)["data"].(map[string]any)["id"].(string)
	if copy == original {
		t.Fatal("copy reused original")
	}
	call(t, app, f.Student, "POST", base+"/coursework/assignment/"+original+"/duplicate", nil, 403)
	call(t, app, f.Teacher, "POST", "/classrooms/"+f.OtherClassID+"/coursework/assignment/"+original+"/duplicate", nil, 404)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+original+"/publish", nil, 200)
	items = call(t, app, f.Student, "GET", base+"/classwork?q=calculus&kind=assignment&sort=due", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatal(items)
	}
	exam := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Independent exam',now()+interval '1 hour',now()+interval '2 hours',60,'draft','[{"id":"original-question","kind":"mcq","prompt":"Select","points":10,"options":["A","B"],"correct_option":0}]')`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	cloned := call(t, app, f.Teacher, "POST", base+"/coursework/exam/"+exam+"/duplicate", nil, 201)["data"].(map[string]any)["id"].(string)
	var question, status string
	if err = f.DB.QueryRow(t.Context(), `SELECT questions->0->>'id',status FROM classroom_exams WHERE id=$1::uuid`, cloned).Scan(&question, &status); err != nil || question == "original-question" || status != "draft" {
		t.Fatal(question, status, err)
	}
}
func TestAnnouncementSchedulingIsPrivateConflictSafeAndPublishesOnce(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	app.Get("/classrooms/:id/announcement-drafts", h.Announcements)
	app.Put("/classrooms/:id/announcement-drafts", h.Announcements)
	app.Post("/classrooms/:id/announcement-drafts/:draftID/publish", h.PublishAnnouncement)
	call(t, app, f.Student, "GET", base+"/announcement-drafts", nil, 403)
	call(t, app, f.Teacher, "PUT", base+"/announcement-drafts", fiber.Map{"title": "Invalid date", "content": "Notice", "state": "scheduled", "publish_at": time.Now().Add(-time.Hour)}, 400)
	id := call(t, app, f.Teacher, "PUT", base+"/announcement-drafts", fiber.Map{"title": "Scheduled fixture", "content": "A scheduled class notice", "state": "scheduled", "publish_at": time.Now().Add(time.Hour)}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "PUT", base+"/announcement-drafts", fiber.Map{"id": id, "version": 99, "title": "Stale", "content": "Stale edit", "state": "draft"}, 409)
	_, err := f.DB.Exec(t.Context(), `UPDATE classroom_announcement_drafts SET publish_at=now()-interval '1 minute' WHERE id=$1::uuid`, id)
	if err != nil {
		t.Fatal(err)
	}
	var group sync.WaitGroup
	errs := make(chan error, 4)
	for i := 0; i < 4; i++ {
		group.Add(1)
		go func() { defer group.Done(); errs <- h.publishScheduled(t.Context()) }()
	}
	group.Wait()
	close(errs)
	for e := range errs {
		if e != nil && !errors.Is(e, pgx.ErrNoRows) {
			t.Fatal(e)
		}
	}
	var count int
	if err = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_stream_posts WHERE classroom_id=$1::uuid AND title='Scheduled fixture'`, f.ClassID).Scan(&count); err != nil || count != 1 {
		t.Fatal(count, err)
	}
	call(t, app, f.Teacher, "POST", base+"/announcement-drafts/"+id+"/publish", fiber.Map{"version": 1}, 409)
	blocked := call(t, app, f.Teacher, "PUT", base+"/announcement-drafts", fiber.Map{"title": "Permission removed", "content": "Do not publish", "state": "scheduled", "publish_at": time.Now().Add(time.Hour)}, 200)["data"].(map[string]any)["id"].(string)
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_announcement_drafts SET publish_at=now()-interval '1 minute' WHERE id=$1::uuid`, blocked)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	if err = h.publishScheduled(t.Context()); err != nil {
		t.Fatal(err)
	}
	var state string
	if err = f.DB.QueryRow(t.Context(), `SELECT state FROM classroom_announcement_drafts WHERE id=$1::uuid`, blocked).Scan(&state); err != nil || state != "blocked" {
		t.Fatal(state, err)
	}
}
