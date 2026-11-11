package config

import (
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
