package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/edunexus/edunexus/internal/auth/dto"
	"github.com/edunexus/edunexus/internal/auth/repository"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	"github.com/edunexus/edunexus/internal/platform/mail"
	"github.com/edunexus/edunexus/internal/platform/security"
)

type UserService struct {
	repo        *repository.UserRepository
	refreshRepo *repository.RefreshTokenRepository
	verifyRepo  *repository.EmailVerificationRepository
	resetRepo   *repository.PasswordResetRepository
	jwt         *security.JWTService
	mailer      *mail.SMTPMailer
}

func New(
	repo *repository.UserRepository,
	refreshRepo *repository.RefreshTokenRepository,
	verifyRepo *repository.EmailVerificationRepository,
	resetRepo *repository.PasswordResetRepository,
	jwt *security.JWTService,
	mailer *mail.SMTPMailer,
) *UserService {

	return &UserService{
		repo:        repo,
		refreshRepo: refreshRepo,
		verifyRepo:  verifyRepo,
		resetRepo:   resetRepo,
		jwt:         jwt,
		mailer:      mailer,
	}
}

func (s *UserService) Register(
	ctx context.Context,
	req dto.RegisterRequest,
) (dto.RegisterResponse, error) {

	_, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return dto.RegisterResponse{},
			errors.New("email already exists")
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return dto.RegisterResponse{}, err
	}

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	user, err := s.repo.CreateUser(
		ctx,
		db.CreateUserParams{
			Email:        req.Email,
			Username:     req.Username,
			PasswordHash: hash,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Phone: pgtype.Text{
				String: req.Phone,
				Valid:  req.Phone != "",
			},
		},
	)
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	// Generate verification token.
	token, err := security.GenerateRefreshToken()
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	expires := pgtype.Timestamptz{
		Time:  time.Now().Add(24 * time.Hour),
		Valid: true,
	}

	uid := user.ID

	// Remove old verification tokens.
	if err := s.verifyRepo.DeleteUserTokens(
		ctx,
		uid,
	); err != nil {
		return dto.RegisterResponse{}, err
	}

	// Save verification token.
	_, err = s.verifyRepo.Create(
		ctx,
		db.CreateEmailVerificationTokenParams{
			UserID:    uid,
			Token:     token,
			ExpiresAt: expires,
		},
	)
	if err != nil {
		return dto.RegisterResponse{}, err
	}

	// Send verification email.
	link :=
		"http://localhost:3000/verify-email?token=" +
			token

	body := `
<h2>Welcome to EduNexus</h2>

<p>Thank you for registering.</p>

<p>Please click the button below to verify your email address.</p>

<p>
	<a href="` + link + `" style="padding:12px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">
		Verify Email
	</a>
</p>

<p>If the button doesn't work, copy this link into your browser:</p>

<p>` + link + `</p>

<p>This verification link will expire in 24 hours.</p>
`

	if s.mailer != nil {
		_ = s.mailer.Send(
			user.Email,
			"Verify your EduNexus account",
			body,
		)
	}

	// Return only safe public user fields.
	return dto.RegisterResponse{
		ID:            user.ID,
		Email:         user.Email,
		Username:      user.Username,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Phone:         user.Phone,
		Status:        user.Status,
		Role:          user.Role,
		EmailVerified: user.EmailVerified,
	}, nil
}
func (s *UserService) Login(
	ctx context.Context,
	req dto.LoginRequest,
) (dto.LoginResponse, error) {

	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return dto.LoginResponse{}, errors.New("invalid email or password")
	}

	if err := security.CheckPassword(
		user.PasswordHash,
		req.Password,
	); err != nil {
		return dto.LoginResponse{}, errors.New("invalid email or password")
	}
	id, err := uuid.FromBytes(user.ID.Bytes[:])
	if err != nil {
		return dto.LoginResponse{}, err
	}
	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true
	accessToken, err := s.jwt.GenerateToken(
		id.String(),
		user.Email,
		user.Role,
	)
	if err != nil {
		return dto.LoginResponse{}, err
	}

	refreshToken, err := security.GenerateRefreshToken()
	if err != nil {
		return dto.LoginResponse{}, err
	}

	expiresAt := pgtype.Timestamptz{
		Time:  time.Now().Add(7 * 24 * time.Hour),
		Valid: true,
	}

	if _, err := s.refreshRepo.Create(
		ctx,
		db.CreateRefreshTokenParams{
			UserID:    uid,
			Token:     refreshToken,
			ExpiresAt: expiresAt,
		},
	); err != nil {
		return dto.LoginResponse{}, err
	}

	return dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}
