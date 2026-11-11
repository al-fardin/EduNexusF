package dto

import "time"

type ClassroomMemberResponse struct {
	MembershipID string    `json:"membership_id"`
	ClassroomID  string    `json:"classroom_id"`
	UserID       string    `json:"user_id"`
	MemberRole   string    `json:"member_role"`
	Status       string    `json:"status"`
	JoinedAt     time.Time `json:"joined_at"`

	Email     string `json:"email"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`

	AvatarURL *string `json:"avatar_url,omitempty"`
}
