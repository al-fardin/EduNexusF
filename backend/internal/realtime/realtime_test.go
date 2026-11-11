package realtime

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/fasthttp/websocket"
	fiberws "github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestOrigins(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("FRONTEND_URL", "https://class.example")
	for _, bad := range []string{"", "null", "http://10.evil.example", "https://class.example.attacker.example", "http://localhost:3000"} {
		if allowedOrigin(bad) {
			t.Fatal("accepted unexpected origin", bad)
		}
	}
	if !allowedOrigin("https://class.example") {
		t.Fatal("configured origin rejected")
	}
	t.Setenv("APP_ENV", "development")
	if !allowedOrigin("http://127.0.0.1:3007") || allowedOrigin("http://192.168.evil.example") {
		t.Fatal("development origins not validated as hosts")
	}
}
func TestWebsocketTicketsAndDelivery(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("APP_ENV", "development")
	h := &Hub{db: f.DB, clients: make(map[*client]struct{}), ready: make(chan struct{})}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go h.listen(ctx)
	select {
	case <-h.ready:
	case <-time.After(5 * time.Second):
		t.Fatal("listener did not become ready")
	}
	app := fiber.New()
	app.Post("/ticket", func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return h.ticket(c) })
	app.Get("/socket", h.upgrade, fiberws.New(h.socket))
	listener, e := net.Listen("tcp", "127.0.0.1:0")
	if e != nil {
		t.Fatal(e)
	}
	go app.Listener(listener)
	defer app.Shutdown()
	address := listener.Addr().String()
	request := httptest.NewRequest("POST", "/ticket", bytes.NewBufferString("{}"))
	res, e := app.Test(request)
	if e != nil {
		t.Fatal(e)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	var ticket struct {
		Data struct {
			Ticket string `json:"ticket"`
		}
	}
	if json.Unmarshal(raw, &ticket) != nil || len(ticket.Data.Ticket) != 64 {
		t.Fatal("ticket missing", string(raw))
	}
	url := "ws://" + address + "/socket?ticket=" + ticket.Data.Ticket
	headers := http.Header{"Origin": []string{"http://localhost:3007"}}
	socket, response, e := websocket.DefaultDialer.Dial(url, headers)
	if e != nil {
		t.Fatal("handshake", e, response)
	}
	defer socket.Close()
	socket.SetReadDeadline(time.Now().Add(5 * time.Second))
	var initial Event
	if socket.ReadJSON(&initial) != nil || initial.Kind != "connected" {
		t.Fatal("connection acknowledgment missing")
	}
	if duplicate, _, err := websocket.DefaultDialer.Dial(url, headers); err == nil {
		duplicate.Close()
		t.Fatal("connection ticket was reusable")
	}
	event := Event{Kind: "classroom_messages", Class: f.ClassID, Users: []string{f.Student}}
	payload, _ := json.Marshal(event)
	if _, e = f.DB.Exec(ctx, `SELECT pg_notify('edunexus_events',$1)`, string(payload)); e != nil {
		t.Fatal(e)
	}
	var received Event
	if e = socket.ReadJSON(&received); e != nil || received.Kind != "classroom_messages" || len(received.Users) != 0 {
		t.Fatal("authorized invalidation delivery failed", e, received)
	}
	h.setAvailable(false)
	if socket.ReadJSON(&received) == nil {
		t.Fatal("listener outage did not trigger client reconnect")
	}
}
