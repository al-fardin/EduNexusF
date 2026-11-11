package learning

import (
	"encoding/json"
	"github.com/edunexus/edunexus/internal/activity"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"strings"
	"testing"
	"time"
)

func TestTeacherActivityAtomicityIsolationAndDeadlineConflict(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := testApp(h)
	app.Get("/classrooms/:id/activity", h.Activity)
	app.Patch("/classrooms/:id/assignments/:assignmentID/deadline", h.AssignmentDeadline)
	base := "/classrooms/" + f.ClassID
	due := time.Now().UTC().Truncate(time.Second).Add(time.Hour)
	created := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "History assignment", DueAt: due, MaxPoints: 100}, 200)
	id := created["data"].(map[string]any)["id"].(string)
	path := base + "/assignments/" + id
	call(t, app, f.Teacher, "POST", path+"/publish", nil, 200)
	submission := submitFile(t, app, f.Student, path+"/submit", uuid.NewString(), 0)["id"].(string)
	grade := path + "/submissions/" + submission + "/grade"
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"points": 75, "feedback": "Reviewed", "reason": "Initial review"}, 200)
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"points": 75, "feedback": "Reviewed", "reason": "Duplicate retry"}, 200)
	call(t, app, f.Teacher, "PUT", grade, fiber.Map{"points": 80, "feedback": "Reviewed", "reason": "Corrected rubric"}, 200)
	call(t, app, f.Student, "GET", base+"/activity", nil, 403)
	call(t, app, f.Outsider, "GET", base+"/activity", nil, 403)
	call(t, app, f.Teacher, "PATCH", path+"/deadline", fiber.Map{"due_at": due.Add(time.Hour), "expected_due_at": due, "reason": "Extra practice time"}, 200)
	call(t, app, f.Teacher, "PATCH", path+"/deadline", fiber.Map{"due_at": due.Add(2 * time.Hour), "expected_due_at": due, "reason": "Stale edit"}, 409)
	call(t, app, f.Student, "PATCH", path+"/deadline", fiber.Map{"due_at": due.Add(time.Hour), "expected_due_at": due, "reason": "Unauthorized"}, 403)
	call(t, app, f.Teacher, "PATCH", path+"/deadline", fiber.Map{"due_at": due.Add(time.Hour), "expected_due_at": due, "reason": "x"}, 400)
	tx, err := f.DB.Begin(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if err = activity.SetActor(t.Context(), tx, f.Teacher, "Rolled back"); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(t.Context(), `UPDATE classroom_assignments SET due_at=due_at+interval '1 hour' WHERE id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	_ = tx.Rollback(t.Context())
	data := call(t, app, f.Teacher, "GET", base+"/activity", nil, 200)["data"].(map[string]any)
	items := data["items"].([]any)
	if len(items) != 3 {
		t.Fatalf("expected 2 grades + deadline, got %v", items)
	}
	raw, _ := json.Marshal(items)
	if strings.Contains(string(raw), "My assignment answer") || strings.Contains(string(raw), "file_bytes") || strings.Contains(string(raw), "Rolled back") {
		t.Fatal("history leaked submission data or rolled back changes")
	}
	first := items[0].(map[string]any)
	if first["reason"] != "Extra practice time" || first["actor"] != "Test User" {
		t.Fatal(first)
	}
	other := call(t, app, f.Teacher, "GET", "/classrooms/"+f.OtherClassID+"/activity", nil, 200)["data"].(map[string]any)
	if len(other["items"].([]any)) != 0 {
		t.Fatal("history crossed classrooms")
	}
	call(t, app, f.Teacher, "GET", base+"/activity?before=bad", nil, 400)
}

func TestMaterialDeletionAndExamGradesAreAudited(t *testing.T) {
	f := testsupport.Database(t)
	tx, err := f.DB.Begin(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(t.Context())
	if err = activity.SetActor(t.Context(), tx, f.Teacher, "Replaced outdated notes"); err != nil {
		t.Fatal(err)
	}
	material := uuid.NewString()
	if _, err = tx.Exec(t.Context(), `INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,$3::uuid,'Lecture notes','notes.txt',$4,5,'text/plain')`, material, f.ClassID, f.Teacher, uuid.NewString()); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(t.Context(), `DELETE FROM classroom_materials WHERE id=$1::uuid`, material); err != nil {
		t.Fatal(err)
	}
	var reason, filename string
	if err = tx.QueryRow(t.Context(), `SELECT reason,before_value->>'file_name' FROM classroom_activity WHERE classroom_id=$1::uuid AND action='material_deleted'`, f.ClassID).Scan(&reason, &filename); err != nil || reason != "Replaced outdated notes" || filename != "notes.txt" {
		t.Fatal(reason, filename, err)
	}
	exam, attempt := uuid.NewString(), uuid.NewString()
	if _, err = tx.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'History exam',now()-interval '1 hour',now()+interval '1 hour',120,'published','[{"id":"q","kind":"theory","prompt":"Explain","points":10}]')`, exam, f.ClassID, f.Teacher); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,expires_at,status,answers,submitted_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '1 minute','submitted','{"q":"private answer"}',now())`, attempt, exam, f.Student); err != nil {
		t.Fatal(err)
	}
	if err = activity.SetActor(t.Context(), tx, f.Teacher, "Rubric review"); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(t.Context(), `INSERT INTO classroom_exam_question_marks(attempt_id,question_id,awarded_points,feedback,grader_kind,graded_by) VALUES($1::uuid,'q',8,'Reviewed','teacher',$2::uuid)`, attempt, f.Teacher); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(t.Context(), `UPDATE classroom_exams SET ends_at=ends_at+interval '1 hour' WHERE id=$1::uuid`, exam); err != nil {
		t.Fatal(err)
	}
	var count int
	if err = tx.QueryRow(t.Context(), `SELECT count(*) FROM classroom_activity WHERE classroom_id=$1::uuid AND action IN ('exam_grade','exam_schedule') AND actor_id=$2::uuid AND reason='Rubric review'`, f.ClassID, f.Teacher).Scan(&count); err != nil || count != 2 {
		t.Fatal(count, err)
	}
}
