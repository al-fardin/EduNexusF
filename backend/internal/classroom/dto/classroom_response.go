package dto

import "time"

type ClassroomResponse struct {
	ID          string     `json:"id"`
	OwnerID     string     `json:"owner_id"`
	Name        string     `json:"name"`
	Section     *string    `json:"section,omitempty"`
	Subject     *string    `json:"subject,omitempty"`
	Room        *string    `json:"room,omitempty"`
	Description *string    `json:"description,omitempty"`
	ClassCode   string     `json:"class_code"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ArchivedAt  *time.Time `json:"archived_at,omitempty"`
}
