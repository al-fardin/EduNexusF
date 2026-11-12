package messaging

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
	"time"
)

func (h *Handler) Block(c *fiber.Ctx) error {
	user, e := h.thread(c)
	if e != nil {
		return e
	}
	if c.Method() == "PUT" {
		var req struct {
			Blocked bool `json:"blocked"`
		}
		if c.BodyParser(&req) != nil {
			return fiber.NewError(400, "Invalid block setting")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('message-policy:'||$1,0))`, c.Params("id")); e != nil {
			return e
		}
		if req.Blocked {
			_, e = tx.Exec(c.UserContext(), `INSERT INTO conversation_blocks(conversation_id,user_id) VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`, c.Params("threadID"), user)
		} else {
			_, e = tx.Exec(c.UserContext(), `DELETE FROM conversation_blocks WHERE conversation_id=$1::uuid AND user_id=$2::uuid`, c.Params("threadID"), user)
		}
		if e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
	}
	var own, blocked bool
	e = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM conversation_blocks WHERE conversation_id=$1::uuid AND user_id=$2::uuid),EXISTS(SELECT 1 FROM conversation_blocks WHERE conversation_id=$1::uuid)`, c.Params("threadID"), user).Scan(&own, &blocked)
	if e != nil {
		return e
	}
	return result(c, fiber.Map{"blocked_by_you": own, "blocked": blocked})
}
func (h *Handler) ReportMessage(c *fiber.Ctx) error {
	user, e := h.thread(c)
	if e != nil {
		return e
	}
	message, e := strconv.ParseInt(c.Params("messageID"), 10, 64)
	if e != nil || message <= 0 {
		return fiber.NewError(400, "Invalid message")
	}
	var req struct {
		Reason string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || len([]rune(strings.TrimSpace(req.Reason))) < 10 || len([]rune(req.Reason)) > 2000 {
		return fiber.NewError(400, "Explain the report in 10–2000 characters")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); e != nil {
		return e
	}
	var existing string
	e = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_message_reports WHERE reporter_id=$1::uuid AND message_id=$2`, user, message).Scan(&existing)
	if e == nil {
		return result(c, fiber.Map{"id": existing})
	}
	if e != pgx.ErrNoRows {
		return e
	}
	var count int
	if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_message_reports WHERE reporter_id=$1::uuid AND created_at>now()-interval '1 day'`, user).Scan(&count); e != nil {
		return e
	}
	if count >= 10 {
		return fiber.NewError(429, "Daily report limit reached")
	}
	id := uuid.NewString()
	tag, e := tx.Exec(c.UserContext(), `INSERT INTO classroom_message_reports(id,classroom_id,message_id,reporter_id,sender_id,message_text,file_name,reason) SELECT $1::uuid,$2::uuid,id,$3::uuid,sender_id,body,file_name,$4 FROM classroom_messages WHERE id=$5 AND conversation_id=$6::uuid AND sender_id<>$3::uuid AND deleted_at IS NULL`, id, c.Params("id"), user, strings.TrimSpace(req.Reason), message, c.Params("threadID"))
	if e != nil {
		return e
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(404, "Message cannot be reported")
	}
	if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_message_report_events(report_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,'open',$3)`, id, user, req.Reason); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return result(c, fiber.Map{"id": id})
}
func (h *Handler) Reports(c *fiber.Ctx) error {
	user, role, e := h.member(c)
	if e != nil {
		return e
	}
	if role != "teacher" {
		return fiber.NewError(403, "Class teacher permission required")
	}
	if c.Method() == "POST" {
		var req struct {
			Version int    `json:"version"`
			Status  string `json:"status"`
			Reason  string `json:"reason"`
		}
		if _, e = uuid.Parse(c.Params("reportID")); e != nil {
			return fiber.NewError(400, "Invalid report")
		}
		if c.BodyParser(&req) != nil || req.Version < 1 || (req.Status != "resolved" && req.Status != "dismissed") || len([]rune(strings.TrimSpace(req.Reason))) < 10 || len([]rune(req.Reason)) > 2000 {
			return fiber.NewError(400, "Provide a decision and reason")
		}
		tx, e := h.db.Begin(c.UserContext())
		if e != nil {
			return e
		}
		defer tx.Rollback(c.UserContext())
		tag, e := tx.Exec(c.UserContext(), `UPDATE classroom_message_reports SET status=$4,decision=$5,reviewed_by=$3::uuid,reviewed_at=now(),version=version+1 WHERE id=$1::uuid AND classroom_id=$2::uuid AND sender_id<>$3::uuid AND reporter_id<>$3::uuid AND version=$6 AND status='open'`, c.Params("reportID"), c.Params("id"), user, req.Status, req.Reason, req.Version)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fiber.NewError(409, "Report changed, is closed, or requires another reviewer")
		}
		if _, e = tx.Exec(c.UserContext(), `INSERT INTO classroom_message_report_events(report_id,actor_id,status,reason) VALUES($1::uuid,$2::uuid,$3,$4)`, c.Params("reportID"), user, req.Status, req.Reason); e != nil {
			return e
		}
		if e = tx.Commit(c.UserContext()); e != nil {
			return e
		}
		return result(c, fiber.Map{"saved": true})
	}
	state := c.Query("state", "open")
	if state != "open" && state != "closed" {
		return fiber.NewError(400, "Invalid report status")
	}
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 10000 {
		return fiber.NewError(400, "Invalid page")
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT r.id::text,r.message_text,r.file_name,r.reason,r.status,r.decision,r.version,r.created_at,trim(u.first_name||' '||u.last_name),r.sender_id=$2::uuid OR r.reporter_id=$2::uuid,COALESCE((SELECT jsonb_agg(jsonb_build_object('status',v.status,'reason',v.reason,'at',v.created_at) ORDER BY v.id) FROM classroom_message_report_events v WHERE v.report_id=r.id),'[]'::jsonb) FROM classroom_message_reports r JOIN users u ON u.id=r.reporter_id WHERE r.classroom_id=$1::uuid AND (($3='open' AND r.status='open') OR ($3='closed' AND r.status<>'open')) ORDER BY r.created_at DESC,r.id LIMIT 51 OFFSET $4`, c.Params("id"), user, state, offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, body, file, reason, status, decision, reporter string
		var version int
		var created time.Time
		var conflict bool
		var history any
		if e = rows.Scan(&id, &body, &file, &reason, &status, &decision, &version, &created, &reporter, &conflict, &history); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "body": body, "file_name": file, "reason": reason, "status": status, "decision": decision, "version": version, "created_at": created, "reporter": reporter, "conflict": conflict, "history": history})
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
	return result(c, fiber.Map{"items": items, "next_offset": next})
}
