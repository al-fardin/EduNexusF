package calling

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strings"
)

func (h *Handler) action(c *fiber.Ctx) error {
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
	var r struct {
		Action string `json:"action"`
	}
	if c.BodyParser(&r) != nil {
		return fiber.NewError(400, "invalid call action")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var state string
	var owner *string
	e = tx.QueryRow(c.UserContext(), `SELECT state,CASE WHEN caller_id=$2::uuid THEN caller_session ELSE callee_session END::text FROM classroom_calls WHERE id=$1::uuid FOR UPDATE`, item.ID, u).Scan(&state, &owner)
	if e != nil {
		return e
	}
	if state == "ended" {
		if r.Action == "accept" {
			return fiber.NewError(409, "This call has ended.")
		}
		return result(c, fiber.Map{"saved": true, "state": "ended"})
	}
	if r.Action != "end" && r.Action != "force-end" && r.Action != "decline" {
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, item.Class); e != nil {
			return e
		}
		var peer string
		e = tx.QueryRow(c.UserContext(), eligible, item.Thread, item.Caller).Scan(&peer)
		if errors.Is(e, pgx.ErrNoRows) {
			return fiber.NewError(403, "Calling has been paused in this conversation.")
		}
		if e != nil {
			return e
		}
	}
	switch r.Action {
	case "accept":
		if u != item.Callee || state != "ringing" {
			if u == item.Callee && state == "active" && owner != nil && *owner == s {
				return result(c, fiber.Map{"saved": true})
			}
			return fiber.NewError(409, "This call was already answered or ended.")
		}
		_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET state='active',callee_session=$2::uuid,accepted_at=now(),callee_seen_at=now() WHERE id=$1::uuid`, item.ID, s)
	case "force-end":
		_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET state='ended',reason='ended',ended_at=now() WHERE id=$1::uuid`, item.ID)
	case "decline":
		if u != item.Callee || state != "ringing" {
			return fiber.NewError(409, "This call is no longer ringing.")
		}
		_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET state='ended',reason='declined',ended_at=now() WHERE id=$1::uuid`, item.ID)
	case "end", "failed", "heartbeat", "connected":
		if owner == nil || *owner != s {
			return fiber.NewError(409, "This call is open in another tab.")
		}
		switch r.Action {
		case "end", "failed":
			reason := "ended"
			if state == "ringing" {
				reason = "cancelled"
			}
			if r.Action == "failed" {
				reason = "failed"
			}
			_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET state='ended',reason=$2,ended_at=now() WHERE id=$1::uuid`, item.ID, reason)
		case "heartbeat":
			_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET caller_seen_at=CASE WHEN caller_id=$2::uuid THEN now() ELSE caller_seen_at END,callee_seen_at=CASE WHEN callee_id=$2::uuid THEN now() ELSE callee_seen_at END WHERE id=$1::uuid`, item.ID, u)
		case "connected":
			if state != "active" {
				return fiber.NewError(409, "Answer the call first.")
			}
			_, e = tx.Exec(c.UserContext(), `UPDATE classroom_calls SET connected_at=COALESCE(connected_at,now()) WHERE id=$1::uuid`, item.ID)
		}
	default:
		return fiber.NewError(400, "unknown call action")
	}
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	if r.Action == "heartbeat" {
		return result(c, fiber.Map{"saved": true, "state": state})
	}
	return result(c, fiber.Map{"saved": true})
}

func validSignal(kind string, raw json.RawMessage) bool {
	if len(raw) == 0 || len(raw) > 65536 {
		return false
	}
	switch kind {
	case "offer", "answer":
		var p struct {
			Type string `json:"type"`
			SDP  string `json:"sdp"`
		}
		return json.Unmarshal(raw, &p) == nil && p.Type == kind && len(p.SDP) > 0 && len(p.SDP) <= 60000 && strings.HasPrefix(p.SDP, "v=0")
	case "ice":
		var p struct {
			Candidate string  `json:"candidate"`
			Mid       *string `json:"sdpMid"`
			Index     *int    `json:"sdpMLineIndex"`
		}
		return json.Unmarshal(raw, &p) == nil && len(p.Candidate) > 0 && len(p.Candidate) < 4096 && (p.Mid == nil || len(*p.Mid) < 128) && (p.Index == nil || (*p.Index >= 0 && *p.Index < 32))
	}
	return false
}
func (h *Handler) signal(c *fiber.Ctx) error {
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
	if !item.Owned {
		return fiber.NewError(409, "This call is open in another tab.")
	}
	var r struct {
		Kind    string          `json:"kind"`
		Payload json.RawMessage `json:"payload"`
		Request string          `json:"request_id"`
	}
	if c.BodyParser(&r) != nil || !validSignal(r.Kind, r.Payload) {
		return fiber.NewError(400, "invalid call signal")
	}
	if _, e = uuid.Parse(r.Request); e != nil {
		return fiber.NewError(400, "invalid signal request")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var state string
	e = tx.QueryRow(c.UserContext(), `SELECT state FROM classroom_calls WHERE id=$1::uuid FOR UPDATE`, item.ID).Scan(&state)
	if e != nil {
		return e
	}
	if state == "ended" {

		return fiber.NewError(409, "This call has ended.")
	}
	if r.Kind == "offer" && u != item.Caller || r.Kind == "answer" && (u != item.Callee || state != "active") {
		return fiber.NewError(403, "signal is not allowed")
	}
	if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, item.Class); e != nil {
		return e
	}
	var peer string
	e = tx.QueryRow(c.UserContext(), eligible, item.Thread, item.Caller).Scan(&peer)
	if errors.Is(e, pgx.ErrNoRows) {
		return fiber.NewError(403, "Calling has been paused.")
	}
	if e != nil {
		return e
	}
	var count int
	if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_call_signals WHERE call_id=$1::uuid`, item.ID).Scan(&count); e != nil {
		return e
	}
	if count >= 512 {
		return fiber.NewError(429, "Call signaling limit reached.")
	}
	var previousKind string
	var previous json.RawMessage
	e = tx.QueryRow(c.UserContext(), `SELECT kind,payload FROM classroom_call_signals WHERE call_id=$1::uuid AND sender_id=$2::uuid AND request_id=$3::uuid`, item.ID, u, r.Request).Scan(&previousKind, &previous)
	if e == nil {
		var a, b any
		json.Unmarshal(previous, &a)
		json.Unmarshal(r.Payload, &b)
		sameA, _ := json.Marshal(a)
		sameB, _ := json.Marshal(b)
		if previousKind != r.Kind || string(sameA) != string(sameB) {
			return fiber.NewError(409, "Signal request already used.")
		}
		return result(c, fiber.Map{"saved": true})
	}
	if !errors.Is(e, pgx.ErrNoRows) {
		return e
	}
	if r.Kind == "offer" || r.Kind == "answer" {
		var exists bool
		e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_call_signals WHERE call_id=$1::uuid AND kind=$2)`, item.ID, r.Kind).Scan(&exists)
		if e != nil {
			return e
		}
		if exists {
			var same bool
			if e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_call_signals WHERE call_id=$1::uuid AND kind=$2 AND sender_id=$3::uuid AND payload=$4::jsonb)`, item.ID, r.Kind, u, string(r.Payload)).Scan(&same); e != nil {
				return e
			}
			if same {
				return result(c, fiber.Map{"saved": true})
			}
			return fiber.NewError(409, "Call description already sent.")
		}
	}
	_, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_call_signals(call_id,sender_id,request_id,kind,payload) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb)`, item.ID, u, r.Request, r.Kind, string(r.Payload))
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return result(c, fiber.Map{"saved": true})
}
