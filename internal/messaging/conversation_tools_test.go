package messaging

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"net/http/httptest"
	"sort"
	"testing"
)

func TestConversationMutePinsAndReadBoundary(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	pair := []string{f.Teacher, f.Student}
	sort.Strings(pair)
	thread := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid)`, thread, f.ClassID, pair[0], pair[1])
	if err != nil {
		t.Fatal(err)
	}
	var message string
	err = f.DB.QueryRow(t.Context(), `INSERT INTO classroom_messages(conversation_id,sender_id,body,client_request_id) VALUES($1::uuid,$2::uuid,'Pinned learning note',$3::uuid) RETURNING id::text`, thread, f.Teacher, uuid.NewString()).Scan(&message)
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	base := "/classrooms/:id/conversations/:threadID"
	app.Get(base+"/preferences", h.Preferences)
	app.Put(base+"/preferences", h.Preferences)
	app.Get(base+"/pins", h.Pins)
	app.Put(base+"/messages/:messageID/pin", h.Pins)
	app.Get(base+"/messages", h.History)
	app.Delete(base+"/messages/:messageID", h.ChangeMessage)
	app.Post(base+"/read", h.Read)
	path := "/classrooms/" + f.ClassID + "/conversations/" + thread
	call := func(user, method, path string, body any, status int) any {
		t.Helper()
		data, _ := json.Marshal(body)
		r := httptest.NewRequest(method, path, bytes.NewReader(data))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		var result map[string]any
		_ = json.NewDecoder(res.Body).Decode(&result)
		if res.StatusCode != status {
			t.Fatalf("%s %s: expected %d got %d: %v", method, path, status, res.StatusCode, result)
		}
		return result["data"]
	}
	call(f.Student, "PUT", path+"/preferences", fiber.Map{"hours": 8}, 200)
	if !call(f.Student, "GET", path+"/preferences", nil, 200).(map[string]any)["muted"].(bool) {
		t.Fatal("mute not saved")
	}
	if call(f.Teacher, "GET", path+"/preferences", nil, 200).(map[string]any)["muted"].(bool) {
		t.Fatal("mute leaked to peer")
	}
	call(f.Outsider, "PUT", path+"/preferences", fiber.Map{"hours": 8}, 403)
	call(f.Student, "PUT", path+"/preferences", fiber.Map{"hours": 500}, 400)
	call(f.Teacher, "PUT", path+"/messages/"+message+"/pin", fiber.Map{"pinned": true}, 200)
	if len(call(f.Student, "GET", path+"/pins", nil, 200).([]any)) != 1 {
		t.Fatal("pin not shared")
	}
	call(f.Outsider, "GET", path+"/pins", nil, 403)
	call(f.Student, "PUT", path+"/messages/999999999999/pin", fiber.Map{"pinned": true}, 404)
	history := call(f.Student, "GET", path+"/messages", nil, 200).(map[string]any)
	if history["last_read"] != "0" {
		t.Fatal("unexpected opening read cursor")
	}
	call(f.Student, "POST", path+"/read", fiber.Map{"last_message_id": message}, 200)
	history = call(f.Student, "GET", path+"/messages", nil, 200).(map[string]any)
	if history["last_read"] != message {
		t.Fatal("own read cursor not returned")
	}
	call(f.Teacher, "DELETE", path+"/messages/"+message, nil, 200)
	if len(call(f.Student, "GET", path+"/pins", nil, 200).([]any)) != 0 {
		t.Fatal("deleted message remained pinned")
	}
	call(f.Teacher, "PUT", path+"/messages/"+message+"/pin", fiber.Map{"pinned": true}, 404)
	for i := 0; i < 6; i++ {
		var next string
		if err = f.DB.QueryRow(t.Context(), `INSERT INTO classroom_messages(conversation_id,sender_id,body,client_request_id) VALUES($1::uuid,$2::uuid,'Note',$3::uuid) RETURNING id::text`, thread, f.Teacher, uuid.NewString()).Scan(&next); err != nil {
			t.Fatal(err)
		}
		status := 200
		if i == 5 {
			status = 409
		}
		call(f.Teacher, "PUT", path+"/messages/"+next+"/pin", fiber.Map{"pinned": true}, status)
	}
	if len(call(f.Student, "GET", path+"/pins", nil, 200).([]any)) != 5 {
		t.Fatal("pin limit was not enforced")
	}
}
