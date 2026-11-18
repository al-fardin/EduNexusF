package handler

import (
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"testing"
)

func TestInstitutionPlacementErrorsDoNotCreatePartialClasses(t *testing.T) {
	f := testsupport.Database(t)
	app, _ := enrollmentApp(f)
	org := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO institutions(id,owner_id,name) VALUES($1::uuid,$2::uuid,'Test institution')`, org, f.Teacher); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO institution_members(institution_id,user_id,role) VALUES($1::uuid,$2::uuid,'owner')`, org, f.Teacher); e != nil {
		t.Fatal(e)
	}
	before := 0
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classrooms WHERE owner_id=$1::uuid`, f.Student).Scan(&before)
	enrollmentCall(t, app, f.Student, "POST", "/create", fiber.Map{"name": "Unauthorized institutional class", "institution": fiber.Map{"institution_id": org}}, 403)
	enrollmentCall(t, app, f.Student, "POST", "/create", fiber.Map{"name": "Invalid organization", "institution": fiber.Map{"institution_id": "invalid"}}, 400)
	after := 0
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classrooms WHERE owner_id=$1::uuid`, f.Student).Scan(&after)
	if before != after {
		t.Fatal("failed placement left classroom rows")
	}
	data := enrollmentCall(t, app, f.Student, "POST", "/create", fiber.Map{"name": "Standalone without institution"}, 201)
	id := data["id"].(string)
	t.Cleanup(func() { f.DB.Exec(t.Context(), `DELETE FROM classrooms WHERE id=$1::uuid`, id) })
	var count int
	if e := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM institution_classrooms WHERE classroom_id=$1::uuid`, id).Scan(&count); e != nil || count != 0 {
		t.Fatal("standalone class acquired organizational requirements", e)
	}
}
