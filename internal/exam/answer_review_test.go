package exam

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAnswerReviewReleaseBoundary(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	exam, attempt := uuid.NewString(), uuid.NewString()
	question := `[{"id":"q","kind":"mcq","prompt":"Which complexity?","points":10,"options":["O(log n)","O(n)"],"correct_option":0,"explanation":"Half the search interval is discarded each iteration."}]`
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Review boundary',now()-interval '1 hour',now()+interval '1 hour',60,'published',$4::jsonb)`, exam, f.ClassID, f.Teacher, question)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,started_at,expires_at,status,answers,submitted_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()-interval '30 minutes',now()+interval '30 minutes','submitted','{"q":"1"}',now());`, attempt, exam, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Get("/classrooms/:id/exams/:examID/result", h.MyResult)
	app.Put("/classrooms/:id/exams/:examID/review-settings", h.ReviewSettings)
	call := func(user, method, suffix, body string, status int) string {
		t.Helper()
		r := httptest.NewRequest(method, "/classrooms/"+f.ClassID+"/exams/"+exam+suffix, bytes.NewBufferString(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != status {
			t.Fatalf("got %d want %d: %s", res.StatusCode, status, raw)
		}
		return string(raw)
	}
	call(f.Student, "GET", "/result", "", 404)
	call(f.Student, "PUT", "/review-settings", `{"show_explanations":true}`, 403)
	call(f.Teacher, "PUT", "/review-settings", `{"show_explanations":true}`, 200)
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_result_publications(attempt_id,published_by) VALUES($1::uuid,$2::uuid)`, attempt, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	early := call(f.Student, "GET", "/result", "", 200)
	if strings.Contains(early, "correct_answer") || strings.Contains(early, "Half the search") {
		t.Fatal("answer review leaked before exam ended")
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_exams SET ends_at=now()-interval '1 second' WHERE id=$1::uuid`, exam)
	if err != nil {
		t.Fatal(err)
	}
	released := call(f.Student, "GET", "/result", "", 200)
	if !strings.Contains(released, "Half the search") || !strings.Contains(released, "O(log n)") {
		t.Fatal("published explanation missing after exam end", released)
	}
	call(f.Outsider, "GET", "/result", "", 403)
	call(f.Teacher, "PUT", "/review-settings", `{"show_explanations":false}`, 200)
	if strings.Contains(call(f.Student, "GET", "/result", "", 200), "correct_answer") {
		t.Fatal("teacher could not hide answer review")
	}
	var qs []Question
	json.Unmarshal([]byte(question), &qs)
	public, _ := json.Marshal(publicQuestions(qs))
	if bytes.Contains(public, []byte("explanation")) || bytes.Contains(public, []byte("correct_option")) {
		t.Fatal("answer keys leaked in live question payload")
	}
}
