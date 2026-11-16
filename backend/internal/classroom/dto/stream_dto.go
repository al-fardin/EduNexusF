package dto

import (
	"encoding/json"
	"github.com/edunexus/edunexus/internal/platform/audience"
	"time"
)

type CreateAnnouncementRequest struct {
	Audience *audience.Rule `json:"audience,omitempty"`
	Title    string         `json:"title"`
	Content  string         `json:"content"`
}

type UpdateAnnouncementRequest struct {
	Audience *audience.Rule `json:"audience,omitempty"`
	Title    string         `json:"title"`
	Content  string         `json:"content"`
}

type StreamAuthorResponse struct {
	ID        *string `json:"id,omitempty"`
	Email     *string `json:"email,omitempty"`
	Username  *string `json:"username,omitempty"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

type StreamPostResponse struct {
	Audience      json.RawMessage       `json:"audience"`
	ID            string                `json:"id"`
	ClassroomID   string                `json:"classroom_id"`
	AuthorID      *string               `json:"author_id,omitempty"`
	PostType      string                `json:"post_type"`
	Title         *string               `json:"title,omitempty"`
	Content       string                `json:"content"`
	ReferenceType *string               `json:"reference_type,omitempty"`
	ReferenceID   *string               `json:"reference_id,omitempty"`
	IsPinned      bool                  `json:"is_pinned"`
	CreatedAt     time.Time             `json:"created_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
	Author        *StreamAuthorResponse `json:"author,omitempty"`
}
