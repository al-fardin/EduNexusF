package notifications

import (
	"context"
	"errors"
	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/edunexus/edunexus/internal/platform/mail"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"html"
	"log"
	"net/url"
	"os"
	"strings"
	"time"
)

type Handler struct {
	db              *pgxpool.Pool
	mailer          mail.Mailer
	emailConfigured bool
}

func Register(app *fiber.App, db *pgxpool.Pool, mailer mail.Mailer, emailConfigured bool) {
	h := &Handler{db, mailer, emailConfigured}
	registerPush(app, db)
	g := app.Group("/notifications", authMiddleware.JWTProtected())
	g.Get("/", h.List)
	g.Get("/preferences", h.Preferences)
	g.Put("/preferences", h.SavePreferences)
	g.Post("/read-all", h.ReadAll)
	g.Post("/:notificationID/read", h.ReadOne)
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error { go h.run(ctx); return nil })
	app.Hooks().OnShutdown(func() error { cancel(); return nil })
}
func userID(c *fiber.Ctx) (string, error) {
	user, ok := c.Locals("user_id").(string)
	if !ok {
		return "", fiber.NewError(401, "authentication required")
	}
	if _, err := uuid.Parse(user); err != nil {
		return "", fiber.NewError(401, "invalid identity")
	}
	return user, nil
}
func result(c *fiber.Ctx, data any) error {
	c.Set("Cache-Control", "no-store")
	return c.JSON(fiber.Map{"success": true, "data": data})
}

const visible = ` EXISTS(SELECT 1 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=n.classroom_id AND m.user_id=n.user_id AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL) AND COALESCE((SELECT app_enabled FROM notification_preferences WHERE user_id=n.user_id),true)`

