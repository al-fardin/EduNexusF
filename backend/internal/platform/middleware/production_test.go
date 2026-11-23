package middleware

import (
	"context"
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestSharedBudgetsAcrossReplicasAndRotatingIPs(t *testing.T) {
	f := testsupport.Database(t)
	secret := f.Teacher
	proof := strings.Repeat("p", 40)
	t.Setenv("TRUSTED_PROXY_SECRET", proof)
	email := "fixture_" + f.Teacher + "@example.invalid"
	var work atomic.Int32
	apps := []*fiber.App{fiber.New(), fiber.New()}
	for _, app := range apps {
		app.Use(IdentityRequestBody, AuthBudgets(f.DB, secret))
		app.Post("/auth/forgot-password", func(c *fiber.Ctx) error { work.Add(1); return c.SendStatus(200) })
	}
	keys := []string{authBudgetKey(secret, "/auth/forgot-password", "email", email)}
	for i := range 40 {
		keys = append(keys, authBudgetKey(secret, "/auth/forgot-password", "ip", fmt.Sprintf("192.0.2.%d", i+1)))
	}
	t.Cleanup(func() {
		_, _ = f.DB.Exec(context.Background(), `DELETE FROM auth_request_budgets WHERE key_hash=ANY($1::text[])`, keys)
	})
	var passed, limited atomic.Int32
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i := range 40 {
		wg.Go(func() {
			<-start
			path := "/auth/forgot-password"
			if i%2 == 0 {
				path = strings.ToUpper(path)
			}
			req := httptest.NewRequest("POST", path, strings.NewReader(`{"email":"`+email+`"}`))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-EduNexus-Client-IP", fmt.Sprintf("192.0.2.%d", i+1))
			req.Header.Set("X-EduNexus-Proxy-Key", proof)
			res, err := apps[i%2].Test(req, 10000)
			if err != nil {
				t.Error(err)
				return
			}
			defer res.Body.Close()
			switch res.StatusCode {
			case 200:
				passed.Add(1)
			case 429:
				limited.Add(1)
				if res.Header.Get("Retry-After") == "" {
					t.Error("retry timing missing")
				}
			default:
				t.Errorf("unexpected status %d", res.StatusCode)
			}
		})
	}
	close(start)
	wg.Wait()
	if passed.Load() != 5 || limited.Load() != 35 || work.Load() != 5 {
		t.Fatalf("shared email budget bypass: %d accepted %d limited %d provider calls", passed.Load(), limited.Load(), work.Load())
	}
	for _, tc := range []struct{ kind, body string }{
		{"application/json", `{"Email":"` + email + `"}`},
		{"application/x-www-form-urlencoded", "Email=" + email},
		{"application/xml", "<Request><Email>" + email + "</Email></Request>"},
	} {
		req := httptest.NewRequest("POST", "/auth/forgot-password", strings.NewReader(tc.body))
		req.Header.Set("Content-Type", tc.kind)
		req.Header.Set("X-EduNexus-Client-IP", "192.0.2.1")
		req.Header.Set("X-EduNexus-Proxy-Key", proof)
		res, err := apps[0].Test(req, 10000)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != 429 {
			t.Fatal("alternate body format bypassed account budget", tc.kind, res.StatusCode)
		}
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE auth_request_budgets SET expires_at=now()-interval '1 second' WHERE key_hash=$1`, keys[0]); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("POST", "/auth/forgot-password", strings.NewReader(`{"email":"`+email+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-EduNexus-Client-IP", "192.0.2.1")
	req.Header.Set("X-EduNexus-Proxy-Key", proof)
	res, err := apps[0].Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatal("expired budget did not reset", res.StatusCode)
	}
}

func TestSharedIPBudgetRejectsForgedProxyMetadata(t *testing.T) {
	f := testsupport.Database(t)
	secret := f.Teacher
	t.Setenv("TRUSTED_PROXY_SECRET", strings.Repeat("p", 40))
	app := fiber.New()
	app.Use(AuthBudgets(f.DB, secret))
	app.Post("/auth/register", func(c *fiber.Ctx) error { return c.SendStatus(200) })
	key := authBudgetKey(secret, "/auth/register", "ip", "0.0.0.0")
	t.Cleanup(func() {
		_, _ = f.DB.Exec(context.Background(), `DELETE FROM auth_request_budgets WHERE key_hash=$1`, key)
	})
	for i := range 21 {
		req := httptest.NewRequest("POST", "/auth/register", strings.NewReader("{}"))
		req.Header.Set("X-Forwarded-For", fmt.Sprintf("192.0.2.%d", i+1))
		req.Header.Set("X-EduNexus-Client-IP", fmt.Sprintf("192.0.2.%d", i+1))
		req.Header.Set("X-EduNexus-Proxy-Key", "forged")
		res, err := app.Test(req, 10000)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		want := 200
		if i == 20 {
			want = 429
		}
		if res.StatusCode != want {
			t.Fatalf("request %d: %d want %d", i, res.StatusCode, want)
		}
	}
}

func TestAuthBudgetsFailClosedAndRejectOversizedBodies(t *testing.T) {
	f := testsupport.Database(t)
	closed, err := pgxpool.NewWithConfig(t.Context(), f.DB.Config())
	if err != nil {
		t.Fatal(err)
	}
	closed.Close()
	app := fiber.New()
	app.Use(AuthBudgets(closed, f.Teacher))
	app.Post("/auth/login", func(c *fiber.Ctx) error { t.Error("failed limiter reached login"); return c.SendStatus(200) })
	for _, tc := range []struct {
		body   string
		status int
	}{{"{}", 503}, {strings.Repeat("x", 16385), 413}} {
		res, err := app.Test(httptest.NewRequest("POST", "/auth/login", strings.NewReader(tc.body)), 10000)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.status {
			t.Fatal(res.StatusCode, tc.status)
		}
	}
}

func TestProductionCORSAndEncodedBodyBoundary(t *testing.T) {
	app := fiber.New()
	app.Use(IdentityRequestBody)
	CORS(app, &config.Config{AppEnv: "production", FrontendURL: "https://school.example"})
	app.Post("/", func(c *fiber.Ctx) error { return c.SendString(string(c.Body())) })
	for _, tc := range []struct {
		origin, encoding string
		status           int
		allow            string
	}{{"https://school.example", "", 200, "https://school.example"}, {"https://evil.invalid", "", 200, ""}, {"", "", 200, ""}, {"", "gzip", 415, ""}, {"", "br", 415, ""}, {"", "identity", 200, ""}} {
		req := httptest.NewRequest("POST", "/", strings.NewReader("fixture"))
		req.Header.Set("Origin", tc.origin)
		req.Header.Set("Content-Encoding", tc.encoding)
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.status || res.Header.Get("Access-Control-Allow-Origin") != tc.allow {
			t.Fatal(tc, res.StatusCode, res.Header.Get("Access-Control-Allow-Origin"))
		}
	}
	req := httptest.NewRequest("POST", "/", strings.NewReader("fixture"))
	req.Header.Add("Content-Encoding", "identity")
	req.Header.Add("Content-Encoding", "gzip")
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 415 {
		t.Fatal("duplicate encoding headers bypassed body policy")
	}
}
