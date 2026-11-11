package messaging

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"sort"
	"testing"
)

func TestRichMessageValidation(t *testing.T) {
	for _, emoji := range []string{"👍", "❤️", "🧑🏽‍🎓", "✅"} {
		r := sendRequest{Kind: "emoji", Body: emoji, EmojiSize: 3}
		if e := validateRichMessage(&r); e != nil {
			t.Fatal(emoji, e)
		}
	}
	for _, r := range []sendRequest{{Kind: "emoji", Body: "hello", EmojiSize: 2}, {Kind: "emoji", Body: "👍👍", EmojiSize: 2}, {Kind: "emoji", Body: "👍", EmojiSize: 4}, {Kind: "voice", file: []byte("%PDF"), media: "application/pdf", Duration: 1000}, {Kind: "voice", file: []byte("x"), media: "audio/webm", Duration: 120001}, {Kind: "text", Body: "hello", EmojiSize: 3}} {
		if validateRichMessage(&r) == nil {
			t.Fatal("invalid rich message accepted", r.Kind)
		}
	}
}
func TestRichMessagesAndPrivateStars(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("EDUNEXUS_MESSAGE_UPLOAD_DIR", t.TempDir())
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Fixture-User")); return c.Next() })
	g := app.Group("/classrooms/:id/conversations/:threadID")
	g.Post("/messages", h.Send)
	g.Get("/messages", h.History)
	g.Get("/stars", h.Stars)
	g.Put("/messages/:messageID/star", h.Stars)
	g.Get("/messages/:messageID/file", h.File)
	g.Delete("/messages/:messageID", h.ChangeMessage)
	pair := []string{f.Teacher, f.Student}
	sort.Strings(pair)
	thread := uuid.NewString()
	_, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_conversations(id,classroom_id,user_low,user_high) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid)`, thread, f.ClassID, pair[0], pair[1])
	if e != nil {
		t.Fatal(e)
	}
	base := "/classrooms/" + f.ClassID + "/conversations/" + thread
	call := func(user, method, path string, payload any, status int) any {
		t.Helper()
		raw, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(raw))
		r.Header.Set("X-Fixture-User", user)
		r.Header.Set("Content-Type", "application/json")
		res, e := app.Test(r)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s: %d %s", method, path, res.StatusCode, body)
		}
		var out map[string]any
		json.Unmarshal(body, &out)
		return out["data"]
	}
	req := uuid.NewString()
	emoji := call(f.Student, "POST", base+"/messages", fiber.Map{"body": "👍", "kind": "emoji", "emoji_size": 3, "client_request_id": req}, 200).(map[string]any)
	id := emoji["id"].(string)
	if emoji["emoji_size"] != float64(3) {
		t.Fatal("emoji size lost")
	}
	call(f.Student, "POST", base+"/messages", fiber.Map{"body": "👍", "kind": "emoji", "emoji_size": 2, "client_request_id": req}, 409)
	call(f.Student, "PUT", base+"/messages/"+id+"/star", fiber.Map{"starred": true}, 200)
	if len(call(f.Student, "GET", base+"/stars", nil, 200).([]any)) != 1 || len(call(f.Teacher, "GET", base+"/stars", nil, 200).([]any)) != 0 {
		t.Fatal("stars not private")
	}
	call(f.Outsider, "GET", base+"/stars", nil, 403)
	var form bytes.Buffer
	writer := multipart.NewWriter(&form)
	writer.WriteField("kind", "voice")
	writer.WriteField("duration_ms", "1200")
	writer.WriteField("client_request_id", uuid.NewString())
	part, _ := writer.CreateFormFile("file", "voice.wav")
	wave := make([]byte, 48)
	copy(wave, []byte("RIFF"))
	binary.LittleEndian.PutUint32(wave[4:8], 40)
	copy(wave[8:], []byte("WAVEfmt "))
	binary.LittleEndian.PutUint32(wave[16:20], 16)
	binary.LittleEndian.PutUint16(wave[20:22], 1)
	binary.LittleEndian.PutUint16(wave[22:24], 1)
	binary.LittleEndian.PutUint32(wave[24:28], 16000)
	binary.LittleEndian.PutUint16(wave[34:36], 16)
	copy(wave[36:], []byte("data"))
	binary.LittleEndian.PutUint32(wave[40:44], 4)
	part.Write(wave)
	writer.Close()
	r := httptest.NewRequest("POST", base+"/messages", &form)
	r.Header.Set("X-Fixture-User", f.Teacher)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	res, e := app.Test(r)
	if e != nil {
		t.Fatal(e)
	}
	data, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatal("voice upload", res.StatusCode, string(data))
	}
	var sent struct {
		Data Message `json:"data"`
	}
	json.Unmarshal(data, &sent)
	if sent.Data.Kind != "voice" || sent.Data.Duration != 1200 {
		t.Fatal("voice metadata lost")
	}
	call(f.Outsider, "GET", base+"/messages/"+sent.Data.ID+"/file", nil, 403)
	call(f.Student, "DELETE", base+"/messages/"+id, nil, 200)
	if len(call(f.Student, "GET", base+"/messages?starred=1", nil, 200).(map[string]any)["messages"].([]any)) != 0 {
		t.Fatal("deleted message retained in stars")
	}
}
