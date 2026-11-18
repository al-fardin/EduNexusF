package exam

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"
)

func TestQuestionImagesAreBoundedAndPrivate(t *testing.T) {
	var b bytes.Buffer
	pic := image.NewRGBA(image.Rect(0, 0, 20, 12))
	pic.Set(2, 2, color.RGBA{R: 255, A: 255})
	if e := png.Encode(&b, pic); e != nil {
		t.Fatal(e)
	}
	data := "data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes())
	q := Question{ID: "q", Kind: "mcq", Prompt: "Choose the diagram", Points: 2, Options: []string{"A", "B"}, CorrectOption: new(int), Image: &QuestionImage{Data: data, Alt: "Diagram"}, OptionImages: map[string]*QuestionImage{"1": {Data: data, Alt: "Choice B"}}}
	if _, e := normalizeQuestions([]Question{q}); e != nil {
		t.Fatal(e)
	}
	if q.Image.Width != 20 || q.Image.Height != 12 {
		t.Fatal("untrusted image dimensions were not replaced")
	}
	raw, _ := json.Marshal(publicQuestions([]Question{q}))
	if !bytes.Contains(raw, []byte("Choice B")) || bytes.Contains(raw, []byte("correct_option")) {
		t.Fatal("public question media or key privacy changed")
	}
	for _, bad := range []QuestionImage{{Data: "https://example.invalid/image.png", Alt: "Remote"}, {Data: "data:image/svg+xml;base64,PHN2Zz4=", Alt: "SVG"}, {Data: strings.Replace(data, "image/png", "image/jpeg", 1), Alt: "Wrong type"}, {Data: data, Alt: ""}, {Data: "data:image/png;base64," + strings.Repeat("A", 180000), Alt: "Huge"}, {Data: "data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes()[:32]), Alt: "Truncated"}} {
		if e := validateQuestionImage(&bad); e == nil {
			t.Fatal("invalid image accepted", bad.Alt)
		}
	}
	q.OptionImages = map[string]*QuestionImage{"2": {Data: data, Alt: "Missing choice"}}
	if _, e := normalizeQuestions([]Question{q}); e == nil {
		t.Fatal("orphan option image accepted")
	}
}
