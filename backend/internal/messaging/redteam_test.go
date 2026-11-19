package messaging

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestRedTeamConcurrentMessageAbuseAndRetry(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", f.Student); return c.Next() })
	app.Post("/classrooms/:id/conversations/:threadID/messages", h.Send)
	var thread string
	if err := f.DB.QueryRow(t.Context(), `INSERT INTO classroom_conversations(classroom_id,user_low,user_high) VALUES($1::uuid,LEAST($2::uuid,$3::uuid),GREATEST($2::uuid,$3::uuid)) RETURNING id::text`, f.ClassID, f.Teacher, f.Student).Scan(&thread); err != nil {
		t.Fatal(err)
	}
	path := "/classrooms/" + f.ClassID + "/conversations/" + thread + "/messages"
	request := func(id, body string) int {
		raw, _ := json.Marshal(fiber.Map{"body": body, "client_request_id": id})
		req := httptest.NewRequest("POST", path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		res, err := app.Test(req, 20000)
		if err != nil {
			t.Error(err)
			return 0
		}
		res.Body.Close()
		return res.StatusCode
	}
	var wg sync.WaitGroup
	codes := make(chan int, 60)
	for range 60 {
		wg.Go(func() { codes <- request(uuid.NewString(), "Abuse fixture") })
	}
	wg.Wait()
	close(codes)
	accepted, rejected := 0, 0
	for code := range codes {
		switch code {
		case 200:
			accepted++
		case 429:
			rejected++
		default:
			t.Errorf("unexpected abuse response %d", code)
		}
	}
	if accepted != 40 || rejected != 20 {
		t.Fatalf("accepted=%d rejected=%d", accepted, rejected)
	}
	var id string
	if err := f.DB.QueryRow(t.Context(), `SELECT client_request_id::text FROM classroom_messages WHERE conversation_id=$1::uuid LIMIT 1`, thread).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if request(id, "Abuse fixture") != 200 {
		t.Fatal("retry blocked instead of returning original message")
	}
	if request(id, "Changed replay") != 409 {
		t.Fatal("request ID reused to overwrite message")
	}
	var count int
	if err := f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_messages WHERE conversation_id=$1::uuid`, thread).Scan(&count); err != nil || count != 40 {
		t.Fatal("duplicate or lost messages", count, err)
	}
	t.Log("60 concurrent sends: 40 accepted, 20 throttled; identical retry did not duplicate")
}
