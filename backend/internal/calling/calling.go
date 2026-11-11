// Package calling authorizes private WebRTC signaling; media stays between peers.
package calling

import (
	"context"
	"encoding/json"
	"errors"
	auth "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"sort"
	"strconv"
	"time"
)

type Handler struct{ db *pgxpool.Pool }
type Call struct {
	ID        string     `json:"id"`
	Class     string     `json:"classroom_id"`
	Thread    string     `json:"conversation_id"`
	Caller    string     `json:"caller_id"`
	Callee    string     `json:"callee_id"`
	Media     string     `json:"media"`
	State     string     `json:"state"`
	Reason    string     `json:"reason"`
	Created   time.Time  `json:"created_at"`
	Accepted  *time.Time `json:"accepted_at"`
	Connected *time.Time `json:"connected_at"`
	Ended     *time.Time `json:"ended_at"`
	Peer      string     `json:"peer_id"`
	Name      string     `json:"peer_name"`
	Classroom string     `json:"classroom_name"`
	Owned     bool       `json:"owned"`
}
type Signal struct {
	ID      string          `json:"id"`
	Kind    string          `json:"kind"`
	Payload json.RawMessage `json:"payload"`
}

const callColumns = `c.id::text,c.classroom_id::text,c.conversation_id::text,c.caller_id::text,c.callee_id::text,c.media,c.state,c.reason,c.created_at,c.accepted_at,c.connected_at,c.ended_at,u.id::text,trim(u.first_name||' '||u.last_name),cl.name,COALESCE(CASE WHEN c.caller_id=$1::uuid THEN c.caller_session ELSE c.callee_session END=$2::uuid,false)`
const callJoins = ` FROM classroom_calls c JOIN users u ON u.id=CASE WHEN c.caller_id=$1::uuid THEN c.callee_id ELSE c.caller_id END JOIN classrooms cl ON cl.id=c.classroom_id `
const visible = ` $1::uuid IN(c.caller_id,c.callee_id) AND cl.status='active' AND cl.deleted_at IS NULL AND EXISTS(SELECT 1 FROM classroom_memberships a JOIN classroom_memberships b ON b.classroom_id=a.classroom_id JOIN users ua ON ua.id=a.user_id JOIN users ub ON ub.id=b.user_id WHERE a.classroom_id=c.classroom_id AND a.user_id=c.caller_id AND b.user_id=c.callee_id AND a.status='active' AND b.status='active' AND a.member_role<>b.member_role AND ua.status='active' AND ub.status='active' AND ua.deleted_at IS NULL AND ub.deleted_at IS NULL)`
const eligible = `SELECT CASE WHEN t.user_low=$2::uuid THEN t.user_high ELSE t.user_low END::text FROM classroom_conversations t JOIN classrooms cl ON cl.id=t.classroom_id JOIN classroom_memberships a ON a.classroom_id=t.classroom_id AND a.user_id=$2::uuid JOIN classroom_memberships b ON b.classroom_id=t.classroom_id AND b.user_id=CASE WHEN t.user_low=$2::uuid THEN t.user_high ELSE t.user_low END JOIN users ua ON ua.id=a.user_id JOIN users ub ON ub.id=b.user_id LEFT JOIN classroom_messaging_policy p ON p.classroom_id=t.classroom_id WHERE t.id=$1::uuid AND $2::uuid IN(t.user_low,t.user_high) AND a.status='active' AND b.status='active' AND a.member_role<>b.member_role AND ua.status='active' AND ub.status='active' AND ua.deleted_at IS NULL AND ub.deleted_at IS NULL AND cl.status='active' AND cl.deleted_at IS NULL AND(a.member_role='teacher' OR(COALESCE(p.students_can_message,true) AND NOT EXISTS(SELECT 1 FROM classroom_messaging_restrictions r WHERE r.classroom_id=t.classroom_id AND r.user_id=$2::uuid)))`

