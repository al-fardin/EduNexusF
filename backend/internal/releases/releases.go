// Package releases exposes an operator-published Android update manifest.
package releases

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"io"
	"os"
	"regexp"
	"strings"
)

type Manifest struct {
	Code        int    `json:"version_code"`
	Name        string `json:"version_name"`
	URL         string `json:"url"`
	SHA256      string `json:"sha256"`
	Notes       string `json:"notes"`
	Certificate string `json:"certificate_sha256,omitempty"`
	Size        int64  `json:"size_bytes,omitempty"`
}

var checksum = regexp.MustCompile(`^[a-f0-9]{64}$`)

func valid(m Manifest) bool {
	base := m.Code > 0 && m.Code <= 2147483647 && len(m.Name) > 0 && len(m.Name) <= 40 && m.URL == "/downloads/EduNexus-release.apk" && checksum.MatchString(m.SHA256) && len([]rune(m.Notes)) <= 2000
	metadata := checksum.MatchString(m.Certificate) && m.Size > 0 && m.Size <= 100*1024*1024
	if m.Code >= 6 || m.Certificate != "" || m.Size != 0 {
		return base && metadata
	}
	return base
}
func Register(app *fiber.App) {
	app.Get("/app/releases/android", func(c *fiber.Ctx) error {
		c.Set("Cache-Control", "no-store")
		var m Manifest
		path := os.Getenv("ANDROID_RELEASE_MANIFEST")
		if strings.TrimSpace(path) == "" {
			return c.JSON(fiber.Map{"success": true, "data": nil})
		}
		reader, e := os.Open(path)
		if e != nil {
			return fiber.NewError(503, "Android release is unavailable")
		}
		defer reader.Close()
		file, e := io.ReadAll(io.LimitReader(reader, 16385))
		if e != nil || len(file) > 16384 || json.Unmarshal(file, &m) != nil || !valid(m) {
			return fiber.NewError(503, "Android release is unavailable")
		}
		return c.JSON(fiber.Map{"success": true, "data": m})
	})
}
