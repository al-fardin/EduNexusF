package messaging

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct{ db *pgxpool.Pool }

func Register(app *fiber.App, db *pgxpool.Pool) {
	h := &Handler{db}
	g := app.Group("/messaging", authMiddleware.JWTProtected())
	g.Get("/classes", h.Classes)
	g.Get("/unread", h.Unread)
	c := app.Group("/classrooms/:id", authMiddleware.JWTProtected())
	c.Get("/message-recipients", h.Recipients)
	c.Get("/messaging-settings", h.Settings)
	c.Put("/messaging-policy", h.Policy)
	c.Put("/messaging-policy/students/:studentID", h.StudentPolicy)
	c.Put("/message-theme", h.Theme)
	c.Get("/conversations/:threadID/theme", h.Theme)
	c.Put("/conversations/:threadID/theme", h.Theme)
	c.Get("/conversations/:threadID/messages/:messageID/file", h.File)
	c.Put("/conversations/:threadID/messages/:messageID/reaction", h.React)
	c.Get("/conversations", h.Conversations)
	c.Post("/conversations", h.Create)
	c.Get("/conversations/:threadID/messages", h.History)
	c.Post("/conversations/:threadID/messages", h.Send)
	c.Post("/conversations/:threadID/read", h.Read)
}
func result(c *fiber.Ctx, data any) error { return c.JSON(fiber.Map{"success": true, "data": data}) }
func userID(c *fiber.Ctx) (string, error) {
	id, _ := c.Locals("user_id").(string)
	if _, err := uuid.Parse(id); err != nil {
		return "", fiber.NewError(401, "authentication required")
	}
	return id, nil
}
func (h *Handler) member(c *fiber.Ctx) (string, string, error) {
	user, err := userID(c)
	if err != nil {
		return "", "", err
	}
	if _, err = uuid.Parse(c.Params("id")); err != nil {
		return "", "", fiber.NewError(400, "invalid classroom")
	}
	var role string
	err = h.db.QueryRow(c.UserContext(), `SELECT m.member_role FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=$1::uuid AND m.user_id=$2::uuid AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", fiber.NewError(403, "active class membership required")
	}
	return user, role, err
}

// Peers must remain active in the same class, with a teacher/student pairing.
const eligible = `cl.status='active' AND cl.deleted_at IS NULL AND mine.status='active' AND peer.status='active' AND mine.member_role<>peer.member_role AND mine.member_role IN ('teacher','student') AND peer.member_role IN ('teacher','student')`
const joins = ` FROM classroom_conversations t JOIN classrooms cl ON cl.id=t.classroom_id JOIN classroom_memberships mine ON mine.classroom_id=t.classroom_id AND mine.user_id=$1::uuid JOIN classroom_memberships peer ON peer.classroom_id=t.classroom_id AND peer.user_id=CASE WHEN t.user_low=$1::uuid THEN t.user_high ELSE t.user_low END `
const mine = `(t.user_low=$1::uuid OR t.user_high=$1::uuid)`
const cursor = `CASE WHEN t.user_low=$1::uuid THEN t.low_last_read ELSE t.high_last_read END`

func (h *Handler) thread(c *fiber.Ctx) (string, error) {
	user, _, err := h.member(c)
	if err != nil {
		return "", err
	}
	if _, err = uuid.Parse(c.Params("threadID")); err != nil {
		return "", fiber.NewError(400, "invalid conversation")
	}
	var allowed bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1`+joins+`WHERE `+mine+` AND `+eligible+` AND t.id=$2::uuid AND t.classroom_id=$3::uuid)`, user, c.Params("threadID"), c.Params("id")).Scan(&allowed)
	if err != nil {
		return "", err
	}
	if !allowed {
		return "", fiber.NewError(403, "conversation unavailable")
	}
	return user, nil
}
func (h *Handler) Unread(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	var count int
	err = h.db.QueryRow(c.UserContext(), `SELECT count(*)`+joins+`JOIN classroom_messages msg ON msg.conversation_id=t.id WHERE `+mine+` AND `+eligible+` AND msg.sender_id<>$1::uuid AND msg.id>`+cursor, user).Scan(&count)
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"unread": count})
}
func (h *Handler) Classes(c *fiber.Ctx) error {
	user, err := userID(c)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT room.id::text,room.name,m.member_role,(SELECT count(*)`+joins+`JOIN classroom_messages msg ON msg.conversation_id=t.id WHERE t.classroom_id=room.id AND `+mine+` AND `+eligible+` AND msg.sender_id<>$1::uuid AND msg.id>`+cursor+`) FROM classrooms room JOIN classroom_memberships m ON m.classroom_id=room.id WHERE m.user_id=$1::uuid AND m.status='active' AND room.status='active' AND room.deleted_at IS NULL ORDER BY room.name LIMIT 200`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name, role string
		var unread int
		if err = rows.Scan(&id, &name, &role, &unread); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "name": name, "role": role, "unread": unread})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, out)
}
func (h *Handler) Recipients(c *fiber.Ctx) error {
	user, role, err := h.member(c)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),m.member_role FROM classroom_memberships m JOIN users u ON u.id=m.user_id WHERE m.classroom_id=$1::uuid AND m.status='active' AND m.user_id<>$2::uuid AND m.member_role<>$3 AND m.member_role IN ('teacher','student') ORDER BY u.first_name,u.last_name LIMIT 500`, c.Params("id"), user, role)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name, kind string
		if err = rows.Scan(&id, &name, &kind); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "name": name, "role": kind})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, out)
}
func (h *Handler) Create(c *fiber.Ctx) error {
	user, role, err := h.member(c)
	if err != nil {
		return err
	}
	var body struct {
		Recipient string `json:"recipient_id"`
	}
	if c.BodyParser(&body) != nil {
		return fiber.NewError(400, "invalid conversation")
	}
	if _, err = uuid.Parse(body.Recipient); err != nil || body.Recipient == user {
		return fiber.NewError(400, "choose a teacher or student")
	}
	var allowed bool
	err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND status='active' AND member_role<>$3 AND member_role IN ('teacher','student'))`, c.Params("id"), body.Recipient, role).Scan(&allowed)
	if err != nil {
		return err
	}
	if !allowed {
		return fiber.NewError(403, "recipient must be a teacher or student in this class")
	}
	permitted, e := canSend(c.UserContext(), h.db, c.Params("id"), user)
	if e != nil {
		return e
	}
	if !permitted {
		return fiber.NewError(403, "Your teacher has paused student messages in this class.")
	}
	var id string
	err = h.db.QueryRow(c.UserContext(), `INSERT INTO classroom_conversations(classroom_id,user_low,user_high) VALUES($1::uuid,LEAST($2::uuid,$3::uuid),GREATEST($2::uuid,$3::uuid)) ON CONFLICT(classroom_id,user_low,user_high) DO UPDATE SET classroom_id=excluded.classroom_id RETURNING id::text`, c.Params("id"), user, body.Recipient).Scan(&id)
	if err != nil {
		return err
	}
	return result(c, fiber.Map{"id": id})
}
func (h *Handler) Conversations(c *fiber.Ctx) error {
	user, _, err := h.member(c)
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT t.id::text,u.id::text,trim(u.first_name||' '||u.last_name),peer.member_role,COALESCE(NULLIF(last.body,''),NULLIF(last.file_name,''),''),last.created_at,(SELECT count(*) FROM classroom_messages m WHERE m.conversation_id=t.id AND m.sender_id<>$1::uuid AND m.id>`+cursor+`)`+joins+`JOIN users u ON u.id=peer.user_id LEFT JOIN LATERAL(SELECT body,file_name,created_at FROM classroom_messages WHERE conversation_id=t.id ORDER BY id DESC LIMIT 1) last ON true WHERE `+mine+` AND `+eligible+` AND t.classroom_id=$2::uuid ORDER BY last.created_at DESC NULLS LAST,t.created_at DESC LIMIT 200`, user, c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]fiber.Map, 0)
	for rows.Next() {
		var id, peer, name, role, body string
		var at *time.Time
		var unread int
		if err = rows.Scan(&id, &peer, &name, &role, &body, &at, &unread); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "peer_id": peer, "name": name, "role": role, "last_message": body, "last_at": at, "unread": unread})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return result(c, out)
}

