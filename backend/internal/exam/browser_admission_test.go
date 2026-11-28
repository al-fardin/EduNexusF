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

func TestBrowserConsentResumesOnlyItsActiveAttempt(t *testing.T) {
	f := testsupport.Database(t)
	eid := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions)
 VALUES($1::uuid,$2::uuid,$3::uuid,'Browser resume',now()-interval '1 hour',now()+interval '1 hour',120,'published','[{"id":"q","kind":"mcq","prompt":"Choose","points":5,"options":["A","B"],"correct_option":0}]')`, eid, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_monitor_policy(exam_id,enabled) VALUES($1::uuid,true) ON CONFLICT(exam_id) DO UPDATE SET enabled=true`, eid); err != nil {
		t.Fatal(err)
	}
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		u := c.Get("X-Test-User")
		if u == "" {
			u = f.Student
		}
		c.Locals("user_id", u)
		return c.Next()
	})
	app.Get("/classrooms/:id/exams/:examID/monitor-admission", h.MonitorAdmissionStatus)
	app.Post("/classrooms/:id/exams/:examID/monitor-admission", h.MonitorAdmission)
	app.Post("/classrooms/:id/exams/:examID/start", h.Start)
	base := "/classrooms/" + f.ClassID + "/exams/" + eid
	call := func(method, path, body string, status int) map[string]any {
		t.Helper()
		r := httptest.NewRequest(method, base+path, bytes.NewBufferString(body))
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s: %d %s", path, res.StatusCode, raw)
		}
		if status >= 400 {
			return nil
		}
		var v map[string]any
		if e = json.Unmarshal(raw, &v); e != nil {
			t.Fatal(e)
		}
		return v
	}
	call("POST", "/start", `{}`, 403)
	call("POST", "/monitor-admission", `{"consented":true,"extension_ready":true}`, 200)
	call("POST", "/start", `{}`, 200) // No native desktop pairing exists or is required.
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_exam_monitor_admissions SET consented_at=now()-interval '50 minutes' WHERE exam_id=$1::uuid`, eid)
	if err != nil {
		t.Fatal(err)
	}
	r := call("GET", "/monitor-admission", "", 200)
	if r["data"].(map[string]any)["admitted"] != true {
		t.Fatal("running attempt lost its consent")
	}
	outsider := httptest.NewRequest("GET", base+"/monitor-admission", nil)
	outsider.Header.Set("X-Test-User", f.Outsider)
	denied, err := app.Test(outsider)
	if err != nil {
		t.Fatal(err)
	}
	denied.Body.Close()
	if denied.StatusCode != 403 {
		t.Fatal("another class member accessed the attempt", denied.StatusCode)
	}
	call("POST", "/start", `{}`, 200) // Reuse an existing attempt after the 15-minute entry window.
	if _, err = f.DB.Exec(t.Context(), `UPDATE classroom_exams SET closed_at=now() WHERE id=$1::uuid`, eid); err != nil {
		t.Fatal(err)
	}
	r = call("GET", "/monitor-admission", "", 200)
	if r["data"].(map[string]any)["admitted"] != false {
		t.Fatal("closed exam reused consent")
	}
	if _, err = f.DB.Exec(t.Context(), `UPDATE classroom_exams SET closed_at=NULL WHERE id=$1::uuid`, eid); err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_exam_attempts SET started_at=now()-interval '2 hours',expires_at=now()-interval '1 minute' WHERE exam_id=$1::uuid`, eid)
	if err != nil {
		t.Fatal(err)
	}
	r = call("GET", "/monitor-admission", "", 200)
	if r["data"].(map[string]any)["admitted"] != false {
		t.Fatal("expired attempt reused consent")
	}
	call("POST", "/start", `{}`, 403)
}
