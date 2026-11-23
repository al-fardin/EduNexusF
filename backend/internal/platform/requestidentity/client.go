// Package requestidentity accepts proxy metadata only with a server-side proof.
package requestidentity

import (
	"crypto/subtle"
	"net"
	"os"

	"github.com/gofiber/fiber/v2"
)

func ClientIP(c *fiber.Ctx) string {
	secret := os.Getenv("TRUSTED_PROXY_SECRET")
	if len(secret) >= 32 && subtle.ConstantTimeCompare([]byte(secret), []byte(c.Get("X-EduNexus-Proxy-Key"))) == 1 {
		if ip := net.ParseIP(c.Get("X-EduNexus-Client-IP")); ip != nil {
			return ip.String()
		}
	}
	return c.IP()
}
