package exam

import (
	"github.com/gofiber/fiber/v2"
	"net/http/httptest"
	"testing"
)

func TestNativeTesterRequiresExplicitProductionTrust(t *testing.T) {
	app := fiber.New()
	app.Get("/", nativeTesterPolicy, func(c *fiber.Ctx) error { return c.SendStatus(200) })
	for _, tc := range []struct {
		env, allow string
		status     int
	}{{"production", "", 503}, {"production", "false", 503}, {"production", "true", 200}, {"development", "", 200}} {
		t.Setenv("APP_ENV", tc.env)
		t.Setenv("ALLOW_TRUSTED_NATIVE_TESTERS", tc.allow)
		res, err := app.Test(httptest.NewRequest("GET", "/", nil))
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != tc.status {
			t.Fatal("unsafe native tester policy", res.StatusCode, tc.status)
		}
	}
}