func (s *UserService) Me(
	ctx context.Context,
	userID string,
) (dto.MeResponse, error) {

	id, err := uuid.Parse(userID)
	if err != nil {
		return dto.MeResponse{}, err
	}

	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true

	user, err := s.repo.GetUserByID(ctx, uid)
	if err != nil {
		return dto.MeResponse{}, err
	}

	var phone *string
	if user.Phone.Valid {
		phone = &user.Phone.String
	}

	var avatar *string
	if user.AvatarUrl.Valid {
		avatar = &user.AvatarUrl.String
	}

	return dto.MeResponse{
		ID:            id.String(),
		Email:         user.Email,
		Username:      user.Username,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Phone:         phone,
		AvatarURL:     avatar,
		Status:        user.Status,
		Role:          user.Role,
		EmailVerified: user.EmailVerified,
	}, nil
}

func (s *UserService) ChangePassword(
	ctx context.Context,
	userID string,
	req dto.ChangePasswordRequest,
) error {

	id, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true

	user, err := s.repo.GetUserByID(ctx, uid)
	if err != nil {
		return err
	}

	if err := security.CheckPassword(
		user.PasswordHash,
		req.CurrentPassword,
	); err != nil {
		return errors.New("current password is incorrect")
	}

	hash, err := security.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	return s.repo.UpdatePassword(
		ctx,
		db.UpdatePasswordParams{
			ID:           uid,
			PasswordHash: hash,
		},
	)
}

func (s *UserService) UpdateProfile(
	ctx context.Context,
	userID string,
	req dto.UpdateProfileRequest,
) (dto.MeResponse, error) {

	id, err := uuid.Parse(userID)
	if err != nil {
		return dto.MeResponse{}, err
	}

	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true

	user, err := s.repo.UpdateUserProfile(
		ctx,
		db.UpdateUserProfileParams{
			ID:        uid,
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Phone: pgtype.Text{
				String: req.Phone,
				Valid:  req.Phone != "",
			},
			AvatarUrl: pgtype.Text{
				String: req.AvatarURL,
				Valid:  req.AvatarURL != "",
			},
		},
	)
	if err != nil {
		return dto.MeResponse{}, err
	}

	var phone *string
	if user.Phone.Valid {
		phone = &user.Phone.String
	}

	var avatar *string
	if user.AvatarUrl.Valid {
		avatar = &user.AvatarUrl.String
	}

	return dto.MeResponse{
		ID:            id.String(),
		Email:         user.Email,
		Username:      user.Username,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Phone:         phone,
		AvatarURL:     avatar,
		Status:        user.Status,
		Role:          user.Role,
		EmailVerified: user.EmailVerified,
	}, nil
}
func (s *UserService) Refresh(
	ctx context.Context,
	req dto.RefreshTokenRequest,
) (dto.RefreshTokenResponse, error) {
	rt, err := s.refreshRepo.GetByToken(
		ctx,
		req.RefreshToken,
	)
	if err != nil {
		return dto.RefreshTokenResponse{}, errors.New("invalid refresh token")
	}

	if rt.Revoked {
		return dto.RefreshTokenResponse{}, errors.New("refresh token revoked")
	}

	if !rt.ExpiresAt.Valid || rt.ExpiresAt.Time.Before(time.Now()) {
		return dto.RefreshTokenResponse{}, errors.New("refresh token expired")
	}

	id, err := uuid.FromBytes(rt.UserID.Bytes[:])
	if err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	user, err := s.repo.GetUserByID(
		ctx,
		rt.UserID,
	)
	if err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	accessToken, err := s.jwt.GenerateToken(
		id.String(),
		user.Email,
		user.Role,
	)
	if err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	// revoke old refresh token
	if err := s.refreshRepo.Revoke(
		ctx,
		req.RefreshToken,
	); err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	// create new refresh token
	newRefresh, err := security.GenerateRefreshToken()
	if err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	expires := pgtype.Timestamptz{
		Time:  time.Now().Add(7 * 24 * time.Hour),
		Valid: true,
	}

	if _, err := s.refreshRepo.Create(
		ctx,
		db.CreateRefreshTokenParams{
			UserID:    rt.UserID,
			Token:     newRefresh,
			ExpiresAt: expires,
		},
	); err != nil {
		return dto.RefreshTokenResponse{}, err
	}

	return dto.RefreshTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefresh,
	}, nil
}
func (s *UserService) Logout(
	ctx context.Context,
	req dto.LogoutRequest,
) error {

	rt, err := s.refreshRepo.GetByToken(
		ctx,
		req.RefreshToken,
	)
	if err != nil {
		return errors.New("invalid refresh token")
	}

	if rt.Revoked {
		return errors.New("refresh token already revoked")
	}

	return s.refreshRepo.Revoke(
		ctx,
		req.RefreshToken,
	)
}
func (s *UserService) LogoutAll(
	ctx context.Context,
	userID string,
) error {

	id, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	var uid pgtype.UUID
	copy(uid.Bytes[:], id[:])
	uid.Valid = true

	return s.refreshRepo.RevokeAll(
		ctx,
		uid,
	)
}
