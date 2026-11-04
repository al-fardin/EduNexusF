package learning

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"net/http/httptest"
	"testing"
)

func TestClassworkTopicIsolation(t *testing.T) {
	f := testsupport.Database(t)
	h := &Handler{db: f.DB}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	g := app.Group("/classrooms/:id/topics")
	g.Get("/", h.Topics)
	g.Post("/", h.SaveTopic)
	g.Patch("/:topicID", h.SaveTopic)
	g.Delete("/:topicID", h.SaveTopic)
	g.Put("/resources/:kind/:resourceID", h.MoveTopicResource)
	call := func(user, method, path string, payload any, status int) map[string]any {
		t.Helper()
		data, _ := json.Marshal(payload)
		r := httptest.NewRequest(method, path, bytes.NewReader(data))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Test-User", user)
		res, err := app.Test(r)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != status {
			t.Fatalf("%s %s got %d want %d: %s", method, path, res.StatusCode, status, body)
		}
		var out map[string]any
		json.Unmarshal(body, &out)
		dataMap, _ := out["data"].(map[string]any)
		return dataMap
	}
	base := "/classrooms/" + f.ClassID + "/topics"
	call(f.Student, "POST", base, fiber.Map{"title": "Denied"}, 403)
	topic := call(f.Teacher, "POST", base, fiber.Map{"title": "Week 1"}, 200)["id"].(string)
	call(f.Teacher, "POST", base, fiber.Map{"title": "week 1"}, 409)
	call(f.Outsider, "GET", base, nil, 403)
	assignment := uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(id,classroom_id,created_by,title,due_at,max_points) VALUES($1::uuid,$2::uuid,$3::uuid,'Draft task',now()+interval '1 day',10)`, assignment, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	resource := base + "/resources/assignment/" + assignment
	call(f.Teacher, "PUT", resource, fiber.Map{"topic_id": topic}, 200)
	links := call(f.Student, "GET", base, nil, 200)["links"].(map[string]any)
	if len(links) != 0 {
		t.Fatal("student saw a draft assignment association")
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_assignments SET status='published' WHERE id=$1::uuid`, assignment)
	if err != nil {
		t.Fatal(err)
	}
	if call(f.Student, "GET", base, nil, 200)["links"].(map[string]any)["assignment:"+assignment] != topic {
		t.Fatal("published classwork folder missing")
	}
	call(f.Teacher, "PUT", resource, fiber.Map{"topic_id": uuid.NewString()}, 404)
	call(f.Teacher, "PATCH", base+"/"+topic, fiber.Map{"title": "Searching"}, 200)
	call(f.Teacher, "DELETE", base+"/"+topic, nil, 200)
	var exists bool
	f.DB.QueryRow(t.Context(), `SELECT EXISTS(SELECT 1 FROM classroom_assignments WHERE id=$1::uuid)`, assignment).Scan(&exists)
	if !exists {
		t.Fatal("removing a topic deleted coursework")
	}
}
