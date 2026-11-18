package exam

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"strconv"
	"strings"
)

// Images travel with the versioned question, so copying an exam does not create
// public file URLs or share access to another classroom's private attachments.
type QuestionImage struct {
	Data   string `json:"data"`
	Alt    string `json:"alt"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

func validateQuestionImage(p *QuestionImage) error {
	if p == nil {
		return nil
	}
	p.Alt = strings.TrimSpace(p.Alt)
	if len(p.Alt) < 1 || len(p.Alt) > 500 {
		return errors.New("image description requires 1–500 bytes")
	}
	if len(p.Data) > 180000 {
		return errors.New("question images must be at most 128 KB each")
	}
	parts := strings.SplitN(p.Data, ",", 2)
	if len(parts) != 2 || (parts[0] != "data:image/png;base64" && parts[0] != "data:image/jpeg;base64") {
		return errors.New("question images must be embedded PNG or JPEG")
	}
	raw, e := base64.StdEncoding.Strict().DecodeString(parts[1])
	if e != nil || len(raw) > 128*1024 {
		return errors.New("invalid or oversized question image")
	}
	cfg, format, e := image.DecodeConfig(bytes.NewReader(raw))
	if e != nil || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 4096 || cfg.Height > 4096 || cfg.Width*cfg.Height > 4_000_000 {
		return errors.New("image dimensions exceed the supported size")
	}
	if (format == "png") != (parts[0] == "data:image/png;base64") {
		return errors.New("image type does not match its content")
	}
	if _, _, e = image.Decode(bytes.NewReader(raw)); e != nil {
		return errors.New("image content is incomplete or invalid")
	}
	p.Width = cfg.Width
	p.Height = cfg.Height
	return nil
}
func validateQuestionMedia(q *Question) error {
	if e := validateQuestionImage(q.Image); e != nil {
		return e
	}
	if q.Kind != "mcq" {
		q.OptionImages = nil
		return nil
	}
	for key, p := range q.OptionImages {
		index, e := strconv.Atoi(key)
		if e != nil || strconv.Itoa(index) != key || index < 0 || index >= len(q.Options) || p == nil {
			return errors.New("image must belong to an existing option")
		}
		if e = validateQuestionImage(p); e != nil {
			return e
		}
	}
	return nil
}

func questionImagePixels(q Question) int {
	pixels := 0
	if q.Image != nil {
		pixels += q.Image.Width * q.Image.Height
	}
	for _, p := range q.OptionImages {
		if p != nil {
			pixels += p.Width * p.Height
		}
	}
	return pixels
}
