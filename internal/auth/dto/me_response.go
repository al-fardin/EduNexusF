package dto

type MeResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Username      string  `json:"username"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	Phone         *string `json:"phone,omitempty"`
	AvatarURL     *string `json:"avatar_url,omitempty"`
	Status        string  `json:"status"`
	Role          string  `json:"role"`
	EmailVerified bool    `json:"email_verified"`
}
