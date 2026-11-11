package config

import (
	"fmt"
	"os"
	"strings"
	"time"

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
	SMTPHost        string
	SMTPPort        string
	SMTPUsername    string
	SMTPPassword    string
	SMTPFrom        string
}

func Load() (*Config, error) {
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

		JWTSecret:       os.Getenv("JWT_SECRET"),
		JWTAccessExpire: getEnv("JWT_ACCESS_EXPIRE", "24h"),
		SMTPHost:        os.Getenv("SMTP_HOST"),
		SMTPPort:        os.Getenv("SMTP_PORT"),
		SMTPUsername:    os.Getenv("SMTP_USERNAME"),
		SMTPPassword:    os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:        os.Getenv("SMTP_FROM"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// Validate fails before connecting to a database or accepting traffic. Never
// include secret values in errors: startup errors are commonly sent to logs.
func (c *Config) Validate() error {
	secret := strings.TrimSpace(c.JWTSecret)
	if len(secret) < 32 || secret != c.JWTSecret {
		return fmt.Errorf("JWT_SECRET must contain at least 32 bytes without surrounding whitespace")
	}
	for _, placeholder := range []string{"super-secret-key", "change-me", "changeme", "your-secret", "replace-me", "example"} {
		if strings.Contains(strings.ToLower(secret), placeholder) {
			return fmt.Errorf("JWT_SECRET must be a generated secret, not a placeholder")
		}
	}
	if duration, err := time.ParseDuration(c.JWTAccessExpire); err != nil || duration <= 0 {
		return fmt.Errorf("JWT_ACCESS_EXPIRE must be a positive duration")
	}
	return nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
