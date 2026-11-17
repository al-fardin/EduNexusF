package learning

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strconv"
	"testing"
)

func personalApp(h *Handler) *fiber.App {
	app := testApp(h)
	app.Get("/personal/items", h.PersonalItems)
	app.Post("/personal/items", h.PersonalItems)
	app.Get("/personal/items/:itemID", h.PersonalItems)
	app.Put("/personal/items/:itemID", h.PersonalItems)
	app.Delete("/personal/items/:itemID", h.PersonalItems)
	app.Post("/personal/items/:itemID/files", h.PersonalFile)
	app.Get("/personal/items/:itemID/files/:fileID", h.PersonalFile)
	app.Delete("/personal/items/:itemID/files/:fileID", h.PersonalFile)
	return app
}
func TestPersonalNotesArePrivateVersionedAndKeepOwnedContext(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := personalApp(h)
	item := personalItem{Title: "Private revision", Body: "My own notes", Checklist: []personalCheck{{ID: uuid.NewString(), Text: "Read chapter"}}, Links: []personalLink{{Label: "Reference", URL: "https://example.com/lesson"}}, Class: f.ClassID, Kind: "class", Resource: f.ClassID}
	call(t, app, "", "POST", "/personal/items", item, 401)
	created := call(t, app, f.Student, "POST", "/personal/items", item, 200)["data"].(map[string]any)
	item.ID = created["id"].(string)
	item.Version = 1
	path := "/personal/items/" + item.ID
	other := call(t, app, f.Teacher, "GET", "/personal/items", nil, 200)["data"].(map[string]any)["items"].([]any)
	if len(other) != 0 {
		t.Fatal("private notes leaked to teacher")
	}
	call(t, app, f.Teacher, "GET", path, nil, 404)
	call(t, app, f.Teacher, "PUT", path, item, 409)
	call(t, app, f.Teacher, "DELETE", path, fiber.Map{"version": 1}, 409)
	got := call(t, app, f.Student, "GET", path, nil, 200)["data"].(map[string]any)["item"].(map[string]any)
	if got["context_url"] != "/student/classrooms/"+f.ClassID {
		t.Fatal(got)
	}
	item.Checklist[0].Done = true
	call(t, app, f.Student, "PUT", path, item, 200)
	call(t, app, f.Student, "PUT", path, item, 409)
	item.Version = 2
	item.Links[0].URL = "javascript:alert(1)"
	call(t, app, f.Student, "PUT", path, item, 400)
	item.Links[0].URL = "https://example.com"
	forged := item
	forged.ID = ""
	forged.Class = f.OtherClassID
	forged.Resource = f.OtherClassID
	call(t, app, f.Student, "POST", "/personal/items", forged, 403)
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_memberships SET status='removed' WHERE classroom_id=$1::uuid AND user_id=$2::uuid`, f.ClassID, f.Student); e != nil {
		t.Fatal(e)
	}
	got = call(t, app, f.Student, "GET", path, nil, 200)["data"].(map[string]any)["item"].(map[string]any)
	if got["context_url"] != "" {
		t.Fatal("removed classroom remains linked")
	}
	item.Body = "My private note survives leaving class"
	call(t, app, f.Student, "PUT", path, item, 200)
	call(t, app, f.Student, "DELETE", path, fiber.Map{"version": 2}, 409)
	call(t, app, f.Student, "DELETE", path, fiber.Map{"version": 3}, 200)
	call(t, app, f.Student, "GET", path, nil, 404)
}
func uploadPersonal(t *testing.T, app *fiber.App, user, path string, version string, want int) map[string]any {
	t.Helper()
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	form.WriteField("version", version)
	part, _ := form.CreateFormFile("file", "private.txt")
	part.Write([]byte("Private attachment"))
	form.Close()
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	req.Header.Set("X-Test-User", user)
	res, e := app.Test(req, 10000)
	if e != nil {
		t.Fatal(e)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != want {
		t.Fatalf("upload expected %d got %d: %s", want, res.StatusCode, raw)
	}
	var out map[string]any
	json.Unmarshal(raw, &out)
	return out
}
func TestPersonalFilesEnforceOwnershipQuotaAndVersions(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := personalApp(h)
	id := call(t, app, f.Student, "POST", "/personal/items", personalItem{Title: "Attachments"}, 200)["data"].(map[string]any)["id"].(string)
	base := "/personal/items/" + id
	file := uploadPersonal(t, app, f.Student, base+"/files", "1", 200)["data"].(map[string]any)["id"].(string)
	uploadPersonal(t, app, f.Student, base+"/files", "1", 409)
	uploadPersonal(t, app, f.Teacher, base+"/files", "2", 404)
	call(t, app, f.Teacher, "GET", base+"/files/"+file, nil, 404)
	req := httptest.NewRequest("GET", base+"/files/"+file, nil)
	req.Header.Set("X-Test-User", f.Student)
	res, e := app.Test(req)
	if e != nil {
		t.Fatal(e)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || string(raw) != "Private attachment" || res.Header.Get("Content-Type") != "application/octet-stream" || res.Header.Get("Cache-Control") != "no-store" {
		t.Fatal("private download contract", res.StatusCode)
	}
	call(t, app, f.Student, "DELETE", base+"/files/"+file, fiber.Map{"version": 1}, 409)
	call(t, app, f.Student, "DELETE", base+"/files/"+file, fiber.Map{"version": 2}, 200)
	if _, e = f.DB.Exec(t.Context(), `INSERT INTO personal_workspace_files(item_id,name,bytes) SELECT $1::uuid,'quota.txt',convert_to(repeat('x',10485760),'UTF8') FROM generate_series(1,5)`, id); e != nil {
		t.Fatal(e)
	}
	uploadPersonal(t, app, f.Student, base+"/files", "3", 422)
	call(t, app, f.Student, "DELETE", base, fiber.Map{"version": 3}, 200)
	var count int
	if e = f.DB.QueryRow(t.Context(), `SELECT count(*) FROM personal_workspace_files WHERE item_id=$1::uuid`, id).Scan(&count); e != nil || count != 0 {
		t.Fatal("files did not follow note ownership lifecycle", count, e)
	}
}

func TestPersonalMessageContextRequiresConversationParticipation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := personalApp(h)
	thread := uuid.NewString()
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status,student_roll) VALUES($1::uuid,$2::uuid,'student','active','002')`, f.ClassID, f.Outsider); e != nil {
		t.Fatal(e)
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high) VALUES($1::uuid,$2::uuid,LEAST($3::uuid,$4::uuid),GREATEST($3::uuid,$4::uuid))`, thread, f.ClassID, f.Student, f.Outsider); e != nil {
		t.Fatal(e)
	}
	var message int64
	if e := f.DB.QueryRow(t.Context(), `INSERT INTO classroom_messages(conversation_id,sender_id,client_request_id,body) VALUES($1::uuid,$2::uuid,$3::uuid,'Private conversation text') RETURNING id`, thread, f.Student, uuid.NewString()).Scan(&message); e != nil {
		t.Fatal(e)
	}
	item := personalItem{Title: "Message note", Class: f.ClassID, Kind: "message", Resource: strconv.FormatInt(message, 10)}
	call(t, app, f.Teacher, "POST", "/personal/items", item, 403)
	id := call(t, app, f.Student, "POST", "/personal/items", item, 200)["data"].(map[string]any)["id"].(string)
	got := call(t, app, f.Student, "GET", "/personal/items/"+id, nil, 200)["data"].(map[string]any)["item"].(map[string]any)
	if got["context_excerpt"] != "Private conversation text" {
		t.Fatal("linked message context missing", got)
	}
	if _, e := f.DB.Exec(t.Context(), `UPDATE classroom_messages SET deleted_at=now() WHERE id=$1`, message); e != nil {
		t.Fatal(e)
	}
	got = call(t, app, f.Student, "GET", "/personal/items/"+id, nil, 200)["data"].(map[string]any)["item"].(map[string]any)
	if got["context_url"] != "" || got["context_excerpt"] != nil {
		t.Fatal("deleted message remains visible through private notes", got)
	}
}
