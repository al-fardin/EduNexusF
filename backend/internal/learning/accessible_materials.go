package learning

import (
	"errors"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

type MaterialAccessibility struct {
	Alt        string `json:"image_alt"`
	Caption    string `json:"caption"`
	Text       string `json:"plain_text"`
	Transcript string `json:"transcript"`
	VTT        string `json:"captions_vtt"`
	Version    int    `json:"version"`
}

var vttTiming = regexp.MustCompile(`^((?:[0-9]{2,}:)?[0-5][0-9]:[0-5][0-9]\.[0-9]{3}) --> ((?:[0-9]{2,}:)?[0-5][0-9]:[0-5][0-9]\.[0-9]{3})(?:[ \t].*)?$`)

func captionMillis(value string) (int64, bool) {
	parts := strings.Split(value, ":")
	var hours int64
	var err error
	if len(parts) == 3 {
		hours, err = strconv.ParseInt(parts[0], 10, 32)
		if err != nil {
			return 0, false
		}
		parts = parts[1:]
	}
	if len(parts) != 2 {
		return 0, false
	}
	minutes, e := strconv.ParseInt(parts[0], 10, 32)
	seconds := strings.Split(parts[1], ".")
	if e != nil || len(seconds) != 2 {
		return 0, false
	}
	s, e := strconv.ParseInt(seconds[0], 10, 32)
	if e != nil {
		return 0, false
	}
	ms, e := strconv.ParseInt(seconds[1], 10, 32)
	return hours*3600000 + minutes*60000 + s*1000 + ms, e == nil
}
func validCaptions(value string) bool {
	if value == "" {
		return true
	}
	lines := strings.Split(value, "\n")
	if len(lines) < 2 || (lines[0] != "WEBVTT" && !strings.HasPrefix(lines[0], "WEBVTT ")) {
		return false
	}
	cues := 0
	for _, line := range lines[1:] {
		if !strings.Contains(line, "-->") {
			continue
		}
		match := vttTiming.FindStringSubmatch(strings.TrimSpace(line))
		if match == nil {
			return false
		}
		start, ok := captionMillis(match[1])
		end, ok2 := captionMillis(match[2])
		if !ok || !ok2 || end <= start {
			return false
		}
		cues++
	}
	return cues > 0
}

func validAccessibility(req MaterialAccessibility) bool {
	for _, value := range []string{req.Alt, req.Caption, req.Text, req.Transcript, req.VTT} {
		if strings.ContainsRune(value, 0) {
			return false
		}
	}
	return len([]rune(req.Alt)) <= 1000 && len([]rune(req.Caption)) <= 4000 && len([]rune(req.Text)) <= 200000 && len([]rune(req.Transcript)) <= 200000 && len([]rune(req.VTT)) <= 100000 && validCaptions(req.VTT)
}
func (h *Handler) AccessibleMaterial(c *fiber.Ctx) error {
	actor, _, err := h.member(c, c.Method() == "PUT")
	if err != nil {
		return err
	}
	if validID(c.Params("materialID")) != nil {
		return fail(400, "Invalid material")
	}
	var exists bool
	if err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_materials m WHERE m.id=$1::uuid AND m.classroom_id=$2::uuid AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.classroom_id=m.classroom_id AND p.reference_type='material' AND p.reference_id=m.id AND p.deleted_at IS NULL))`, c.Params("materialID"), c.Params("id")).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fail(404, "Material not found")
	}
	if c.Method() == "PUT" {
		var req MaterialAccessibility
		if c.BodyParser(&req) != nil {
			return fail(400, "Invalid accessible material text")
		}
		req.VTT = strings.ReplaceAll(strings.TrimSpace(strings.TrimPrefix(req.VTT, "\ufeff")), "\r\n", "\n")
		if !validAccessibility(req) || req.Version < 0 {
			return fail(400, "Text exceeds its limit or WebVTT captions are invalid")
		}
		tag, err := h.db.Exec(c.UserContext(), `INSERT INTO classroom_material_accessibility(material_id,image_alt,caption,plain_text,transcript,captions_vtt,updated_by) SELECT $1::uuid,$2,$3,$4,$5,$6,$7::uuid WHERE $8=0 ON CONFLICT(material_id) DO NOTHING`, c.Params("materialID"), req.Alt, req.Caption, req.Text, req.Transcript, req.VTT, actor, req.Version)
		if err != nil {
			return err
		}
		if req.Version > 0 {
			tag, err = h.db.Exec(c.UserContext(), `UPDATE classroom_material_accessibility SET image_alt=$2,caption=$3,plain_text=$4,transcript=$5,captions_vtt=$6,updated_by=$7::uuid,version=version+1,updated_at=now() WHERE material_id=$1::uuid AND version=$8`, c.Params("materialID"), req.Alt, req.Caption, req.Text, req.Transcript, req.VTT, actor, req.Version)
		}
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "Material text changed. Reload before saving")
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	var req MaterialAccessibility
	err = h.db.QueryRow(c.UserContext(), `SELECT image_alt,caption,plain_text,transcript,captions_vtt,version FROM classroom_material_accessibility WHERE material_id=$1::uuid`, c.Params("materialID")).Scan(&req.Alt, &req.Caption, &req.Text, &req.Transcript, &req.VTT, &req.Version)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, req)
}
