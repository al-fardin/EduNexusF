package calling

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"github.com/gofiber/fiber/v2"
	"os"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) config(c *fiber.Ctx) error {
	user, e := identity(c)
	if e != nil {
		return e
	}
	servers := []fiber.Map{}
	if _, exists := os.LookupEnv("WEBRTC_STUN_URLS"); !exists {
		servers = append(servers, fiber.Map{"urls": []string{"stun:stun.l.google.com:19302"}})
	}
	if value := strings.TrimSpace(os.Getenv("WEBRTC_STUN_URLS")); value != "" {
		urls := []string{}
		for _, v := range strings.Split(value, ",") {
			if strings.HasPrefix(strings.TrimSpace(v), "stun:") {
				urls = append(urls, strings.TrimSpace(v))
			}
		}
		if len(urls) > 0 {
			servers = append(servers, fiber.Map{"urls": urls})
		}
	}
	urls := []string{}
	for _, v := range strings.Split(os.Getenv("WEBRTC_TURN_URLS"), ",") {
		v = strings.TrimSpace(v)
		if strings.HasPrefix(v, "turn:") || strings.HasPrefix(v, "turns:") {
			urls = append(urls, v)
		}
	}
	secret := os.Getenv("WEBRTC_TURN_SECRET")
	if len(urls) > 0 && secret != "" && c.Query("call") != "" {
		session, e := session(c)
		if e != nil {
			return e
		}
		call, e := h.get(c.UserContext(), user, session, c.Query("call"))
		if e != nil {
			return e
		}
		if !call.Owned || call.State == "ended" {
			return fiber.NewError(403, "an active call session is required")
		}
		username := strconv.FormatInt(call.Created.Add(2*time.Hour).Unix(), 10) + ":" + user
		mac := hmac.New(sha1.New, []byte(secret))
		mac.Write([]byte(username))
		servers = append(servers, fiber.Map{"urls": urls, "username": username, "credential": base64.StdEncoding.EncodeToString(mac.Sum(nil))})
	}
	return result(c, fiber.Map{"ice_servers": servers, "relay_configured": len(urls) > 0 && secret != "", "ring_timeout_seconds": 45})
}
