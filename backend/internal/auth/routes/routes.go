package routes

import (
	"github.com/edunexus/edunexus/internal/platform/requestidentity"
	"os"
	"time"

	"github.com/edunexus/edunexus/internal/auth/handler"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func Register(app *fiber.App, h *handler.UserHandler) {

	auth := app.Group("/auth")

	auth.Post("/register", authLimit(20), h.Register)

	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.Refresh)

	auth.Get(
		"/me",
		authMiddleware.JWTProtected(),
		h.Me,
	)

	auth.Put(
		"/profile",

		authMiddleware.JWTProtected(),
		h.UpdateProfile,
	)
	auth.Put(
		"/password",
		authMiddleware.JWTProtected(),
		h.ChangePassword,
	)
	auth.Get("/ping", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Auth module working",
		})
	})
	auth.Post(
		"/logout",
		h.Logout,
	)
	auth.Post(
		"/logout-all",
		authMiddleware.JWTProtected(),
		h.LogoutAll,
	)
	auth.Post("/verify-email", authLimit(20), h.VerifyEmail)
	auth.Post("/resend-verification", authLimit(5), h.ResendVerification)
	auth.Get(
		"/verify-email",
		h.VerifyEmail,
	)
	auth.Post(
		"/forgot-password",
		authLimit(5),
		h.ForgotPassword,
	)

	auth.Post(
		"/reset-password",
		authLimit(20),
		h.ResetPassword,
	)

}

// Each endpoint has its own budget. Proxy headers do not select a new identity.
func authLimit(max int) fiber.Handler {
	if os.Getenv("APP_ENV") == "production" {
		max *= 4
	}
	return limiter.New(limiter.Config{Max: max, Expiration: time.Minute, KeyGenerator: requestidentity.ClientIP, LimitReached: func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"success": false, "message": "Too many requests. Try again in a minute."})
	}})
}
