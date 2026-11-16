package server

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/testsupport"
)

// Exercise actual registered routes and JWTs, including indirect visibility surfaces.
func TestRollAudienceAcrossRegisteredRoutes(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("MATERIAL_UPLOAD_DIR", t.TempDir())
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','002')`, f.ClassID, f.Outsider); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{AppName: "Audience verification", AppEnv: "test", JWTSecret: "audience-route-fixture-signing-key-2026", JWTAccessExpire: "5m"}
	jwt, err := security.NewJWT(cfg)
	if err != nil {
		t.Fatal(err)
	}
	app := New(cfg, f.DB, jwt)
	tokens := map[string]string{}
	for _, id := range []string{f.Teacher, f.Student, f.Outsider} {
		tokens[id], err = jwt.GenerateToken(id, id+"@example.invalid", "student")
		if err != nil {
			t.Fatal(err)
		}
	}
	call := func(actor, method, path string, body any, status int) json.RawMessage {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest(method, path, bytes.NewReader(raw))
		req.Header.Set("Authorization", "Bearer "+tokens[actor])
		req.Header.Set("Content-Type", "application/json")
		res, e := app.Test(req, 10000)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		data, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s expected=%d got=%d: %s", method, path, status, res.StatusCode, data)
		}
		var out struct {
			Data json.RawMessage `json:"data"`
		}
		json.Unmarshal(data, &out)
		return out.Data
	}
	base := "/classrooms/" + f.ClassID
	for mode, want := range map[string]int{"all": 2, "odd": 1, "even": 1} {
		raw := call(f.Teacher, "POST", base+"/audience/preview", map[string]any{"mode": mode}, 200)
		var p struct {
			Eligible int `json:"eligible"`
		}
		json.Unmarshal(raw, &p)
		if p.Eligible != want {
			t.Fatal(mode, string(raw))
		}
	}
	call(f.Student, "POST", base+"/audience/preview", map[string]any{"mode": "all"}, 403)
	var work struct {
		ID string `json:"id"`
	}
	json.Unmarshal(call(f.Teacher, "POST", base+"/assignments", map[string]any{"title": "Targeted even assignment", "due_at": time.Now().Add(-time.Hour), "max_points": 100, "audience": map[string]string{"mode": "even"}}, 200), &work)
	call(f.Teacher, "POST", base+"/assignments/"+work.ID+"/publish", nil, 200)
	if string(call(f.Student, "GET", base+"/assignments", nil, 200)) != "[]" {
		t.Fatal("odd roll saw even assignment")
	}
	call(f.Student, "GET", base+"/assignments/"+work.ID+"/submissions", nil, 403)
	if !strings.Contains(string(call(f.Outsider, "GET", base+"/assignments", nil, 200)), work.ID) {
		t.Fatal("even roll missed assignment")
	}
	if !strings.Contains(string(call(f.Teacher, "GET", base+"/gradebook", nil, 200)), `"status":"not_assigned"`) {
		t.Fatal("gradebook did not mark unassigned cells")
	}
	progress := string(call(f.Student, "GET", base+"/progress", nil, 200))
	if !strings.Contains(progress, `"missing":0`) {
		t.Fatal("unassigned work counted missing", progress)
	}
	var exam struct {
		ID string `json:"id"`
	}
	json.Unmarshal(call(f.Teacher, "POST", base+"/exams", map[string]any{"title": "Targeted odd exam", "starts_at": time.Now().Add(-time.Minute), "ends_at": time.Now().Add(time.Hour), "duration_minutes": 30, "allow_mobile_mcq": true, "questions": []any{map[string]any{"id": "q1", "kind": "mcq", "prompt": "Choose the answer", "points": 10, "options": []string{"A", "B"}, "correct_option": 0}}, "audience": map[string]string{"mode": "odd"}}, 201), &exam)
	call(f.Teacher, "POST", base+"/exams/"+exam.ID+"/publish", nil, 200)
	call(f.Student, "GET", base+"/exams/"+exam.ID+"/access", nil, 200)
	for _, suffix := range []string{"", "/access", "/attempt", "/monitor-policy"} {
		call(f.Outsider, "GET", base+"/exams/"+exam.ID+suffix, nil, 403)
	}
	call(f.Outsider, "POST", base+"/exams/"+exam.ID+"/start", map[string]any{}, 403)
	var post struct {
		ID string `json:"id"`
	}
	json.Unmarshal(call(f.Teacher, "POST", base+"/stream/announcements", map[string]any{"title": "Targeted odd announcement", "content": "For odd rolls only", "audience": map[string]string{"mode": "odd"}}, 201), &post)
	if strings.Contains(string(call(f.Outsider, "GET", base+"/stream", nil, 200)), post.ID) {
		t.Fatal("even roll saw odd post")
	}
	if !strings.Contains(string(call(f.Student, "GET", base+"/stream", nil, 200)), post.ID) {
		t.Fatal("odd roll missed own post")
	}
	// Multipart creation carries the audience before publication/notification triggers run.
	var buffer bytes.Buffer
	form := multipart.NewWriter(&buffer)
	form.WriteField("title", "Targeted even material")
	form.WriteField("audience", `{"mode":"even"}`)
	part, _ := form.CreateFormFile("file", "audience.txt")
	part.Write([]byte("Even class resource"))
	form.Close()
	req := httptest.NewRequest("POST", base+"/materials", &buffer)
	req.Header.Set("Authorization", "Bearer "+tokens[f.Teacher])
	req.Header.Set("Content-Type", form.FormDataContentType())
	res, e := app.Test(req, 10000)
	if e != nil {
		t.Fatal(e)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 201 {
		t.Fatalf("upload %d %s", res.StatusCode, raw)
	}
	var material struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	json.Unmarshal(raw, &material)
	// Delete through the real endpoint after assertions; no successful file response is opened here.
	t.Cleanup(func() {
		call(f.Teacher, "DELETE", base+"/materials/"+material.Data.ID, map[string]string{"reason": "Remove isolated audience fixture"}, 200)
	})
	call(f.Student, "GET", base+"/materials/"+material.Data.ID+"/download", nil, 403)
	call(f.Student, "GET", base+"/materials/"+material.Data.ID+"/accessibility", nil, 403)
	if string(call(f.Student, "GET", base+"/materials", nil, 200)) != "[]" {
		t.Fatal("odd roll saw even material")
	}
	if !strings.Contains(string(call(f.Outsider, "GET", base+"/materials", nil, 200)), material.Data.ID) {
		t.Fatal("even roll missed material")
	}
	for _, actor := range []string{f.Student, f.Outsider} {
		content := string(call(actor, "GET", "/workspace/search?q=Targeted&class="+f.ClassID, nil, 200))
		if actor == f.Student && strings.Contains(content, "even") || actor == f.Outsider && strings.Contains(content, "odd") {
			t.Fatal("search leaked targeted content", content)
		}
		notifications := string(call(actor, "GET", "/notifications?class="+f.ClassID, nil, 200))
		if actor == f.Student && strings.Contains(notifications, "even") || actor == f.Outsider && strings.Contains(notifications, "odd") {
			t.Fatal("notification leak", notifications)
		}
	}
	// Check indirect discovery surfaces using the same registered API middleware.
	from, to := url.QueryEscape(time.Now().Add(-2*time.Hour).Format(time.RFC3339)), url.QueryEscape(time.Now().Add(2*time.Hour).Format(time.RFC3339))
	for _, actor := range []string{f.Student, f.Outsider} {
		paths := []string{"/workspace", "/workspace/files", "/workspace/tasks", "/workspace/calendar?from=" + from + "&to=" + to, base + "/classwork", base + "/analytics", "/workspace/semester-classes/" + f.ClassID + "/contents", base + "/progress/" + actor + "/coursework"}
		for _, path := range paths {
			raw := string(call(actor, "GET", path, nil, 200))
			blocked := "Targeted even"
			if actor == f.Outsider {
				blocked = "Targeted odd"
			}
			if strings.Contains(raw, blocked) {
				t.Fatalf("%s leaked %s", path, blocked)
			}
		}
	}
	// Default creation remains frictionless and visible to both groups.
	var defaultWork struct {
		ID string `json:"id"`
	}
	json.Unmarshal(call(f.Teacher, "POST", base+"/assignments", map[string]any{"title": "Default everyone work", "due_at": time.Now().Add(time.Hour), "max_points": 100}, 200), &defaultWork)
	call(f.Teacher, "POST", base+"/assignments/"+defaultWork.ID+"/publish", nil, 200)
	for _, actor := range []string{f.Student, f.Outsider} {
		if !strings.Contains(string(call(actor, "GET", base+"/assignments", nil, 200)), defaultWork.ID) {
			t.Fatal("default Everyone blocked a student")
		}
	}
	// Pending exam attempts must not exist for the excluded roll.
	var attempts int
	if err = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_exam_attempts WHERE exam_id=$1::uuid AND student_id=$2::uuid`, exam.ID, f.Outsider).Scan(&attempts); err != nil || attempts != 0 {
		t.Fatal(attempts, err)
	}
}
