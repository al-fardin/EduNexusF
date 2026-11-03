package messaging

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"testing"
)

func TestThemesPermissionsAndAttachments(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("EDUNEXUS_MESSAGE_UPLOAD_DIR", t.TempDir())
	h := &Handler{f.DB}
	app := fiber.New(fiber.Config{BodyLimit: 18 * 1024 * 1024})
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	g := app.Group("/classrooms/:id")
	g.Get("/settings", h.Settings)
	g.Put("/policy", h.Policy)
	g.Put("/policy/:studentID", h.StudentPolicy)
	g.Put("/theme", h.Theme)
	g.Post("/conversations", h.Create)
	g.Get("/conversations/:threadID/theme", h.Theme)
	g.Put("/conversations/:threadID/theme", h.Theme)
	g.Get("/conversations/:threadID/messages", h.History)
	g.Post("/conversations/:threadID/messages", h.Send)
	g.Get("/conversations/:threadID/messages/:messageID/file", h.File)
	g.Put("/conversations/:threadID/messages/:messageID/reaction", h.React)
	call := func(user, method, path string, payload any, status int) map[string]any {
		t.Helper()
		data, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(data))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, err := app.Test(r, 10000)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s: expected %d got %d %s", method, path, status, res.StatusCode, raw)
		}
		var out map[string]any
		json.Unmarshal(raw, &out)
		value, _ := out["data"].(map[string]any)
		return value
	}
	base := "/classrooms/" + f.ClassID
	thread := call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Teacher}, 200)["id"].(string)
	path := base + "/conversations/" + thread
	call(f.Student, "PUT", base+"/policy", fiber.Map{"students_can_message": false}, 403)
	call(f.Teacher, "PUT", base+"/policy", fiber.Map{"students_can_message": false}, 200)
	payload := fiber.Map{"body": "blocked", "client_request_id": uuid.NewString()}
	call(f.Student, "POST", path+"/messages", payload, 403)
	call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Teacher}, 403)
	call(f.Teacher, "POST", path+"/messages", fiber.Map{"body": "Teacher outreach remains available", "client_request_id": uuid.NewString()}, 200)
	call(f.Student, "GET", path+"/messages", nil, 200)
	if call(f.Student, "GET", base+"/settings", nil, 200)["can_send"] != false {
		t.Fatal("student permission was not reflected in settings")
	}
	call(f.Teacher, "PUT", base+"/policy", fiber.Map{"students_can_message": true}, 200)
	call(f.Teacher, "PUT", base+"/policy/"+f.Outsider, fiber.Map{"can_message": false}, 404)
	call(f.Teacher, "PUT", base+"/policy/"+f.Student, fiber.Map{"can_message": false}, 200)
	call(f.Student, "POST", path+"/messages", payload, 403)
	call(f.Teacher, "PUT", base+"/policy/"+f.Student, fiber.Map{"can_message": true}, 200)
	call(f.Student, "POST", path+"/messages", payload, 200)
	call(f.Student, "PUT", base+"/theme", fiber.Map{"theme": "ocean"}, 200)
	if call(f.Teacher, "GET", base+"/settings", nil, 200)["theme"] != "ocean" {
		t.Fatal("class theme was not shared with the teacher")
	}
	if call(f.Student, "GET", base+"/settings", nil, 200)["theme"] != "ocean" {
		t.Fatal("class theme not saved")
	}
	call(f.Student, "PUT", path+"/theme", fiber.Map{"theme": "rose"}, 200)
	if call(f.Student, "GET", path+"/theme", nil, 200)["theme"] != "rose" {
		t.Fatal("conversation override not saved")
	}
	if call(f.Teacher, "GET", path+"/theme", nil, 200)["theme"] != "rose" {
		t.Fatal("conversation theme was not shared with peer")
	}
	call(f.Outsider, "PUT", path+"/theme", fiber.Map{"theme": "sage"}, 403)
	call(f.Student, "PUT", path+"/theme", fiber.Map{"theme": "unavailable"}, 400)
	call(f.Student, "PUT", path+"/theme", fiber.Map{"theme": ""}, 200)
	if call(f.Student, "GET", path+"/theme", nil, 200)["theme"] != "" {
		t.Fatal("conversation did not restore class theme")
	}
	upload := func(user, request, content string, status int) map[string]any {
		t.Helper()
		var buf bytes.Buffer
		w := multipart.NewWriter(&buf)
		w.WriteField("body", "")
		w.WriteField("client_request_id", request)
		part, _ := w.CreateFormFile("file", "notes.txt")
		io.WriteString(part, content)
		w.Close()
		r := httptest.NewRequest("POST", path+"/messages", &buf)
		r.Header.Set("Content-Type", w.FormDataContentType())
		r.Header.Set("X-Test-User", user)
		res, e := app.Test(r, 10000)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		data, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("upload expected %d got %d: %s", status, res.StatusCode, data)
		}
		var out map[string]any
		json.Unmarshal(data, &out)
		value, _ := out["data"].(map[string]any)
		return value
	}
	request := uuid.NewString()
	sent := upload(f.Student, request, "Assignment notes ✅", 200)
	again := upload(f.Student, request, "Assignment notes ✅", 200)
	if sent["id"] != again["id"] {
		t.Fatal("attachment retry duplicated the message")
	}
	upload(f.Student, request, "Different file contents", 409)
	fileURL := path + "/messages/" + sent["id"].(string) + "/file"
	r := httptest.NewRequest("GET", fileURL, nil)
	r.Header.Set("X-Test-User", f.Teacher)
	res, e := app.Test(r)
	if e != nil {
		t.Fatal(e)
	}
	data, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || string(data) != "Assignment notes ✅" || res.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("authorized file download failed", res.StatusCode, string(data))
	}
	reactionURL := path + "/messages/" + sent["id"].(string) + "/reaction"
	call(f.Student, "PUT", reactionURL, fiber.Map{"emoji": "❤️"}, 200)
	call(f.Teacher, "PUT", reactionURL, fiber.Map{"emoji": "👍"}, 200)
	call(f.Student, "PUT", reactionURL, fiber.Map{"emoji": "😂"}, 200)
	call(f.Student, "PUT", reactionURL, fiber.Map{"emoji": "invalid"}, 400)
	call(f.Outsider, "PUT", reactionURL, fiber.Map{"emoji": "👍"}, 403)
	history := call(f.Student, "GET", path+"/messages", nil, 200)["messages"].([]any)
	found := false
	for _, item := range history {
		m := item.(map[string]any)
		if m["id"] == sent["id"] {
			found = true
			if len(m["reactions"].([]any)) != 2 {
				t.Fatal("reaction replacement created duplicates")
			}
		}
	}
	if !found {
		t.Fatal("reaction message missing")
	}
	call(f.Student, "PUT", reactionURL, fiber.Map{"emoji": ""}, 200)
	call(f.Outsider, "GET", fileURL, nil, 403)
	call(f.Teacher, "GET", base+"/conversations/"+uuid.NewString()+"/messages/"+sent["id"].(string)+"/file", nil, 403)
	call(f.Teacher, "PUT", base+"/policy/"+f.Student, fiber.Map{"can_message": false}, 200)
	upload(f.Student, uuid.NewString(), "Blocked upload", 403)
	call(f.Student, "PUT", reactionURL, fiber.Map{"emoji": "👍"}, 403)
	call(f.Student, "GET", path+"/messages", nil, 200)
}
