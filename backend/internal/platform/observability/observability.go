// Package observability exposes bounded, content-free operational counters.
package observability

import (
	"context"
	"crypto/subtle"
	"fmt"
	"log"
	"os"
	"sync/atomic"
	"time"

	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Counters struct{ Requests, ServerErrors, ClientErrors, SlowRequests, ClientRuntime, ClientRejection, ClientBoundary atomic.Uint64 }

var Default Counters

func Middleware(c *fiber.Ctx) error {
	start := time.Now()
	err := c.Next()
	status := c.Response().StatusCode()
	if e, ok := err.(*fiber.Error); ok {
		status = e.Code
	} else if err != nil {
		status = 500
	}
	Default.Requests.Add(1)
	if status >= 500 {
		Default.ServerErrors.Add(1)
		log.Printf(`{"event":"api_error","request_id":%q,"method":%q,"route":%q,"status":%d}`, c.GetRespHeader("X-Request-ID"), c.Method(), c.Route().Path, status)
	} else if status >= 400 {
		Default.ClientErrors.Add(1)
	}
	if time.Since(start) > 2*time.Second {
		Default.SlowRequests.Add(1)
		log.Printf(`{"event":"slow_request","request_id":%q,"route":%q,"duration_ms":%d}`, c.GetRespHeader("X-Request-ID"), c.Route().Path, time.Since(start).Milliseconds())
	}
	return err
}
func Register(app *fiber.App, db *pgxpool.Pool) {
	app.Get("/health/ready", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Second)
		defer cancel()
		c.Set("Cache-Control", "no-store")
		if db.Ping(ctx) != nil {
			return c.Status(503).JSON(fiber.Map{"status": "unavailable"})
		}
		return c.JSON(fiber.Map{"status": "ready"})
	})
	app.Get("/ops/metrics", func(c *fiber.Ctx) error {
		token := os.Getenv("OBSERVABILITY_TOKEN")
		if len(token) < 32 || subtle.ConstantTimeCompare([]byte(c.Get("Authorization")), []byte("Bearer "+token)) != 1 {
			return fiber.ErrNotFound
		}
		c.Set("Cache-Control", "no-store")
		c.Set("Content-Type", "text/plain; version=0.0.4")
		return c.SendString(fmt.Sprintf("edunexus_requests_total %d\nedunexus_server_errors_total %d\nedunexus_client_errors_total %d\nedunexus_slow_requests_total %d\nedunexus_browser_runtime_errors_total %d\nedunexus_browser_rejections_total %d\nedunexus_browser_boundary_errors_total %d\n", Default.Requests.Load(), Default.ServerErrors.Load(), Default.ClientErrors.Load(), Default.SlowRequests.Load(), Default.ClientRuntime.Load(), Default.ClientRejection.Load(), Default.ClientBoundary.Load()))
	})
	app.Post("/telemetry", auth.JWTProtected(), limiter.New(limiter.Config{Max: 10, Expiration: time.Minute, KeyGenerator: func(c *fiber.Ctx) string { u, _ := c.Locals("user_id").(string); return u }}), func(c *fiber.Ctx) error {
		var req struct {
			Category string `json:"category"`
		}
		if len(c.Body()) > 100 || c.BodyParser(&req) != nil {
			return fiber.ErrBadRequest
		}
		switch req.Category {
		case "runtime":
			Default.ClientRuntime.Add(1)
		case "rejection":
			Default.ClientRejection.Add(1)
		case "boundary":
			Default.ClientBoundary.Add(1)
		default:
			return fiber.ErrBadRequest
		}
		return c.SendStatus(204)
	})
}
