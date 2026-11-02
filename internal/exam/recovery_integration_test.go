package exam

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"net/http/httptest"
	"testing"
)

func TestRecoveryRevisionAndSubmissionReceipt(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	exam, attempt := uuid.NewString(), uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Recovery exam',now()-interval '1 hour',now()+interval '1 hour',120,'published','[{"id":"q","kind":"theory","prompt":"Explain","points":10}]')`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,expires_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '1 hour')`, attempt, exam, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return c.Next() })
	g := app.Group("/classrooms/:id/exams")
	g.Get("/active", h.ActiveAttempts)
	g.Get("/:examID/attempt", h.Attempt)
	g.Put("/:examID/attempt", h.Save)
	g.Post("/:examID/submit", h.Submit)
	call := func(method, path string, payload any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		req := httptest.NewRequest(method, path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		res, e := app.Test(req)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s: expected %d got %d: %s", path, status, res.StatusCode, body)
		}
		var result map[string]any
		json.Unmarshal(body, &result)
		return result
	}
	base := "/classrooms/" + f.ClassID + "/exams/"
	data := call("GET", base+"active", nil, 200)
	if len(data["data"].([]any)) != 1 {
		t.Fatal("active exam not discoverable")
	}
	saved := call("PUT", base+exam+"/attempt", fiber.Map{"answers": fiber.Map{"q": "first"}, "expected_revision": 0}, 200)["data"].(map[string]any)
	if saved["revision"] != float64(1) || saved["last_saved_at"] == nil {
		t.Fatal("save revision or timestamp missing")
	}
	call("PUT", base+exam+"/attempt", fiber.Map{"answers": fiber.Map{"q": "stale overwrite"}, "expected_revision": 0}, 409)
	receipt := call("POST", base+exam+"/submit", fiber.Map{"answers": fiber.Map{"q": "final"}, "expected_revision": 1}, 200)["data"].(map[string]any)
	retry := call("POST", base+exam+"/submit", fiber.Map{"answers": fiber.Map{"q": "must not replace final"}, "expected_revision": 0}, 200)["data"].(map[string]any)
	if retry["revision"] != receipt["revision"] || retry["submitted_at"] != receipt["submitted_at"] || retry["answers"].(map[string]any)["q"] != "final" {
		t.Fatal("submit replay changed stored answers")
	}
}
func TestQuestionBankSnapshotAndClassIsolation(t *testing.T) {
	f := testsupport.Database(t)
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		user := c.Get("X-Test-User")
		if user == "" {
			user = f.Teacher
		}
		c.Locals("user_id", user)
		return c.Next()
	})
	g := app.Group("/classrooms/:id/question-bank")
	g.Get("/", h.BankList)
	g.Post("/", h.BankSave)
	g.Post("/draw", h.BankDraw)
	reqBody := `{"question":{"kind":"mcq","prompt":"Choose the first option","points":10,"options":["A","B"],"correct_option":0},"topic":"Algebra","difficulty":"easy"}`
	req := httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/question-bank", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("bank save: %s", raw)
	}
	req = httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/question-bank/draw?count=1&topic=Algebra&difficulty=easy", nil)
	res, err = app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var output struct {
		Data []BankItem `json:"data"`
	}
	json.NewDecoder(res.Body).Decode(&output)
	if len(output.Data) != 1 || output.Data[0].Question.Topic != "Algebra" {
		t.Fatal("filtered question draw failed")
	}
	req = httptest.NewRequest("GET", "/classrooms/"+f.ClassID+"/question-bank", nil)
	req.Header.Set("X-Test-User", f.Student)
	res, err = app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 403 {
		t.Fatal("student accessed private answer bank")
	}
}
