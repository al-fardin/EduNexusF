package exam

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// This bounded concurrency regression runs only in the isolated fixture database.
func TestConcurrentExamEntryAutosaveSubmitAndReplay(t *testing.T) {
	f := testsupport.Database(t)
	users := make([]string, 40)
	for i := range users {
		users[i] = uuid.NewString()
		_, err := f.DB.Exec(t.Context(), `INSERT INTO users(id,email,username,password_hash,first_name,last_name) VALUES($1::uuid,$2,$3,'fixture','Load','Student');`, users[i], users[i]+"@example.invalid", "load_"+users[i][:8])
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active',$3)`, f.ClassID, users[i], fmt.Sprint(i+10)); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := f.DB.Exec(ctx, `DELETE FROM users WHERE id=ANY($1::uuid[])`, users); err != nil {
			t.Error(err)
		}
	})
	exam := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,allow_mobile_mcq,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Concurrency fixture',now()-interval '5 minutes',now()+interval '1 hour',60,'published',true,'[{"id":"q","kind":"mcq","prompt":"Choose","points":10,"options":["A","B"],"correct_option":0}]')`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	base := "/classrooms/" + f.ClassID + "/exams/" + exam
	app.Post("/classrooms/:id/exams/:examID/start", h.Start)
	app.Put("/classrooms/:id/exams/:examID/attempt", h.Save)
	app.Post("/classrooms/:id/exams/:examID/submit", h.Submit)
	start := time.Now()
	var group sync.WaitGroup
	failures := make(chan error, len(users))
	for _, user := range users {
		group.Add(1)
		go func(user string) {
			defer group.Done()
			for _, step := range []struct{ method, path, body string }{{"POST", "/start", `{"entry_mode":"mobile","mobile_rules_accepted":true}`}, {"PUT", "/attempt", `{"answers":{"q":"0"},"expected_revision":0}`}, {"POST", "/submit", `{"answers":{"q":"0"},"expected_revision":1}`}, {"POST", "/submit", `{"answers":{"q":"1"},"expected_revision":0}`}} {
				req := httptest.NewRequest(step.method, base+step.path, bytes.NewBufferString(step.body))
				req.Header.Set("X-Test-User", user)
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("User-Agent", "Android Mobile EduNexusAndroid/1.0")
				res, e := app.Test(req, 15000)
				if e != nil {
					failures <- e
					return
				}
				body, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || strings.Contains(string(body), "correct_option") {
					failures <- fmt.Errorf("%s: %d %s", step.path, res.StatusCode, body)
					return
				}
			}
		}(user)
	}
	group.Wait()
	close(failures)
	for err := range failures {
		t.Error(err)
	}
	var attempts, correct int
	if err = f.DB.QueryRow(t.Context(), `SELECT count(*)::int,count(*) FILTER(WHERE status='submitted' AND answers->>'q'='0' AND revision=2)::int FROM classroom_exam_attempts WHERE exam_id=$1::uuid`, exam).Scan(&attempts, &correct); err != nil {
		t.Fatal(err)
	}
	if attempts != len(users) || correct != len(users) {
		t.Fatal("lost answers, duplicate attempts or replay overwrite", attempts, correct)
	}
	t.Logf("40 concurrent students, 160 entry/save/submit/replay operations: %s", time.Since(start))
}
