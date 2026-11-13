package learning

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func reviewApp(h *Handler) *fiber.App {
	app := academicApp(h)
	app.Get("/workspace/terms", h.Terms)
	app.Post("/workspace/terms", h.Terms)
	app.Get("/workspace/semester-classes", h.SemesterClasses)
	app.Put("/workspace/semester-classes/:id", h.SaveSemesterClass)
	app.Get("/workspace/semester-classes/:id/contents", h.ArchiveContents)
	app.Post("/workspace/semester-classes/:id/rollover", h.RolloverClass)
	g := app.Group("/classrooms/:id")
	g.Get("/exams/:examID/question-analysis", h.QuestionAnalysis)
	g.Get("/assignments/:assignmentID/similarity-roster", h.SimilarityRoster)
	g.Post("/assignments/:assignmentID/similarity", h.Similarity)
	g.Post("/assignments/:assignmentID/similarity-review", h.ReviewSimilarity)
	g.Get("/rechecks/eligible", h.RecheckCandidates)
	g.Get("/rechecks", h.Rechecks)
	g.Post("/rechecks", h.Rechecks)
	g.Post("/rechecks/:requestID/respond", h.RespondRecheck)
	g.Get("/materials/:materialID/accessibility", h.AccessibleMaterial)
	g.Put("/materials/:materialID/accessibility", h.AccessibleMaterial)
	return app
}
func TestSemesterRolloverKeepsPrivateRecordsOutAndCopiesFiles(t *testing.T) {
	f := testsupport.Database(t)
	app := reviewApp(&Handler{db: f.DB})
	root := t.TempDir()
	t.Setenv("MATERIAL_UPLOAD_DIR", root)
	term := call(t, app, f.Teacher, "POST", "/workspace/terms", fiber.Map{"title": "Spring 2027", "starts_on": "2027-01-01", "ends_on": "2027-06-30"}, 201)["data"].(map[string]any)["id"].(string)
	if items := call(t, app, f.Teacher, "GET", "/workspace/terms", nil, 200)["data"].([]any); len(items) != 1 || items[0].(map[string]any)["id"] != term {
		t.Fatal(items)
	}
	base := "/workspace/semester-classes/" + f.ClassID
	call(t, app, f.Student, "PUT", base, fiber.Map{"term_id": term, "syllabus": "Learning objectives", "status": "active"}, 403)
	call(t, app, f.Teacher, "PUT", base, fiber.Map{"term_id": term, "syllabus": "Learning objectives", "status": "active"}, 200)
	codeExpiry := time.Now().UTC().Add(time.Hour).Truncate(time.Second)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classrooms SET join_mode='approval',code_join_enabled=false,class_code_expires_at=$2 WHERE id=$1::uuid`, f.ClassID, codeExpiry); e != nil {
		t.Fatal(e)
	}
	work := call(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/assignments", Assignment{Title: "Semester assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/assignments/"+work+"/publish", nil, 200)
	submitFile(t, app, f.Student, "/classrooms/"+f.ClassID+"/assignments/"+work+"/submit", uuid.NewString(), 0)
	material, key := uuid.NewString(), uuid.NewString()
	if err := os.MkdirAll(filepath.Join(root, f.ClassID), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, f.ClassID, key), []byte("semester file"), 0600); err != nil {
		t.Fatal(err)
	}
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,description,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,$3::uuid,'Notes','','notes.txt',$4,13,'text/plain')`, material, f.ClassID, f.Teacher, key)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id) VALUES($1::uuid,$2::uuid,'material','Notes','Notes','material',$3::uuid)`, f.ClassID, f.Teacher, material)
	if err != nil {
		t.Fatal(err)
	}
	tester, sourceExam := uuid.NewString(), uuid.NewString()
	if _, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_question_testers(id,classroom_id,uploaded_by,name,sha256,executable) VALUES($1::uuid,$2::uuid,$3::uuid,'fixture.exe',$4,$5)`, tester, f.ClassID, f.Teacher, strings.Repeat("a", 64), []byte("MZ"+strings.Repeat("X", 62))); err != nil {
		t.Fatal(err)
	}
	questions, _ := json.Marshal([]map[string]any{{"id": "original-question", "kind": "coding", "prompt": "Solve", "points": 10, "tester": map[string]any{"id": tester, "name": "fixture.exe"}}})
	if _, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Copied exam',now()+interval '1 day',now()+interval '2 days',60,$4::jsonb)`, sourceExam, f.ClassID, f.Teacher, questions); err != nil {
		t.Fatal(err)
	}
	payload := fiber.Map{"name": "New semester class", "term_id": term, "request_id": uuid.NewString(), "day_shift": 180, "assignments": true, "exams": true, "materials": true}
	call(t, app, f.Student, "POST", base+"/rollover", payload, 403)
	fresh := call(t, app, f.Teacher, "POST", base+"/rollover", payload, 201)["data"].(map[string]any)["id"].(string)
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		f.DB.Exec(ctx, `DELETE FROM classrooms WHERE id=$1::uuid`, fresh)
		f.DB.Exec(ctx, `DELETE FROM academic_terms WHERE id=$1::uuid`, term)
	})
	replay := call(t, app, f.Teacher, "POST", base+"/rollover", payload, 200)["data"].(map[string]any)
	var mode string
	var enabled bool
	var copiedExpiry time.Time
	if e := f.DB.QueryRow(t.Context(), `SELECT join_mode,code_join_enabled,class_code_expires_at FROM classrooms WHERE id=$1::uuid`, fresh).Scan(&mode, &enabled, &copiedExpiry); e != nil || mode != "approval" || enabled || !copiedExpiry.Equal(codeExpiry) {
		t.Fatal("Rollover changed the admission policy or expiry")
	}
	if replay["id"] != fresh {
		t.Fatal("duplicate class")
	}
	var questionID, testerID, status string
	if err = f.DB.QueryRow(t.Context(), `SELECT questions->0->>'id',questions->0->'tester'->>'id',status FROM classroom_exams WHERE classroom_id=$1::uuid`, fresh).Scan(&questionID, &testerID, &status); err != nil {
		t.Fatal(err)
	}
	if questionID == "original-question" || testerID == tester || status != "draft" {
		t.Fatal("Exam or tester snapshot was shared", questionID, testerID, status)
	}
	var testerClass string
	if err = f.DB.QueryRow(t.Context(), `SELECT classroom_id::text FROM classroom_question_testers WHERE id=$1::uuid`, testerID).Scan(&testerClass); err != nil || testerClass != fresh {
		t.Fatal("Tester copied outside destination scope", err)
	}
	var members, submissions, drafts int
	var syllabus, copyKey string
	if err = f.DB.QueryRow(t.Context(), `SELECT (SELECT count(*) FROM classroom_memberships WHERE classroom_id=$1::uuid),(SELECT count(*) FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid),(SELECT count(*) FROM classroom_assignments WHERE classroom_id=$1::uuid AND status='draft'),syllabus FROM classrooms WHERE id=$1::uuid`, fresh).Scan(&members, &submissions, &drafts, &syllabus); err != nil {
		t.Fatal(err)
	}
	if members != 1 || submissions != 0 || drafts != 1 || syllabus != "Learning objectives" {
		t.Fatal(members, submissions, drafts, syllabus)
	}
	if err = f.DB.QueryRow(t.Context(), `SELECT storage_key FROM classroom_materials WHERE classroom_id=$1::uuid`, fresh).Scan(&copyKey); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(root, fresh, copyKey))
	if err != nil || string(data) != "semester file" || copyKey == key {
		t.Fatal("file was not independently copied", err)
	}
	call(t, app, f.Teacher, "PUT", base, fiber.Map{"term_id": term, "syllabus": "Learning objectives", "status": "archived"}, 200)
	call(t, app, f.Student, "GET", base+"/contents", nil, 200)
	call(t, app, f.Outsider, "GET", base+"/contents", nil, 403)
	if err = os.Remove(filepath.Join(root, f.ClassID, key)); err != nil {
		t.Fatal(err)
	}
	payload["name"] = "Failed material copy"
	payload["request_id"] = uuid.NewString()
	call(t, app, f.Teacher, "POST", base+"/rollover", payload, 409)
	var partial int
	if err = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classrooms WHERE owner_id=$1::uuid AND name='Failed material copy'`, f.Teacher).Scan(&partial); err != nil || partial != 0 {
		t.Fatal("Partial rollover committed", partial, err)
	}
}
func TestQuestionAnalysisCountsCompletedAnswersAndProtectsKeys(t *testing.T) {
	f := testsupport.Database(t)
	app := reviewApp(&Handler{db: f.DB})
	exam := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Analysis fixture',now()-interval '1 hour',now()+interval '1 hour',60,'published','[{"id":"q","kind":"mcq","prompt":"Choose","points":10,"topic":"Logic","options":["A","B"],"correct_option":0},{"id":"t","kind":"theory","prompt":"Explain","points":10,"topic":"Logic"}]')`, exam, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	a, b := uuid.NewString(), uuid.NewString()
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,status,expires_at,answers) VALUES($1::uuid,$3::uuid,$4::uuid,'submitted',now()+interval '1 hour','{"q":"0","t":"Explanation"}'),($2::uuid,$3::uuid,$5::uuid,'submitted',now()+interval '1 hour','{"q":"1"}')`, a, b, exam, f.Student, f.Outsider)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_question_marks(attempt_id,question_id,awarded_points,grader_kind,graded_by) VALUES($1::uuid,'t',4,'teacher',$2::uuid)`, a, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	base := "/classrooms/" + f.ClassID + "/exams/" + exam + "/question-analysis"
	call(t, app, f.Student, "GET", base, nil, 403)
	data := call(t, app, f.Teacher, "GET", base, nil, 200)["data"].(map[string]any)
	questions := data["questions"].([]any)
	if questions[0].(map[string]any)["correct"] != float64(1) || questions[0].(map[string]any)["incorrect"] != float64(1) || questions[1].(map[string]any)["unanswered"] != float64(1) || questions[1].(map[string]any)["percent"] != float64(20) {
		t.Fatal(data)
	}
	request := fiber.Map{"kind": "exam", "resource_id": a, "reason": "Please review the explanation and awarded theory marks."}
	rechecks := "/classrooms/" + f.ClassID + "/rechecks"
	call(t, app, f.Student, "POST", rechecks, request, 409)
	if _, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_result_publications(attempt_id,published_by) VALUES($1::uuid,$2::uuid)`, a, f.Teacher); err != nil {
		t.Fatal(err)
	}
	call(t, app, f.Student, "POST", rechecks, request, 201)
	items := call(t, app, f.Student, "GET", rechecks, nil, 200)["data"].(map[string]any)["items"].([]any)
	grade := items[0].(map[string]any)["grade"].(map[string]any)
	if grade["score"] != float64(14) || grade["maximum"] != float64(20) {
		t.Fatal(grade)
	}
}
func TestSimilarityUsesVersionSnapshotsAndNeverChangesGrades(t *testing.T) {
	f := testsupport.Database(t)
	app := reviewApp(&Handler{db: f.DB})
	work := call(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/assignments", Assignment{Title: "Compare responses", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	text := "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo"
	for _, student := range []string{f.Student, f.Outsider} {
		_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignment_submissions(assignment_id,student_id,version,request_id,answer) VALUES($1::uuid,$2::uuid,1,$3::uuid,$4)`, work, student, uuid.NewString(), text)
		if err != nil {
			t.Fatal(err)
		}
	}
	base := "/classrooms/" + f.ClassID + "/assignments/" + work
	payload := fiber.Map{"students": []string{f.Student, f.Outsider}}
	call(t, app, f.Student, "POST", base+"/similarity", payload, 403)
	data := call(t, app, f.Teacher, "POST", base+"/similarity", payload, 200)["data"].(map[string]any)
	pair := data["pairs"].([]any)[0].(map[string]any)
	if pair["percent"] != float64(100) {
		t.Fatal(data)
	}
	review := fiber.Map{"low": pair["low"], "high": pair["high"], "note": "Reviewed alongside assignment requirements."}
	call(t, app, f.Teacher, "POST", base+"/similarity-review", review, 200)
	var count int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_assignment_submissions WHERE assignment_id=$1::uuid AND awarded_points IS NOT NULL`, work).Scan(&count); err != nil || count != 0 {
		t.Fatal("similarity changed marks", count, err)
	}
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignment_submissions(assignment_id,student_id,version,request_id,answer) VALUES($1::uuid,$2::uuid,2,$3::uuid,'A new independent answer')`, work, f.Student, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	call(t, app, f.Teacher, "POST", base+"/similarity-review", review, 409)
}
func TestRecheckPrivateHistoryConflictAndGradeSnapshot(t *testing.T) {
	f := testsupport.Database(t)
	app := reviewApp(&Handler{db: f.DB})
	base := "/classrooms/" + f.ClassID
	work := call(t, app, f.Teacher, "POST", base+"/assignments", Assignment{Title: "Recheck assignment", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}, 200)["data"].(map[string]any)["id"].(string)
	call(t, app, f.Teacher, "POST", base+"/assignments/"+work+"/publish", nil, 200)
	submission := submitFile(t, app, f.Student, base+"/assignments/"+work+"/submit", uuid.NewString(), 0)["id"].(string)
	payload := fiber.Map{"kind": "assignment", "resource_id": submission, "reason": "Please review the reasoning and criterion scores."}
	call(t, app, f.Student, "POST", base+"/rechecks", payload, 409)
	call(t, app, f.Teacher, "PUT", base+"/assignments/"+work+"/submissions/"+submission+"/grade", fiber.Map{"points": 0}, 200)
	id := call(t, app, f.Student, "POST", base+"/rechecks", payload, 201)["data"].(map[string]any)["id"].(string)
	if call(t, app, f.Student, "POST", base+"/rechecks", payload, 200)["data"].(map[string]any)["id"] != id {
		t.Fatal("duplicate request")
	}
	call(t, app, f.Outsider, "GET", base+"/rechecks", nil, 403)
	call(t, app, f.Student, "POST", base+"/rechecks/"+id+"/respond", fiber.Map{"status": "resolved", "reason": "I reviewed the marks myself.", "version": 1}, 403)
	response := fiber.Map{"status": "resolved", "reason": "Checked the rubric; original marks remain correct.", "version": 1}
	call(t, app, f.Teacher, "POST", base+"/rechecks/"+id+"/respond", response, 200)
	call(t, app, f.Teacher, "POST", base+"/rechecks/"+id+"/respond", response, 409)
	items := call(t, app, f.Student, "GET", base+"/rechecks?state=closed", nil, 200)["data"].(map[string]any)["items"].([]any)
	row := items[0].(map[string]any)
	if len(row["events"].([]any)) != 2 || row["grade"].(map[string]any)["score"] != float64(0) {
		t.Fatal(row)
	}
	call(t, app, f.Teacher, "PUT", base+"/assignments/"+work+"/submissions/"+submission+"/grade", fiber.Map{"points": 10}, 200)
	call(t, app, f.Student, "POST", base+"/rechecks", payload, 201)
}
func TestAccessibleMaterialsConflictSearchAndClassPrivacy(t *testing.T) {
	f := testsupport.Database(t)
	app := reviewApp(&Handler{db: f.DB})
	material := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,description,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,$3::uuid,'Diagram','','diagram.png',$4,1,'image/png')`, material, f.ClassID, f.Teacher, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id) VALUES($1::uuid,$2::uuid,'material','Diagram','Diagram','material',$3::uuid)`, f.ClassID, f.Teacher, material)
	if err != nil {
		t.Fatal(err)
	}
	base := "/classrooms/" + f.ClassID + "/materials/" + material + "/accessibility"
	payload := MaterialAccessibility{Alt: "An annotated circuit", Text: "uniquesearchableword learning material", VTT: "WEBVTT\n\n00:00.000 --> 00:02.000\nWelcome\n"}
	call(t, app, f.Student, "PUT", base, payload, 403)
	call(t, app, f.Teacher, "PUT", base, payload, 200)
	call(t, app, f.Teacher, "PUT", base, payload, 409)
	data := call(t, app, f.Student, "GET", base, nil, 200)["data"].(map[string]any)
	if data["version"] != float64(1) || data["image_alt"] != payload.Alt {
		t.Fatal(data)
	}
	call(t, app, f.Outsider, "GET", base, nil, 403)
	found := call(t, app, f.Student, "GET", "/workspace/search?q=uniquesearchableword", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(found) != 1 {
		t.Fatal("accessible text not searchable", found)
	}
	raw, _ := json.Marshal(found)
	if strings.Contains(string(raw), "storage_key") {
		t.Fatal("storage reference leaked")
	}
}
func TestSimilarityAndCaptionBoundaries(t *testing.T) {
	if score, _ := textSimilarity(textShingles("short answer"), textShingles("short answer")); score != 0 {
		t.Fatal("short common answer was flagged")
	}
	if validAccessibility(MaterialAccessibility{VTT: "<script>unsafe</script>"}) {
		t.Fatal("invalid captions accepted")
	}
	for _, value := range []string{"WEBVTT\n\n00:00.000 --> 00:01.000\nHello", "WEBVTT\n\n01:02:03.123 --> 01:02:04.456 align:start\nHello"} {
		if !validCaptions(value) {
			t.Fatalf("valid captions rejected: %q", value)
		}
	}
	for _, value := range []string{"WEBVTT", "WEBVTT\n\n00:61.000 --> 02:00.000\nInvalid seconds", "WEBVTT\n\n00:02.000 --> 00:01.000\nReversed", "WEBVTT\n\n00:00.000 --> 00:01.000\nValid\n\ninvalid --> timestamp\nInvalid"} {
		if validCaptions(value) {
			t.Fatalf("invalid captions accepted: %q", value)
		}
	}
}
