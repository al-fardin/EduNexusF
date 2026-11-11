package dto

import "github.com/jackc/pgx/v5/pgtype"

// RegisterResponse contains only fields that are safe
// to return to the client after registration.
type RegisterResponse struct {
	ID            pgtype.UUID `json:"id"`
	Email         string      `json:"email"`
	Username      string      `json:"username"`
	FirstName     string      `json:"first_name"`
	LastName      string      `json:"last_name"`
	Phone         pgtype.Text `json:"phone"`
	Status        string      `json:"status"`
	Role          string      `json:"role"`
	EmailVerified bool        `json:"email_verified"`
}
