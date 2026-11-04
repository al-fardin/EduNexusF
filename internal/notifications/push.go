package notifications

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/url"
	"strings"
	"time"
)

type pushHandler struct {
	db     *pgxpool.Pool
	sender *pushSender
}

func registerPush(app *fiber.App, db *pgxpool.Pool) {
	h := &pushHandler{db, newPushSender()}
	g := app.Group("/notifications/push", auth.JWTProtected())
	g.Get("/", h.status)
	g.Put("/devices/:deviceID", h.register)
	g.Delete("/devices/:deviceID", h.remove)
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error { go h.runPush(ctx); return nil })
	app.Hooks().OnShutdown(func() error { cancel(); return nil })
}
func (h *pushHandler) status(c *fiber.Ctx) error {
	user, e := userID(c)
	if e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT id::text,platform,enabled,last_seen_at FROM notification_devices WHERE user_id=$1::uuid ORDER BY last_seen_at DESC`, user)
	if e != nil {
		return e
	}
	defer rows.Close()
	devices := make([]fiber.Map, 0)
	for rows.Next() {
		var id, platform string
		var enabled bool
		var last time.Time
		if e = rows.Scan(&id, &platform, &enabled, &last); e != nil {
			return e
		}
		devices = append(devices, fiber.Map{"id": id, "platform": platform, "enabled": enabled, "last_seen_at": last})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return result(c, fiber.Map{"web_configured": h.sender.webConfigured(), "android_configured": h.sender.androidConfigured(), "public_key": h.sender.webPublic, "devices": devices})
}
func (h *pushHandler) register(c *fiber.Ctx) error {
	user, e := userID(c)
	if e != nil {
		return e
	}
	id := c.Params("deviceID")
	if _, e = uuid.Parse(id); e != nil {
		return fiber.NewError(400, "invalid device")
	}
	var req struct {
		Binding      string          `json:"binding_id"`
		Platform     string          `json:"platform"`
		Token        string          `json:"token"`
		Subscription json.RawMessage `json:"subscription"`
	}
	if c.BodyParser(&req) != nil {
		return fiber.NewError(400, "invalid notification device")
	}
	if _, e = uuid.Parse(req.Binding); e != nil {
		return fiber.NewError(400, "invalid device binding")
	}
	fingerprint := ""
	if req.Platform == "web" {
		if !h.sender.webConfigured() {
			return fiber.NewError(503, "browser notifications are not available yet")
		}
		if validateSubscription(req.Subscription) != nil {
			return fiber.NewError(400, "invalid browser notification subscription")
		}
		var sub struct {
			Endpoint string `json:"endpoint"`
		}
		json.Unmarshal(req.Subscription, &sub)
		fingerprint = sub.Endpoint
		req.Token = ""
	} else if req.Platform == "android" {
		if !h.sender.androidConfigured() {
			return fiber.NewError(503, "Android notifications are not available yet")
		}
		if len(req.Token) < 20 || len(req.Token) > 4096 {
			return fiber.NewError(400, "invalid device token")
		}
		fingerprint = req.Token
		req.Subscription = nil
	} else {
		return fiber.NewError(400, "unknown device type")
	}
	sum := sha256.Sum256([]byte(fingerprint))
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "push-devices:"+user); e != nil {
		return e
	}
	var count int
	e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM notification_devices WHERE user_id=$1::uuid AND id<>$2::uuid`, user, id).Scan(&count)
	if e != nil {
		return e
	}
	if count >= 10 {
		return fiber.NewError(400, "remove an old notification device before adding another")
	}
	_, e = tx.Exec(c.UserContext(), `INSERT INTO notification_devices(id,user_id,platform,token,subscription,token_hash,binding_id) VALUES($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6,$7::uuid) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,platform=excluded.platform,token=excluded.token,subscription=excluded.subscription,token_hash=excluded.token_hash,binding_id=excluded.binding_id,enabled=true,registered_at=CASE WHEN notification_devices.user_id<>excluded.user_id OR notification_devices.enabled=false OR notification_devices.binding_id<>excluded.binding_id THEN now() ELSE notification_devices.registered_at END,last_seen_at=now()`, id, user, req.Platform, req.Token, nullableJSON(req.Subscription), hex.EncodeToString(sum[:]), req.Binding)
	var pgErr *pgconn.PgError
	if errors.As(e, &pgErr) && pgErr.Code == "23505" {
		return fiber.NewError(409, "reconnect notifications on this device")
	}
	if e != nil {
		return e
	}
	_, e = tx.Exec(c.UserContext(), `INSERT INTO notification_preferences(user_id,push_enabled) VALUES($1::uuid,true) ON CONFLICT(user_id) DO UPDATE SET push_enabled=true`, user)
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return result(c, fiber.Map{"enabled": true})
}
func nullableJSON(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	return string(b)
}
func (h *pushHandler) remove(c *fiber.Ctx) error {
	user, e := userID(c)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("deviceID")); e != nil {
		return fiber.NewError(400, "invalid device")
	}
	if _, e = uuid.Parse(c.Query("binding")); e != nil {
		return fiber.NewError(400, "invalid device binding")
	}
	_, e = h.db.Exec(c.UserContext(), `DELETE FROM notification_devices WHERE id=$1::uuid AND user_id=$2::uuid AND binding_id=$3::uuid`, c.Params("deviceID"), user, c.Query("binding"))
	if e != nil {
		return e
	}
	return result(c, fiber.Map{"removed": true})
}
func (h *pushHandler) runPush(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		h.pollPush(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
func (h *pushHandler) pollPush(parent context.Context) {
	if !h.sender.webConfigured() && !h.sender.androidConfigured() {
		return
	}
	ctx, cancel := context.WithTimeout(parent, 25*time.Second)
	defer cancel()
	_, _ = h.db.Exec(ctx, `UPDATE notification_push_outbox SET status='failed' WHERE status='sending' AND attempts>=5 AND next_at<=now()`)
	_, err := h.db.Exec(ctx, `INSERT INTO notification_push_outbox(notification_id,device_id) SELECT n.id,d.id FROM user_notifications n JOIN notification_devices d ON d.user_id=n.user_id JOIN notification_preferences p ON p.user_id=n.user_id JOIN classroom_memberships m ON m.classroom_id=n.classroom_id AND m.user_id=n.user_id JOIN classrooms c ON c.id=n.classroom_id WHERE d.enabled AND p.push_enabled AND p.app_enabled AND n.read_at IS NULL AND n.created_at>=d.registered_at AND n.created_at>now()-interval '1 day' AND m.status='active' AND c.status='active' AND c.deleted_at IS NULL AND((d.platform='web' AND $1)OR(d.platform='android' AND $2)) ON CONFLICT(notification_id,device_id) DO NOTHING`, h.sender.webConfigured(), h.sender.androidConfigured())
	if err != nil {
		return
	}
	for i := 0; i < 10 && ctx.Err() == nil; i++ {
		if err = h.deliverPush(ctx); err != nil {
			return
		}
	}
}
func (h *pushHandler) deliverPush(ctx context.Context) error {
	var job int64
	var attempts int
	var d pushDevice
	var p PushPayload
	err := h.db.QueryRow(ctx, `UPDATE notification_push_outbox o SET status='sending',attempts=o.attempts+1,next_at=now()+interval '2 minutes' FROM(SELECT o.id FROM notification_push_outbox o WHERE o.status IN ('pending','sending') AND o.next_at<=now() AND o.attempts<5 ORDER BY o.id FOR UPDATE SKIP LOCKED LIMIT 1) candidate,user_notifications n,notification_devices d WHERE o.id=candidate.id AND n.id=o.notification_id AND d.id=o.device_id RETURNING o.id,o.attempts,d.id::text,d.user_id::text,d.platform,d.token,d.subscription,d.binding_id::text,n.user_id::text,n.id::text,n.title,n.body,n.url`).Scan(&job, &attempts, &d.ID, &d.User, &d.Platform, &d.Token, &d.Subscription, &d.Binding, &p.User, &p.ID, &p.Title, &p.Body, &p.URL)
	if err != nil {
		return err
	}
	var allowed bool
	err = h.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM user_notifications n JOIN notification_devices d ON d.id=$2::uuid AND d.user_id=n.user_id JOIN notification_preferences p ON p.user_id=n.user_id JOIN classroom_memberships m ON m.classroom_id=n.classroom_id AND m.user_id=n.user_id JOIN classrooms c ON c.id=n.classroom_id JOIN users u ON u.id=n.user_id WHERE n.id=$1::uuid AND d.enabled AND p.push_enabled AND p.app_enabled AND n.read_at IS NULL AND n.created_at>=d.registered_at AND n.created_at>now()-interval '1 day' AND m.status='active' AND c.status='active' AND c.deleted_at IS NULL AND u.status='active' AND u.deleted_at IS NULL)`, p.ID, d.ID).Scan(&allowed)
	if err != nil {
		return err
	}
	state := "skipped"
	if allowed && d.User == p.User {
		p.Title = shortPush(p.Title, 100)
		p.Body = shortPush(p.Body, 220)
		parsed, e := url.Parse(p.URL)
		if e != nil || parsed.IsAbs() || parsed.Host != "" || !strings.HasPrefix(p.URL, "/") || strings.HasPrefix(p.URL, "//") {
			p.URL = "/notifications"
		}
		gone, e := h.sender.send(ctx, d, p)
		state = "sent"
		if gone {
			_, _ = h.db.Exec(ctx, `DELETE FROM notification_devices WHERE id=$1::uuid AND binding_id=$2::uuid`, d.ID, d.Binding)
			return nil
		}
		if e != nil {
			state = "pending"
			if attempts >= 5 {
				state = "failed"
			}
		}
	}
	_, err = h.db.Exec(ctx, `UPDATE notification_push_outbox SET status=$2,next_at=now()+($3::int*interval '1 minute') WHERE id=$1`, job, state, attempts*attempts)
	return err
}
func shortPush(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}
