package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/edunexus/edunexus/internal/classroom/repository"
	"github.com/edunexus/edunexus/internal/classroom/service"
	"github.com/edunexus/edunexus/internal/platform/contentrelease"
	db "github.com/edunexus/edunexus/internal/platform/database/sqlc"
	appErrors "github.com/edunexus/edunexus/internal/platform/errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
)

func TestScheduledMaterialUploadPrivacyAndPublication(t *testing.T) {
	f := testsupport.Database(t)
	if _, err := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET student_roll='002' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student); err != nil {
		t.Fatal(err)
	}
	if _, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','003')`, f.ClassID, f.Outsider); err != nil {
		t.Fatal(err)
	}
	q := db.New(f.DB)
	classes := repository.New(q, f.DB)
	members := repository.NewMembershipRepository(q)
	h := NewMaterial(f.DB, service.NewStream(repository.NewStreamRepository(q), classes, members, service.New(classes, members)))
	h.directory = t.TempDir()
	// Fiber caches SendFile handles for ten seconds; Windows cannot unlink them until released.
	t.Cleanup(func() {
		rel, err := filepath.Rel(os.TempDir(), h.directory)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
			t.Error("Unexpected temporary path")
			return
		}
		until := time.Now().Add(30 * time.Second)
		for {
			err = os.RemoveAll(h.directory)
			if err == nil {
				return
			}
			if time.Now().After(until) {
				t.Error(err)
				return
			}
			time.Sleep(250 * time.Millisecond)
		}
	})
	app := fiber.New(fiber.Config{ErrorHandler: appErrors.Handler})
	app.Use(func(c *fiber.Ctx) error {
		user := c.Get("X-Test-User")
		c.Locals("user_id", user)
		role := "student"
		if user == f.Teacher {
			role = "instructor"
		}
		c.Locals("role", role)
		return c.Next()
	})
	app.Post("/classrooms/:id/materials", h.Upload)
	app.Delete("/classrooms/:id/materials/:materialID", h.Remove)
	app.Get("/classrooms/:id/materials", h.List)
	app.Get("/classrooms/:id/materials/:materialID/download", h.Download)
	path := "/classrooms/" + f.ClassID + "/materials"
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	form.WriteField("title", "Scheduled lecture")
	form.WriteField("audience", `{"mode":"even"}`)
	form.WriteField("publish_at", time.Now().Add(time.Hour).Format(time.RFC3339))
	part, err := form.CreateFormFile("file", "lecture.txt")
	if err != nil {
		t.Fatal(err)
	}
	part.Write([]byte("Private lesson before release"))
	form.Close()
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	req.Header.Set("X-Test-User", f.Teacher)
	res, err := app.Test(req, 5000)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != 201 {
		t.Fatalf("upload %d %s", res.StatusCode, raw)
	}
	var envelope struct {
		Data materialRecord `json:"data"`
	}
	if err = json.Unmarshal(raw, &envelope); err != nil {
		t.Fatal(err)
	}
	id := envelope.Data.ID
	list := func(user string) []any {
		r := httptest.NewRequest("GET", path, nil)
		r.Header.Set("X-Test-User", user)
		resp, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer resp.Body.Close()
		var out struct {
			Data []any `json:"data"`
		}
		if e = json.NewDecoder(resp.Body).Decode(&out); e != nil {
			t.Fatal(e)
		}
		return out.Data
	}
	if len(list(f.Student)) != 0 || len(list(f.Teacher)) != 1 {
		t.Fatal("scheduled list visibility")
	}
	download := func(user string, want int) {
		r := httptest.NewRequest("GET", path+"/"+id+"/download", nil)
		r.Header.Set("X-Test-User", user)
		resp, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer resp.Body.Close()
		if resp.StatusCode != want {
			raw, _ := io.ReadAll(resp.Body)
			t.Fatalf("download %d: %s", resp.StatusCode, raw)
		}
	}
	download(f.Student, 404)
	download(f.Teacher, 200)
	if _, err = f.DB.Exec(t.Context(), `UPDATE classroom_content_schedules SET publish_at=now()-interval '1 minute' WHERE resource_id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	if err = contentrelease.PublishOne(t.Context(), f.DB); err != nil {
		t.Fatal(err)
	}
	if len(list(f.Student)) != 1 {
		t.Fatal("published material missing")
	}
	download(f.Student, 200)
	download(f.Outsider, 403)
	if len(list(f.Outsider)) != 0 {
		t.Fatal("scheduled audience was not preserved")
	}
	var n int
	if err = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_stream_posts WHERE reference_type='material' AND reference_id=$1::uuid`, id).Scan(&n); err != nil || n != 1 {
		t.Fatal(n, err)
	}
	// Deletion now hides both the public link and teacher download, retaining the file for restoration.
	req = httptest.NewRequest("DELETE", path+"/"+id, strings.NewReader(`{"reason":"Accidental upload"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", f.Teacher)
	deleted, e := app.Test(req)
	if e != nil {
		t.Fatal(e)
	}
	defer deleted.Body.Close()
	if deleted.StatusCode != 200 {
		raw, _ := io.ReadAll(deleted.Body)
		t.Fatal(deleted.StatusCode, string(raw))
	}
	if len(list(f.Student)) != 0 || len(list(f.Teacher)) != 0 {
		t.Fatal("trashed material remained listed")
	}
	download(f.Teacher, 403)
	download(f.Student, 403)
	var key string
	if e = f.DB.QueryRow(t.Context(), `SELECT storage_key FROM classroom_materials m JOIN classroom_material_trash t ON t.material_id=m.id WHERE m.id=$1::uuid`, id).Scan(&key); e != nil {
		t.Fatal(e)
	}
	if _, e = os.Stat(filepath.Join(h.directory, f.ClassID, key)); e != nil {
		t.Fatal("restorable file was destroyed", e)
	}

}
