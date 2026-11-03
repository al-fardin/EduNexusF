package messaging

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

func TestClassConversationPrivacyAndDelivery(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Get("/messaging/classes", h.Classes)
	app.Get("/messaging/unread", h.Unread)
	g := app.Group("/classrooms/:id")
	g.Post("/conversations", h.Create)
	g.Get("/conversations", h.Conversations)
	g.Get("/message-recipients", h.Recipients)
	g.Get("/conversations/:threadID/messages", h.History)
	g.Post("/conversations/:threadID/messages", h.Send)
	g.Post("/conversations/:threadID/read", h.Read)
	call := func(user, method, path string, payload any, status int) any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(raw))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, err := app.Test(r)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s expected %d got %d: %s", method, path, status, res.StatusCode, body)
		}
		var out map[string]any
		json.Unmarshal(body, &out)
		return out["data"]
	}
	base := "/classrooms/" + f.ClassID
	call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Outsider}, 403)
	call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Student}, 400)
	created := call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Teacher}, 200).(map[string]any)
	thread := created["id"].(string)
	path := base + "/conversations/" + thread
	reverse := call(f.Teacher, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Student}, 200).(map[string]any)
	if reverse["id"] != thread {
		t.Fatal("duplicate pair created a second thread")
	}
	call(f.Outsider, "GET", path+"/messages", nil, 403)
	call(f.Teacher, "GET", "/classrooms/"+f.OtherClassID+"/conversations/"+thread+"/messages", nil, 403)
	request := uuid.NewString()
	payload := fiber.Map{"body": "স্যার, assignment নিয়ে প্রশ্ন আছে।", "client_request_id": request}
	sent := call(f.Student, "POST", path+"/messages", payload, 200).(map[string]any)
	retry := call(f.Student, "POST", path+"/messages", payload, 200).(map[string]any)
	if retry["id"] != sent["id"] {
		t.Fatal("retry duplicated a message")
	}
	call(f.Student, "POST", path+"/messages", fiber.Map{"body": "changed", "client_request_id": request}, 409)
	classes := call(f.Teacher, "GET", "/messaging/classes", nil, 200).([]any)
	for _, item := range classes {
		row := item.(map[string]any)
		expected := float64(0)
		if row["id"] == f.ClassID {
			expected = 1
		}
		if row["unread"] != expected {
			t.Fatal("unread count leaked across classes", row)
		}
	}
	call(f.Teacher, "POST", path+"/read", fiber.Map{"last_message_id": sent["id"]}, 200)
	unread := call(f.Teacher, "GET", "/messaging/unread", nil, 200).(map[string]any)
	if unread["unread"] != float64(0) {
		t.Fatal("read cursor did not clear badge")
	}
	reply := call(f.Teacher, "POST", path+"/messages", fiber.Map{"body": "Please explain which part.", "client_request_id": uuid.NewString()}, 200).(map[string]any)
	call(f.Student, "POST", path+"/read", fiber.Map{"last_message_id": reply["id"]}, 200)
	call(f.Student, "POST", path+"/read", fiber.Map{"last_message_id": sent["id"]}, 200)
	call(f.Student, "POST", path+"/messages", fiber.Map{"body": " ", "client_request_id": uuid.NewString()}, 400)
	for i := 0; i < 52; i++ {
		user := f.Student
		if i%2 == 1 {
			user = f.Teacher
		}
		call(user, "POST", path+"/messages", fiber.Map{"body": "Page test", "client_request_id": uuid.NewString()}, 200)
	}
	history := call(f.Teacher, "GET", path+"/messages", nil, 200).(map[string]any)
	if history["has_more"] != true || len(history["messages"].([]any)) != 50 {
		t.Fatal("history pagination failed")
	}
	first := history["messages"].([]any)[0].(map[string]any)["id"].(string)
	older := call(f.Student, "GET", path+"/messages?before_id="+first, nil, 200).(map[string]any)
	if len(older["messages"].([]any)) != 4 {
		t.Fatalf("older messages missing: got %d, first %s, data %#v", len(older["messages"].([]any)), first, older)
	}
	// Each user has sent 27 messages; the 41st new message in a minute is rejected.
	for i := 0; i < 13; i++ {
		call(f.Student, "POST", path+"/messages", fiber.Map{"body": "Rate limit check", "client_request_id": uuid.NewString()}, 200)
	}
	call(f.Student, "POST", path+"/messages", fiber.Map{"body": "Over limit", "client_request_id": uuid.NewString()}, 429)
	// A retry of an already accepted request remains safe even at the rate limit.
	call(f.Student, "POST", path+"/messages", payload, 200)
	// An active third class member still cannot read a private pair's thread.
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','002')`, f.ClassID, f.Outsider)
	if err != nil {
		t.Fatal(err)
	}
	call(f.Outsider, "GET", path+"/messages", nil, 403)
	call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Outsider}, 403)
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	call(f.Student, "GET", path+"/messages", nil, 403)
	call(f.Teacher, "POST", path+"/messages", fiber.Map{"body": "Cannot send to former member", "client_request_id": uuid.NewString()}, 403)
}