func Register(app *fiber.App, db *pgxpool.Pool) {
	h := &Handler{db}
	g := app.Group("/calling", auth.JWTProtected())
	g.Get("/config", h.config)
	g.Get("/active", h.active)
	g.Get("/history/:thread", h.history)
	g.Post("/", h.create)
	g.Get("/:callID", h.sync)
	g.Post("/:callID/action", h.action)
	g.Post("/:callID/signals", h.signal)
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error {
		go func() {
			timer := time.NewTicker(10 * time.Second)
			defer timer.Stop()
			for {
				h.expire(ctx)
				select {
				case <-ctx.Done():
					return
				case <-timer.C:
				}
			}
		}()
		return nil
	})
	app.Hooks().OnShutdown(func() error { cancel(); return nil })
}
func identity(c *fiber.Ctx) (string, error) {
	u, _ := c.Locals("user_id").(string)
	if _, e := uuid.Parse(u); e != nil {
		return "", fiber.NewError(401, "authentication required")
	}
	return u, nil
}
func session(c *fiber.Ctx) (string, error) {
	s := c.Query("session")
	if _, e := uuid.Parse(s); e != nil {
		return "", fiber.NewError(400, "invalid call session")
	}
	return s, nil
}
func result(c *fiber.Ctx, data any) error {
	c.Set("Cache-Control", "no-store")
	return c.JSON(fiber.Map{"success": true, "data": data})
}
func scan(row pgx.Row) (Call, error) {
	var c Call
	e := row.Scan(&c.ID, &c.Class, &c.Thread, &c.Caller, &c.Callee, &c.Media, &c.State, &c.Reason, &c.Created, &c.Accepted, &c.Connected, &c.Ended, &c.Peer, &c.Name, &c.Classroom, &c.Owned)
	return c, e
}
func (h *Handler) get(ctx context.Context, user, session, id string) (Call, error) {
	if _, e := uuid.Parse(id); e != nil {
		return Call{}, fiber.NewError(400, "invalid call")
	}
	c, e := scan(h.db.QueryRow(ctx, `SELECT `+callColumns+callJoins+` WHERE `+visible+` AND c.id=$3::uuid`, user, session, id))
	if errors.Is(e, pgx.ErrNoRows) {
		return c, fiber.NewError(403, "call is unavailable")
	}
	return c, e
}
func (h *Handler) expire(ctx context.Context) {
	work, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, _ = h.db.Exec(work, `UPDATE classroom_calls c SET state='ended',reason=CASE WHEN state='ringing' THEN 'missed' ELSE 'disconnected' END,ended_at=now() WHERE state<>'ended' AND((state='ringing' AND created_at<now()-interval '45 seconds') OR(state='active' AND(caller_seen_at<now()-interval '75 seconds' OR callee_seen_at<now()-interval '75 seconds')) OR created_at<now()-interval '2 hours' OR NOT EXISTS(SELECT 1 FROM classroom_memberships a JOIN classroom_memberships b ON b.classroom_id=a.classroom_id JOIN classrooms cl ON cl.id=a.classroom_id JOIN users ua ON ua.id=a.user_id JOIN users ub ON ub.id=b.user_id WHERE a.classroom_id=c.classroom_id AND a.user_id=c.caller_id AND b.user_id=c.callee_id AND a.status='active' AND b.status='active' AND a.member_role<>b.member_role AND cl.status='active' AND cl.deleted_at IS NULL AND ua.status='active' AND ub.status='active' AND ua.deleted_at IS NULL AND ub.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM classroom_memberships a LEFT JOIN classroom_messaging_policy p ON p.classroom_id=a.classroom_id WHERE a.classroom_id=c.classroom_id AND a.user_id=c.caller_id AND a.member_role='student' AND(NOT COALESCE(p.students_can_message,true) OR EXISTS(SELECT 1 FROM classroom_messaging_restrictions r WHERE r.classroom_id=c.classroom_id AND r.user_id=c.caller_id))))`)
}
func (h *Handler) active(c *fiber.Ctx) error {
	u, e := identity(c)
	if e != nil {
		return e
	}
	s, e := session(c)
	if e != nil {
		return e
	}
	item, e := scan(h.db.QueryRow(c.UserContext(), `SELECT `+callColumns+callJoins+` WHERE `+visible+` AND c.state<>'ended' ORDER BY c.created_at DESC LIMIT 1`, u, s))
	if errors.Is(e, pgx.ErrNoRows) {
		return result(c, nil)
	}
	if e != nil {
		return e
	}
	return result(c, item)
}
func (h *Handler) create(c *fiber.Ctx) error {
	u, e := identity(c)
	if e != nil {
		return e
	}
	s, e := session(c)
	if e != nil {
		return e
	}
	var r struct {
		Thread  string `json:"conversation_id"`
		Media   string `json:"media"`
		Request string `json:"client_request_id"`
	}
	if c.BodyParser(&r) != nil {
		return fiber.NewError(400, "invalid call")
	}
	if _, e = uuid.Parse(r.Thread); e != nil {
		return fiber.NewError(400, "invalid conversation")
	}
	if _, e = uuid.Parse(r.Request); e != nil {
		return fiber.NewError(400, "invalid request")
	}
	if r.Media != "audio" && r.Media != "video" {
		return fiber.NewError(400, "choose an audio or video call")
	}
	h.expire(c.UserContext())
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var classID string
	if e = tx.QueryRow(c.UserContext(), `SELECT classroom_id::text FROM classroom_conversations WHERE id=$1::uuid`, r.Thread).Scan(&classID); errors.Is(e, pgx.ErrNoRows) {
		return fiber.NewError(403, "calling is unavailable for this conversation")
	} else if e != nil {
		return e
	}
	if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, classID); e != nil {
		return e
	}
	var peer string
	e = tx.QueryRow(c.UserContext(), eligible, r.Thread, u).Scan(&peer)
	if errors.Is(e, pgx.ErrNoRows) {
		return fiber.NewError(403, "calling is unavailable for this conversation")
	}
	if e != nil {
		return e
	}
	participants := []string{u, peer}
	sort.Strings(participants)
	for _, id := range participants {
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('call-user:'||$1,0))`, id); e != nil {
			return e
		}
	}
	var existing, thread, media string
	e = tx.QueryRow(c.UserContext(), `SELECT id::text,conversation_id::text,media FROM classroom_calls WHERE caller_id=$1::uuid AND client_request_id=$2::uuid`, u, r.Request).Scan(&existing, &thread, &media)
	if e == nil {
		if thread != r.Thread || media != r.Media {
			return fiber.NewError(409, "call request already used")
		}
		tx.Rollback(c.UserContext())
		return h.respondCall(c, u, s, existing)
	}
	if !errors.Is(e, pgx.ErrNoRows) {
		return e
	}
	var busy bool
	if e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_calls WHERE state<>'ended' AND(caller_id=ANY($1::uuid[]) OR callee_id=ANY($1::uuid[])))`, participants).Scan(&busy); e != nil {
		return e
	}
	if busy {
		return fiber.NewError(409, "A participant is already on a call.")
	}
	var recent int
	if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_calls WHERE caller_id=$1::uuid AND created_at>now()-interval '1 minute'`, u).Scan(&recent); e != nil {
		return e
	}
	if recent >= 10 {
		return fiber.NewError(429, "Wait a moment before calling again.")
	}
	var id string
	e = tx.QueryRow(c.UserContext(), `INSERT INTO classroom_calls(classroom_id,conversation_id,caller_id,callee_id,caller_session,media,client_request_id) SELECT classroom_id,id,$2::uuid,$3::uuid,$4::uuid,$5,$6::uuid FROM classroom_conversations WHERE id=$1::uuid RETURNING id::text`, r.Thread, u, peer, s, r.Media, r.Request).Scan(&id)
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return h.respondCall(c, u, s, id)
}
func (h *Handler) respondCall(c *fiber.Ctx, u, s, id string) error {
	item, e := h.get(c.UserContext(), u, s, id)
	if e != nil {
		return e
	}
	return result(c, item)
}
func (h *Handler) history(c *fiber.Ctx) error {
	u, e := identity(c)
	if e != nil {
		return e
	}
	s, e := session(c)
	if e != nil {
		return e
	}
	if _, e = uuid.Parse(c.Params("thread")); e != nil {
		return fiber.NewError(400, "invalid conversation")
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT `+callColumns+callJoins+` WHERE `+visible+` AND c.conversation_id=$3::uuid ORDER BY c.created_at DESC LIMIT 50`, u, s, c.Params("thread"))
	if e != nil {
		return e
	}
	defer rows.Close()
	out := []Call{}
	for rows.Next() {
		item, e := scan(rows)
		if e != nil {
			return e
		}
		out = append(out, item)
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return result(c, out)
}
func (h *Handler) sync(c *fiber.Ctx) error {
	u, e := identity(c)
	if e != nil {
		return e
	}
	s, e := session(c)
	if e != nil {
		return e
	}
	item, e := h.get(c.UserContext(), u, s, c.Params("callID"))
	if e != nil {
		return e
	}
	after, e := strconv.ParseInt(c.Query("after", "0"), 10, 64)
	if e != nil || after < 0 {
		return fiber.NewError(400, "invalid signal cursor")
	}
	out := []Signal{}
	if item.Owned && item.State != "ended" {
		rows, e := h.db.Query(c.UserContext(), `SELECT id::text,kind,payload FROM classroom_call_signals WHERE call_id=$1::uuid AND sender_id<>$2::uuid AND id>$3 ORDER BY id LIMIT 100`, item.ID, u, after)
		if e != nil {
			return e
		}
		defer rows.Close()
		for rows.Next() {
			var signal Signal
			if e = rows.Scan(&signal.ID, &signal.Kind, &signal.Payload); e != nil {
				return e
			}
			out = append(out, signal)
		}
		if e = rows.Err(); e != nil {
			return e
		}
	}
	return result(c, fiber.Map{"call": item, "signals": out})
}
