package config

import (
	"encoding/base64"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName              string
	AppEnv               string
	AppPort              string
	FrontendURL          string
	TrustedProxySecret   string
	MFAEncryptionKey     string
	AllowPrivateDatabase bool

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
		AppName:              getEnv("APP_NAME", "EduNexus"),
		AppEnv:               getEnv("APP_ENV", "development"),
		AppPort:              getEnv("APP_PORT", "8080"),
		FrontendURL:          os.Getenv("FRONTEND_URL"),
		TrustedProxySecret:   os.Getenv("TRUSTED_PROXY_SECRET"),
		MFAEncryptionKey:     os.Getenv("MFA_ENCRYPTION_KEY"),
		AllowPrivateDatabase: os.Getenv("ALLOW_PRIVATE_DATABASE") == "true",

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "edunexus"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:       os.Getenv("JWT_SECRET"),
		JWTAccessExpire: getEnv("JWT_ACCESS_EXPIRE", "15m"),
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
	switch c.AppEnv {
	case "", "development", "test", "production":
	default:
		return fmt.Errorf("APP_ENV must be development, test or production")
	}
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
	if c.AppEnv == "production" {
		duration, _ := time.ParseDuration(c.JWTAccessExpire)
		if duration > 30*time.Minute {
			return fmt.Errorf("production access tokens must expire within 30 minutes")
		}
		origin, err := url.Parse(c.FrontendURL)
		if err != nil || origin.Scheme != "https" || origin.Hostname() == "" || origin.User != nil || (origin.Path != "" && origin.Path != "/") || origin.RawQuery != "" || origin.Fragment != "" {
			return fmt.Errorf("production FRONTEND_URL must be an HTTPS origin")
		}
		proxy := strings.TrimSpace(c.TrustedProxySecret)
		if len(proxy) < 32 || proxy != c.TrustedProxySecret || proxy == c.JWTSecret || strings.Contains(strings.ToLower(proxy), "replace") {
			return fmt.Errorf("production TRUSTED_PROXY_SECRET must be a separate generated secret of at least 32 bytes")
		}
		mfa, err := base64.StdEncoding.DecodeString(c.MFAEncryptionKey)
		if err != nil || len(mfa) != 32 {
			return fmt.Errorf("production MFA_ENCRYPTION_KEY must be a persistent 32-byte Base64 key")
		}
		if len(c.DBPassword) < 20 || strings.Contains(strings.ToLower(c.DBPassword), "replace") || strings.Contains(strings.ToLower(c.DBPassword), "password") {
			return fmt.Errorf("production DB_PASSWORD must be a strong unique password of at least 20 bytes")
		}
		privateHost := c.DBHost == "postgres" || c.DBHost == "localhost"
		if ip := net.ParseIP(c.DBHost); ip != nil {
			privateHost = ip.IsPrivate() || ip.IsLoopback()
		}
		if c.DBSSLMode != "verify-full" && !(c.DBSSLMode == "disable" && c.AllowPrivateDatabase && privateHost) {
			return fmt.Errorf("production database requires verify-full TLS or explicit ALLOW_PRIVATE_DATABASE for an isolated private network")
		}
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
