// Package realtime delivers small invalidation events; academic data still uses authorized HTTP routes.
package realtime

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"net"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type Event struct {
	Kind   string   `json:"kind"`
	Class  string   `json:"classroom_id,omitempty"`
	Thread string   `json:"conversation_id,omitempty"`
	User   string   `json:"user_id,omitempty"`
	Typing bool     `json:"typing,omitempty"`
	Users  []string `json:"users,omitempty"`
}
type client struct {
	user   string
	events chan Event
	done   chan struct{}
	once   sync.Once
}

func (c *client) close() { c.once.Do(func() { close(c.done) }) }

type Hub struct {
	db        *pgxpool.Pool
	mu        sync.RWMutex
	clients   map[*client]struct{}
	ready     chan struct{}
	readyOnce sync.Once
	available bool
}

func Register(app *fiber.App, db *pgxpool.Pool) {
	h := &Hub{db: db, clients: make(map[*client]struct{}), ready: make(chan struct{})}
	app.Post("/messaging/realtime-ticket", auth.JWTProtected(), h.ticket)
	app.Get("/messaging/socket", h.upgrade, websocket.New(h.socket, websocket.Config{HandshakeTimeout: 5 * time.Second, Origins: []string{"*"}}))
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error { go h.listen(ctx); return nil })
	app.Hooks().OnShutdown(func() error {
		cancel()
		h.mu.Lock()
		for c := range h.clients {
			c.close()
		}
		h.mu.Unlock()
		return nil
	})
}
func hash(value string) string { s := sha256.Sum256([]byte(value)); return hex.EncodeToString(s[:]) }
func (h *Hub) ticket(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if _, e := uuid.Parse(user); e != nil {
		return fiber.NewError(401, "authentication required")
	}
	ctx := c.UserContext()
	_, _ = h.db.Exec(ctx, `DELETE FROM realtime_tickets WHERE expires_at<now()`)
	var count int
	if err := h.db.QueryRow(ctx, `SELECT count(*) FROM realtime_tickets WHERE user_id=$1::uuid`, user).Scan(&count); err != nil {
		return err
	}
	if count >= 8 {
		return fiber.NewError(429, "reconnect in a moment")
	}
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return err
	}
	ticket := hex.EncodeToString(bytes)
	session := time.Now().Add(30 * time.Minute)
	if expires, ok := c.Locals("auth_expires").(int64); ok && time.Unix(expires, 0).Before(session) {
		session = time.Unix(expires, 0)
	}
	sid, _ := c.Locals("session_id").(string)
	_, err := h.db.Exec(ctx, `INSERT INTO realtime_tickets(ticket_hash,user_id,expires_at,session_expires_at,auth_session_id) SELECT $1,$2::uuid,now()+interval '30 seconds',$3,NULLIF($4,'')::uuid WHERE EXISTS(SELECT 1 FROM users WHERE id=$2::uuid AND status='active' AND deleted_at IS NULL)`, hash(ticket), user, session, sid)
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"ticket": ticket, "socket_url": os.Getenv("REALTIME_PUBLIC_URL")}})
}
func allowedOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" || parsed.Path != "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return false
	}
	for _, candidate := range strings.Split(os.Getenv("FRONTEND_URL")+","+os.Getenv("REALTIME_ALLOWED_ORIGINS"), ",") {
		if strings.TrimRight(strings.TrimSpace(candidate), "/") == origin {
			return true
		}
	}
	if os.Getenv("APP_ENV") != "production" {
		host := parsed.Hostname()
		if host == "localhost" {
			return true
		}
		if ip := net.ParseIP(host); ip != nil && (ip.IsLoopback() || ip.IsPrivate()) {
			return true
		}
	}
	return false
}
func (h *Hub) upgrade(c *fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.NewError(426, "websocket upgrade required")
	}
	if !allowedOrigin(c.Get("Origin")) {
		return fiber.NewError(403, "origin is not allowed")
	}
	value := c.Query("ticket")
	if len(value) != 64 {
		return fiber.NewError(401, "invalid connection ticket")
	}
	var user string
	var expiry time.Time
	var sid *string
	var issued time.Time
	err := h.db.QueryRow(c.UserContext(), `DELETE FROM realtime_tickets t USING users u WHERE t.ticket_hash=$1 AND t.expires_at>now() AND t.session_expires_at>now() AND u.id=t.user_id AND u.status='active' AND u.deleted_at IS NULL RETURNING t.user_id::text,t.session_expires_at,t.auth_session_id::text,t.issued_at`, hash(value)).Scan(&user, &expiry, &sid, &issued)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(401, "connection ticket expired")
	}
	if err != nil {
		return err
	}
	if !h.sessionAllowed(user, sid, issued) {
		return fiber.NewError(401, "Session revoked")
	}
	c.Locals("socket_session", sid)
	c.Locals("socket_issued", issued)
	c.Locals("socket_user", user)
	c.Locals("socket_expiry", expiry)
	return c.Next()
}
func (h *Hub) broadcast(e Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		for _, user := range e.Users {
			if user == c.user {
				copy := e
				copy.Users = nil
				select {
				case c.events <- copy:
				default:
					c.close()
				}
				break
			}
		}
	}
}
func (h *Hub) socket(conn *websocket.Conn) {
	select {
	case <-h.ready:
	case <-time.After(5 * time.Second):
		conn.Close()
		return
	}
	user, _ := conn.Locals("socket_user").(string)
	sid, _ := conn.Locals("socket_session").(*string)
	issued, _ := conn.Locals("socket_issued").(time.Time)
	expiry, _ := conn.Locals("socket_expiry").(time.Time)
	c := &client{user: user, events: make(chan Event, 32), done: make(chan struct{})}
	h.mu.Lock()
	if !h.available {
		h.mu.Unlock()
		conn.Close()
		return
	}
	count := 0
	for existing := range h.clients {
		if existing.user == user {
			count++
		}
	}
	if count >= 5 {
		h.mu.Unlock()
		conn.Close()
		return
	}
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	defer func() { c.close(); h.mu.Lock(); delete(h.clients, c); h.mu.Unlock(); conn.Close() }()
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		timer := time.NewTimer(time.Until(expiry))
		defer timer.Stop()
		defer conn.Close()
		conn.WriteJSON(Event{Kind: "connected"})
		for {
			select {
			case <-c.done:
				return
			case <-timer.C:
				return
			case <-ticker.C:
				if !h.sessionAllowed(user, sid, issued) {
					return
				}
				conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if conn.WriteMessage(websocket.PingMessage, nil) != nil {
					return
				}
			case e := <-c.events:
				conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if conn.WriteJSON(e) != nil {
					return
				}
			}
		}
	}()
	conn.SetReadLimit(2048)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error { return conn.SetReadDeadline(time.Now().Add(60 * time.Second)) })
	last := time.Time{}
	for {
		var e Event
		if err := conn.ReadJSON(&e); err != nil {
			return
		}
		if e.Kind != "typing" || time.Since(last) < 800*time.Millisecond {
			continue
		}
		last = time.Now()
		if _, err := uuid.Parse(e.Class); err != nil {
			continue
		}
		if _, err := uuid.Parse(e.Thread); err != nil {
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		var peer string
		err := h.db.QueryRow(ctx, `SELECT CASE WHEN t.user_low=$1::uuid THEN t.user_high ELSE t.user_low END::text FROM classroom_conversations t JOIN classroom_memberships mine ON mine.classroom_id=t.classroom_id AND mine.user_id=$1::uuid JOIN classroom_memberships other ON other.classroom_id=t.classroom_id AND other.user_id=CASE WHEN t.user_low=$1::uuid THEN t.user_high ELSE t.user_low END JOIN classrooms cl ON cl.id=t.classroom_id LEFT JOIN classroom_messaging_policy p ON p.classroom_id=t.classroom_id WHERE t.id=$2::uuid AND t.classroom_id=$3::uuid AND $1::uuid IN(t.user_low,t.user_high) AND mine.status='active' AND other.status='active' AND mine.member_role<>other.member_role AND cl.status='active' AND cl.deleted_at IS NULL AND(mine.member_role='teacher' OR(COALESCE(p.students_can_message,true) AND NOT EXISTS(SELECT 1 FROM classroom_messaging_restrictions r WHERE r.classroom_id=t.classroom_id AND r.user_id=$1::uuid)))`, user, e.Thread, e.Class).Scan(&peer)
		cancel()
		if err == nil {
			h.broadcast(Event{Kind: "typing", Class: e.Class, Thread: e.Thread, User: user, Typing: e.Typing, Users: []string{peer}})
		}
	}
}

