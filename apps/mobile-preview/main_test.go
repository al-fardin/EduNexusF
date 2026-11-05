package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestGatewayRoutesAndKeepsAuthentication(t *testing.T) {
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer fixture" {
			t.Error("authorization lost")
		}
		if r.URL.Path != "/messaging/realtime-ticket" || r.URL.RawQuery != "check=1" {
			t.Error("API path changed")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"data":{"ticket":"private-ticket","socket_url":"ws://127.0.0.1:8080/messaging/socket"}}`))
	}))
	defer api.Close()
	web := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("frontend")) }))
	defer web.Close()
	u, _ := url.Parse("https://preview.example")
	a, _ := url.Parse(api.URL)
	f, _ := url.Parse(web.URL)
	h := gateway(u, f, a)
	r := httptest.NewRequest("POST", "https://preview.example/api/messaging/realtime-ticket?check=1", nil)
	r.Header.Set("Authorization", "Bearer fixture")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var result map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	d := result["data"].(map[string]any)
	if d["ticket"] != "private-ticket" || d["socket_url"] != "wss://preview.example/messaging/socket" {
		t.Fatal(d)
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "https://preview.example/login", nil))
	if w.Body.String() != "frontend" {
		t.Fatal(w.Body.String())
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "https://other.example/login", nil))
	if w.Code != 421 {
		t.Fatal(w.Code)
	}
}
