package notifications

import (
	"strings"
	"testing"
)

func TestEmailEscapesUntrustedContent(t *testing.T) {
	t.Setenv("FRONTEND_URL", "https://school.example")
	body := emailBody("<script>alert(1)</script>", "<img src=x>", "/student/classrooms/abc?tab=exam")
	if strings.Contains(body, "<script>") || strings.Contains(body, "<img") {
		t.Fatal("unescaped class content")
	}
	if !strings.Contains(body, "https://school.example/student/classrooms/abc?tab=exam") {
		t.Fatal("missing classroom link")
	}
}
func TestEmailRejectsExternalRedirect(t *testing.T) {
	t.Setenv("FRONTEND_URL", "https://school.example")
	if strings.Contains(emailBody("Title", "Body", "//evil.test"), "href=") {
		t.Fatal("external URL accepted")
	}
}
