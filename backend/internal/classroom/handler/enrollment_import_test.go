package handler

import (
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
)

func TestInvitationCSVValidation(t *testing.T) {
	rows, err := parseInvitationCSV("\ufeffemail\r\n\"Student@Example.com\"\r\nstudent@example.com\r\ninvalid\r\n")
	if err != nil || len(rows) != 3 || rows[0].Email != "student@example.com" || rows[1].State != "duplicate" || rows[2].State != "invalid" {
		t.Fatalf("%+v %v", rows, err)
	}
	for _, raw := range []string{"name,email\nA,a@example.com", "email\n", "email\n\"unterminated", "email\n" + strings.Repeat("s@example.com\n", 101), strings.Repeat("x", 32769)} {
		if _, err := parseInvitationCSV(raw); err == nil {
			t.Fatal("invalid CSV accepted")
		}
	}
}
func TestBulkInvitationPreviewConsentAndStaleCommit(t *testing.T) {
	f := testsupport.Database(t)
	app, h := enrollmentApp(f)
	app.Post("/classrooms/:id/import", h.ImportInvitations)
	path := "/classrooms/" + f.ClassID + "/import"
	var email string
	if err := f.DB.QueryRow(t.Context(), `SELECT email FROM users WHERE id=$1::uuid`, f.Student).Scan(&email); err != nil {
		t.Fatal(err)
	}
	raw := "email\nnew-student@example.invalid\nNEW-STUDENT@example.invalid\ninvalid\n" + email + "\n"
	enrollmentCall(t, app, f.Student, "POST", path, fiber.Map{"csv": raw, "action": "preview"}, 403)
	preview := enrollmentCall(t, app, f.Teacher, "POST", path, fiber.Map{"csv": raw, "action": "preview"}, 200)
	if preview["ready"] != float64(1) {
		t.Fatal(preview)
	}
	var count int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_student_invitations WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&count); err != nil || count != 0 {
		t.Fatal("preview wrote invitations", count, err)
	}
	result := enrollmentCall(t, app, f.Teacher, "POST", path, fiber.Map{"csv": raw, "action": "commit", "revision": preview["revision"]}, 200)
	if result["created"] != float64(1) {
		t.Fatal(result)
	}
	enrollmentCall(t, app, f.Teacher, "POST", path, fiber.Map{"csv": raw, "action": "commit", "revision": preview["revision"]}, 409)
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_memberships WHERE classroom_id=$1::uuid AND status='active'`, f.ClassID).Scan(&count); err != nil || count != 2 {
		t.Fatal("invitation automatically joined a student", count, err)
	}
	raw = "email\nnext-student@example.invalid\n"
	preview = enrollmentCall(t, app, f.Teacher, "POST", path, fiber.Map{"csv": raw, "action": "preview"}, 200)
	enrollmentCall(t, app, f.Teacher, "POST", "/classrooms/"+f.ClassID+"/invitations", fiber.Map{"email": "next-student@example.invalid"}, 201)
	enrollmentCall(t, app, f.Teacher, "POST", path, fiber.Map{"csv": raw, "action": "commit", "revision": preview["revision"]}, 409)
}
