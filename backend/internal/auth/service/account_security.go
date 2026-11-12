package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/auth/dto"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type deviceKey struct{}

func LoginContext(ctx context.Context, device string) context.Context {
	return context.WithValue(ctx, deviceKey{}, strings.ToValidUTF8(device, ""))
}
func (s *UserService) ConfigureSecurity(pool *pgxpool.Pool) { s.pool = pool }
func tokenHash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func (s *UserService) securePassword(ctx context.Context, user, hash, reset, expected string) error {
	tx, e := s.pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	var current string
	if e = tx.QueryRow(ctx, `SELECT password_hash FROM users WHERE id=$1::uuid FOR UPDATE`, user).Scan(&current); e != nil {
		return e
	}
	if expected != "" && current != expected {
		return errors.New("Password changed; sign in again")
	}
	if reset != "" {
		tag, err := tx.Exec(ctx, `DELETE FROM password_reset_tokens WHERE user_id=$1::uuid AND token=$2 AND expires_at>now() AND NOT used`, user, reset)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return errors.New("Invalid or expired reset token")
		}
	}
	if _, e = tx.Exec(ctx, `UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1::uuid`, user, hash); e != nil {
		return e
	}
	if e = revokeAccount(ctx, tx, user, ""); e != nil {
		return e
	}
	if _, e = tx.Exec(ctx, `DELETE FROM password_reset_tokens WHERE user_id=$1::uuid`, user); e != nil {
		return e
	}
	return tx.Commit(ctx)
}
func mfaCipher() (cipher.AEAD, error) {
	key, e := base64.StdEncoding.DecodeString(os.Getenv("MFA_ENCRYPTION_KEY"))
	if e != nil || len(key) != 32 {
		return nil, errors.New("Two-step setup requires the server encryption key")
	}
	b, e := aes.NewCipher(key)
	if e != nil {
		return nil, e
	}
	return cipher.NewGCM(b)
}
func encryptMFA(user string, secret []byte) ([]byte, error) {
	a, e := mfaCipher()
	if e != nil {
		return nil, e
	}
	n := make([]byte, a.NonceSize())
	if _, e = rand.Read(n); e != nil {
		return nil, e
	}
	return a.Seal(n, n, secret, []byte(user)), nil
}
func decryptMFA(user string, value []byte) ([]byte, error) {
	a, e := mfaCipher()
	if e != nil {
		return nil, e
	}
	if len(value) < a.NonceSize() {
		return nil, errors.New("Invalid authenticator configuration")
	}
	return a.Open(nil, value[:a.NonceSize()], value[a.NonceSize():], []byte(user))
}

