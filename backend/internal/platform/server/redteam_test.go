package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/platform/config"
	"github.com/edunexus/edunexus/internal/platform/security"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/google/uuid"
)

func TestRedTeamRegisteredRoutePermissionMatrix(t *testing.T) {
	f := testsupport.Database(t)
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := f.DB.Exec(t.Context(), sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status) VALUES($1::uuid,$2::uuid,'teacher','active')`, f.ClassID, f.Outsider)
	exec(`INSERT INTO classroom_staff_permissions(classroom_id,user_id,permissions) VALUES($1::uuid,$2::uuid,'{}')`, f.ClassID, f.Outsider)
	uploads := t.TempDir()
	t.Setenv("MATERIAL_UPLOAD_DIR", uploads)
	material, key := uuid.NewString(), uuid.NewString()
	exec(`INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,original_filename,storage_key,file_size,media_type) VALUES($1::uuid,$2::uuid,$3::uuid,'Private fixture','notes.txt',$4,7,'text/plain')`, material, f.ClassID, f.Teacher, key)
	exec(`INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id) VALUES($1::uuid,$2::uuid,'material','Private fixture','Fixture content','material',$3::uuid)`, f.ClassID, f.Teacher, material)
	if err := os.MkdirAll(filepath.Join(uploads, f.ClassID), 0700); err != nil {
		t.Fatal(err)
	}
	if runtime.GOOS != "windows" {
		if err := os.WriteFile(filepath.Join(uploads, f.ClassID, key), []byte("private"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	cfg := &config.Config{AppName: "Red team fixture", AppEnv: "test", JWTSecret: "red-team-fixture-signing-key-2026", JWTAccessExpire: "5m"}
	jwt, err := security.NewJWT(cfg)
	if err != nil {
		t.Fatal(err)
	}
	app := New(cfg, f.DB, jwt)
	tokens := map[string]string{}
	for _, id := range []string{f.Teacher, f.Student, f.Outsider} {
		tokens[id], err = jwt.GenerateToken(id, "fixture@example.invalid", "student")
		if err != nil {
			t.Fatal(err)
		}
	}
	call := func(user, method, path string, status int) {
		t.Helper()
		req := httptest.NewRequest(method, path, bytes.NewBufferString("{}"))
		req.Header.Set("Content-Type", "application/json")
		if user != "" {
			req.Header.Set("Authorization", "Bearer "+tokens[user])
		}
		res, err := app.Test(req, 10000)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s expected %d got %d: %s", method, path, status, res.StatusCode, body)
		}
	}
	base := "/classrooms/" + f.ClassID
	for _, path := range []string{base + "/question-bank/page", base + "/gradebook", base + "/attendance?day=2026-01-01", base + "/reports"} {
		call("", "GET", path, 401)
		call(f.Outsider, "GET", path, 403)
		call(f.Outsider, "GET", strings.Replace(path, "/classrooms/", "/CLASSROOMS/", 1), 403)
		call(f.Outsider, "GET", strings.ToUpper(path), 403)
		call(f.Teacher, "GET", path, 200)
	}
	call(f.Student, "GET", base+"/question-bank/page", 403)
	call(f.Student, "DELETE", base+"/materials/"+material, 403)
	// fasthttp caches an open file descriptor; Windows cannot unlink it during
	// TempDir cleanup. The positive download is exercised by Linux race/CI tests.
	if runtime.GOOS != "windows" {
		call(f.Student, "GET", base+"/materials/"+material+"/download", 200)
	}
	call(f.Teacher, "GET", "/classrooms/"+f.OtherClassID+"/materials/"+material+"/download", 404)
	call(f.Outsider, "GET", base+"/materials/"+material+"/download", 403)
	call(f.Student, "GET", "/classrooms/"+f.OtherClassID+"/exams", 403)
	// An existing signed token must not restore a removed membership.
	exec(`DELETE FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student)
	for _, path := range []string{base + "/materials", base + "/exams", base + "/conversations", base + "/materials/" + material + "/download"} {
		call(f.Student, "GET", path, 403)
	}
	// Compare recovery responses without delivering mail externally.
	var previous []byte
	for _, email := range []string{f.Teacher + "@example.invalid", "missing@example.invalid"} {
		raw, _ := json.Marshal(map[string]string{"email": email})
		req := httptest.NewRequest("POST", "/auth/forgot-password", bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		res, err := app.Test(req, 20000)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatalf("recovery returned %d", res.StatusCode)
		}
		// Ignore request IDs; the public response envelope must be identical.
		var response map[string]any
		if err = json.Unmarshal(body, &response); err != nil {
			t.Fatal(err)
		}
		delete(response, "request_id")
		normalized, _ := json.Marshal(response)
		if previous != nil && !bytes.Equal(previous, normalized) {
			t.Fatal("recovery response reveals account existence")
		}
		previous = normalized
	}
}
