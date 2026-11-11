// @title EduNexus API
// @version 1.0
// @description EduNexus Backend API
// @host localhost:8080
// @BasePath /
//
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter: Bearer <your JWT access token>

package main

import (
	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/database"
	"github.com/edunexus/edunexus/internal/platform/logger"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/platform/server"
)

func main() {
	log := logger.NewPretty()
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Invalid server configuration")
	}

	dbCfg := database.NewConfig(cfg)

	db, err := database.Connect(dbCfg)
	if err != nil {
		log.Fatal().
			Err(err).
			Msg("Failed to connect to PostgreSQL")
	}
	defer db.Close()

	log.Info().
		Msg("PostgreSQL connected successfully")

	jwtService, err := security.NewJWT(cfg)
	if err != nil {
		log.Fatal().
			Err(err).
			Msg("Failed to initialize JWT")
	}

	app := server.New(cfg, db, jwtService)

	log.Info().
		Str("app", cfg.AppName).
		Str("environment", cfg.AppEnv).
		Str("port", cfg.AppPort).
		Msg("Starting EduNexus API")

	if err := app.Listen(":" + cfg.AppPort); err != nil {
		log.Fatal().
			Err(err).
			Msg("Failed to start server")
	}
}
