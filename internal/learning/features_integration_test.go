package learning

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testApp(h *Handler) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if user := c.Get("X-Test-User"); user != "" {
			c.Locals("user_id", user)
		}
		return c.Next()
	})
	g := app.Group("/classrooms/:id")
	g.Get("/assignments", h.ListAssignments)
	g.Post("/assignments", h.SaveAssignment)
	g.Put("/assignments/:assignmentID", h.SaveAssignment)
	g.Post("/assignments/:assignmentID/publish", h.PublishAssignment)
	g.Post("/assignments/:assignmentID/submit", h.SubmitAssignment)
	g.Get("/assignments/:assignmentID/submissions", h.AssignmentSubmissions)
	g.Put("/assignments/:assignmentID/submissions/:submissionID/grade", h.GradeAssignment)
	g.Get("/assignments/:assignmentID/submissions/:submissionID/file", h.AssignmentFile)
	g.Get("/analytics", h.Analytics)
	g.Get("/tutor", h.TutorHistory)
	g.Post("/tutor/sources", h.TutorAddSource)
	g.Post("/tutor/ask", h.TutorAsk)
	return app
}
func call(t *testing.T, app *fiber.App, user, method, path string, payload any, expected int) map[string]any {
	t.Helper()
	var body io.Reader
	if payload != nil {
		raw, _ := json.Marshal(payload)
		body = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("X-Test-User", user)
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != expected {
		t.Fatalf("%s %s: expected %d, got %d: %s", method, path, expected, res.StatusCode, raw)
	}
	var parsed map[string]any
	json.Unmarshal(raw, &parsed)
	return parsed
}
func submitFile(t *testing.T, app *fiber.App, user, path, request string, version int) map[string]any {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	writer.WriteField("answer", "My assignment answer")
	writer.WriteField("request_id", request)
	writer.WriteField("expected_version", []string{"0", "1"}[version])
	part, _ := writer.CreateFormFile("file", "solution.py")
	part.Write([]byte("print(42)"))
	writer.Close()
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-Test-User", user)
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != 201 && res.StatusCode != 200 {
		t.Fatalf("submit: %d %s", res.StatusCode, raw)
	}
	var parsed map[string]any
	json.Unmarshal(raw, &parsed)
	return parsed["data"].(map[string]any)
}
func TestAssignmentLifecycleAndIsolation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	call(t, app, f.Outsider, "GET", base+"/assignments", nil, 403)
	call(t, app, "", "GET", base+"/assignments", nil, 401)
	created := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Practical assignment", Instructions: "Submit code", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, AllowResubmit: true}, 200)
	id := created["data"].(map[string]any)["id"].(string)
	path := base + "/assignments/" + id
	empty := call(t, app, f.Student, "GET", base+"/assignments", nil, 200)
	if len(empty["data"].([]any)) != 0 {
		t.Fatal("student saw draft")
	}
	call(t, app, f.Teacher, "POST", path+"/publish", nil, 200)
	request := uuid.NewString()
	first := submitFile(t, app, f.Student, path+"/submit", request, 0)
	replay := submitFile(t, app, f.Student, path+"/submit", request, 0)
	if first["id"] != replay["id"] {
		t.Fatal("submission retry duplicated")
	}
	call(t, app, f.Teacher, "PUT", path, Assignment{Title: "Changed assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 90}, 409)
	second := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 1)
	submission := second["id"].(string)
	call(t, app, f.Outsider, "GET", path+"/submissions/"+submission+"/file", nil, 403)
	call(t, app, f.Teacher, "PUT", path+"/submissions/"+submission+"/grade", fiber.Map{"points": 101}, 400)
	call(t, app, f.Student, "PUT", path+"/submissions/"+submission+"/grade", fiber.Map{"points": 80}, 403)
	call(t, app, f.Teacher, "PUT", path+"/submissions/"+submission+"/grade", fiber.Map{"points": 80, "feedback": "Good work"}, 200)
	history := call(t, app, f.Student, "GET", path+"/submissions", nil, 200)
	if len(history["data"].([]any)) != 2 {
		t.Fatal("resubmission history lost")
	}
	stats := call(t, app, f.Student, "GET", base+"/analytics", nil, 200)["data"].(map[string]any)
	if stats["assignment_percent"] != float64(80) || stats["assignment_submissions"] != float64(1) {
		t.Fatalf("incorrect latest-version analytics: %#v", stats)
	}
	var count int
	err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM user_notifications WHERE user_id=$1::uuid AND classroom_id=$2::uuid AND kind IN ('assignment','grade')`, f.Student, f.ClassID).Scan(&count)
	if err != nil || count != 2 {
		t.Fatalf("publish and grade notifications: %d %v", count, err)
	}
}
func TestAnalyticsPublicationAndTutorExamGate(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	base := "/classrooms/" + f.ClassID
	exam, attempt := uuid.NewString(), uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Exam',now()-interval '1 hour',now()+interval '1 hour',120,'published','[{"id":"q","kind":"mcq","prompt":"Select","points":10,"options":["A","B"],"correct_option":0}]');`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,expires_at,status,answers,submitted_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '1 hour','submitted','{"q":"0"}',now())`, attempt, exam, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	data := call(t, app, f.Student, "GET", base+"/analytics", nil, 200)["data"].(map[string]any)
	if len(data["questions"].([]any)) != 0 {
		t.Fatal("unpublished scores leaked")
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_result_publications(attempt_id,published_by) VALUES($1::uuid,$2::uuid)`, attempt, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	data = call(t, app, f.Student, "GET", base+"/analytics", nil, 200)["data"].(map[string]any)
	if data["exam_percent"] != float64(100) {
		t.Fatalf("incorrect published score: %#v", data)
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_exam_attempts SET status='in_progress' WHERE id=$1::uuid`, attempt)
	if err != nil {
		t.Fatal(err)
	}
	data = call(t, app, f.Student, "GET", base+"/tutor", nil, 200)["data"].(map[string]any)
	if data["blocked"] != true {
		t.Fatal("tutor not blocked during exam")
	}
	call(t, app, f.Student, "POST", base+"/tutor/ask", fiber.Map{"question": "Help me solve this exam", "request_id": uuid.NewString()}, 409)
}
func TestTutorSourcesStayClassScoped(t *testing.T) {
	f := testsupport.Database(t)
	app := testApp(&Handler{db: f.DB})
	base := "/classrooms/" + f.ClassID
	source := fiber.Map{"title": "Class notes", "content": strings.Repeat("Useful classroom facts. ", 4)}
	call(t, app, f.Student, "POST", base+"/tutor/sources", source, 403)
	call(t, app, f.Teacher, "POST", base+"/tutor/sources", source, 201)
	call(t, app, f.Outsider, "GET", base+"/tutor", nil, 403)
}
