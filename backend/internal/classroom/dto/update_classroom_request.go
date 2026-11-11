package dto

type UpdateClassroomRequest struct {
	Name        string `json:"name"`
	Section     string `json:"section"`
	Subject     string `json:"subject"`
	Room        string `json:"room"`
	Description string `json:"description"`
}
