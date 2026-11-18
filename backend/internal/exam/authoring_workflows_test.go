package exam

import (
	"bytes"
	"encoding/json"
	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"io"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestBankCatalogueReadinessAndApprovedSets(t *testing.T) {
	t.Setenv("JWT_SECRET", "fixture-signing-key-for-exam-sets-123456789")
	f := testsupport.Database(t)
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		actor := c.Get("X-Actor")
		if actor == "" {
			actor = f.Teacher
		}
		c.Locals("user_id", actor)
		return c.Next()
	})
	base := "/classrooms/:id"
	app.Post(base+"/question-bank", h.BankSave)
	app.Get(base+"/question-bank/page", h.BankCatalogue)
	app.Get(base+"/question-bank/taxonomy", h.BankTaxonomy)
	app.Get(base+"/question-bank/:bankID/usage", h.BankUsage)
	app.Post(base+"/exams", h.Create)
	app.Post(base+"/exams/readiness", h.ExamReadiness)
	app.Post(base+"/exams/:examID/publish", h.Publish)
	app.Post(base+"/exams/:examID/sets/preview", h.PreviewExamSets)
	app.Post(base+"/exams/:examID/sets/approve", h.ApproveExamSets)
	prefix := "/classrooms/" + f.ClassID
	call := func(method, path, actor string, body any, status int) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest(method, prefix+path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Actor", actor)
		res, e := app.Test(req, 20000)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		payload, _ := io.ReadAll(res.Body)
		if res.StatusCode != status {
			t.Fatalf("%s %s: expected %d got %d: %s", method, path, status, res.StatusCode, payload)
		}
		var out map[string]any
		json.Unmarshal(payload, &out)
		return out
	}
	key := 0
	q := Question{ID: "q", Kind: "mcq", Prompt: "Select a prime", Points: 5, Options: []string{"2", "4", "6"}, CorrectOption: &key, Subject: "Math", Chapter: "Numbers", Topic: "Primes", Difficulty: "medium"}
	item := call("POST", "/question-bank", "", BankItem{Question: q, Topic: q.Topic, Difficulty: q.Difficulty}, 200)["data"].([]any)[0].(map[string]any)
	bankID := item["id"].(string)
	for _, name := range []string{"Choose another prime", "Pick the prime number"} {
		copy := q
		copy.Prompt = name
		call("POST", "/question-bank", "", BankItem{Question: copy, Topic: q.Topic, Difficulty: q.Difficulty}, 200)
	}
	page := call("GET", "/question-bank/page?subject=Math&chapter=Numbers&topic=Primes", "", nil, 200)["data"].(map[string]any)
	if len(page["items"].([]any)) != 3 {
		t.Fatal("hierarchical filters missed questions")
	}
	call("GET", "/question-bank/page", f.Student, nil, 403)
	call("GET", "/question-bank/taxonomy", f.Outsider, nil, 403)
	taxonomy := call("GET", "/question-bank/taxonomy", "", nil, 200)["data"].([]any)
	if len(taxonomy) != 1 || taxonomy[0].(map[string]any)["chapter"] != "Numbers" {
		t.Fatal("taxonomy not grouped")
	}
	q.SourceBankID = bankID
	q.SourceBankVersion = 1
	draft := CreateRequest{Title: "Equivalent exam", StartsAt: time.Now().Add(time.Hour), EndsAt: time.Now().Add(2 * time.Hour), DurationMinutes: 30, Questions: []Question{q}, AllowMobileMCQ: true}
	invalid := draft
	invalid.Questions = []Question{q}
	invalid.Questions[0].CorrectOption = nil
	r := call("POST", "/exams/readiness", "", invalid, 200)["data"].(map[string]any)
	if r["ready"] != false {
		t.Fatal("missing answer key passed readiness")
	}
	id := call("POST", "/exams", "", draft, 201)["data"].(map[string]any)["id"].(string)
	path := "/exams/" + id
	call("POST", path+"/sets/preview", f.Student, fiber.Map{"count": 3, "mode": "shuffle"}, 403)
	preview := call("POST", path+"/sets/preview", "", fiber.Map{"count": 3, "mode": "equivalent"}, 200)["data"].(map[string]any)
	sets := preview["sets"].([]any)
	if len(sets) != 3 || preview["total_points"] != float64(5) {
		t.Fatal("unbalanced set preview")
	}
	seen := map[string]bool{}
	for _, set := range sets {
		qs := set.(map[string]any)["questions"].([]any)
		question := qs[0].(map[string]any)
		if question["points"] != float64(5) || question["subject"] != "Math" || seen[question["prompt"].(string)] {
			t.Fatal("equivalent set violated blueprint")
		}
		seen[question["prompt"].(string)] = true
		opts := question["options"].([]any)
		if opts[int(question["correct_option"].(float64))] != "2" {
			t.Fatal("shuffle changed answer key")
		}
	}
	var count int
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_exams WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&count)
	if count != 1 {
		t.Fatal("preview created drafts")
	}
	raw, _ := json.Marshal(sets)
	var tampered []map[string]any
	json.Unmarshal(raw, &tampered)
	tampered[0]["questions"].([]any)[0].(map[string]any)["points"] = 99
	call("POST", path+"/sets/approve", "", fiber.Map{"sets": tampered, "receipt": preview["receipt"]}, 400)
	approved := fiber.Map{"sets": sets, "receipt": preview["receipt"]}
	call("POST", path+"/sets/approve", "", approved, 201)
	call("POST", path+"/sets/approve", "", approved, 200)
	f.DB.QueryRow(t.Context(), `SELECT count(*) FROM classroom_exams WHERE classroom_id=$1::uuid AND status='draft'`, f.ClassID).Scan(&count)
	if count != 4 {
		t.Fatal("approval replay duplicated exams", count)
	}
	usage := call("GET", "/question-bank/"+bankID+"/usage", "", nil, 200)["data"].(map[string]any)
	if len(usage["items"].([]any)) < 2 {
		t.Fatal("bank provenance usage missing")
	}
	fresh := call("POST", path+"/sets/preview", "", fiber.Map{"count": 2, "mode": "shuffle"}, 200)["data"].(map[string]any)
	f.DB.Exec(t.Context(), `UPDATE classroom_question_bank SET version=version+1 WHERE id=$1::uuid`, bankID)
	call("POST", path+"/sets/approve", "", fiber.Map{"sets": fresh["sets"], "receipt": fresh["receipt"]}, 409)
	current := call("POST", path+"/sets/preview", "", fiber.Map{"count": 2, "mode": "shuffle"}, 200)["data"].(map[string]any)
	body, _ := json.Marshal(fiber.Map{"sets": current["sets"], "receipt": current["receipt"]})
	codes := make(chan int, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			request := httptest.NewRequest("POST", prefix+path+"/sets/approve", bytes.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			res, e := app.Test(request, 20000)
			if e != nil {
				codes <- 0
				return
			}
			res.Body.Close()
			codes <- res.StatusCode
		}()
	}
	wg.Wait()
	close(codes)
	sum := 0
	for status := range codes {
		sum += status
	}
	if sum != 401 {
		t.Fatal("concurrent approvals were not idempotent", sum)
	}
	fresh = call("POST", path+"/sets/preview", "", fiber.Map{"count": 2, "mode": "shuffle"}, 200)["data"].(map[string]any)
	f.DB.Exec(t.Context(), `UPDATE classroom_exams SET title='Edited source' WHERE id=$1::uuid`, id)
	call("POST", path+"/sets/approve", "", fiber.Map{"sets": fresh["sets"], "receipt": fresh["receipt"]}, 409)
	empty := uuid.NewString()
	f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Empty draft',now(),now()+interval '1 hour',30,'[]')`, empty, f.ClassID, f.Teacher)
	call("POST", "/exams/"+empty+"/publish", "", nil, 400)
	var status string
	f.DB.QueryRow(t.Context(), `SELECT status FROM classroom_exams WHERE id=$1::uuid`, empty).Scan(&status)
	if status != "draft" {
		t.Fatal("invalid draft was published")
	}
	if _, e := f.DB.Exec(t.Context(), `INSERT INTO classroom_question_bank(classroom_id,created_by,question,topic,difficulty) SELECT $1::uuid,$2::uuid,jsonb_build_object('id',gen_random_uuid()::text,'kind','mcq','prompt','Extra question '||n,'points',5,'options',jsonb_build_array('A','B'),'correct_option',0,'subject','Math','chapter','Numbers','topic','Primes'),'Primes','medium' FROM generate_series(1,60) n`, f.ClassID, f.Teacher); e != nil {
		t.Fatal(e)
	}
	first := call("GET", "/question-bank/page", "", nil, 200)["data"].(map[string]any)
	second := call("GET", "/question-bank/page?offset=50", "", nil, 200)["data"].(map[string]any)
	if len(first["items"].([]any)) != 50 || first["next_offset"] != float64(50) || len(second["items"].([]any)) != 13 {
		t.Fatal("catalogue pagination failed")
	}

}
func TestReadinessAndShufflingPreserveRequiredAnswerSemantics(t *testing.T) {
	key := 1
	q := Question{ID: "q", Kind: "mcq", Prompt: "Choose", Points: 10, Options: []string{"wrong", "correct", "also correct"}, Selection: "multiple", CorrectOptions: []int{1, 2}, CorrectOption: &key, Required: true}
	for i := 0; i < 20; i++ {
		copy, e := shuffledQuestion(q)
		if e != nil {
			t.Fatal(e)
		}
		for _, index := range copy.CorrectOptions {
			if !strings.Contains(copy.Options[index], "correct") {
				t.Fatal("checkbox key drift")
			}
		}
		if !copy.Required || copy.Points != q.Points {
			t.Fatal("shuffle changed rules")
		}
	}
}
