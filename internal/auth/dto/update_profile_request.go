package dto

type UpdateProfileRequest struct {
	FirstName string `json:"first_name" validate:"required,min=2,max=100"`
	LastName  string `json:"last_name" validate:"required,min=2,max=100"`
	Phone     string `json:"phone"`
	AvatarURL string `json:"avatar_url"`
}