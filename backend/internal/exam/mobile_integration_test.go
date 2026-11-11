package exam

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestMobileExamPolicyAndRecovery(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		user := c.Get("X-Test-User")
		if user == "" {
			user = f.Student
		}
		c.Locals("user_id", user)
		return c.Next()
	})
	g := app.Group("/classrooms/:id/exams")
	g.Get("/:examID/access", h.ExamAccess)
	g.Post("/:examID/start", h.Start)
	g.Get("/:examID/attempt", h.Attempt)
	g.Put("/:examID/attempt", h.Save)
	g.Post("/:examID/submit", h.Submit)
	makeExam := func(allowed bool, kind string) string {
		t.Helper()
		id := uuid.NewString()
		questions := `[{"id":"q","kind":"` + kind + `","prompt":"Choose","points":10,"options":["A","B"],"correct_option":0}]`
		_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions,allow_mobile_mcq) VALUES($1::uuid,$2::uuid,$3::uuid,'Phone policy',now()-interval '5 minutes',now()+interval '1 hour',60,'published',$4::jsonb,$5)`, id, f.ClassID, f.Teacher, questions, allowed)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	call := func(method, id, path, body, user string, status int) map[string]any {
		t.Helper()
		req := httptest.NewRequest(method, "/classrooms/"+f.ClassID+"/exams/"+id+path, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Mozilla/5.0 Android Mobile EduNexusAndroid/1.0")
		req.Header.Set("X-Test-User", user)
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s: expected %d got %d: %s", method, path, status, res.StatusCode, raw)
		}
		var result map[string]any
		json.Unmarshal(raw, &result)
		return result
	}
	entry := `{"entry_mode":"mobile","mobile_rules_accepted":true}`
	disabled := makeExam(false, "mcq")
	call("POST", disabled, "/start", entry, "", 403)
	coding := makeExam(true, "coding") // Even a manually flagged coding exam is refused.
	call("POST", coding, "/start", entry, "", 403)
	id := makeExam(true, "mcq")
	call("POST", id, "/start", `{"entry_mode":"mobile"}`, "", 400)
	call("POST", id, "/start", entry, f.Outsider, 403)
	call("POST", id, "/start", `{"entry_mode":"desktop"}`, "", 403)
	started := call("POST", id, "/start", entry, "", 200)["data"].(map[string]any)
	attempt := started["attempt"].(map[string]any)
	if attempt["entry_mode"] != "mobile" {
		t.Fatal("phone entry not persisted")
	}
	questions := started["questions"].([]any)
	if _, leaked := questions[0].(map[string]any)["correct_option"]; leaked {
		t.Fatal("answer key leaked")
	}
	call("PUT", id, "/attempt", `{"answers":{"q":"0"},"expected_revision":0}`, "", 200)
	resumed := call("GET", id, "/attempt", "", "", 200)["data"].(map[string]any)["attempt"].(map[string]any)
	if resumed["answers"].(map[string]any)["q"] != "0" || resumed["revision"] != float64(1) {
		t.Fatal("phone answer recovery failed")
	}
	replay := call("POST", id, "/start", entry, "", 200)["data"].(map[string]any)["attempt"].(map[string]any)
	if replay["id"] != attempt["id"] {
		t.Fatal("duplicate attempt created")
	}
	call("POST", id, "/submit", `{"answers":{"q":"0"},"expected_revision":1}`, "", 200)
	call("POST", id, "/submit", `{"answers":{"q":"1"},"expected_revision":0}`, "", 200)
	desktop := makeExam(true, "mcq")
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(exam_id,student_id,expires_at) VALUES($1::uuid,$2::uuid,now()+interval '1 hour')`, desktop, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	call("POST", desktop, "/start", entry, "", 409)
	call("GET", desktop, "/attempt", "", "", 403)
	call("PUT", desktop, "/attempt", `{"answers":{"q":"0"}}`, "", 403)
}