// consumeFactor must run with the account_security row locked. Recovery codes
// are high-entropy random values stored only as hashes; each is consumed once.
func consumeFactor(ctx context.Context, tx pgx.Tx, user, code string) (bool, error) {
	var encrypted []byte
	var last int64
	var hashes []string
	var failures int
	var locked *time.Time
	if e := tx.QueryRow(ctx, `SELECT secret,last_step,recovery_hashes,failures,locked_until FROM account_security WHERE user_id=$1::uuid FOR UPDATE`, user).Scan(&encrypted, &last, &hashes, &failures, &locked); e != nil {
		return false, e
	}
	if locked != nil && locked.After(time.Now()) {
		return false, nil
	}
	ok := false
	step := last
	hash := tokenHash(strings.ToLower(strings.TrimSpace(code)))
	for i, v := range hashes {
		if v == hash {
			hashes = append(hashes[:i], hashes[i+1:]...)
			ok = true
			break
		}
	}
	if !ok {
		secret, e := decryptMFA(user, encrypted)
		if e != nil {
			return false, e
		}
		step, ok = security.CheckTOTP(secret, strings.TrimSpace(code), last, time.Now())
	}
	if !ok {
		_, e := tx.Exec(ctx, `UPDATE account_security SET failures=failures+1,locked_until=CASE WHEN failures+1>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=$1::uuid`, user)
		return false, e
	}
	_, e := tx.Exec(ctx, `UPDATE account_security SET last_step=$2,recovery_hashes=$3,failures=0,locked_until=NULL,updated_at=now() WHERE user_id=$1::uuid`, user, step, hashes)
	return true, e
}
func (s *UserService) secureLogin(ctx context.Context, req dto.LoginRequest, user db.User) (dto.LoginResponse, error) {
	id := uuid.UUID(user.ID.Bytes).String()
	if user.Status != "active" || user.DeletedAt.Valid {
		return dto.LoginResponse{}, errors.New("Account unavailable")
	}
	tx, e := s.pool.Begin(ctx)
	if e != nil {
		return dto.LoginResponse{}, e
	}
	defer tx.Rollback(ctx)
	// Serialize factor changes, login and session limits for this account.
	var activeHash string
	if e = tx.QueryRow(ctx, `SELECT password_hash FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR UPDATE`, id).Scan(&activeHash); e != nil {
		return dto.LoginResponse{}, e
	}
	if activeHash != user.PasswordHash {
		return dto.LoginResponse{}, errors.New("Please sign in again")
	}
	var enabled bool
	if e = tx.QueryRow(ctx, `SELECT COALESCE((SELECT enabled FROM account_security WHERE user_id=$1::uuid),false)`, id).Scan(&enabled); e != nil {
		return dto.LoginResponse{}, e
	}
	if enabled {
		ok, err := consumeFactor(ctx, tx, id, req.Code)
		if err != nil {
			return dto.LoginResponse{}, errors.New("Authenticator unavailable; use a recovery code")
		}
		if !ok {
			if e = tx.Commit(ctx); e != nil {
				return dto.LoginResponse{}, e
			}
			return dto.LoginResponse{}, errors.New("Enter a valid authenticator or recovery code; too many attempts require a 15-minute wait")
		}
	}
	sid := uuid.NewString()
	device, _ := ctx.Value(deviceKey{}).(string)
	r := []rune(device)
	if len(r) > 200 {
		device = string(r[:200])
	}
	if _, e = tx.Exec(ctx, `INSERT INTO auth_sessions(id,user_id,device,expires_at,mfa_verified) VALUES($1::uuid,$2::uuid,$3,now()+interval '7 days',$4)`, sid, id, device, enabled); e != nil {
		return dto.LoginResponse{}, e
	}
	if _, e = tx.Exec(ctx, `UPDATE auth_sessions SET revoked_at=now() WHERE id IN(SELECT id FROM auth_sessions WHERE user_id=$1::uuid AND revoked_at IS NULL ORDER BY created_at DESC OFFSET 20)`, id); e != nil {
		return dto.LoginResponse{}, e
	}
	refresh, e := security.GenerateRefreshToken()
	if e != nil {
		return dto.LoginResponse{}, e
	}
	if _, e = tx.Exec(ctx, `INSERT INTO refresh_tokens(user_id,token,expires_at,session_id) VALUES($1::uuid,$2,now()+interval '7 days',$3::uuid)`, id, tokenHash(refresh), sid); e != nil {
		return dto.LoginResponse{}, e
	}
	access, e := s.jwt.GenerateSessionToken(id, user.Email, user.Role, sid)
	if e != nil {
		return dto.LoginResponse{}, e
	}
	if e = tx.Commit(ctx); e != nil {
		return dto.LoginResponse{}, e
	}
	return dto.LoginResponse{AccessToken: access, RefreshToken: refresh}, nil
}
func (s *UserService) secureRefresh(ctx context.Context, req dto.RefreshTokenRequest) (dto.RefreshTokenResponse, error) {
	tx, e := s.pool.Begin(ctx)
	if e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	defer tx.Rollback(ctx)
	var owner string
	if e = tx.QueryRow(ctx, `SELECT user_id::text FROM refresh_tokens WHERE token=$1 OR token=$2`, tokenHash(req.RefreshToken), req.RefreshToken).Scan(&owner); e != nil {
		return dto.RefreshTokenResponse{}, errors.New("Invalid refresh token")
	}
	if _, e = tx.Exec(ctx, `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, owner); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	var id, email, role string
	var session *string
	var expires time.Time
	e = tx.QueryRow(ctx, `SELECT r.user_id::text,u.email,u.role,r.session_id::text,r.expires_at FROM refresh_tokens r JOIN users u ON u.id=r.user_id WHERE (r.token=$1 OR r.token=$2) AND NOT r.revoked AND r.expires_at>now() AND u.status='active' AND u.deleted_at IS NULL FOR UPDATE OF r`, tokenHash(req.RefreshToken), req.RefreshToken).Scan(&id, &email, &role, &session, &expires)
	if e != nil {
		return dto.RefreshTokenResponse{}, errors.New("Invalid refresh token")
	}
	var enabled bool
	if e = tx.QueryRow(ctx, `SELECT COALESCE((SELECT enabled FROM account_security WHERE user_id=$1::uuid),false)`, id).Scan(&enabled); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	if session == nil {
		if enabled {
			return dto.RefreshTokenResponse{}, errors.New("Sign in with your authenticator")
		}
		sid := uuid.NewString()
		session = &sid
		if _, e = tx.Exec(ctx, `INSERT INTO auth_sessions(id,user_id,device,expires_at) VALUES($1::uuid,$2::uuid,'Previous installation',$3)`, sid, id, expires); e != nil {
			return dto.RefreshTokenResponse{}, e
		}
	}
	var verified bool
	e = tx.QueryRow(ctx, `SELECT mfa_verified FROM auth_sessions WHERE id=$1::uuid AND user_id=$2::uuid AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`, *session, id).Scan(&verified)
	if e != nil || (enabled && !verified) {
		return dto.RefreshTokenResponse{}, errors.New("Session revoked; sign in again")
	}
	if _, e = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked=true WHERE token=$1 OR token=$2`, tokenHash(req.RefreshToken), req.RefreshToken); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	refresh, e := security.GenerateRefreshToken()
	if e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	if _, e = tx.Exec(ctx, `INSERT INTO refresh_tokens(user_id,token,expires_at,session_id) VALUES($1::uuid,$2,$3,$4::uuid)`, id, tokenHash(refresh), expires, *session); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	if _, e = tx.Exec(ctx, `UPDATE auth_sessions SET last_seen_at=now() WHERE id=$1::uuid`, *session); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	access, e := s.jwt.GenerateSessionToken(id, email, role, *session)
	if e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	if e = tx.Commit(ctx); e != nil {
		return dto.RefreshTokenResponse{}, e
	}
	return dto.RefreshTokenResponse{AccessToken: access, RefreshToken: refresh}, nil
}
func (s *UserService) secureLogout(ctx context.Context, token string) error {
	tx, e := s.pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	var owner string
	e = tx.QueryRow(ctx, `SELECT user_id::text FROM refresh_tokens WHERE token=$1 OR token=$2`, tokenHash(token), token).Scan(&owner)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if _, e = tx.Exec(ctx, `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, owner); e != nil {
		return e
	}
	if _, e = tx.Exec(ctx, `WITH revoked AS(UPDATE refresh_tokens SET revoked=true WHERE token=$1 OR token=$2 RETURNING session_id) UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id IN(SELECT session_id FROM revoked)`, tokenHash(token), token); e != nil {
		return e
	}
	return tx.Commit(ctx)
}
func (s *UserService) revokeAll(ctx context.Context, user string) error {
	tx, e := s.pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(ctx)
	if _, e = tx.Exec(ctx, `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); e != nil {
		return e
	}
	if e = revokeAccount(ctx, tx, user, ""); e != nil {
		return e
	}
	return tx.Commit(ctx)
}
func revokeAccount(ctx context.Context, tx pgx.Tx, user, except string) error {
	if _, e := tx.Exec(ctx, `UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1::uuid AND id::text<>$2`, user, except); e != nil {
		return e
	}
	if _, e := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked=true WHERE user_id=$1::uuid AND (session_id IS NULL OR session_id::text<>$2)`, user, except); e != nil {
		return e
	}
	_, e := tx.Exec(ctx, `INSERT INTO account_security(user_id,legacy_revoked_at) VALUES($1::uuid,now()) ON CONFLICT(user_id) DO UPDATE SET legacy_revoked_at=now()`, user)
	return e
}

func (s *UserService) RegisterSecurity(app *fiber.App) {
	app.Use("/auth/login", limiter.New(limiter.Config{Max: 20, Expiration: time.Minute}))
	g := app.Group("/auth/security", authMiddleware.JWTProtected())
	g.Get("/", s.securityStatus)
	g.Get("/sessions", s.sessions)
	g.Delete("/sessions/:sessionID", s.revokeSession)
	g.Post("/two-step/:action", limiter.New(limiter.Config{Max: 8, Expiration: time.Minute}), s.twoStep)
}
func (s *UserService) securityStatus(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	var enabled bool
	var count int
	e := s.pool.QueryRow(c.UserContext(), `SELECT COALESCE(a.enabled,false),COALESCE(cardinality(a.recovery_hashes),0) FROM users u LEFT JOIN account_security a ON a.user_id=u.id WHERE u.id=$1::uuid`, user).Scan(&enabled, &count)
	if e != nil {
		return e
	}
	_, keyErr := mfaCipher()
	c.Set("Cache-Control", "no-store")
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"enabled": enabled, "recovery_remaining": count, "setup_available": keyErr == nil}})
}
func (s *UserService) sessions(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	current, _ := c.Locals("session_id").(string)
	rows, e := s.pool.Query(c.UserContext(), `SELECT id::text,device,created_at,last_seen_at,expires_at FROM auth_sessions WHERE user_id=$1::uuid AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 20`, user)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, device string
		var created, seen, expires time.Time
		if e = rows.Scan(&id, &device, &created, &seen, &expires); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "device": device, "created_at": created, "last_seen_at": seen, "expires_at": expires, "current": id == current})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	c.Set("Cache-Control", "no-store")
	return c.JSON(fiber.Map{"success": true, "data": items})
}
func (s *UserService) revokeSession(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if _, e := uuid.Parse(c.Params("sessionID")); e != nil {
		return fiber.NewError(400, "Invalid session")
	}
	tag, e := s.pool.Exec(c.UserContext(), `UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1::uuid AND user_id=$2::uuid`, c.Params("sessionID"), user)
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(404, "Session not found")
	}
	return c.JSON(fiber.Map{"success": true})
}
func (s *UserService) twoStep(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	session, _ := c.Locals("session_id").(string)
	action := c.Params("action")
	if action != "setup" && action != "enable" && action != "disable" {
		return fiber.NewError(404, "Unknown security action")
	}
	var req struct {
		Password string `json:"password"`
		Code     string `json:"code"`
	}
	if c.BodyParser(&req) != nil {
		return fiber.NewError(400, "Invalid security request")
	}
	tx, e := s.pool.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var password, email, role string
	var verified bool
	if e = tx.QueryRow(c.UserContext(), `SELECT password_hash,email,role,email_verified FROM users WHERE id=$1::uuid FOR UPDATE`, user).Scan(&password, &email, &role, &verified); e != nil {
		return e
	}
	if security.CheckPassword(password, req.Password) != nil {
		return fiber.NewError(401, "Current password is incorrect")
	}
	if role != "instructor" && role != "admin" {
		return fiber.NewError(403, "Two-step verification is available to teacher and admin accounts")
	}
	if !verified {
		return fiber.NewError(409, "Verify your email before enabling two-step verification")
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO account_security(user_id) VALUES($1::uuid) ON CONFLICT DO NOTHING`, user); e != nil {
		return e
	}
	var enabled bool
	if e = tx.QueryRow(c.UserContext(), `SELECT enabled FROM account_security WHERE user_id=$1::uuid FOR UPDATE`, user).Scan(&enabled); e != nil {
		return e
	}
	c.Set("Cache-Control", "no-store")
	if action == "setup" {
		if enabled {
			return fiber.NewError(409, "Disable the existing authenticator before replacing it")
		}
		secret := make([]byte, 20)
		if _, e = rand.Read(secret); e != nil {
			return e
		}
		encrypted, e := encryptMFA(user, secret)
		if e != nil {
			return fiber.NewError(503, "Authenticator setup is not configured on this server")
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE account_security SET pending_secret=$2,pending_expires=now()+interval '10 minutes' WHERE user_id=$1::uuid`, user, encrypted); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		key := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret)
		uri := "otpauth://totp/" + url.PathEscape("EduNexus:"+email) + "?secret=" + key + "&issuer=EduNexus&algorithm=SHA1&digits=6&period=30"
		return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"secret": key, "uri": uri}})
	}
	if action == "disable" {
		if !enabled {
			return fiber.NewError(409, "Two-step verification is already off")
		}
		ok, err := consumeFactor(c.UserContext(), tx, user, req.Code)
		if err != nil {
			return fiber.NewError(503, "Use a recovery code if your authenticator is unavailable")
		}
		if !ok {
			if e = tx.Commit(c.UserContext()); e != nil {
				return e
			}
			return fiber.NewError(401, "Invalid or recently used verification code")
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE account_security SET enabled=false,secret=NULL,pending_secret=NULL,pending_expires=NULL,recovery_hashes='{}',last_step=-1 WHERE user_id=$1::uuid`, user); e != nil {
			return e
		}
		if e = revokeAccount(c.UserContext(), tx, user, session); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return c.JSON(fiber.Map{"success": true})
	}
	if enabled {
		return fiber.NewError(409, "Two-step verification is already on")
	}
	if session == "" {
		return fiber.NewError(409, "Sign in again before enabling two-step verification")
	}
	var encrypted []byte
	var expires *time.Time
	var failures int
	var locked *time.Time
	if e = tx.QueryRow(c.UserContext(), `SELECT pending_secret,pending_expires,failures,locked_until FROM account_security WHERE user_id=$1::uuid`, user).Scan(&encrypted, &expires, &failures, &locked); e != nil {
		return e
	}
	if expires == nil || expires.Before(time.Now()) || (locked != nil && locked.After(time.Now())) {
		return fiber.NewError(409, "Setup expired or temporarily locked; try again later")
	}
	secret, e := decryptMFA(user, encrypted)
	if e != nil {
		return fiber.NewError(503, "Authenticator setup is unavailable")
	}
	step, ok := security.CheckTOTP(secret, req.Code, -1, time.Now())
	if !ok {
		if _, e = tx.Exec(c.UserContext(), `UPDATE account_security SET failures=failures+1,locked_until=CASE WHEN failures+1>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=$1::uuid`, user); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return fiber.NewError(401, "Invalid authenticator code")
	}
	codes := []string{}
	hashes := []string{}
	for range 8 {
		raw := make([]byte, 12)
		if _, e = rand.Read(raw); e != nil {
			return e
		}
		code := hex.EncodeToString(raw)
		codes = append(codes, code)
		hashes = append(hashes, tokenHash(code))
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE account_security SET enabled=true,secret=pending_secret,pending_secret=NULL,pending_expires=NULL,last_step=$2,recovery_hashes=$3,failures=0,locked_until=NULL WHERE user_id=$1::uuid`, user, step, hashes); e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE auth_sessions SET mfa_verified=true WHERE id=$1::uuid AND user_id=$2::uuid`, session, user); e != nil {
		return e
	}
	if e = revokeAccount(c.UserContext(), tx, user, session); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"recovery_codes": codes}})
}
