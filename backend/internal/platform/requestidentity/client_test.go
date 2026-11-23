package requestidentity

import (
	"github.com/gofiber/fiber/v2"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOnlyAuthenticatedProxyMetadataSelectsClientIP(t *testing.T) {
	secret := strings.Repeat("p", 40)
	t.Setenv("TRUSTED_PROXY_SECRET", secret)
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error { return c.SendString(ClientIP(c)) })
	for _, tc := range []struct{ proof, ip, want string }{{"", "192.0.2.1", "0.0.0.0"}, {"wrong", "192.0.2.2", "0.0.0.0"}, {secret, "192.0.2.3", "192.0.2.3"}, {secret, "192.0.2.4, 127.0.0.1", "0.0.0.0"}, {secret, "not-an-ip", "0.0.0.0"}} {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-EduNexus-Proxy-Key", tc.proof)
		req.Header.Set("X-EduNexus-Client-IP", tc.ip)
		req.Header.Set("X-Forwarded-For", "203.0.113.1")
		res, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		var body [100]byte
		n, _ := res.Body.Read(body[:])
		res.Body.Close()
		if string(body[:n]) != tc.want {
			t.Fatal("proxy identity bypass", string(body[:n]), tc.want)
		}
	}
}
