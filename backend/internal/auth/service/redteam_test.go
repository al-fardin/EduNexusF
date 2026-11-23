package service

import (
	"context"
	"html"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/google/uuid"
)

func TestRedTeamLegacyRefreshStillRotates(t *testing.T) {
	f, s, _, _ := securityFixture(t)
	const legacy = "previous-installation-refresh-token"
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO refresh_tokens(user_id,token,expires_at) VALUES($1::uuid,$2,now()+interval '1 hour')`, f.Teacher, legacy); err != nil {
		t.Fatal(err)
	}
	rotated, err := s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: legacy})
	if err != nil || rotated.RefreshToken == "" {
		t.Fatal("legacy session cannot rotate", err)
	}
	if _, err = s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: legacy}); err == nil {
		t.Fatal("legacy credential replay accepted")
	}
}

func TestRedTeamVerificationRejectsExpiredUsedAndInactiveLinks(t *testing.T) {
	for _, mode := range []string{"valid legacy", "expired", "used", "suspended"} {
		t.Run(mode, func(t *testing.T) {
			f, s, _, _ := securityFixture(t)
			if _, err := f.DB.Exec(t.Context(), `UPDATE users SET email_verified=false,status=CASE WHEN $2 THEN 'suspended' ELSE 'active' END WHERE id=$1::uuid`, f.Teacher, mode == "suspended"); err != nil {
				t.Fatal(err)
			}
			if _, err := f.DB.Exec(t.Context(), `INSERT INTO email_verification_tokens(user_id,token,expires_at,verified) VALUES($1::uuid,'legacy-verification',CASE WHEN $2 THEN now()-interval '1 second' ELSE now()+interval '1 hour' END,$3)`, f.Teacher, mode == "expired", mode == "used"); err != nil {
				t.Fatal(err)
			}
			err := s.VerifyEmail(t.Context(), dto.VerifyEmailRequest{Token: "legacy-verification"})
			valid := mode == "valid legacy"
			if (err == nil) != valid {
				t.Fatalf("verification accepted=%v want=%v", err == nil, valid)
			}
			var verified bool
			if err := f.DB.QueryRow(t.Context(), `SELECT email_verified FROM users WHERE id=$1::uuid`, f.Teacher).Scan(&verified); err != nil || verified != valid {
				t.Fatal("incorrect verification state", verified, err)
			}
		})
	}
}

func TestRedTeamRegistrationStoresOnlyVerificationDigest(t *testing.T) {
	f, s, _, _ := securityFixture(t)
	t.Setenv("FRONTEND_URL", "https://school.example")
	inbox := &recoveryMailbox{}
	s.mailer = inbox
	name := uuid.NewString()[:8]
	user, err := s.Register(t.Context(), dto.RegisterRequest{Email: name + "@example.invalid", Username: "redteam_" + name, Password: "Security_Test_2026!", FirstName: "Test", LastName: "User"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = f.DB.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, user.ID) })
	var stored string
	if err = f.DB.QueryRow(t.Context(), `SELECT token FROM email_verification_tokens WHERE user_id=$1`, user.ID).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(stored, "sha256:") || strings.Contains(inbox.body, stored) {
		t.Fatal("registration did not separate bearer link and stored digest")
	}
	match := regexp.MustCompile(`href="([^"]+)"`).FindStringSubmatch(inbox.body)
	if len(match) != 2 {
		t.Fatal("missing registration verification link")
	}
	link, err := url.Parse(html.UnescapeString(match[1]))
	if err != nil {
		t.Fatal(err)
	}
	if err = s.VerifyEmail(t.Context(), dto.VerifyEmailRequest{Token: link.Query().Get("token")}); err != nil {
		t.Fatal("registration link rejected", err)
	}
}

type recoveryMailbox struct {
	body  string
	count int
}

func (m *recoveryMailbox) Send(to, subject, body string) error { m.body = body; m.count++; return nil }

