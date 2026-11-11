package dto

import "time"

type JoinClassroomResponse struct {
	MembershipID string            `json:"membership_id"`
	MemberRole   string            `json:"member_role"`
	JoinedAt     time.Time         `json:"joined_at"`
	Classroom    ClassroomResponse `json:"classroom"`
}
