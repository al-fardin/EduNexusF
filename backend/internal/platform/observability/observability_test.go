package observability

import (
	"github.com/gofiber/fiber/v2"
	recovermw "github.com/gofiber/fiber/v2/middleware/recover"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMetricsRequireOperatorSecretAndHideUserContent(t *testing.T) {
	t.Setenv("OBSERVABILITY_TOKEN", strings.Repeat("x", 32))
	app := fiber.New()
	app.Use(Middleware)
	Register(app, nil)
	for _, auth := range []string{"", "Bearer wrong", "Bearer " + strings.Repeat("x", 32)} {
		req := httptest.NewRequest("GET", "/ops/metrics?secret=never-output", nil)
		req.Header.Set("Authorization", auth)
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if strings.Contains(string(body), "never-output") || strings.Contains(string(body), strings.Repeat("x", 32)) {
			t.Fatal("sensitive content leaked")
		}
		expected := 404
		if strings.HasSuffix(auth, strings.Repeat("x", 32)) {
			expected = 200
		}
		if res.StatusCode != expected {
			t.Fatal(res.StatusCode)
		}
	}
}

func TestRecoveredPanicsCountAsServerErrors(t *testing.T) {
	app := fiber.New()
	app.Use(Middleware)
	app.Use(recovermw.New())
	app.Get("/panic", func(c *fiber.Ctx) error { panic("fixture") })
	before := Default.ServerErrors.Load()
	res, err := app.Test(httptest.NewRequest("GET", "/panic", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 500 || Default.ServerErrors.Load() != before+1 {
		t.Fatal("recovered panic not counted")
	}
}
