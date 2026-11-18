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

func TestCheckboxKeysAndCanonicalAnswers(t *testing.T) {
	q := Question{ID: "q", Kind: "mcq", Prompt: "Choose primes", Points: 5, Options: []string{"2", "4", "3"}, Selection: "multiple", CorrectOptions: []int{2, 0}}
	if _, err := normalizeQuestions([]Question{q}); err != nil {
		t.Fatal(err)
	}
	if err := normalizeMCQ(&q); err != nil {
		t.Fatal(err)
	}
	if mcqKey(q) != "0,2" {
		t.Fatal("key must be canonical")
	}
	for _, value := range []string{"", "0", "0,2"} {
		if err := validateAnswers(map[string]string{"q": value}, []Question{q}); err != nil {
			t.Fatal(value, err)
		}
	}
	for _, value := range []string{"2,0", "0,0", "0,3", "00", "0, 2", "-1"} {
		if err := validateAnswers(map[string]string{"q": value}, []Question{q}); err == nil {
			t.Fatal("accepted invalid answer", value)
		}
	}
	raw, _ := json.Marshal(publicQuestions([]Question{q}))
	if strings.Contains(string(raw), "correct_option") || strings.Contains(string(raw), "explanation") {
		t.Fatal("answer key leak", string(raw))
	}
	if !strings.Contains(string(raw), `"selection":"multiple"`) {
		t.Fatal("selection missing from public question")
	}
	q.CorrectOptions = []int{0, 0}
	if err := normalizeMCQ(&q); err == nil {
		t.Fatal("duplicate keys accepted")
	}
	q.Selection = "dropdown"
	q.CorrectOption = nil
	if err := normalizeMCQ(&q); err == nil {
		t.Fatal("missing dropdown key accepted")
	}
}

func TestMCQDatabaseScoreAndAutoMarks(t *testing.T) {
	f := testsupport.Database(t)
	q := Question{ID: "q", Kind: "mcq", Prompt: "Choose primes", Points: 5, Options: []string{"2", "4", "3"}, Selection: "multiple", CorrectOptions: []int{0, 2}}
	raw, _ := json.Marshal(q)
	for _, tc := range []struct {
		answer string
		want   int
	}{{"0,2", 5}, {"0", 0}, {"0,1,2", 0}, {"2,0", 0}, {"", 0}, {"0,0,2", 0}} {
		var got int
		if err := f.DB.QueryRow(t.Context(), `SELECT edunexus_mcq_score($1::jsonb,$2)`, string(raw), tc.answer).Scan(&got); err != nil {
			t.Fatal(err)
		}
		if got != tc.want {
			t.Fatalf("%s: %d != %d", tc.answer, got, tc.want)
		}
	}
	var legacy int
	if err := f.DB.QueryRow(t.Context(), `SELECT edunexus_mcq_score('{"kind":"mcq","points":10,"correct_option":0}', '0')`).Scan(&legacy); err != nil || legacy != 10 {
		t.Fatal("legacy grading changed", legacy, err)
	}
}

func TestCheckboxPhoneSubmissionAndAutoMarks(t *testing.T) {
	f := testsupport.Database(t)
	q := Question{ID: "q", Kind: "mcq", Prompt: "Select primes", Points: 5, Options: []string{"2", "4", "3"}, Selection: "multiple", CorrectOptions: []int{0, 2}}
	id := uuid.NewString()
	questions, _ := json.Marshal([]Question{q})
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions,allow_mobile_mcq) VALUES($1::uuid,$2::uuid,$3::uuid,'Checkbox exam',now()-interval '1 minute',now()+interval '1 hour',60,'published',$4::jsonb,true)`, id, f.ClassID, f.Teacher, string(questions)); err != nil {
		t.Fatal(err)
	}
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return c.Next() })
	g := app.Group("/classrooms/:id/exams/:examID")
	g.Post("/start", h.Start)
	g.Put("/attempt", h.Save)
	g.Post("/submit", h.Submit)
	call := func(method, path, body string, status int) []byte {
		t.Helper()
		req := httptest.NewRequest(method, "/classrooms/"+f.ClassID+"/exams/"+id+path, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Android Mobile EduNexusAndroid/1.0")
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s: %d %s", path, res.StatusCode, raw)
		}
		return raw
	}
	public := call("POST", "/start", `{"entry_mode":"mobile","mobile_rules_accepted":true}`, 200)
	if bytes.Contains(public, []byte("correct_options")) {
		t.Fatal("checkbox key leaked")
	}
	call("PUT", "/attempt", `{"answers":{"q":"2,0"},"expected_revision":0}`, 400)
	call("PUT", "/attempt", `{"answers":{"q":"0,2"},"expected_revision":0}`, 200)
	call("POST", "/submit", `{"answers":{"q":"0,2"},"expected_revision":1}`, 200)
	app.Get("/auto-marks", func(c *fiber.Ctx) error {
		if err := h.syncAutoMarks(c, id, []Question{q}); err != nil {
			return err
		}
		return c.SendStatus(200)
	})
	res, err := app.Test(httptest.NewRequest("GET", "/auto-marks", nil))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatal("auto marking failed", res.StatusCode)
	}
	var awarded int
	var feedback string
	if err = f.DB.QueryRow(t.Context(), `SELECT m.awarded_points,m.feedback FROM classroom_exam_question_marks m JOIN classroom_exam_attempts a ON a.id=m.attempt_id WHERE a.exam_id=$1::uuid AND a.student_id=$2::uuid`, id, f.Student).Scan(&awarded, &feedback); err != nil || awarded != 5 || feedback != "Correct" {
		t.Fatal("checkbox auto mark", awarded, feedback, err)
	}
}
