package server

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/testsupport"
)

func TestProductionRouterAppliesSharedSecurityPolicies(t *testing.T) {
	f := testsupport.Database(t)
	cfg := &config.Config{AppName: "Production fixture", AppEnv: "production", FrontendURL: "https://school.example", JWTSecret: f.Teacher + f.Outsider, TrustedProxySecret: f.Student + f.Outsider, JWTAccessExpire: "15m", DBPassword: strings.Repeat("z", 32), DBSSLMode: "verify-full"}
	cfg.MFAEncryptionKey = base64.StdEncoding.EncodeToString([]byte(strings.Repeat("m", 32)))
	if err := cfg.Validate(); err != nil {
		t.Fatal(err)
	}
	t.Setenv("APP_ENV", "production")
	t.Setenv("TRUSTED_PROXY_SECRET", cfg.TrustedProxySecret)
	jwt, err := security.NewJWT(cfg)
	if err != nil {
		t.Fatal(err)
	}
	app := New(cfg, f.DB, jwt)
	for _, tc := range []struct {
		path   string
		status int
	}{{"/health", 200}, {"/panic", 404}, {"/swagger/index.html", 404}} {
		res, err := app.Test(httptest.NewRequest("GET", tc.path, nil))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.status || !strings.Contains(res.Header.Get("Cache-Control"), "no-store") || res.Header.Get("X-Content-Type-Options") != "nosniff" {
			t.Fatal("unsafe production route", tc.path, res.StatusCode, res.Header)
		}
	}
	email := f.Teacher + "@example.invalid"
	keys := []string{}
	addKey := func(kind, value string) {
		h := hmac.New(sha256.New, []byte(cfg.JWTSecret))
		h.Write([]byte("/auth/login\x00" + kind + "\x00" + value))
		keys = append(keys, hex.EncodeToString(h.Sum(nil)))
	}
	addKey("email", email)
	for i := range 21 {
		addKey("ip", fmt.Sprintf("192.0.2.%d", i+1))
	}
	t.Cleanup(func() {
		_, _ = f.DB.Exec(context.Background(), `DELETE FROM auth_request_budgets WHERE key_hash=ANY($1::text[])`, keys)
	})
	for i := range 21 {
		req := httptest.NewRequest("POST", "/AUTH/LOGIN", strings.NewReader(`{"email":"`+email+`","password":"Incorrect_2026!"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-EduNexus-Proxy-Key", cfg.TrustedProxySecret)
		req.Header.Set("X-EduNexus-Client-IP", fmt.Sprintf("192.0.2.%d", i+1))
		res, err := app.Test(req, 10000)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		want := 401
		if i == 20 {
			want = 429
		}
		if res.StatusCode != want {
			t.Fatalf("request %d: %d want %d", i, res.StatusCode, want)
		}
	}
	// Different authenticated users behind the same school/proxy IP must not
	// consume each other's MFA-management allowance.
	for _, user := range []string{f.Teacher, f.Student} {
		token, err := jwt.GenerateToken(user, user+"@example.invalid", "student")
		if err != nil {
			t.Fatal(err)
		}
		for i := range 9 {
			req := httptest.NewRequest("POST", "/auth/security/two-step/disable", strings.NewReader(`{"password":"Incorrect_2026!","code":"000000"}`))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)
			res, err := app.Test(req, 10000)
			if err != nil {
				t.Fatal(err)
			}
			res.Body.Close()
			want := 401
			if i == 8 {
				want = 429
			}
			if res.StatusCode != want {
				t.Fatal("MFA budgets leaked across accounts", i, res.StatusCode, want)
			}
		}
	}
}
