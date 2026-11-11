package messaging

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rivo/uniseg"
	"strings"
	"unicode"
)

func validateRichMessage(r *sendRequest) error {
	if r.Kind == "" {
		r.Kind = "text"
	}
	if r.EmojiSize == 0 {
		r.EmojiSize = 1
	}
	if r.EmojiSize < 1 || r.EmojiSize > 3 || r.Duration < 0 || r.Duration > 120000 {
		return fiber.NewError(400, "invalid message details")
	}
	switch r.Kind {
	case "text":
		if r.EmojiSize != 1 || r.Duration != 0 {
			return fiber.NewError(400, "invalid text details")
		}
	case "emoji":
		symbol := false
		for _, ch := range r.Body {
			if unicode.IsLetter(ch) || unicode.IsDigit(ch) {
				return fiber.NewError(400, "choose a single emoji")
			}
			if unicode.IsSymbol(ch) {
				symbol = true
			}
		}
		if !symbol || uniseg.GraphemeClusterCount(r.Body) != 1 || len(r.Body) > 80 || len(r.file) > 0 || r.Duration != 0 {
			return fiber.NewError(400, "choose a single emoji")
		}
	case "voice":
		if len(r.file) == 0 || r.Duration <= 0 || r.EmojiSize != 1 || r.Body != "" {
			return fiber.NewError(400, "invalid voice message")
		}
		switch strings.Split(r.media, ";")[0] {
		case "audio/mpeg", "audio/ogg", "application/ogg", "audio/wave", "audio/x-wav", "audio/wav", "audio/mp4", "video/mp4", "video/webm", "audio/webm":
		default:
			return fiber.NewError(400, "unsupported voice recording")
		}
	default:
		return fiber.NewError(400, "invalid message type")
	}
	return nil
}
