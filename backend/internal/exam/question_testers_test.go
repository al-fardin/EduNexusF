package exam

import (
	"encoding/binary"
	"encoding/json"
	"testing"
)

func TestWindowsTesterValidation(t *testing.T) {
	pe := make([]byte, 132)
	copy(pe, "MZ")
	binary.LittleEndian.PutUint32(pe[60:64], 128)
	copy(pe[128:], "PE\x00\x00")
	if !validWindowsTester("tests.exe", pe) {
		t.Fatal("valid PE rejected")
	}
	for _, name := range []string{"tests.zip", "../tests.exe", "a\\tests.exe", "bad\n.exe"} {
		if validWindowsTester(name, pe) {
			t.Fatalf("unsafe filename accepted: %q", name)
		}
	}
	if validWindowsTester("test.exe", []byte("MZ")) {
		t.Fatal("truncated PE accepted")
	}
	binary.LittleEndian.PutUint32(pe[60:64], 0xffffffff)
	if validWindowsTester("test.exe", pe) {
		t.Fatal("invalid PE offset accepted")
	}
}

func TestPublicQuestionKeepsOptionalTesterWithoutAnswerKeys(t *testing.T) {
	attachment := &TesterAttachment{ID: "tester-id", Name: "test.exe"}
	q := Question{ID: "q1", Kind: "coding", Prompt: "Solve", Points: 10, SampleAnswer: "private", Tester: attachment}
	public := publicQuestions([]Question{q, {ID: "q2", Kind: "coding", Prompt: "Solve", Points: 10}})
	if public[0].Tester != attachment || public[1].Tester != nil {
		t.Fatal("optional tester projection is incorrect")
	}
	raw, _ := json.Marshal(public)
	var decoded []map[string]any
	json.Unmarshal(raw, &decoded)
	if _, ok := decoded[0]["sample_answer"]; ok {
		t.Fatal("answer key exposed")
	}
	if _, ok := decoded[1]["tester"]; ok {
		t.Fatal("absent tester should be omitted")
	}
	q.Kind = "theory"
	if _, err := normalizeQuestions([]Question{q}); err == nil {
		t.Fatal("non-coding tester accepted")
	}
	q.Kind = "coding"
	q.Tester = nil
	if _, err := normalizeQuestions([]Question{q}); err != nil {
		t.Fatal(err)
	}
}
