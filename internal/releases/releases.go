// Package releases exposes an operator-published Android update manifest.
package releases

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"os"
	"regexp"
	"strings"
)

type Manifest struct {
	Code   int    `json:"version_code"`
	Name   string `json:"version_name"`
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Notes  string `json:"notes"`
}

var checksum = regexp.MustCompile(`^[a-f0-9]{64}$`)

func valid(m Manifest) bool {
	return m.Code > 0 && len(m.Name) > 0 && len(m.Name) <= 40 && m.URL == "/downloads/EduNexus-release.apk" && checksum.MatchString(m.SHA256) && len(m.Notes) <= 2000
}
func Register(app *fiber.App) {
	app.Get("/app/releases/android", func(c *fiber.Ctx) error {
		c.Set("Cache-Control", "no-store")
		var m Manifest
		path := os.Getenv("ANDROID_RELEASE_MANIFEST")
		if strings.TrimSpace(path) == "" {
			return c.JSON(fiber.Map{"success": true, "data": nil})
		}
		file, e := os.ReadFile(path)
		if e != nil || len(file) > 8192 || json.Unmarshal(file, &m) != nil || !valid(m) {
			return fiber.NewError(503, "Android release is unavailable")
		}
		return c.JSON(fiber.Map{"success": true, "data": m})
	})
}
