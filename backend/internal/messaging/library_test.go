package messaging

import (
	"encoding/json"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestSharedLibraryFiltersAndMembershipPrivacy(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	pair := []string{f.Teacher, f.Student}
	sort.Strings(pair)
	thread := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid)`, thread, f.ClassID, pair[0], pair[1])
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range []struct {
		name, media string
		deleted     bool
	}{{"notes.pdf", "application/pdf", false}, {"diagram.png", "image/png", false}, {"deleted.pdf", "application/pdf", true}} {
		_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_messages(conversation_id,sender_id,body,client_request_id,file_name,file_size,media_type,deleted_at) VALUES($1::uuid,$2::uuid,'Fixture file',$3::uuid,$4,10,$5,CASE WHEN $6 THEN now() ELSE NULL END)`, thread, f.Teacher, uuid.NewString(), item.name, item.media, item.deleted)
		if err != nil {
			t.Fatal(err)
		}
	}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Get("/classrooms/:id/conversations/:threadID/library", h.Library)
	base := "/classrooms/" + f.ClassID + "/conversations/" + thread + "/library"
	request := func(user, path string, status int) map[string]any {
		t.Helper()
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("X-Test-User", user)
		res, e := app.Test(req)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		var body map[string]any
		_ = json.NewDecoder(res.Body).Decode(&body)
		if res.StatusCode != status {
			t.Fatal(res.StatusCode, body)
		}
		if status != 200 {
			return nil
		}
		return body["data"].(map[string]any)
	}
	request(f.Outsider, base, 403)
	request(f.Student, "/classrooms/"+f.OtherClassID+"/conversations/"+thread+"/library", 403)
	for _, kind := range []string{"files", "media"} {
		items := request(f.Student, base+"?kind="+kind, 200)["items"].([]any)
		if len(items) != 1 {
			t.Fatal(kind, items)
		}
		raw, _ := json.Marshal(items)
		if strings.Contains(string(raw), "storage_key") || strings.Contains(string(raw), "deleted.pdf") {
			t.Fatal("library leaked storage or removed files")
		}
	}
	if len(request(f.Teacher, base+"?q=notes", 200)["items"].([]any)) != 1 {
		t.Fatal("file name search failed")
	}
	request(f.Student, base+"?before=invalid", 400)
}
