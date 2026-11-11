package learning

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestClassDetailsAndStudentLeave(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Get("/classrooms/:id/details", h.ClassroomDetails)
	app.Post("/classrooms/:id/leave", h.LeaveClassroom)
	call := func(method, path, user string, status int) string {
		t.Helper()
		req := httptest.NewRequest(method, "/classrooms/"+f.ClassID+path, nil)
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
		return string(raw)
	}
	body := call("GET", "/details", f.Student, 200)
	if !strings.Contains(body, f.Teacher) || strings.Contains(body, "email") || strings.Contains(body, "password") {
		t.Fatal("teacher details missing or private account fields exposed")
	}
	call("GET", "/details", f.Outsider, 403)
	call("POST", "/leave", f.Teacher, 403)
	call("POST", "/leave", f.Outsider, 403)
	exam := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Leave protection',now()-interval '5 minutes',now()+interval '1 hour',60,'published','[{"id":"q","kind":"mcq","prompt":"Choose","points":10,"options":["A","B"],"correct_option":0}]');`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(exam_id,student_id,expires_at) VALUES($1::uuid,$2::uuid,now()+interval '1 hour')`, exam, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	call("POST", "/leave", f.Student, 409)
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_exam_attempts SET status='submitted',submitted_at=now() WHERE exam_id=$1::uuid`, exam)
	if err != nil {
		t.Fatal(err)
	}
	call("POST", "/leave", f.Student, 200)
	call("GET", "/details", f.Student, 403)
	if _, err = f.DB.Exec(t.Context(), `UPDATE classrooms SET status='archived' WHERE id=$1::uuid`, f.ClassID); err != nil {
		t.Fatal(err)
	}
	call("GET", "/details", f.Teacher, 200)
	var preserved bool
	if err = f.DB.QueryRow(t.Context(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts WHERE exam_id=$1::uuid AND student_id=$2::uuid)`, exam, f.Student).Scan(&preserved); err != nil || !preserved {
		t.Fatal("leaving deleted prior exam history", err)
	}
}
