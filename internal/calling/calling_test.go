package calling

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
)

func TestCallLifecycleIsolationAndPolicy(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Fixture-User")); return c.Next() })
	app.Post("/", h.create)
	app.Get("/active", h.active)
	app.Get("/:callID", h.sync)
	app.Post("/:callID/action", h.action)
	app.Post("/:callID/signals", h.signal)
	pair := []string{f.Teacher, f.Student}
	sort.Strings(pair)
	thread := uuid.NewString()
	_, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid)`, thread, f.ClassID, pair[0], pair[1])
	if e != nil {
		t.Fatal(e)
	}
	studentSession, teacherSession := uuid.NewString(), uuid.NewString()
	call := func(user, session, method, path string, body any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(body)
		r := httptest.NewRequest(method, path+"?session="+session, bytes.NewReader(raw))
		r.Header.Set("X-Fixture-User", user)
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r, 5000)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		data, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s: %d want %d: %s", method, path, res.StatusCode, status, data)
		}
		var out struct {
			Data map[string]any `json:"data"`
		}
		json.Unmarshal(data, &out)
		return out.Data
	}
	request := uuid.NewString()
	create := map[string]string{"conversation_id": thread, "media": "video", "client_request_id": request}
	first := call(f.Student, studentSession, "POST", "/", create, 200)
	id := first["id"].(string)
	if first["owned"] != true {
		t.Fatal("caller must own its session")
	}
	if call(f.Student, studentSession, "POST", "/", create, 200)["id"] != id {
		t.Fatal("lost create response caused a duplicate call")
	}
	call(f.Student, studentSession, "POST", "/", map[string]string{"conversation_id": thread, "media": "audio", "client_request_id": uuid.NewString()}, 409)
	call(f.Outsider, uuid.NewString(), "GET", "/"+id, nil, 403)
	call(f.Outsider, uuid.NewString(), "POST", "/"+id+"/action", map[string]string{"action": "force-end"}, 403)
	signal := func(user, session, kind string, status int) {
		call(user, session, "POST", "/"+id+"/signals", map[string]any{"kind": kind, "request_id": uuid.NewString(), "payload": map[string]string{"type": kind, "sdp": "v=0\r\ns=private-fixture"}}, status)
	}
	signal(f.Student, studentSession, "offer", 200)
	before := call(f.Teacher, teacherSession, "GET", "/"+id, nil, 200)
	if len(before["signals"].([]any)) != 0 {
		t.Fatal("signal disclosed before accepting")
	}
	otherTab := call(f.Student, uuid.NewString(), "GET", "/"+id, nil, 200)
	if len(otherTab["signals"].([]any)) != 0 {
		t.Fatal("signal disclosed to non-owning tab")
	}
	call(f.Teacher, teacherSession, "POST", "/"+id+"/action", map[string]string{"action": "accept"}, 200)
	call(f.Teacher, uuid.NewString(), "POST", "/"+id+"/action", map[string]string{"action": "accept"}, 409)
	accepted := call(f.Teacher, teacherSession, "GET", "/"+id, nil, 200)
	if len(accepted["signals"].([]any)) != 1 {
		t.Fatal("callee did not receive offer")
	}
	signal(f.Student, studentSession, "answer", 403)
	signal(f.Teacher, teacherSession, "answer", 200)
	call(f.Teacher, teacherSession, "POST", "/"+id+"/action", map[string]string{"action": "connected"}, 200)
	call(f.Student, studentSession, "POST", "/"+id+"/action", map[string]string{"action": "heartbeat"}, 200)
	call(f.Student, studentSession, "POST", "/"+id+"/action", map[string]string{"action": "end"}, 200)
	var count int
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_call_signals WHERE call_id=$1::uuid`, id).Scan(&count)
	if count != 0 {
		t.Fatal("terminal call retained private SDP/ICE")
	}
	_, e = f.DB.Exec(t.Context(), `INSERT INTO classroom_messaging_policy(classroom_id,students_can_message) VALUES($1::uuid,false) ON CONFLICT(classroom_id) DO UPDATE SET students_can_message=false`, f.ClassID)
	if e != nil {
		t.Fatal(e)
	}
	call(f.Student, studentSession, "POST", "/", map[string]string{"conversation_id": thread, "media": "audio", "client_request_id": uuid.NewString()}, 403)
	teacherCall := call(f.Teacher, teacherSession, "POST", "/", map[string]string{"conversation_id": thread, "media": "audio", "client_request_id": uuid.NewString()}, 200)
	missed := teacherCall["id"].(string)
	f.DB.Exec(t.Context(), `UPDATE classroom_calls SET created_at=now()-interval '1 minute' WHERE id=$1::uuid`, missed)
	h.expire(t.Context())
	var reason string
	var read bool
	e = f.DB.QueryRow(t.Context(), `SELECT c.reason,n.read_at IS NOT NULL FROM classroom_calls c JOIN user_notifications n ON n.event_key='call:'||c.id::text WHERE c.id=$1::uuid`, missed).Scan(&reason, &read)
	if e != nil || reason != "missed" || !read {
		t.Fatal("missed call cleanup", reason, read, e)
	}
}
func TestSignalValidation(t *testing.T) {
	if !validSignal("offer", json.RawMessage(`{"type":"offer","sdp":"v=0\r\n"}`)) {
		t.Fatal("offer rejected")
	}
	for _, v := range []struct{ k, p string }{{"offer", `{"type":"answer","sdp":"v=0"}`}, {"ice", `{"candidate":"x","sdpMLineIndex":99}`}, {"offer", `{"type":"offer","sdp":"` + strings.Repeat("x", 65537) + `"}`}} {
		if validSignal(v.k, []byte(v.p)) {
			t.Fatal("invalid signal accepted")
		}
	}
}
