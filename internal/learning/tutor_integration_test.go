package learning

import (
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTutorAPIIdempotenceAndPrivateHistory(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("OPENAI_API_KEY", "fixture-key")
	t.Setenv("OPENAI_MODEL", "fixture-model")
	calls := 0
	sourceID := ""
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		answer, _ := json.Marshal(fiber.Map{"answer": "A source-grounded explanation", "source_ids": []string{sourceID}})
		json.NewEncoder(w).Encode(fiber.Map{"status": "completed", "output": []any{fiber.Map{"type": "message", "content": []any{fiber.Map{"type": "output_text", "text": string(answer)}}}}})
	}))
	defer provider.Close()
	app := testApp(&Handler{db: f.DB, tutorHTTP: provider.Client(), tutorEndpoint: provider.URL})
	base := "/classrooms/" + f.ClassID + "/tutor"
	source := call(t, app, f.Teacher, "POST", base+"/sources", fiber.Map{"title": "Course notes", "content": "The definition and worked examples from our class."}, 201)
	sourceID = source["data"].(map[string]any)["id"].(string)
	request := uuid.NewString()
	payload := fiber.Map{"question": "Explain our class definition", "request_id": request, "source_ids": []string{sourceID}}
	first := call(t, app, f.Student, "POST", base+"/ask", payload, 200)["data"].(map[string]any)
	second := call(t, app, f.Student, "POST", base+"/ask", payload, 200)["data"].(map[string]any)
	if calls != 1 || first["id"] != second["id"] {
		t.Fatal("replayed tutor request generated a second answer")
	}
	data := call(t, app, f.Teacher, "GET", base, nil, 200)["data"].(map[string]any)
	if len(data["messages"].([]any)) != 0 {
		t.Fatal("teacher saw private student history")
	}
	data = call(t, app, f.Student, "GET", base, nil, 200)["data"].(map[string]any)
	if len(data["messages"].([]any)) != 1 {
		t.Fatal("student history missing")
	}
}
