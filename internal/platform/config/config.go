package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName string
	AppEnv  string
	AppPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret       string
	JWTAccessExpire string
	SMTPHost     string
SMTPPort     string
SMTPUsername string
SMTPPassword string
SMTPFrom     string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		AppName: getEnv("APP_NAME", "EduNexus"),
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "edunexus"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:       getEnv("JWT_SECRET", "super-secret-key"),
JWTAccessExpire: getEnv("JWT_ACCESS_EXPIRE", "24h"),
SMTPHost:     os.Getenv("SMTP_HOST"),
SMTPPort:     os.Getenv("SMTP_PORT"),
SMTPUsername: os.Getenv("SMTP_USERNAME"),
SMTPPassword: os.Getenv("SMTP_PASSWORD"),
SMTPFrom:     os.Getenv("SMTP_FROM"),
	}

	log.Println("Configuration loaded")

	return cfg
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}