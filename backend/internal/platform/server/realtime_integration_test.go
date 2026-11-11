package server

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/fasthttp/websocket"
	"github.com/google/uuid"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Exercise the actual router: prefix middleware must not demand an HTTP bearer
// header from a browser WebSocket that already carries its one-use ticket.
func TestCompleteRouterRealtimeDelivery(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("APP_ENV", "development")
	cfg := &config.Config{AppName: "Realtime router test", AppEnv: "test", JWTSecret: "router-fixture-secret-only", JWTAccessExpire: "5m"}
	jwt, e := security.NewJWT(cfg)
	if e != nil {
		t.Fatal(e)
	}
	app := New(cfg, f.DB, jwt)
	listener, e := net.Listen("tcp", "127.0.0.1:0")
	if e != nil {
		t.Fatal(e)
	}
	go app.Listener(listener)
	defer app.Shutdown()
	token := func(user string) string {
		value, err := jwt.GenerateToken(user, "fixture@example.invalid", "student")
		if err != nil {
			t.Fatal(err)
		}
		return value
	}
	student, teacher := token(f.Student), token(f.Teacher)
	call := func(method, path, access string, body any) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(body)
		r := httptest.NewRequest(method, path, bytes.NewReader(raw))
		r.Header.Set("Authorization", "Bearer "+access)
		r.Header.Set("Content-Type", "application/json")
		res, err := app.Test(r, 5000)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		data, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Fatalf("%s %s: %d %s", method, path, res.StatusCode, data)
		}
		var out struct {
			Data map[string]any `json:"data"`
		}
		if json.Unmarshal(data, &out) != nil {
			t.Fatal("invalid response")
		}
		return out.Data
	}
	connect := func(access string) *websocket.Conn {
		t.Helper()
		ticket := call("POST", "/messaging/realtime-ticket", access, nil)["ticket"].(string)
		socket, res, err := websocket.DefaultDialer.Dial("ws://"+listener.Addr().String()+"/messaging/socket?ticket="+ticket, http.Header{"Origin": []string{"http://localhost:3007"}})
		if err != nil {
			status := 0
			if res != nil {
				status = res.StatusCode
			}
			t.Fatalf("complete router handshake: HTTP %d %v", status, err)
		}
		t.Cleanup(func() { socket.Close() })
		socket.SetReadDeadline(time.Now().Add(5 * time.Second))
		var hello map[string]any
		if socket.ReadJSON(&hello) != nil || hello["kind"] != "connected" {
			t.Fatal("connection acknowledgement missing")
		}
		return socket
	}
	receiver, sender := connect(student), connect(teacher)
	base := "/classrooms/" + f.ClassID
	thread := call("POST", base+"/conversations", student, map[string]string{"recipient_id": f.Teacher})["id"].(string)
	call("POST", base+"/conversations/"+thread+"/messages", teacher, map[string]string{"body": "Full-router delivery fixture", "client_request_id": uuid.NewString()})
	readKind := func(socket *websocket.Conn, kind string) map[string]any {
		t.Helper()
		socket.SetReadDeadline(time.Now().Add(4 * time.Second))
		for i := 0; i < 20; i++ {
			var event map[string]any
			if err := socket.ReadJSON(&event); err != nil {
				t.Fatalf("missing %s: %v", kind, err)
			}
			if event["kind"] == kind {
				return event
			}
		}
		t.Fatalf("missing event %s", kind)
		return nil
	}
	delivered := readKind(receiver, "classroom_messages")
	if delivered["conversation_id"] != thread || delivered["users"] != nil {
		t.Fatal("incorrect event scope", delivered)
	}
	if e = receiver.WriteJSON(map[string]any{"kind": "typing", "classroom_id": f.ClassID, "conversation_id": thread, "typing": true}); e != nil {
		t.Fatal(e)
	}
	typing := readKind(sender, "typing")
	if typing["user_id"] != f.Student {
		t.Fatal("typing identity incorrect", typing)
	}
}
