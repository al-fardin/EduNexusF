package routes

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/auth/handler"
	"github.com/gofiber/fiber/v2"
)

func TestRedTeamEmailEndpointsThrottleWithoutTrustingForwardedIPs(t *testing.T) {
	app := fiber.New()
	Register(app, &handler.UserHandler{})
	for _, path := range []string{"/auth/forgot-password", "/auth/resend-verification"} {
		for i := 0; i < 6; i++ {
			req := httptest.NewRequest("POST", path, strings.NewReader("{"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Forwarded-For", string(rune('a'+i))+".example")
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			res.Body.Close()
			want := 400
			if i == 5 {
				want = 429
			}
			if res.StatusCode != want {
				t.Fatalf("%s request %d: got %d want %d", path, i, res.StatusCode, want)
			}
			if i == 5 && res.Header.Get("Retry-After") == "" {
				t.Fatal("missing retry timing")
			}
		}
	}
}
