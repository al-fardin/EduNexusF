package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/auth/repository"
	"github.com/edunexus/edunexus/internal/platform/config"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func securityFixture(t *testing.T) (*testsupport.Fixture, *UserService, *security.JWTService, dto.LoginRequest) {
	t.Helper()
	f := testsupport.Database(t)
	q := db.New(f.DB)
	j, e := security.NewJWT(&config.Config{JWTSecret: "security-fixture-signing-key-only", JWTAccessExpire: "15m"})
	if e != nil {
		t.Fatal(e)
	}
	j.ConfigureSessions(f.DB)
	s := New(repository.New(q), repository.NewRefreshTokenRepository(q), repository.NewEmailVerificationRepository(q), repository.NewPasswordResetRepository(q), j, nil)
	s.ConfigureSecurity(f.DB)
	password := "Security_Fixture_2026!"
	hash, e := security.HashPassword(password)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.DB.Exec(t.Context(), `UPDATE users SET password_hash=$2,role='instructor' WHERE id=$1::uuid`, f.Teacher, hash); e != nil {
		t.Fatal(e)
	}
	return f, s, j, dto.LoginRequest{Email: f.Teacher + "@example.invalid", Password: password}
}
func TestSessionsRotateOnceAndRevokeAccessImmediately(t *testing.T) {
	f, s, j, req := securityFixture(t)
	a, e := s.Login(LoginContext(t.Context(), "Test browser"), req)
	if e != nil {
		t.Fatal(e)
	}
	claims, e := j.ParseToken(a.AccessToken)
	if e != nil || claims.SessionID == "" {
		t.Fatal("session token missing")
	}
	var raw string
	if e = f.DB.QueryRow(t.Context(), `SELECT token FROM refresh_tokens WHERE session_id=$1::uuid`, claims.SessionID).Scan(&raw); e != nil || raw == a.RefreshToken || !strings.HasPrefix(raw, "sha256:") {
		t.Fatal("refresh credential was not hashed")
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	success := 0
	for range 2 {
		wg.Go(func() {
			_, err := s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: a.RefreshToken})
			if err == nil {
				mu.Lock()
				success++
				mu.Unlock()
			}
		})
	}
	wg.Wait()
	if success != 1 {
		t.Fatalf("rotation accepted %d requests", success)
	}
	if _, e = f.DB.Exec(t.Context(), `UPDATE auth_sessions SET revoked_at=now() WHERE id=$1::uuid`, claims.SessionID); e != nil {
		t.Fatal(e)
	}
	if _, e = j.ParseToken(a.AccessToken); e == nil {
		t.Fatal("revoked access accepted")
	}
	b, e := s.Login(t.Context(), req)
	if e != nil {
		t.Fatal(e)
	}
	if e = s.Logout(t.Context(), dto.LogoutRequest{RefreshToken: b.RefreshToken}); e != nil {
		t.Fatal(e)
	}
	if _, e = j.ParseToken(b.AccessToken); e == nil {
		t.Fatal("logout left access active")
	}
}
func TestAuthenticatorEncryptedRecoverySingleUseAndLockout(t *testing.T) {
	f, s, j, req := securityFixture(t)
	t.Setenv("MFA_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{7}, 32)))
	login, e := s.Login(t.Context(), req)
	if e != nil {
		t.Fatal(e)
	}
	secret := []byte("12345678901234567890")
	encrypted, e := encryptMFA(f.Teacher, secret)
	if e != nil {
		t.Fatal(e)
	}
	if bytes.Contains(encrypted, secret) {
		t.Fatal("plaintext secret persisted")
	}
	if _, e = decryptMFA(f.Student, encrypted); e == nil {
		t.Fatal("secret was not bound to account")
	}
	recovery := "fixture-recovery-code"
	_, e = f.DB.Exec(t.Context(), `INSERT INTO account_security(user_id,enabled,secret,recovery_hashes) VALUES($1::uuid,true,$2,$3)`, f.Teacher, encrypted, []string{tokenHash(recovery)})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = j.ParseToken(login.AccessToken); e == nil {
		t.Fatal("pre-MFA session remained valid")
	}
	req.Code = security.TOTP(secret, time.Now().Unix()/30)
	a, e := s.Login(t.Context(), req)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = j.ParseToken(a.AccessToken); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Login(t.Context(), req); e == nil {
		t.Fatal("replayed TOTP accepted")
	}
	req.Code = recovery
	if _, e = s.Login(t.Context(), req); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Login(t.Context(), req); e == nil {
		t.Fatal("recovery code reused")
	}
	req.Code = "invalid"
	for range 5 {
		if _, e = s.Login(t.Context(), req); e == nil {
			t.Fatal("invalid factor accepted")
		}
	}
	var locked bool
	if e = f.DB.QueryRow(t.Context(), `SELECT locked_until>now() FROM account_security WHERE user_id=$1::uuid`, f.Teacher).Scan(&locked); e != nil || !locked {
		t.Fatal("account factor lock was not enforced")
	}
}
func TestTwoStepEnrollmentCannotBeEnabledWithoutProof(t *testing.T) {
	f, s, j, req := securityFixture(t)
	t.Setenv("MFA_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{8}, 32)))
	login, e := s.Login(t.Context(), req)
	if e != nil {
		t.Fatal(e)
	}
	claims, _ := j.ParseToken(login.AccessToken)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user_id", f.Teacher)
		c.Locals("session_id", claims.SessionID)
		return c.Next()
	})
	app.Post("/:action", s.twoStep)
	call := func(action, code string, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(map[string]string{"password": req.Password, "code": code})
		r := httptest.NewRequest("POST", "/"+action, bytes.NewReader(raw))
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		if res.StatusCode != status {
			t.Fatalf("%s status=%d", action, res.StatusCode)
		}
		var value map[string]any
		json.NewDecoder(res.Body).Decode(&value)
		return value
	}
	setup := call("setup", "", 200)["data"].(map[string]any)
	if setup["secret"] == "" {
		t.Fatal("setup key missing")
	}
	call("enable", "bad", 401)
	var encrypted []byte
	if e = f.DB.QueryRow(t.Context(), `SELECT pending_secret FROM account_security WHERE user_id=$1::uuid`, f.Teacher).Scan(&encrypted); e != nil {
		t.Fatal(e)
	}
	secret, e := decryptMFA(f.Teacher, encrypted)
	if e != nil {
		t.Fatal(e)
	}
	data := call("enable", security.TOTP(secret, time.Now().Unix()/30), 200)["data"].(map[string]any)
	if len(data["recovery_codes"].([]any)) != 8 {
		t.Fatal("recovery codes missing")
	}
	if _, e = j.ParseToken(login.AccessToken); e != nil {
		t.Fatal("current verified session lost")
	}
}
