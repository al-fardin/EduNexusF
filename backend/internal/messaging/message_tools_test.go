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

func TestRepliesEditsSearchAndSeen(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	g := app.Group("/classrooms/:id")
	g.Post("/conversations", h.Create)
	g.Post("/conversations/:threadID/messages", h.Send)
	g.Get("/conversations/:threadID/messages", h.History)
	g.Patch("/conversations/:threadID/messages/:messageID", h.ChangeMessage)
	g.Delete("/conversations/:threadID/messages/:messageID", h.ChangeMessage)
	g.Post("/conversations/:threadID/read", h.Read)
	call := func(user, method, path string, payload any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(raw))
		r.Header.Set("X-Test-User", user)
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s got %d want %d: %s", method, path, res.StatusCode, status, body)
		}
		var out map[string]any
		json.Unmarshal(body, &out)
		data, _ := out["data"].(map[string]any)
		return data
	}
	base := "/classrooms/" + f.ClassID
	thread := call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Teacher}, 200)["id"].(string)
	path := base + "/conversations/" + thread + "/messages"
	first := call(f.Teacher, "POST", path, fiber.Map{"body": "Loop invariant notes", "client_request_id": uuid.NewString()}, 200)
	id := first["id"].(string)
	reply := call(f.Student, "POST", path, fiber.Map{"body": "Thanks for the notes", "reply_to_id": id, "client_request_id": uuid.NewString()}, 200)
	if reply["reply"].(map[string]any)["id"] != id {
		t.Fatal("reply context missing")
	}
	call(f.Student, "POST", path, fiber.Map{"body": "forged reference", "reply_to_id": "9223372036854775800", "client_request_id": uuid.NewString()}, 400)
	call(f.Student, "PATCH", path+"/"+id, fiber.Map{"body": "cannot edit teacher"}, 403)
	call(f.Outsider, "DELETE", path+"/"+id, nil, 403)
	call(f.Teacher, "PATCH", path+"/"+id, fiber.Map{"body": "Corrected invariant notes"}, 200)
	search := call(f.Student, "GET", path+"?q=corrected", nil, 200)["messages"].([]any)
	if len(search) != 1 || search[0].(map[string]any)["edited_at"] == nil {
		t.Fatal("edited message search failed")
	}
	call(f.Student, "POST", base+"/conversations/"+thread+"/read", fiber.Map{"last_message_id": id}, 200)
	if call(f.Teacher, "GET", path, nil, 200)["peer_last_read"] != id {
		t.Fatal("seen cursor is not visible to sender")
	}
	call(f.Teacher, "DELETE", path+"/"+id, nil, 200)
	call(f.Teacher, "DELETE", path+"/"+id, nil, 200)
	call(f.Teacher, "PATCH", path+"/"+id, fiber.Map{"body": "restore"}, 409)
	history := call(f.Student, "GET", path, nil, 200)["messages"].([]any)
	if history[0].(map[string]any)["deleted_at"] == nil || history[1].(map[string]any)["reply"].(map[string]any)["body"] != "Message deleted" {
		t.Fatal("delete did not redact message and reply context")
	}
	if len(call(f.Student, "GET", path+"?q=corrected", nil, 200)["messages"].([]any)) != 0 {
		t.Fatal("deleted content remained searchable")
	}
}
