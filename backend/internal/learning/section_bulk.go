package learning

import (
	"github.com/gofiber/fiber/v2"
	"sort"
)

// Every selected version is checked in a single transaction. A stale student
// rolls back the whole transfer rather than leaving half a selection moved.
func (h *Handler) BulkSection(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	var req struct {
		Section  string `json:"section_id"`
		Reason   string `json:"reason"`
		Students []struct {
			ID      string `json:"id"`
			Version int    `json:"version"`
		} `json:"students"`
	}
	if c.BodyParser(&req) != nil || len(req.Students) < 1 || len(req.Students) > 200 {
		return fail(400, "Select 1–200 students")
	}
	seen := map[string]bool{}
	for _, s := range req.Students {
		if validID(s.ID) != nil || s.Version < 1 || seen[s.ID] {
			return fail(400, "Invalid or duplicate student selection")
		}
		seen[s.ID] = true
	}
	sort.Slice(req.Students, func(i, j int) bool { return req.Students[i].ID < req.Students[j].ID })
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = lockRoster(c.UserContext(), tx, c.Params("id"), actor); err != nil {
		return err
	}
	for _, s := range req.Students {
		if err = updateRoster(c.UserContext(), tx, c.Params("id"), actor, s.ID, nil, req.Section, s.Version, req.Reason); err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": len(req.Students)})
}
