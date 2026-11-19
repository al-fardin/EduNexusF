package learning

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestRedTeamConcurrentTutorQuotaAndReplay(t *testing.T) {
	f := testsupport.Database(t)
	t.Setenv("OPENAI_API_KEY", "fixture-only")
	t.Setenv("OPENAI_MODEL", "fixture-model")
	var providerCalls atomic.Int32
	sourceID := ""
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		providerCalls.Add(1)
		answer, _ := json.Marshal(fiber.Map{"answer": "A grounded source explanation", "source_ids": []string{sourceID}})
		json.NewEncoder(w).Encode(fiber.Map{"status": "completed", "output": []any{fiber.Map{"type": "message", "content": []any{fiber.Map{"type": "output_text", "text": string(answer)}}}}})
	}))
	defer provider.Close()
	app := testApp(&Handler{db: f.DB, tutorHTTP: provider.Client(), tutorEndpoint: provider.URL})
	base := "/classrooms/" + f.ClassID + "/tutor"
	source := call(t, app, f.Teacher, "POST", base+"/sources", fiber.Map{"title": "Quota fixture", "content": "Course definitions and worked examples for a bounded tutor test."}, 201)
	sourceID = source["data"].(map[string]any)["id"].(string)
	var wg sync.WaitGroup
	codes := make(chan int, 40)
	for range 40 {
		wg.Go(func() {
			raw, _ := json.Marshal(fiber.Map{"question": "Explain our class definition", "request_id": uuid.NewString(), "source_ids": []string{sourceID}})
			req := httptest.NewRequest("POST", base+"/ask", bytes.NewReader(raw))
			req.Header.Set("X-Test-User", f.Student)
			req.Header.Set("Content-Type", "application/json")
			res, err := app.Test(req, 20000)
			if err != nil {
				t.Error(err)
				codes <- 0
				return
			}
			res.Body.Close()
			codes <- res.StatusCode
		})
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
			t.Errorf("unexpected quota response %d", code)
		}
	}
	if accepted != 30 || rejected != 10 || providerCalls.Load() != 30 {
		t.Fatalf("quota overrun: accepted=%d rejected=%d calls=%d", accepted, rejected, providerCalls.Load())
	}
	var requestID string
	if err := f.DB.QueryRow(t.Context(), `SELECT request_id::text FROM classroom_tutor_messages WHERE classroom_id=$1::uuid AND status='completed' LIMIT 1`, f.ClassID).Scan(&requestID); err != nil {
		t.Fatal(err)
	}
	call(t, app, f.Student, "POST", base+"/ask", fiber.Map{"question": "Explain our class definition", "request_id": requestID, "source_ids": []string{sourceID}}, 200)
	if providerCalls.Load() != 30 {
		t.Fatal("retry incurred a second provider call")
	}
	t.Log("40 concurrent tutor requests: 30 accepted, 10 throttled; replay reused stored answer; no external provider called")
}
