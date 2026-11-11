package learning

import (
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWorkspaceIsolation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return c.Next() })
	app.Get("/workspace", h.Workspace)
	app.Get("/workspace/files", h.WorkspaceFiles)
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(classroom_id,created_by,title,due_at,max_points,status) VALUES($1::uuid,$3::uuid,'Visible task',now()+interval '2 days',10,'published'),($2::uuid,$3::uuid,'Private other class task',now()+interval '2 days',10,'published')`, f.ClassID, f.OtherClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/workspace", "/workspace/files", "/workspace?from=bad"} {
		r, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(r.Body)
		r.Body.Close()
		want := 200
		if strings.Contains(path, "bad") {
			want = 400
		}
		if r.StatusCode != want {
			t.Fatalf("%s: %d %s", path, r.StatusCode, raw)
		}
		if path == "/workspace" && (!strings.Contains(string(raw), "Visible task") || strings.Contains(string(raw), "Private other class task") || strings.Contains(string(raw), f.OtherClassID)) {
			t.Fatal("workspace leaked other classroom data")
		}
	}
}
