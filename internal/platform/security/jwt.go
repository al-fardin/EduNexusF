package security

import (
	"time"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/golang-jwt/jwt/v5"
)

type JWTService struct {
	secret []byte
	expire time.Duration
}

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
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
	now := time.Now()

	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
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

	return claims, nil
}
