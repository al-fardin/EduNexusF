package database

import (
	"net/url"

	"github.com/edunexus/edunexus/internal/platform/config"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

func NewConfig(cfg *config.Config) Config {
	return Config{
		Host:     cfg.DBHost,
		Port:     cfg.DBPort,
		User:     cfg.DBUser,
		Password: cfg.DBPassword,
		Name:     cfg.DBName,
		SSLMode:  cfg.DBSSLMode,
	}
}

func (c Config) DSN() string {
	u := url.URL{Scheme: "postgres", Host: c.Host + ":" + c.Port, User: url.UserPassword(c.User, c.Password), Path: "/" + c.Name}
	query := url.Values{"sslmode": {c.SSLMode}}
	u.RawQuery = query.Encode()
	return u.String()
}
