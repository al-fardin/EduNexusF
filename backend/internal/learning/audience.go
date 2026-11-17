package learning

import (
	"encoding/json"
	"strconv"

	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) AudiencePreview(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	var req audience.Rule
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid audience settings")
	}
	raw, err := audience.Encode(&req)
	if err != nil {
		return fail(400, err.Error())
	}
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	selection := c.Query("selection", "selected")
	if e != nil || offset < 0 || offset > 10000 || (selection != "selected" && selection != "excluded") {
		return fail(400, "Invalid audience preview page")
	}
	var total, eligible, missing int
	var sample, students json.RawMessage
	err = h.db.QueryRow(c.UserContext(), `WITH roster AS (
 SELECT m.user_id id,m.student_roll roll,trim(u.first_name||' '||u.last_name) name,edunexus_audience_matches($2::jsonb,m.student_roll,m.section_id) selected
 FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL)
 SELECT count(*)::int,count(*) FILTER(WHERE selected)::int,count(*) FILTER(WHERE trim(COALESCE(roll,''))='')::int,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('roll',roll,'name',name)) FROM (SELECT roll,name FROM roster WHERE selected ORDER BY roll,name LIMIT 50)s),'[]'::jsonb),
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'roll',roll,'name',name)) FROM (SELECT id,roll,name FROM roster WHERE selected=$3 ORDER BY roll NULLS LAST,name,id LIMIT 50 OFFSET $4)s),'[]'::jsonb) FROM roster`, c.Params("id"), raw, selection == "selected", offset).Scan(&total, &eligible, &missing, &sample, &students)
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	count := eligible
	if selection == "excluded" {
		count = total - eligible
	}
	next := -1
	if offset+50 < count {
		next = offset + 50
	}
	return respond(c, 200, fiber.Map{"total": total, "eligible": eligible, "missing_rolls": missing, "sample": sample, "students": students, "selection": selection, "next_offset": next})
}