func TestRedTeamRefreshDigestCannotAuthenticateOrRevoke(t *testing.T) {
	f, s, j, req := securityFixture(t)
	login, err := s.Login(t.Context(), req)
	if err != nil {
		t.Fatal(err)
	}
	var digest string
	if err = f.DB.QueryRow(t.Context(), `SELECT token FROM refresh_tokens WHERE user_id=$1::uuid AND NOT revoked`, f.Teacher).Scan(&digest); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: digest}); err == nil {
		t.Fatal("stored refresh digest accepted as bearer credential")
	}
	_ = s.Logout(t.Context(), dto.LogoutRequest{RefreshToken: digest})
	if _, err = j.ParseToken(login.AccessToken); err != nil {
		t.Fatal("digest revoked another session", err)
	}
	if _, err = s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: login.RefreshToken}); err != nil {
		t.Fatal("valid raw refresh rejected", err)
	}
}

func TestRedTeamResendVerificationDoesNotEnumerateAccounts(t *testing.T) {
	f, s, _, req := securityFixture(t)
	t.Setenv("FRONTEND_URL", "https://school.example")
	inbox := &recoveryMailbox{}
	s.mailer = inbox
	for _, email := range []string{"missing@example.invalid", req.Email} {
		if err := s.ResendVerification(t.Context(), dto.ResendVerificationRequest{Email: email}); err != nil {
			t.Fatal("account state disclosed", err)
		}
	}
	if inbox.count != 0 {
		t.Fatal("sent verification for verified or missing account")
	}
	if _, err := f.DB.Exec(t.Context(), `UPDATE users SET email_verified=false WHERE id=$1::uuid`, f.Teacher); err != nil {
		t.Fatal(err)
	}
	if err := s.ResendVerification(t.Context(), dto.ResendVerificationRequest{Email: req.Email}); err != nil {
		t.Fatal(err)
	}
	if inbox.count != 1 {
		t.Fatal("unverified account did not receive verification")
	}
}

