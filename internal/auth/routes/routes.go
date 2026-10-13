package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/edunexus/edunexus/internal/auth/handler"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
)

func Register(app *fiber.App, h *handler.UserHandler) {

	auth := app.Group("/auth")

	auth.Post("/register", h.Register)

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
	auth.Post("/verify-email", h.VerifyEmail)
	auth.Post("/resend-verification", h.ResendVerification)
	auth.Get(
		"/verify-email",
		h.VerifyEmail,
	)
	auth.Post(
		"/forgot-password",
		h.ForgotPassword,
	)

	auth.Post(
		"/reset-password",
		h.ResetPassword,
	)

}