type Message struct {
	ID         string      `json:"id"`
	Sender     string      `json:"sender_id"`
	Body       string      `json:"body"`
	At         time.Time   `json:"created_at"`
	Request    string      `json:"client_request_id"`
	Reactions  []Reaction  `json:"reactions"`
	Attachment *Attachment `json:"attachment,omitempty"`
	hash       string
}

func scan(row pgx.Row) (Message, error) {
	var m Message
	var name, media string
	var reactions []byte
	var size int64
	err := row.Scan(&m.ID, &m.Sender, &m.Body, &m.At, &m.Request, &name, &size, &media, &m.hash, &reactions)
	if err == nil {
		err = json.Unmarshal(reactions, &m.Reactions)
	}
	if name != "" {
		m.Attachment = &Attachment{name, size, media}
	}
	return m, err
}

const columns = `id::text,sender_id::text,body,created_at,client_request_id::text,file_name,file_size,media_type,file_hash,COALESCE((SELECT json_agg(json_build_object('emoji',r.emoji,'user_id',r.user_id::text) ORDER BY r.user_id) FROM classroom_message_reactions r WHERE r.message_id=classroom_messages.id),'[]'::json)`

func (h *Handler) History(c *fiber.Ctx) error {
	if _, err := h.thread(c); err != nil {
		return err
	}
	before := int64(9223372036854775807)
	if raw := c.Query("before_id"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || n <= 0 {
			return fiber.NewError(400, "invalid message cursor")
		}
		before = n
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT `+columns+` FROM classroom_messages WHERE conversation_id=$1::uuid AND id<$2 ORDER BY classroom_messages.id DESC LIMIT 51`, c.Params("threadID"), before)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := make([]Message, 0)
	for rows.Next() {
		m, err := scan(rows)
		if err != nil {
			return err
		}
		out = append(out, m)
	}
	if err = rows.Err(); err != nil {
		return err
	}
	more := len(out) > 50
	if more {
		out = out[:50]
	}
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return result(c, fiber.Map{"messages": out, "has_more": more})
}
func (h *Handler) Send(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	req, err := parseMessage(c)
	if err != nil {
		return err
	}
	req.Body = strings.TrimSpace(req.Body)
	if (req.Body == "" && len(req.file) == 0) || utf8.RuneCountInString(req.Body) > 4000 || len(req.Body) > 16000 {
		return fiber.NewError(400, "message must contain 1–4000 characters")
	}
	if _, err = uuid.Parse(req.Request); err != nil {
		return fiber.NewError(400, "a valid message request ID is required")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message:'||$1,0))`, user); err != nil {
		return err
	}
	var existingThread string
	existing, err := scan(tx.QueryRow(c.UserContext(), `SELECT `+columns+` FROM classroom_messages WHERE sender_id=$1::uuid AND client_request_id=$2::uuid`, user, req.Request))
	if err == nil {
		if err = tx.QueryRow(c.UserContext(), `SELECT conversation_id::text FROM classroom_messages WHERE id=$1::bigint`, existing.ID).Scan(&existingThread); err != nil {
			return err
		}
		if existingThread != c.Params("threadID") || existing.Body != req.Body || existing.hash != req.hash || (existing.Attachment != nil && existing.Attachment.Name != req.name) {
			return fiber.NewError(409, "message request ID already used")
		}
		return result(c, existing)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); err != nil {
		return err
	}
	permitted, e := canSend(c.UserContext(), tx, c.Params("id"), user)
	if e != nil {
		return e
	}
	if !permitted {
		return fiber.NewError(403, "Your teacher has paused student messages in this class.")
	}
	var count int
	if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_messages WHERE sender_id=$1::uuid AND created_at>now()-interval '1 minute'`, user).Scan(&count); err != nil {
		return err
	}
	if count >= 40 {
		return fiber.NewError(429, "Too many messages. Try again in a minute.")
	}
	if len(req.file) > 0 {
		var bytes int64
		err = tx.QueryRow(c.UserContext(), `SELECT COALESCE(sum(file_size),0) FROM classroom_messages WHERE sender_id=$1::uuid AND created_at>now()-interval '24 hours'`, user).Scan(&bytes)
		if err != nil {
			return err
		}
		if bytes+int64(len(req.file)) > 100*1024*1024 {
			return fiber.NewError(429, "Daily attachment limit reached. Try again later.")
		}
	}
	key, err := storeFile(req.file)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed && key != "" {
			os.Remove(filepath.Join(fileDirectory(), key))
		}
	}()
	m, err := scan(tx.QueryRow(c.UserContext(), `INSERT INTO classroom_messages(conversation_id,sender_id,client_request_id,body,file_name,file_size,media_type,storage_key,file_hash) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9) RETURNING `+columns, c.Params("threadID"), user, req.Request, req.Body, req.name, len(req.file), req.media, key, req.hash))
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	committed = true
	return result(c, m)
}
func (h *Handler) Read(c *fiber.Ctx) error {
	user, err := h.thread(c)
	if err != nil {
		return err
	}
	var req struct {
		Last string `json:"last_message_id"`
	}
	if c.BodyParser(&req) != nil {
		return fiber.NewError(400, "invalid read cursor")
	}
	id, err := strconv.ParseInt(req.Last, 10, 64)
	if err != nil || id <= 0 {
		return fiber.NewError(400, "invalid read cursor")
	}
	tag, err := h.db.Exec(c.UserContext(), `UPDATE classroom_conversations t SET low_last_read=CASE WHEN user_low=$1::uuid THEN GREATEST(low_last_read,$3::bigint) ELSE low_last_read END,high_last_read=CASE WHEN user_high=$1::uuid THEN GREATEST(high_last_read,$3::bigint) ELSE high_last_read END WHERE t.id=$2::uuid AND EXISTS(SELECT 1 FROM classroom_messages WHERE conversation_id=t.id AND id=$3::bigint)`, user, c.Params("threadID"), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(400, "message does not belong to this conversation")
	}
	return result(c, fiber.Map{"read": true})
}
