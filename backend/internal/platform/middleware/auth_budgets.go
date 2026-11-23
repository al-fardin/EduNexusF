package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/edunexus/edunexus/internal/auth/dto"
	"strings"
	"sync/atomic"
	"time"

	"github.com/edunexus/edunexus/internal/platform/requestidentity"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func authBudgetKey(secret, path, kind, identity string) string {
	hash := hmac.New(sha256.New, []byte(secret))
	hash.Write([]byte(path + "\x00" + kind + "\x00" + identity))
	return hex.EncodeToString(hash.Sum(nil))
}

func authBudgetEmail(c *fiber.Ctx, path string) string {
	// Reuse the handler DTOs so alternate JSON/form/XML field spellings cannot
	// be interpreted differently by the limiter and the authentication handler.
	switch path {
	case "/auth/login":
		var req dto.LoginRequest
		if c.BodyParser(&req) == nil {
			return req.Email
		}
	case "/auth/forgot-password":
		var req dto.ForgotPasswordRequest
		if c.BodyParser(&req) == nil {
			return req.Email
		}
	case "/auth/resend-verification":
		var req dto.ResendVerificationRequest
		if c.BodyParser(&req) == nil {
			return req.Email
		}
	}
	return ""
}

// AuthBudgets shares one-minute request budgets across API instances. It is enabled
// in production; ordinary development and test setups retain their local limits.
func AuthBudgets(db *pgxpool.Pool, secret string) fiber.Handler {
	var nextCleanup atomic.Int64
	return func(c *fiber.Ctx) error {
		path := strings.ToLower(strings.TrimRight(c.Path(), "/"))
		max := 0
		switch path {
		case "/auth/login", "/auth/register", "/auth/reset-password", "/auth/verify-email":
			max = 20
		case "/auth/forgot-password", "/auth/resend-verification":
			max = 5
		case "/auth/refresh", "/auth/logout":
			max = 60
		}
		if max == 0 || (c.Method() != fiber.MethodPost && !(path == "/auth/verify-email" && c.Method() == fiber.MethodGet)) {
			return c.Next()
		}
		c.Set("Cache-Control", "private, no-store")
		if len(c.Body()) > 16384 {
			return fiber.ErrRequestEntityTooLarge
		}
		digest := func(kind, identity string) string {
			return authBudgetKey(secret, path, kind, identity)
		}
		ipMax := max
		if path == "/auth/login" || path == "/auth/refresh" || path == "/auth/logout" {
			ipMax = 120
		}
		if path == "/auth/forgot-password" || path == "/auth/resend-verification" {
			ipMax = 20
		}
		keys := []string{digest("ip", requestidentity.ClientIP(c))}
		if path == "/auth/login" || path == "/auth/forgot-password" || path == "/auth/resend-verification" {
			if email := authBudgetEmail(c, path); email != "" {
				keys = append(keys, digest("email", strings.ToLower(strings.TrimSpace(email))))
			}
		}
		ctx, cancel := context.WithTimeout(c.UserContext(), 3*time.Second)
		defer cancel()
		tx, err := db.Begin(ctx)
		if err != nil {
			return fiber.ErrServiceUnavailable
		}
		defer tx.Rollback(ctx)
		for i, key := range keys {
			budget := max
			if i == 0 {
				budget = ipMax
			}
			var used int
			err = tx.QueryRow(ctx, `INSERT INTO auth_request_budgets(key_hash,used,expires_at) VALUES($1,1,clock_timestamp()+interval '1 minute') ON CONFLICT(key_hash) DO UPDATE SET used=CASE WHEN auth_request_budgets.expires_at<=clock_timestamp() THEN 1 ELSE auth_request_budgets.used+1 END,expires_at=CASE WHEN auth_request_budgets.expires_at<=clock_timestamp() THEN clock_timestamp()+interval '1 minute' ELSE auth_request_budgets.expires_at END WHERE auth_request_budgets.expires_at<=clock_timestamp() OR auth_request_budgets.used<$2 RETURNING used`, key, budget).Scan(&used)
			if errors.Is(err, pgx.ErrNoRows) {
				c.Set("Retry-After", "60")
				return c.Status(429).JSON(fiber.Map{"success": false, "message": "Too many requests. Try again in a minute."})
			}
			if err != nil {
				return fiber.ErrServiceUnavailable
			}
		}
		if tx.Commit(ctx) != nil {
			return fiber.ErrServiceUnavailable
		}
		// Opportunistic, bounded maintenance uses the expiry index. No background
		// goroutine survives shutdown, and no external call holds a quota row lock.
		now := time.Now().Unix()
		next := nextCleanup.Load()
		if now >= next && nextCleanup.CompareAndSwap(next, now+60) {
			_, _ = db.Exec(ctx, `DELETE FROM auth_request_budgets WHERE key_hash IN (SELECT key_hash FROM auth_request_budgets WHERE expires_at<now() ORDER BY expires_at LIMIT 10000 FOR UPDATE SKIP LOCKED)`)
		}
		return c.Next()
	}
}
