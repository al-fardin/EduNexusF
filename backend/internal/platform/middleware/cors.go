package middleware

import (
	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/gofiber/fiber/v2"
	corsmw "github.com/gofiber/fiber/v2/middleware/cors"
	"strings"
)

func CORS(app *fiber.App, cfg *config.Config) {
	if cfg.AppEnv != "production" {
		app.Use(corsmw.New())
		return
	}
	origin := strings.TrimRight(cfg.FrontendURL, "/")
	app.Use(corsmw.New(corsmw.Config{AllowOrigins: origin, AllowMethods: "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS", AllowHeaders: "Authorization,Content-Type,X-Request-ID", ExposeHeaders: "X-Request-ID,Retry-After,Content-Disposition"}))
}
