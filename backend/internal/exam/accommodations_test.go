package exam

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"net/http/httptest"
	"testing"
	"time"
)

func TestPersonalExtraTimeReachesMobileAttemptAndKeepsHardClose(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return c.Next() })
	app.Post("/classrooms/:id/exams/:examID/start", h.Start)
	for _, window := range []int{120, 45} {
		id := uuid.NewString()
		if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions,allow_mobile_mcq) VALUES($1::uuid,$2::uuid,$3::uuid,'Extra time',now()-interval '1 minute',now()+$4*interval '1 minute',60,'published','[{"id":"q","kind":"mcq","prompt":"Pick","points":10,"options":["a","b"],"correct_option":0}]',true)`, id, f.ClassID, f.Teacher, window); e != nil {
			t.Fatal(e)
		}
		if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_accommodations(classroom_id,resource_id,kind,exam_id,student_id,extra_minutes) VALUES($1::uuid,$2::uuid,'exam',$2::uuid,$3::uuid,30)`, f.ClassID, id, f.Student); e != nil {
			t.Fatal(e)
		}
		request := httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/exams/"+id+"/start", bytes.NewBufferString(`{"entry_mode":"mobile","mobile_rules_accepted":true}`))
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("User-Agent", "Android Mobile")
		response, e := app.Test(request)
		if e != nil {
			t.Fatal(e)
		}
		var result struct {
			Data struct {
				Exam    Exam    `json:"exam"`
				Attempt Attempt `json:"attempt"`
			} `json:"data"`
		}
		e = json.NewDecoder(response.Body).Decode(&result)
		response.Body.Close()
		if e != nil || response.StatusCode != 200 {
			t.Fatal(response.StatusCode, e)
		}
		minutes := result.Data.Attempt.ExpiresAt.Sub(result.Data.Attempt.StartedAt).Minutes()
		want := 90.0
		if window == 45 {
			want = 45
		}
		if minutes < want-0.1 || minutes > want+0.1 || result.Data.Exam.DurationMinutes != 90 {
			t.Fatal("personal duration not enforced", window, minutes, result.Data.Exam.DurationMinutes)
		}
		if result.Data.Attempt.ExpiresAt.After(result.Data.Exam.EndsAt.Add(time.Second)) {
			t.Fatal("extra time bypassed hard close")
		}
	}
}

func TestManualExamPublicationCompletesPendingSchedule(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Teacher); return c.Next() })
	app.Post("/classrooms/:id/exams/:examID/publish", h.Publish)
	id := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Manual publication',now()+interval '2 hours',now()+interval '3 hours',60,'[{"id":"q","kind":"mcq","prompt":"Choose one","points":5,"options":["A","B"],"correct_option":0}]')`, id, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_content_schedules(resource_id,classroom_id,kind,exam_id,actor_id,publish_at) VALUES($1::uuid,$2::uuid,'exam',$1::uuid,$3::uuid,now()+interval '1 hour')`, id, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	response, e := app.Test(httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/exams/"+id+"/publish", nil))
	if e != nil {
		t.Fatal(e)
	}
	response.Body.Close()
	if response.StatusCode != 200 {
		t.Fatal(response.StatusCode)
	}
	var state string
	if e = f.DB.QueryRow(t.Context(), `SELECT state FROM classroom_content_schedules WHERE resource_id=$1::uuid`, id).Scan(&state); e != nil || state != "published" {
		t.Fatal(state, e)
	}
}
