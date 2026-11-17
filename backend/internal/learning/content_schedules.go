package learning

import (
	"errors"
	"strconv"
	"time"

	"github.com/edunexus/edunexus/internal/platform/contentrelease"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) ContentSchedules(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if c.Method() == "GET" {
		offset, e := strconv.Atoi(c.Query("offset", "0"))
		if e != nil || offset < 0 || offset > 10000 {
			return fail(400, "Invalid page")
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT s.resource_id::text,s.kind,COALESCE(a.title,m.title,e.title),s.publish_at,s.state,s.version,s.error FROM classroom_content_schedules s LEFT JOIN classroom_assignments a ON a.id=s.assignment_id LEFT JOIN classroom_materials m ON m.id=s.material_id LEFT JOIN classroom_exams e ON e.id=s.exam_id WHERE s.classroom_id=$1::uuid AND NOT EXISTS(SELECT 1 FROM classroom_material_trash t WHERE t.material_id=s.material_id) ORDER BY CASE WHEN s.state IN ('scheduled','blocked') THEN 0 ELSE 1 END,s.publish_at DESC,s.resource_id LIMIT 51 OFFSET $2`, c.Params("id"), offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, kind, title, state, message string
			var at time.Time
			var version int
			if e = rows.Scan(&id, &kind, &title, &at, &state, &version, &message); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "kind": kind, "title": title, "publish_at": at, "state": state, "version": version, "error": message})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		c.Set("Cache-Control", "no-store")
		return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
	}
	var req struct {
		ID        string     `json:"id"`
		Kind      string     `json:"kind"`
		Action    string     `json:"action"`
		Version   int        `json:"version"`
		PublishAt *time.Time `json:"publish_at"`
	}
	if c.BodyParser(&req) != nil || validID(req.ID) != nil || req.Version < 0 || (req.Kind != "material" && req.Kind != "assignment" && req.Kind != "exam") || (req.Action != "cancel" && req.Action != "publish" && req.Action != "reschedule" && req.Action != "schedule") {
		return fail(400, "Invalid scheduled content action")
	}
	if (req.Action == "reschedule" || req.Action == "schedule") && (req.PublishAt == nil || !req.PublishAt.After(time.Now()) || req.PublishAt.After(time.Now().AddDate(1, 0, 0))) {
		return fail(400, "Choose a future publish time within one year")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = contentrelease.LockResource(c.UserContext(), tx, req.Kind, req.ID, c.Params("id"), false); errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Content not found")
	}
	if err != nil {
		return err
	}
	if req.Kind == "exam" && (req.Action == "schedule" || req.Action == "reschedule" || req.Action == "publish") {
		var valid bool
		err = tx.QueryRow(c.UserContext(), `SELECT status='draft' AND closed_at IS NULL AND starts_at>COALESCE($3,now()) FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid`, req.ID, c.Params("id"), req.PublishAt).Scan(&valid)
		if err != nil {
			return err
		}
		if !valid {
			return fail(409, "Choose a draft exam and publish before its start time")
		}
	}
	if req.Action == "schedule" {
		if req.Kind != "exam" || req.Version != 0 {
			return fail(400, "Invalid new exam schedule")
		}
		var exists bool
		if err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_content_schedules WHERE resource_id=$1::uuid)`, req.ID).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return fail(409, "Schedule already exists. Reload to update it")
		}
		if err = contentrelease.Save(c.UserContext(), tx, c.Params("id"), actor, req.Kind, req.ID, req.PublishAt); err != nil {
			return err
		}
		if err = tx.Commit(c.UserContext()); err != nil {
			return err
		}
		return respond(c, 200, fiber.Map{"saved": true})
	}
	if req.Version < 1 {
		return fail(400, "Invalid schedule version")
	}
	var state string
	err = tx.QueryRow(c.UserContext(), `SELECT state FROM classroom_content_schedules WHERE resource_id=$1::uuid AND classroom_id=$2::uuid AND kind=$3 AND version=$4 FOR UPDATE`, req.ID, c.Params("id"), req.Kind, req.Version).Scan(&state)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && state == "published" {
		return fail(409, "Schedule changed or content already published")
	}
	if err != nil {
		return err
	}
	switch req.Action {
	case "publish":
		err = contentrelease.Publish(c.UserContext(), tx, req.Kind, req.ID, c.Params("id"), actor)
	case "cancel":
		err = contentrelease.Save(c.UserContext(), tx, c.Params("id"), actor, req.Kind, req.ID, nil)
	case "reschedule":
		if req.Kind == "assignment" {
			var valid bool
			if err = tx.QueryRow(c.UserContext(), `SELECT status='draft' AND due_at>$2 FROM classroom_assignments WHERE id=$1::uuid`, req.ID, req.PublishAt).Scan(&valid); err != nil {
				return err
			}
			if !valid {
				return fail(409, "Publish time must precede the draft assignment deadline")
			}
		}
		err = contentrelease.Save(c.UserContext(), tx, c.Params("id"), actor, req.Kind, req.ID, req.PublishAt)
	}
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
