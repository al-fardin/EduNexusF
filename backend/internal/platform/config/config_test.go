package config

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestValidateRejectsUnsafeSigningConfiguration(t *testing.T) {
	valid := Config{JWTSecret: "ae07895417c4f23d9b0231b6ae716b5f4b901c23a8e73660", JWTAccessExpire: "24h"}
	for _, secret := range []string{"", "super-secret-key", strings.Repeat("x", 31), "  " + valid.JWTSecret, "change-me-" + strings.Repeat("x", 40)} {
		cfg := valid
		cfg.JWTSecret = secret
		if err := cfg.Validate(); err == nil {
			t.Errorf("accepted unsafe signing configuration")
		} else if secret != "" && strings.Contains(err.Error(), secret) {
			t.Error("error leaked secret")
		}
	}
	for _, duration := range []string{"0s", "-1h", "invalid", ""} {
		cfg := valid
		cfg.JWTAccessExpire = duration
		if cfg.Validate() == nil {
			t.Errorf("accepted duration %q", duration)
		}
	}
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
}

func TestProductionConfigurationFailsClosed(t *testing.T) {
	valid := Config{AppEnv: "production", FrontendURL: "https://school.example", JWTSecret: strings.Repeat("a", 48), TrustedProxySecret: strings.Repeat("b", 48), JWTAccessExpire: "15m", DBPassword: strings.Repeat("c", 32), DBSSLMode: "verify-full"}
	valid.MFAEncryptionKey = base64.StdEncoding.EncodeToString([]byte(strings.Repeat("m", 32)))
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
	for _, mutate := range []func(*Config){
		func(c *Config) { c.FrontendURL = "http://school.example" },
		func(c *Config) { c.FrontendURL = "https://user:secret@school.example" },
		func(c *Config) { c.FrontendURL = "https://school.example/path" },
		func(c *Config) { c.TrustedProxySecret = "" },
		func(c *Config) { c.MFAEncryptionKey = "" },
		func(c *Config) { c.TrustedProxySecret = c.JWTSecret },
		func(c *Config) { c.DBPassword = "postgres" },
		func(c *Config) { c.DBSSLMode = "disable" },
		func(c *Config) { c.DBSSLMode = "require" },
		func(c *Config) {
			c.DBHost = "public.database.example"
			c.DBSSLMode = "disable"
			c.AllowPrivateDatabase = true
		},
		func(c *Config) { c.JWTAccessExpire = "24h" },
		func(c *Config) { c.AppEnv = "Production" },
	} {
		cfg := valid
		mutate(&cfg)
		err := cfg.Validate()
		if err == nil {
			t.Fatal("accepted unsafe production configuration")
		}
		for _, secret := range []string{valid.JWTSecret, valid.TrustedProxySecret, valid.DBPassword} {
			if strings.Contains(err.Error(), secret) {
				t.Fatal("configuration error contains secret")
			}
		}
	}
	valid.DBSSLMode = "disable"
	valid.AllowPrivateDatabase = true
	valid.DBHost = "postgres"
	if err := valid.Validate(); err != nil {
		t.Fatal("explicit private database configuration rejected", err)
	}
}
