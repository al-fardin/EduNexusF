package learning

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func academicApp(h *Handler) *fiber.App {
	app := testApp(h)
	app.Get("/workspace/search", h.Search)
	app.Get("/workspace/calendar", h.Calendar)
	g := app.Group("/classrooms/:id")
	g.Post("/calendar/events", h.SaveCalendarEvent)
	g.Delete("/calendar/events/:eventID", h.SaveCalendarEvent)
	g.Put("/calendar/:kind/:resourceID/reminder", h.CalendarReminder)
	g.Get("/progress", h.Progress)
	g.Get("/attendance", h.Attendance)
	g.Put("/attendance", h.Attendance)
	g.Post("/assignments/:assignmentID/import-grades", h.ImportGrades)
	g.Get("/assignments/:assignmentID/import-template", h.GradeImportTemplate)
	g.Get("/assignments/:assignmentID/submission-bundle", h.SubmissionBundle)
	g.Post("/assignments/:assignmentID/remind", h.RemindStudents)
	return app
}
func TestSearchScopesDraftsLiteralWildcardsAndNoExamKeys(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	id := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Confidential % draft", DueAt: time.Now().Add(time.Hour), MaxPoints: 10}, 200)["data"].(map[string]any)["id"].(string)
	path := "/workspace/search?q=" + url.QueryEscape("Confidential")
	if len(call(t, app, f.Student, "GET", path, nil, 200)["data"].(map[string]any)["items"].([]any)) != 0 {
		t.Fatal("student draft leak")
	}
	if len(call(t, app, f.Teacher, "GET", path, nil, 200)["data"].(map[string]any)["items"].([]any)) != 1 {
		t.Fatal("teacher draft missing")
	}
	call(t, app, f.Teacher, "POST", base+"/assignments/"+id+"/publish", nil, 200)
	if len(call(t, app, f.Outsider, "GET", path, nil, 200)["data"].(map[string]any)["items"].([]any)) != 0 {
		t.Fatal("cross-class search leak")
	}
	call(t, app, f.Student, "GET", "/workspace/search?q=a", nil, 400)
	items := call(t, app, f.Student, "GET", "/workspace/search?q="+url.QueryEscape("% draft"), nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatal("literal search failed", items)
	}
}
func TestCalendarReminderExactlyOnceAndRevokedAccess(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	payload := fiber.Map{"title": "Class seminar", "description": "Agenda", "starts_at": time.Now().Add(5 * time.Minute), "ends_at": time.Now().Add(time.Hour)}
	call(t, app, f.Student, "POST", base+"/calendar/events", payload, 403)
	id := call(t, app, f.Teacher, "POST", base+"/calendar/events", payload, 201)["data"].(map[string]any)["id"].(string)
	calendar := "/workspace/calendar?from=" + url.QueryEscape(time.Now().Add(-time.Hour).Format(time.RFC3339)) + "&to=" + url.QueryEscape(time.Now().Add(24*time.Hour).Format(time.RFC3339))
	items := call(t, app, f.Student, "GET", calendar, nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(items) != 1 {
		t.Fatal(items)
	}
	call(t, app, f.Outsider, "PUT", base+"/calendar/event/"+id+"/reminder", fiber.Map{"lead_minutes": 15}, 403)
	call(t, app, f.Student, "PUT", base+"/calendar/event/"+id+"/reminder", fiber.Map{"lead_minutes": 15}, 200)
	if err := h.deliverCalendarReminder(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := h.deliverCalendarReminder(t.Context()); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("reminder repeated", err)
	}
	var n int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM user_notifications WHERE user_id=$1::uuid AND event_key=$2`, f.Student, "calendar:event:"+id).Scan(&n); err != nil || n != 1 {
		t.Fatal(n, err)
	}
	id = call(t, app, f.Teacher, "POST", base+"/calendar/events", payload, 201)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Student, "PUT", base+"/calendar/event/"+id+"/reminder", fiber.Map{"lead_minutes": 15}, 200)
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student); err != nil {
		t.Fatal(err)
	}
	if err := h.deliverCalendarReminder(t.Context()); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("revoked member received reminder", err)
	}
}
func TestBulkImportPreviewConflictReplayBundleAndProgress(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	base := "/classrooms/" + f.ClassID
	assignment := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Bulk grading work", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, AllowResubmit: true}, 200)["data"].(map[string]any)["id"].(string)
	path := base + "/assignments/" + assignment
	call(t, app, f.Teacher, "POST", path+"/publish", nil, 200)
	submission := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 0)["id"].(string)
	var csvBuffer bytes.Buffer
	w := csv.NewWriter(&csvBuffer)
	w.Write([]string{"submission_id", "version", "points", "feedback", "criteria"})
	w.Write([]string{submission, "1", "80", "Good work", "{}"})
	w.Flush()
	raw := csvBuffer.String()
	payload := fiber.Map{"csv": raw}
	call(t, app, f.Student, "POST", path+"/import-grades", payload, 403)
	preview := call(t, app, f.Teacher, "POST", path+"/import-grades", payload, 200)["data"].(map[string]any)
	var score *int
	if err := f.DB.QueryRow(t.Context(), `SELECT awarded_points FROM classroom_assignment_submissions WHERE id=$1::uuid`, submission).Scan(&score); err != nil || score != nil {
		t.Fatal("preview mutated grade", err)
	}
	request := uuid.NewString()
	payload = fiber.Map{"csv": raw, "confirm": true, "request_id": request, "revision": preview["revision"]}
	call(t, app, f.Teacher, "POST", path+"/import-grades", payload, 200)
	call(t, app, f.Teacher, "POST", path+"/import-grades", payload, 200)
	call(t, app, f.Teacher, "POST", path+"/import-grades", fiber.Map{"csv": strings.Replace(raw, "80", "81", 1), "confirm": true, "request_id": uuid.NewString(), "revision": preview["revision"]}, 409)
	call(t, app, f.Student, "GET", base+"/progress?student="+f.Outsider, nil, 403)
	progress := call(t, app, f.Student, "GET", base+"/progress", nil, 200)["data"].(map[string]any)["students"].([]any)[0].(map[string]any)
	if progress["percent"] != float64(80) || len(progress["trend"].([]any)) != 1 {
		t.Fatal(progress)
	}
	call(t, app, f.Student, "PUT", base+"/attendance?day="+time.Now().UTC().Format("2006-01-02"), fiber.Map{"rows": []any{fiber.Map{"id": f.Student, "status": "present"}}}, 403)
	call(t, app, f.Teacher, "PUT", base+"/attendance?day="+time.Now().UTC().Format("2006-01-02"), fiber.Map{"rows": []any{fiber.Map{"id": f.Student, "status": "present"}}}, 200)
	progress = call(t, app, f.Student, "GET", base+"/progress", nil, 200)["data"].(map[string]any)["students"].([]any)[0].(map[string]any)
	if progress["present"] != float64(1) || progress["attendance_total"] != float64(1) {
		t.Fatal(progress)
	}
	req := httptest.NewRequest("GET", path+"/submission-bundle", nil)
	req.Header.Set("X-Test-User", f.Teacher)
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	data, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatal(res.StatusCode, string(data))
	}
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil || len(archive.File) != 2 {
		t.Fatal("bundle", err)
	}
	for _, file := range archive.File {
		if strings.Contains(file.Name, "..") || strings.HasPrefix(file.Name, "/") {
			t.Fatal("unsafe archive path")
		}
	}
}
func TestGradeCSVValidation(t *testing.T) {
	for _, raw := range []string{"", "id,version,points\n", "submission_id,version,points,feedback,criteria\ninvalid,1,50,,{}"} {
		if _, err := parseGradeCSV(raw); err == nil {
			t.Fatal(fmt.Sprintf("accepted invalid CSV %q", raw))
		}
	}
}

func TestImportTemplateIdentifiesStudentsAndIncludesRubricCriteria(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := academicApp(h)
	criterion := uuid.NewString()
	base := "/classrooms/" + f.ClassID
	work := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Rubric CSV template", DueAt: time.Now().Add(time.Hour), MaxPoints: 100, Rubric: []RubricCriterion{{ID: criterion, Title: "Accuracy", Maximum: 100}}}, 200)["data"].(map[string]any)["id"].(string)
	endpoint := base + "/assignments/" + work
	call(t, app, f.Teacher, "POST", endpoint+"/publish", nil, 200)
	submitFile(t, app, f.Student, endpoint+"/submit", uuid.NewString(), 0)
	if _, err := f.DB.Exec(t.Context(), `UPDATE users SET first_name='=SUM(1)' WHERE id=$1::uuid`, f.Student); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", endpoint+"/import-template", nil)
	req.Header.Set("X-Test-User", f.Teacher)
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 {
		t.Fatal(res.StatusCode, string(raw))
	}
	records, err := csv.NewReader(strings.NewReader(strings.TrimPrefix(string(raw), "\ufeff"))).ReadAll()
	if err != nil || len(records) != 2 || len(records[1]) != 8 {
		t.Fatal("invalid template", err)
	}
	if !strings.HasPrefix(records[1][5], "'=SUM") || !strings.Contains(records[1][4], criterion) || records[1][6] != "001" {
		t.Fatal("template missing identity, criteria or spreadsheet protection", records)
	}
	call(t, app, f.Teacher, "POST", endpoint+"/import-grades", fiber.Map{"csv": string(raw)}, 200)
	call(t, app, f.Student, "GET", endpoint+"/import-template", nil, 403)
}
