package messaging

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"net/http/httptest"
	"testing"
)

func TestConversationBlockAndReportedMessageIsolation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	g := app.Group("/classrooms/:id")
	g.Post("/conversations", h.Create)
	g.Get("/conversations/:threadID/messages", h.History)
	g.Post("/conversations/:threadID/messages", h.Send)
	g.Put("/conversations/:threadID/block", h.Block)
	g.Get("/conversations/:threadID/block", h.Block)
	g.Post("/conversations/:threadID/messages/:messageID/report", h.ReportMessage)
	g.Get("/message-reports", h.Reports)
	g.Post("/message-reports/:reportID/respond", h.Reports)
	call := func(user, method, path string, payload any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(raw))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		if res.StatusCode != status {
			t.Fatalf("%s %s status=%d expected=%d", method, path, res.StatusCode, status)
		}
		var out map[string]any
		json.NewDecoder(res.Body).Decode(&out)
		if data, ok := out["data"].(map[string]any); ok {
			return data
		}
		return out
	}
	base := "/classrooms/" + f.ClassID
	thread := call(f.Student, "POST", base+"/conversations", fiber.Map{"recipient_id": f.Teacher}, 200)["id"].(string)
	path := base + "/conversations/" + thread
	message := call(f.Teacher, "POST", path+"/messages", fiber.Map{"body": "A reported test message", "client_request_id": uuid.NewString()}, 200)["id"].(string)
	call(f.Student, "PUT", path+"/block", fiber.Map{"blocked": true}, 200)
	call(f.Teacher, "POST", path+"/messages", fiber.Map{"body": "Cannot send while blocked", "client_request_id": uuid.NewString()}, 403)
	call(f.Teacher, "PUT", path+"/block", fiber.Map{"blocked": false}, 200)
	if !call(f.Student, "GET", path+"/block", nil, 200)["blocked"].(bool) {
		t.Fatal("peer removed another participant block")
	}
	call(f.Student, "GET", path+"/messages", nil, 200)
	call(f.Student, "PUT", path+"/block", fiber.Map{"blocked": false}, 200)
	report := call(f.Student, "POST", path+"/messages/"+message+"/report", fiber.Map{"reason": "Please review this reported classroom message."}, 200)["id"].(string)
	if retry := call(f.Student, "POST", path+"/messages/"+message+"/report", fiber.Map{"reason": "Please review this reported classroom message."}, 200)["id"]; retry != report {
		t.Fatal("duplicate report")
	}
	call(f.Student, "GET", base+"/message-reports", nil, 403)
	call(f.Teacher, "POST", base+"/message-reports/"+report+"/respond", fiber.Map{"version": 1, "status": "dismissed", "reason": "Cannot review own reported content."}, 409)
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status) VALUES($1::uuid,$2::uuid,'teacher','active')`, f.ClassID, f.Outsider); e != nil {
		t.Fatal(e)
	}
	call(f.Outsider, "GET", path+"/messages", nil, 403)
	data := call(f.Outsider, "GET", base+"/message-reports", nil, 200)
	items := data["items"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["body"] != "A reported test message" {
		t.Fatal("reported snapshot unavailable")
	}
	call(f.Outsider, "POST", base+"/message-reports/"+report+"/respond", fiber.Map{"version": 1, "status": "resolved", "reason": "Reviewed message and discussed classroom conduct."}, 200)
	call(f.Outsider, "POST", base+"/message-reports/"+report+"/respond", fiber.Map{"version": 1, "status": "dismissed", "reason": "Stale decision must not overwrite review."}, 409)
	data = call(f.Outsider, "GET", base+"/message-reports?state=closed", nil, 200)
	if len(data["items"].([]any)[0].(map[string]any)["history"].([]any)) != 2 {
		t.Fatal("review history missing")
	}
}