func (h *Hub) sessionAllowed(user string, sid *string, issued time.Time) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	var allowed bool
	e := h.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users u LEFT JOIN account_security a ON a.user_id=u.id LEFT JOIN auth_sessions s ON s.id=NULLIF($2,'')::uuid AND s.user_id=u.id WHERE u.id=$1::uuid AND u.status='active' AND u.deleted_at IS NULL AND CASE WHEN $2<>'' THEN s.revoked_at IS NULL AND s.expires_at>now() AND (NOT COALESCE(a.enabled,false) OR s.mfa_verified) ELSE NOT COALESCE(a.enabled,false) AND (a.legacy_revoked_at IS NULL OR a.legacy_revoked_at<$3) END)`, user, func() string {
		if sid != nil {
			return *sid
		}
		return ""
	}(), issued).Scan(&allowed)
	return e == nil && allowed
}
func (h *Hub) listen(ctx context.Context) {
	for ctx.Err() == nil {
		conn, err := h.db.Acquire(ctx)
		if err == nil {
			_, err = conn.Exec(ctx, "LISTEN edunexus_events")
			if err == nil {
				h.setAvailable(true)
				h.readyOnce.Do(func() { close(h.ready) })
			}
			for err == nil {
				var n *pgconn.Notification
				n, err = conn.Conn().WaitForNotification(ctx)
				if err == nil {
					var e Event
					if json.Unmarshal([]byte(n.Payload), &e) == nil && len(e.Users) > 0 {
						h.broadcast(e)
					}
				}
			}
			h.setAvailable(false)
			conn.Conn().Exec(context.Background(), "UNLISTEN edunexus_events")
			conn.Release()
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Second):
		}
	}
}

// A broken listener must restore HTTP polling instead of leaving clients marked
// connected while events are lost. Reconnect invalidates their cached queries.
func (h *Hub) setAvailable(value bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.available = value
	if !value {
		for c := range h.clients {
			c.close()
		}
	}
}