func (h *Handler) List(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,kind,title,body,url,created_at,read_at,email_status FROM user_notifications n WHERE user_id=$1::uuid AND `+visible+` ORDER BY created_at DESC,id DESC LIMIT 50`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, kind, title, body, url, email string
		var created time.Time
		var read *time.Time
		if err = rows.Scan(&id, &kind, &title, &body, &url, &created, &read, &email); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "kind": kind, "title": title, "body": body, "url": url, "created_at": created, "read_at": read, "email_status": email})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	rows.Close()
	var unread int
	if err = h.db.QueryRow(c.UserContext(), `SELECT count(*) FROM user_notifications n WHERE user_id=$1::uuid AND read_at IS NULL AND `+visible, user).Scan(&unread); err != nil {
		return err
	}
	return result(c, fiber.Map{"items": out, "unread_count": unread})
}
func (h *Handler) Preferences(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	app, email := true, true
	err = h.db.QueryRow(c.UserContext(), `SELECT app_enabled,email_enabled FROM notification_preferences WHERE user_id=$1::uuid`, user).Scan(&app, &email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	return result(c, fiber.Map{"app_enabled": app, "email_enabled": email, "email_configured": h.emailConfigured})
}
func (h *Handler) SavePreferences(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var req struct {
		App   *bool `json:"app_enabled"`
		Email *bool `json:"email_enabled"`
	}
	if err = c.BodyParser(&req); err != nil || req.App == nil || req.Email == nil {
		return fiber.NewError(400, "provide app and email preferences")
	}
	_, err = h.db.Exec(c.UserContext(), `INSERT INTO notification_preferences(user_id,app_enabled,email_enabled) VALUES($1::uuid,$2,$3) ON CONFLICT(user_id) DO UPDATE SET app_enabled=$2,email_enabled=$3`, user, *req.App, *req.Email)
	if err != nil {
		return err
	}
	if !*req.Email {
		_, err = h.db.Exec(c.UserContext(), `UPDATE user_notifications SET email_status='skipped' WHERE user_id=$1::uuid AND email_status='pending'`, user)
		if err != nil {
			return err
		}
	}
	return h.Preferences(c)
}
func (h *Handler) ReadAll(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	_, err = h.db.Exec(c.UserContext(), `UPDATE user_notifications SET read_at=now() WHERE user_id=$1::uuid AND read_at IS NULL`, user)
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"read": true})
}
func (h *Handler) ReadOne(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	if _, err = uuid.Parse(c.Params("notificationID")); err != nil {
		return fiber.NewError(400, "invalid notification")
	}
	_, err = h.db.Exec(c.UserContext(), `UPDATE user_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1::uuid AND user_id=$2::uuid`, c.Params("notificationID"), user)
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"read": true})
}
func emailBody(title, body, path string) string {
	content := "<h2>" + html.EscapeString(title) + "</h2><p>" + html.EscapeString(body) + "</p>"
	base, err := url.Parse(os.Getenv("FRONTEND_URL"))
	if err == nil && (base.Scheme == "https" || base.Scheme == "http" && base.Hostname() == "localhost") && base.Host != "" && strings.HasPrefix(path, "/") && !strings.HasPrefix(path, "//") {
		content += "<p><a href=\"" + html.EscapeString(base.ResolveReference(&url.URL{Path: strings.Split(path, "?")[0], RawQuery: strings.Join(strings.Split(path, "?")[1:], "?")}).String()) + "\">Open EduNexus</a></p>"
	}
	return content + "<p>Manage email preferences in EduNexus Notifications.</p>"
}
func (h *Handler) run(ctx context.Context) {
	timer := time.NewTicker(30 * time.Second)
	defer timer.Stop()
	for {
		h.tick(ctx)
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		}
	}
}
func (h *Handler) tick(ctx context.Context) {
	poll, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	_, err := h.db.Exec(poll, `SELECT edunexus_notify(a.classroom_id,NULL,'assignment-reminder:'||a.id||':'||a.due_at||':'||w.hours,'reminder','Assignment due soon: '||a.title,'Your assignment deadline is approaching.','classwork','student',m.user_id)
 FROM classroom_assignments a JOIN classroom_memberships m ON m.classroom_id=a.classroom_id AND m.member_role='student' AND m.status='active'
 CROSS JOIN (VALUES(24),(1))w(hours) WHERE a.status='published' AND a.due_at>now() AND a.due_at<=now()+w.hours*interval '1 hour' AND (w.hours=1 OR a.due_at>now()+interval '1 hour')
 AND NOT EXISTS(SELECT 1 FROM user_notifications n WHERE n.user_id=m.user_id AND n.event_key='assignment-reminder:'||a.id||':'||a.due_at||':'||w.hours)
 AND NOT EXISTS(SELECT 1 FROM classroom_assignment_submissions s WHERE s.assignment_id=a.id AND s.student_id=m.user_id) LIMIT 500;
 SELECT edunexus_notify(e.classroom_id,NULL,'exam-reminder:'||e.id||':'||e.starts_at||':'||w.hours,'reminder','Upcoming exam: '||e.title,'Review your exam schedule and entry setup.','exam','student',m.user_id)
 FROM classroom_exams e JOIN classroom_memberships m ON m.classroom_id=e.classroom_id AND m.member_role='student' AND m.status='active' CROSS JOIN (VALUES(24),(1))w(hours) WHERE e.status='published' AND e.closed_at IS NULL AND e.starts_at>now() AND e.starts_at<=now()+w.hours*interval '1 hour' AND (w.hours=1 OR e.starts_at>now()+interval '1 hour')
 AND NOT EXISTS(SELECT 1 FROM user_notifications n WHERE n.user_id=m.user_id AND n.event_key='exam-reminder:'||e.id||':'||e.starts_at||':'||w.hours) LIMIT 500;`)
	if err != nil {
		if ctx.Err() == nil {
			log.Print("Notification worker: reminders unavailable; check migrations")
		}
		return
	}
	_, _ = h.db.Exec(poll, `UPDATE user_notifications SET email_status=CASE WHEN email_attempts>=5 THEN 'failed' ELSE 'skipped' END WHERE (email_status='sending' AND email_attempts>=5 AND email_next_at<now()) OR (email_status='pending' AND created_at<now()-interval '7 days')`)
	if !h.emailConfigured {
		return
	}
	for i := 0; i < 20 && poll.Err() == nil; i++ {
		if deadline, ok := poll.Deadline(); ok && time.Until(deadline) < 16*time.Second {
			break
		}
		if err = h.deliver(poll); errors.Is(err, pgx.ErrNoRows) {
			break
		} else if err != nil {
			log.Print("Notification worker: delivery deferred")
			break
		}
	}
}
func (h *Handler) deliver(ctx context.Context) error {
	var id, to, title, body, path string
	var attempts int
	err := h.db.QueryRow(ctx, `UPDATE user_notifications n SET email_status='sending',email_attempts=n.email_attempts+1,email_next_at=now()+interval '2 minutes'
 FROM(SELECT n.id FROM user_notifications n JOIN users u ON u.id=n.user_id
 WHERE n.email_status IN ('pending','sending') AND n.email_next_at<=now() AND n.email_attempts<5 AND u.email_verified AND u.status='active' AND u.deleted_at IS NULL
 AND COALESCE((SELECT email_enabled FROM notification_preferences WHERE user_id=n.user_id),true)
 AND EXISTS(SELECT 1 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=n.classroom_id AND m.user_id=n.user_id AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL)
 ORDER BY n.created_at FOR UPDATE OF n SKIP LOCKED LIMIT 1) candidate,users u WHERE n.id=candidate.id AND u.id=n.user_id
 RETURNING n.id::text,u.email,n.title,n.body,n.url,n.email_attempts`).Scan(&id, &to, &title, &body, &path, &attempts)
	if err != nil {
		return err
	}
	sendErr := h.mailer.Send(to, "EduNexus · "+strings.ReplaceAll(strings.ReplaceAll(title, "\r", " "), "\n", " "), emailBody(title, body, path))
	state := "sent"
	if sendErr != nil {
		state = "pending"
		if attempts >= 5 {
			state = "failed"
		}
	}
	_, err = h.db.Exec(ctx, `UPDATE user_notifications SET email_status=$2,email_sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END,email_next_at=now()+($3::int*interval '1 minute') WHERE id=$1::uuid`, id, state, attempts*attempts)
	return err
}
