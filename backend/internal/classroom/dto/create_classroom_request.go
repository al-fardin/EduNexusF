package dto

import "time"

type CreateClassroomRequest struct {
	JoinMode        string     `json:"join_mode"`
	CodeJoinEnabled *bool      `json:"code_join_enabled"`
	CodeExpiresAt   *time.Time `json:"class_code_expires_at"`
	Name            string     `json:"name"`
	Section         string     `json:"section"`
	Subject         string     `json:"subject"`
	Room            string     `json:"room"`
	Description     string     `json:"description"`
}
