package learning

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTutorProviderRequestAndCitations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Error("missing authorization")
		}
		var payload map[string]any
		json.NewDecoder(r.Body).Decode(&payload)
		if payload["store"] != false {
			t.Error("provider storage enabled")
		}
		output := `{"answer":"Use the definition from the notes.","source_ids":["known","invented"]}`
		json.NewEncoder(w).Encode(map[string]any{"status": "completed", "output": []any{map[string]any{"type": "message", "content": []any{map[string]any{"type": "output_text", "text": output}}}}})
	}))
	defer server.Close()
	answer, citations, err := generateTutorAnswer(context.Background(), server.Client(), server.URL, "test-key", "test-model", "class", "Explain", []TutorSource{{ID: "known", Title: "Notes", Kind: "text", Content: "A useful classroom definition."}})
	if err != nil {
		t.Fatal(err)
	}
	if answer == "" || len(citations) != 1 || citations[0].ID != "known" {
		t.Fatal("invalid citation filtering")
	}
}
func TestTutorProviderFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(429) }))
	defer server.Close()
	if _, _, err := generateTutorAnswer(context.Background(), server.Client(), server.URL, "k", "m", "c", "q", []TutorSource{{ID: "s", Kind: "text", Content: "notes"}}); err == nil {
		t.Fatal("provider error ignored")
	}
}
func TestTutorExcerptUnicode(t *testing.T) {
	content := strings.Repeat("ক খ গ ", 1000) + " photosynthesis is explained here"
	excerpt := sourceExcerpt(content, "photosynthesis")
	if !strings.Contains(excerpt, "photosynthesis") {
		t.Fatal("matching passage not selected")
	}
	if len([]rune(excerpt)) > 2500 {
		t.Fatal("excerpt exceeds bound")
	}
}
