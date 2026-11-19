package service

import (
	"html"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/edunexus/edunexus/internal/auth/dto"
)

type recoveryMailbox struct {
	body  string
	count int
}

func (m *recoveryMailbox) Send(to, subject, body string) error { m.body = body; m.count++; return nil }

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
