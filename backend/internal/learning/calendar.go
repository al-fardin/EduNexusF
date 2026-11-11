package learning

import (
	"context"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"log"
	"strings"
	"time"
)

const calendarResources = `SELECT id,classroom_id,'exam'::text kind,title,starts_at at,ends_at FROM classroom_exams WHERE status='published' AND closed_at IS NULL
 UNION ALL SELECT id,classroom_id,'assignment',title,due_at,due_at FROM classroom_assignments WHERE status='published'
 UNION ALL SELECT id,classroom_id,'event',title,starts_at,ends_at FROM classroom_calendar_events`

func (h *Handler) Calendar(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "authentication required")
	}
	from, err := time.Parse(time.RFC3339, c.Query("from"))
	if err != nil {
		return fail(400, "Invalid calendar start")
	}
	to, err := time.Parse(time.RFC3339, c.Query("to"))
	if err != nil || !to.After(from) || to.Sub(from) > 93*24*time.Hour {
		return fail(400, "Calendar range must be within 93 days")
	}
	rows, err := h.db.Query(c.UserContext(), `WITH resources AS (`+calendarResources+`) SELECT r.id::text,r.kind,r.title,r.at,r.ends_at,cl.id::text,cl.name,m.member_role,COALESCE(rem.lead_minutes,0),rem.sent_at IS NOT NULL,COALESCE(ev.description,''),COALESCE(ev.version,0)
 FROM resources r JOIN classrooms cl ON cl.id=r.classroom_id JOIN classroom_memberships m ON m.classroom_id=cl.id
 LEFT JOIN calendar_reminders rem ON rem.user_id=m.user_id AND rem.resource_id=r.id AND rem.kind=r.kind
 LEFT JOIN classroom_calendar_events ev ON ev.id=r.id AND r.kind='event'
 WHERE m.user_id=$1::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND r.at>=$2 AND r.at<$3 ORDER BY r.at,r.kind,r.id LIMIT 501`, user, from, to)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var id, kind, title, class, name, role, description string
		var at, end time.Time
		var lead, version int
		var sent bool
		if err = rows.Scan(&id, &kind, &title, &at, &end, &class, &name, &role, &lead, &sent, &description, &version); err != nil {
			return err
		}
		items = append(items, fiber.Map{"id": id, "kind": kind, "title": title, "at": at, "ends_at": end, "classroom_id": class, "classroom_name": name, "role": role, "lead_minutes": lead, "reminder_sent": sent, "description": description, "version": version})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	truncated := len(items) > 500
	if truncated {
		items = items[:500]
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"items": items, "truncated": truncated})
}
func (h *Handler) SaveCalendarEvent(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if c.Method() == "DELETE" {
		if validID(c.Params("eventID")) != nil {
			return fail(400, "Invalid event")
		}
		var removed int
		err := h.db.QueryRow(c.UserContext(), `WITH removed AS(DELETE FROM classroom_calendar_events WHERE id=$1::uuid AND classroom_id=$2::uuid RETURNING id), reminders AS(DELETE FROM calendar_reminders WHERE kind='event' AND resource_id IN(SELECT id FROM removed)) SELECT count(*)::int FROM removed`, c.Params("eventID"), c.Params("id")).Scan(&removed)
		if err != nil {
			return err
		}
		if removed == 0 {
			return fail(404, "Event not found")
		}
		return respond(c, 200, fiber.Map{"deleted": true})
	}
	var req struct {
		Title       string    `json:"title"`
		Description string    `json:"description"`
		Start       time.Time `json:"starts_at"`
		End         time.Time `json:"ends_at"`
	}
	if c.BodyParser(&req) != nil || len([]rune(strings.TrimSpace(req.Title))) < 3 || len([]rune(req.Title)) > 200 || len([]rune(req.Description)) > 4000 || req.Start.IsZero() || req.End.Before(req.Start) || req.End.Sub(req.Start) > 7*24*time.Hour {
		return fail(400, "Provide a title and event time within seven days")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE`, c.Params("id")); err != nil {
		return err
	}
	var n int
	if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_calendar_events WHERE classroom_id=$1::uuid`, c.Params("id")).Scan(&n); err != nil {
		return err
	}
	if n >= 1000 {
		return fail(422, "Remove old events before adding more")
	}
	var id string
	if err = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_calendar_events(classroom_id,created_by,title,description,starts_at,ends_at) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6) RETURNING id::text`, c.Params("id"), actor, strings.TrimSpace(req.Title), req.Description, req.Start, req.End).Scan(&id); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 201, fiber.Map{"id": id})
}
func (h *Handler) CalendarReminder(c *fiber.Ctx) error {
	user, _, err := h.member(c, false)
	if err != nil {
		return err
	}
	if validID(c.Params("resourceID")) != nil {
		return fail(400, "Invalid calendar item")
	}
	kind := c.Params("kind")
	if kind != "event" && kind != "exam" && kind != "assignment" {
		return fail(400, "Invalid calendar item type")
	}
	if c.Method() == "DELETE" {
		_, err = h.db.Exec(c.UserContext(), `DELETE FROM calendar_reminders WHERE user_id=$1::uuid AND classroom_id=$2::uuid AND kind=$3 AND resource_id=$4::uuid`, user, c.Params("id"), kind, c.Params("resourceID"))
		if err != nil {
			return err
		}
		return respond(c, 200, fiber.Map{"removed": true})
	}
	var req struct {
		Lead int `json:"lead_minutes"`
	}
	if c.BodyParser(&req) != nil || (req.Lead != 15 && req.Lead != 60 && req.Lead != 1440) {
		return fail(400, "Choose 15 minutes, one hour or one day")
	}
	tag, err := h.db.Exec(c.UserContext(), `WITH resources AS (`+calendarResources+`) INSERT INTO calendar_reminders(user_id,classroom_id,kind,resource_id,lead_minutes) SELECT $1::uuid,classroom_id,kind,id,$5 FROM resources WHERE id=$4::uuid AND classroom_id=$2::uuid AND kind=$3 AND at>now() ON CONFLICT(user_id,kind,resource_id) DO UPDATE SET lead_minutes=excluded.lead_minutes WHERE calendar_reminders.sent_at IS NULL`, user, c.Params("id"), kind, c.Params("resourceID"), req.Lead)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "Item ended, was removed, or its reminder already sent")
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
func (h *Handler) deliverCalendarReminder(ctx context.Context) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var user, class, kind, id, title string
	err = tx.QueryRow(ctx, `WITH resources AS (`+calendarResources+`) SELECT r.user_id::text,r.classroom_id::text,r.kind,r.resource_id::text,e.title FROM calendar_reminders r JOIN resources e ON e.id=r.resource_id AND e.classroom_id=r.classroom_id AND e.kind=r.kind JOIN classroom_memberships m ON m.user_id=r.user_id AND m.classroom_id=r.classroom_id JOIN classrooms cl ON cl.id=m.classroom_id JOIN users u ON u.id=m.user_id WHERE r.sent_at IS NULL AND e.at>now() AND e.at<=now()+r.lead_minutes*interval '1 minute' AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL AND u.status='active' AND u.deleted_at IS NULL ORDER BY e.at FOR UPDATE OF r SKIP LOCKED LIMIT 1`).Scan(&user, &class, &kind, &id, &title)
	if err != nil {
		return err
	}
	tab := "calendar"
	if kind == "exam" {
		tab = "exam"
	} else if kind == "assignment" {
		tab = "classwork&assignment=" + id
	}
	if _, err = tx.Exec(ctx, `SELECT edunexus_notify($1::uuid,NULL,$2,'reminder',$3,'An upcoming calendar item is due soon.',$4,'all',$5::uuid)`, class, "calendar:"+kind+":"+id, "Reminder: "+title, tab, user); err != nil {
		return err
	}
	if kind == "event" {
		if _, err = tx.Exec(ctx, `UPDATE user_notifications SET url='/calendar' WHERE user_id=$1::uuid AND event_key=$2`, user, "calendar:event:"+id); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, `UPDATE calendar_reminders SET sent_at=now() WHERE user_id=$1::uuid AND kind=$2 AND resource_id=$3::uuid`, user, kind, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func registerCalendarReminders(app *fiber.App, h *Handler) {
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnShutdown(func() error { cancel(); return nil })
	app.Hooks().OnListen(func(fiber.ListenData) error {
		go func() {
			timer := time.NewTicker(30 * time.Second)
			defer timer.Stop()
			for {
				work, stop := context.WithTimeout(ctx, 8*time.Second)
				for i := 0; i < 100; i++ {
					if err := h.deliverCalendarReminder(work); err != nil {
						if !errors.Is(err, pgx.ErrNoRows) {
							log.Print("Calendar reminders deferred")
						}
						break
					}
				}
				stop()
				select {
				case <-ctx.Done():
					return
				case <-timer.C:
				}
			}
		}()
		return nil
	})
}
