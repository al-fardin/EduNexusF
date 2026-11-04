package notifications

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type pushTransport func(*http.Request) (*http.Response, error)

func (f pushTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestPushOutboxHonorsPreferencesAndReadState(t *testing.T) {
	f := testsupport.Database(t)
	private, public, e := webpush.GenerateVAPIDKeys()
	if e != nil {
		t.Fatal(e)
	}
	calls := 0
	s := &pushSender{webPrivate: private, webPublic: public, subject: "mailto:test@example.invalid", client: &http.Client{Transport: pushTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		raw, _ := io.ReadAll(r.Body)
		if bytes.Contains(raw, []byte("Private fixture content")) {
			t.Error("web push body not encrypted")
		}
		if r.Header.Get("Authorization") == "" {
			t.Error("missing VAPID authorization")
		}
		return &http.Response{StatusCode: 201, Body: io.NopCloser(strings.NewReader("")), Header: make(http.Header)}, nil
	})}}
	h := &pushHandler{f.DB, s}
	device := uuid.NewString()
	sub := fmt.Sprintf(`{"endpoint":"https://fcm.googleapis.com/send/%s","keys":{"p256dh":"%s","auth":"%s"}}`, uuid.NewString(), public, base64.RawURLEncoding.EncodeToString(make([]byte, 16)))
	_, e = f.DB.Exec(t.Context(), `INSERT INTO notification_devices(id,user_id,platform,subscription,token_hash) VALUES($1::uuid,$2::uuid,'web',$3::jsonb,$4);`, device, f.Student, sub, uuid.NewString())
	if e != nil {
		t.Fatal(e)
	}
	_, e = f.DB.Exec(t.Context(), `INSERT INTO notification_preferences(user_id,push_enabled) VALUES($1::uuid,true)`, f.Student)
	if e != nil {
		t.Fatal(e)
	}
	makeNotification := func(read bool) string {
		t.Helper()
		id := uuid.NewString()
		_, err := f.DB.Exec(t.Context(), `INSERT INTO user_notifications(id,user_id,classroom_id,kind,title,body,url,event_key,email_status,read_at) VALUES($1::uuid,$2::uuid,$3::uuid,'assignment_published','Fixture','Private fixture content','/notifications',$4,'skipped',CASE WHEN $5 THEN now() ELSE NULL END)`, id, f.Student, f.ClassID, uuid.NewString(), read)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	first := makeNotification(false)
	h.pollPush(t.Context())
	var state string
	if e = f.DB.QueryRow(t.Context(), `SELECT status FROM notification_push_outbox WHERE notification_id=$1::uuid`, first).Scan(&state); e != nil || state != "sent" || calls != 1 {
		t.Fatal(state, calls, e)
	}
	h.pollPush(t.Context())
	if calls != 1 {
		t.Fatal("push sent twice")
	}
	read := makeNotification(true)
	h.pollPush(t.Context())
	var count int
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM notification_push_outbox WHERE notification_id=$1::uuid`, read).Scan(&count)
	if count != 0 || calls != 1 {
		t.Fatal("read notification delivered")
	}
	pending := makeNotification(false)
	_, e = f.DB.Exec(t.Context(), `INSERT INTO notification_push_outbox(notification_id,device_id) VALUES($1::uuid,$2::uuid)`, pending, device)
	if e != nil {
		t.Fatal(e)
	}
	f.DB.Exec(t.Context(), `UPDATE notification_preferences SET push_enabled=false WHERE user_id=$1::uuid`, f.Student)
	if e = h.deliverPush(t.Context()); e != nil {
		t.Fatal(e)
	}
	f.DB.QueryRow(t.Context(), `SELECT status FROM notification_push_outbox WHERE notification_id=$1::uuid`, pending).Scan(&state)
	if state != "skipped" || calls != 1 {
		t.Fatal("disabled notifications delivered", state, calls)
	}
}

func TestPushEndpointRestrictions(t *testing.T) {
	for _, raw := range []string{"https://fcm.googleapis.com/send/x", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://web.push.apple.com/x"} {
		if !validPushEndpoint(raw) {
			t.Fatal(raw)
		}
	}
	for _, raw := range []string{"http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.evil.test/x", "https://user@fcm.googleapis.com/x", "https://fcm.googleapis.com:443/x", "https://fcm.googleapis.com/x#secret", "https://evil.test/x"} {
		if validPushEndpoint(raw) {
			t.Fatal("unsafe endpoint accepted", raw)
		}
	}
	if validateSubscription([]byte(`{"endpoint":"https://fcm.googleapis.com/x","keys":{"p256dh":"bad","auth":"bad"}}`)) == nil {
		t.Fatal("bad subscription accepted")
	}
}

func TestFCMDataOnlyDelivery(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	calls := 0
	var endpoint string
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token" {
			r.ParseForm()
			token, e := jwt.Parse(r.Form.Get("assertion"), func(t *jwt.Token) (any, error) { return &key.PublicKey, nil }, jwt.WithValidMethods([]string{"RS256"}), jwt.WithAudience(endpoint+"/token"))
			if e != nil || !token.Valid {
				t.Error("invalid service assertion", e)
			}
			fmt.Fprint(w, `{"access_token":"mock-only","expires_in":3600}`)
			return
		}
		calls++
		if r.Header.Get("Authorization") != "Bearer mock-only" {
			t.Error("missing authorization")
		}
		var body map[string]any
		json.NewDecoder(r.Body).Decode(&body)
		m := body["message"].(map[string]any)
		if m["notification"] != nil {
			t.Error("automatic notification could expose previous account")
		}
		data := m["data"].(map[string]any)
		if data["user_id"] != "recipient" || data["url"] != "/messages?class=test" {
			t.Error(data)
		}
		fmt.Fprint(w, `{"name":"mock-delivery"}`)
	}))
	defer remote.Close()
	endpoint = remote.URL
	s := &pushSender{client: remote.Client(), key: key, email: "test@example.invalid", firebaseProject: "fixture", tokenURL: endpoint + "/token", fcmURL: endpoint + "/projects/"}
	gone, err := s.send(context.Background(), pushDevice{Platform: "android", Token: "fake-device-token"}, PushPayload{User: "recipient", URL: "/messages?class=test"})
	if err != nil || gone || calls != 1 {
		t.Fatal(gone, err, calls)
	}
}

func TestPushDeviceBindingIsolation(t *testing.T) {
	f := testsupport.Database(t)
	private, public, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatal(err)
	}
	h := &pushHandler{f.DB, &pushSender{webPrivate: private, webPublic: public}}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Fixture-User")); return c.Next() })
	app.Put("/devices/:deviceID", h.register)
	app.Delete("/devices/:deviceID", h.remove)
	app.Get("/status", h.status)
	device := uuid.NewString()
	oldBinding := uuid.NewString()
	freshBinding := uuid.NewString()
	sub := fmt.Sprintf(`{"endpoint":"https://fcm.googleapis.com/send/%s","keys":{"p256dh":"%s","auth":"%s"}}`, uuid.NewString(), public, base64.RawURLEncoding.EncodeToString(make([]byte, 16)))
	request := func(method, path, user, body string) string {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("X-Fixture-User", user)
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Fatalf("%s: %d %s", path, res.StatusCode, b)
		}
		return string(b)
	}
	register := func(user, binding string) {
		request("PUT", "/devices/"+device, user, fmt.Sprintf(`{"platform":"web","binding_id":"%s","subscription":%s}`, binding, sub))
	}
	register(f.Student, oldBinding)
	register(f.Teacher, freshBinding)
	request("DELETE", "/devices/"+device+"?binding="+oldBinding, f.Student, "")
	if strings.Contains(request("GET", "/status", f.Student, ""), device) {
		t.Fatal("device metadata leaked to former account")
	}
	if !strings.Contains(request("GET", "/status", f.Teacher, ""), device) {
		t.Fatal("late previous logout removed current device")
	}
	request("DELETE", "/devices/"+device+"?binding="+oldBinding, f.Teacher, "")
	if !strings.Contains(request("GET", "/status", f.Teacher, ""), device) {
		t.Fatal("old binding removed current registration")
	}
	request("DELETE", "/devices/"+device+"?binding="+freshBinding, f.Teacher, "")
	if strings.Contains(request("GET", "/status", f.Teacher, ""), device) {
		t.Fatal("current device not removed")
	}
}
