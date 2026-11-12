package security

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/golang-jwt/jwt/v5"
)

type JWTService struct {
	RequestPolicy func(context.Context, string, string, string) error
	pool          *pgxpool.Pool
	secret        []byte
	expire        time.Duration
}

type Claims struct {
	SessionID string `json:"sid,omitempty"`
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

func NewJWT(cfg *config.Config) (*JWTService, error) {
	expire, err := time.ParseDuration(
		cfg.JWTAccessExpire,
	)
	if err != nil {
		return nil, err
	}

	return &JWTService{
		secret: []byte(cfg.JWTSecret),
		expire: expire,
	}, nil
}

func (j *JWTService) GenerateToken(
	userID string,
	email string,
	role string,
) (string, error) {
	return j.GenerateSessionToken(userID, email, role, "")
}
func (j *JWTService) ConfigureSessions(pool *pgxpool.Pool) { j.pool = pool }
func (j *JWTService) GenerateSessionToken(userID, email, role, session string) (string, error) {
	now := time.Now()

	claims := Claims{
		SessionID: session,
		UserID:    userID,
		Email:     email,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(j.expire)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString(j.secret)
}

func (j *JWTService) ParseToken(
	tokenString string,
) (*Claims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(token *jwt.Token) (
			interface{},
			error,
		) {
			if token.Method.Alg() !=
				jwt.SigningMethodHS256.Alg() {
				return nil,
					jwt.ErrSignatureInvalid
			}

			return j.secret, nil
		},
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil,
			jwt.ErrTokenInvalidClaims
	}
	if j.pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var allowed bool
		if claims.SessionID != "" {
			err = j.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM auth_sessions s JOIN users u ON u.id=s.user_id LEFT JOIN account_security a ON a.user_id=u.id WHERE s.id::text=$1 AND s.user_id::text=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active' AND u.deleted_at IS NULL AND (NOT COALESCE(a.enabled,false) OR s.mfa_verified))`, claims.SessionID, claims.UserID).Scan(&allowed)
		} else {
			issued := int64(0)
			if claims.IssuedAt != nil {
				issued = claims.IssuedAt.Unix()
			}
			err = j.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users u LEFT JOIN account_security a ON a.user_id=u.id WHERE u.id::text=$1 AND u.status='active' AND u.deleted_at IS NULL AND NOT COALESCE(a.enabled,false) AND (a.legacy_revoked_at IS NULL OR to_timestamp($2)>a.legacy_revoked_at))`, claims.UserID, issued).Scan(&allowed)
		}
		if err != nil {
			return nil, err
		}
		if !allowed {
			return nil, jwt.ErrTokenInvalidClaims
		}
	}

	return claims, nil
}
