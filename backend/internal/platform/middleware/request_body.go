package middleware

import (
	"bytes"
	"github.com/gofiber/fiber/v2"
	"strings"
)

// Requests use identity encoding. Compressed attachment files are still allowed
// inside multipart uploads; this rejects HTTP-level decompression before Body()
// can expand an attacker-controlled stream beyond the wire-size limit.
func IdentityRequestBody(c *fiber.Ctx) error {
	unsupported := false
	c.Request().Header.VisitAll(func(key, value []byte) {
		if bytes.EqualFold(key, []byte("Content-Encoding")) {
			encoding := strings.TrimSpace(string(value))
			if encoding != "" && !strings.EqualFold(encoding, "identity") {
				unsupported = true
			}
		}
	})
	if unsupported {
		return fiber.NewError(415, "Compressed request bodies are not supported")
	}
	c.Request().Header.Del("Content-Encoding")
	return c.Next()
}
