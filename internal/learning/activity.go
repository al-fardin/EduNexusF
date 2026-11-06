package learning

import (
	"encoding/json"
	"github.com/edunexus/edunexus/internal/activity"
	"github.com/gofiber/fiber/v2"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) Activity(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	cursor, err := strconv.ParseInt(c.Query("before", "9223372036854775807"), 10, 64)
	if err != nil || cursor < 1 {
		return fail(400, "invalid activity cursor")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id,actor_name,action,target_id,title,before_value,after_value,reason,created_at FROM classroom_activity WHERE classroom_id=$1::uuid AND id<$2 ORDER BY id DESC LIMIT 51`, c.Params("id"), cursor)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	next := ""
	for rows.Next() {
		var id int64
		var actor, action, target, title, reason string
		var before, after json.RawMessage
		var at time.Time
		if err = rows.Scan(&id, &actor, &action, &target, &title, &before, &after, &reason, &at); err != nil {
			return err
		}
		if len(out) == 50 {
			next = out[49]["id"].(string)
			break
		}
		out = append(out, fiber.Map{"id": strconv.FormatInt(id, 10), "actor": actor, "action": action, "target_id": target, "title": title, "before": before, "after": after, "reason": reason, "created_at": at})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"items": out, "next": next})
}

func (h *Handler) AssignmentDeadline(c *fiber.Ctx) error {
	user, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if err = validID(c.Params("assignmentID")); err != nil {
		return err
	}
	var req struct {
		DueAt    time.Time `json:"due_at"`
		Expected time.Time `json:"expected_due_at"`
		Reason   string    `json:"reason"`
	}
	if c.BodyParser(&req) != nil || req.DueAt.IsZero() || req.Expected.IsZero() || len(strings.TrimSpace(req.Reason)) < 3 || len(req.Reason) > 1000 {
		return fail(400, "provide a deadline, current deadline and reason (3-1000 bytes)")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = activity.SetActor(c.UserContext(), tx, user, req.Reason); err != nil {
		return err
	}
	tag, err := tx.Exec(c.UserContext(), `UPDATE classroom_assignments SET due_at=$3 WHERE id=$1::uuid AND classroom_id=$2::uuid AND due_at=$4`, c.Params("assignmentID"), c.Params("id"), req.DueAt, req.Expected)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "deadline changed; refresh before updating")
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"updated": true})
}