func TestRedTeamVerificationTokenIsHashedAndConsumedOnce(t *testing.T) {
	f, s, _, req := securityFixture(t)
	t.Setenv("FRONTEND_URL", "https://school.example")
	inbox := &recoveryMailbox{}
	s.mailer = inbox
	if _, err := f.DB.Exec(t.Context(), `UPDATE users SET email_verified=false WHERE id=$1::uuid`, f.Teacher); err != nil {
		t.Fatal(err)
	}
	if err := s.ResendVerification(t.Context(), dto.ResendVerificationRequest{Email: req.Email}); err != nil {
		t.Fatal(err)
	}
	match := regexp.MustCompile(`href="([^"]+)"`).FindStringSubmatch(inbox.body)
	if len(match) != 2 {
		t.Fatal("missing verification link")
	}
	link, err := url.Parse(html.UnescapeString(match[1]))
	if err != nil {
		t.Fatal(err)
	}
	token := link.Query().Get("token")
	var digest string
	if err = f.DB.QueryRow(t.Context(), `SELECT token FROM email_verification_tokens WHERE user_id=$1::uuid`, f.Teacher).Scan(&digest); err != nil {
		t.Fatal(err)
	}
	if digest == token || !strings.HasPrefix(digest, "sha256:") {
		t.Fatal("verification capability stored in plaintext")
	}
	if err = s.VerifyEmail(t.Context(), dto.VerifyEmailRequest{Token: digest}); err == nil {
		t.Fatal("digest accepted as verification credential")
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	accepted := 0
	for range 8 {
		wg.Go(func() {
			if s.VerifyEmail(t.Context(), dto.VerifyEmailRequest{Token: token}) == nil {
				mu.Lock()
				accepted++
				mu.Unlock()
			}
		})
	}
	wg.Wait()
	if accepted != 1 {
		t.Fatalf("verification accepted %d times", accepted)
	}
	var verified bool
	if err = f.DB.QueryRow(t.Context(), `SELECT email_verified FROM users WHERE id=$1::uuid`, f.Teacher).Scan(&verified); err != nil || !verified {
		t.Fatal("account not verified", err)
	}
}

func TestRedTeamPasswordRecoveryIsPrivateHashedAndSingleUse(t *testing.T) {
	f, s, j, loginRequest := securityFixture(t)
	t.Setenv("FRONTEND_URL", "https://school.example")
	inbox := &recoveryMailbox{}
	s.mailer = inbox
	if err := s.ForgotPassword(t.Context(), dto.ForgotPasswordRequest{Email: "missing@example.invalid"}); err != nil {
		t.Fatalf("unknown account has a distinguishable error: %v", err)
	}
	if inbox.count != 0 {
		t.Fatal("sent mail for unknown account")
	}
	login, err := s.Login(t.Context(), loginRequest)
	if err != nil {
		t.Fatal(err)
	}
	if err = s.ForgotPassword(t.Context(), dto.ForgotPasswordRequest{Email: loginRequest.Email}); err != nil {
		t.Fatal(err)
	}
	match := regexp.MustCompile(`href="([^"]+)"`).FindStringSubmatch(inbox.body)
	if len(match) != 2 {
		t.Fatal("missing reset link")
	}
	link, err := url.Parse(html.UnescapeString(match[1]))
	if err != nil {
		t.Fatal(err)
	}
	if link.Scheme != "https" || link.Host != "school.example" || link.Path != "/reset-password" {
		t.Fatal("reset link does not use public origin")
	}
	token := link.Query().Get("token")
	if len(token) < 32 {
		t.Fatal("weak reset capability")
	}
	var stored string
	if err = f.DB.QueryRow(t.Context(), `SELECT token FROM password_reset_tokens WHERE user_id=$1::uuid`, f.Teacher).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if stored == token || !strings.HasPrefix(stored, "sha256:") {
		t.Fatal("reset secret stored in plaintext")
	}
	if err = s.ResetPassword(t.Context(), dto.ResetPasswordRequest{Token: stored, Password: "Wrong_Bearer_2026!"}); err == nil {
		t.Fatal("database digest accepted as bearer token")
	}
	var mu sync.Mutex
	accepted := 0
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			err := s.ResetPassword(t.Context(), dto.ResetPasswordRequest{Token: token, Password: "New_Secret_2026!"})
			if err == nil {
				mu.Lock()
				accepted++
				mu.Unlock()
			}
		})
	}
	wg.Wait()
	if accepted != 1 {
		t.Fatalf("reset accepted %d times", accepted)
	}
	if _, err = j.ParseToken(login.AccessToken); err == nil {
		t.Fatal("password reset retained old access")
	}
	if _, err = s.Refresh(t.Context(), dto.RefreshTokenRequest{RefreshToken: login.RefreshToken}); err == nil {
		t.Fatal("password reset retained refresh credential")
	}
	loginRequest.Password = "New_Secret_2026!"
	if _, err = s.Login(t.Context(), loginRequest); err != nil {
		t.Fatal(err)
	}
}

func TestRedTeamLegacyResetCompatibilityAndUsedTokenRejection(t *testing.T) {
	for _, used := range []bool{false, true} {
		t.Run(map[bool]string{false: "valid legacy link", true: "used legacy link"}[used], func(t *testing.T) {
			f, s, _, _ := securityFixture(t)
			_, err := f.DB.Exec(t.Context(), `INSERT INTO password_reset_tokens(user_id,token,expires_at,used) VALUES($1::uuid,'legacy-token',now()+interval '1 hour',$2)`, f.Teacher, used)
			if err != nil {
				t.Fatal(err)
			}
			err = s.ResetPassword(t.Context(), dto.ResetPasswordRequest{Token: "legacy-token", Password: "New_Secret_2026!"})
			if used && err == nil {
				t.Fatal("used legacy reset accepted")
			}
			if !used && err != nil {
				t.Fatal("valid legacy link broke", err)
			}
		})
	}
}
