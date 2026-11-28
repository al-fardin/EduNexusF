package exam

import (
	"encoding/json"
	"testing"
)

func TestPublicQuestionsOmitRetiredNativeTesterAndAnswerKeys(t *testing.T) {
	answer := 1
	raw, err := json.Marshal(publicQuestions([]Question{{ID: "q", Kind: "coding", Prompt: "Solve", Points: 5, CorrectOption: &answer, Tester: &TesterAttachment{ID: "legacy", Name: "old.exe"}}}))
	if err != nil {
		t.Fatal(err)
	}
	var questions []map[string]any
	if err = json.Unmarshal(raw, &questions); err != nil {
		t.Fatal(err)
	}
	if _, ok := questions[0]["tester"]; ok {
		t.Fatal("native tester exposed")
	}
	if _, ok := questions[0]["correct_option"]; ok {
		t.Fatal("answer key exposed")
	}
}
