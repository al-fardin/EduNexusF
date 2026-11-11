package notifications

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"html"
	"strings"
)

const emailMembership = `EXISTS(SELECT 1 FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE m.classroom_id=n.classroom_id AND m.user_id=n.user_id AND m.status='active' AND cl.status='active' AND cl.deleted_at IS NULL)`

func (h *Handler) prepareDigest(ctx context.Context) error {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var user, frequency string
	err = tx.QueryRow(ctx, `SELECT p.user_id::text,p.email_frequency FROM notification_preferences p JOIN users u ON u.id=p.user_id WHERE p.email_enabled AND p.email_frequency IN ('daily','weekly') AND p.email_digest_at+CASE WHEN p.email_frequency='daily' THEN interval '1 day' ELSE interval '7 days' END<=now() AND u.email_verified AND u.status='active' AND u.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM notification_email_digests d WHERE d.user_id=p.user_id AND d.state IN ('pending','sending')) AND EXISTS(SELECT 1 FROM user_notifications n WHERE n.user_id=p.user_id AND n.email_status='pending' AND `+emailMembership+`) ORDER BY p.email_digest_at FOR UPDATE OF p SKIP LOCKED LIMIT 1`).Scan(&user, &frequency)
	if err != nil {
		return err
	}
	rows, err := tx.Query(ctx, `SELECT n.id::text FROM user_notifications n WHERE n.user_id=$1::uuid AND n.email_status='pending' AND `+emailMembership+` ORDER BY n.created_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 500`, user)
	if err != nil {
		return err
	}
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(ids) == 0 {
		return pgx.ErrNoRows
	}
	if _, err = tx.Exec(ctx, `INSERT INTO notification_email_digests(user_id,frequency,notification_ids) VALUES($1::uuid,$2,$3::uuid[])`, user, frequency, ids); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE user_notifications SET email_status='digest' WHERE id=ANY($1::uuid[]);`, ids); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE notification_preferences SET email_digest_at=now() WHERE user_id=$1::uuid`, user); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (h *Handler) deliverDigest(ctx context.Context) error {
	var id, user, frequency, lease string
	var ids []string
	var attempts int
	err := h.db.QueryRow(ctx, `UPDATE notification_email_digests d SET state='sending',attempts=d.attempts+1,next_at=now()+interval '2 minutes',lease=gen_random_uuid() FROM(SELECT id FROM notification_email_digests WHERE state IN ('pending','sending') AND next_at<=now() AND attempts<5 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) q WHERE d.id=q.id RETURNING d.id::text,d.user_id::text,d.frequency,d.notification_ids::text[],d.attempts,d.lease::text`).Scan(&id, &user, &frequency, &ids, &attempts, &lease)
	if err != nil {
		return err
	}
	var to string
	var allowed bool
	err = h.db.QueryRow(ctx, `SELECT u.email,u.status='active' AND u.deleted_at IS NULL AND u.email_verified AND p.email_enabled AND p.email_frequency=$2 FROM users u JOIN notification_preferences p ON p.user_id=u.id WHERE u.id=$1::uuid`, user, frequency).Scan(&to, &allowed)
	if err != nil && err != pgx.ErrNoRows {
		return err
	}
	state := "skipped"
	var sendErr error
	validIDs := make([]string, 0)
	var body strings.Builder
	if allowed {
		rows, e := h.db.Query(ctx, `SELECT n.id::text,n.title,n.body,n.url FROM user_notifications n WHERE n.id=ANY($1::uuid[]) AND n.user_id=$2::uuid AND n.email_status='digest' AND `+emailMembership+` ORDER BY n.created_at`, ids, user)
		if e != nil {
			return e
		}
		for rows.Next() {
			var notification, title, text, path string
			if e = rows.Scan(&notification, &title, &text, &path); e != nil {
				rows.Close()
				return e
			}
			validIDs = append(validIDs, notification)
			if len(validIDs) <= 100 {
				body.WriteString("<section>" + strings.TrimSuffix(emailBody(title, text, path), "<p>Manage email preferences in EduNexus Notifications.</p>") + "</section>")
			}
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		if len(validIDs) > 0 {
			if len(validIDs) > 100 {
				fmt.Fprintf(&body, "<p>%s more updates are available in your inbox.</p>", html.EscapeString(fmt.Sprint(len(validIDs)-100)))
			}
			sendErr = h.mailer.Send(to, "EduNexus · "+frequency+" summary", `<div style="font:15px system-ui;color:#251333;max-width:640px;margin:auto"><h1>EduNexus summary</h1>`+body.String()+`<p>Manage email preferences in EduNexus Notifications.</p></div>`)
			state = "sent"
			if sendErr != nil {
				state = "pending"
				if attempts >= 5 {
					state = "failed"
				}
			}
		}
	}
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `UPDATE notification_email_digests SET state=$2,next_at=now()+($3::int*interval '1 minute') WHERE id=$1::uuid AND lease=$4::uuid AND state='sending'`, id, state, attempts*attempts, lease)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return nil
	}
	if state == "sent" {
		if _, err = tx.Exec(ctx, `UPDATE user_notifications SET email_status='sent',email_sent_at=now() WHERE id=ANY($1::uuid[]) AND user_id=$2::uuid AND email_status='digest'`, validIDs, user); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE user_notifications SET email_status='skipped' WHERE id=ANY($1::uuid[]) AND NOT(id=ANY($2::uuid[])) AND user_id=$3::uuid AND email_status='digest'`, ids, validIDs, user); err != nil {
			return err
		}
	} else if state == "skipped" || state == "failed" {
		if _, err = tx.Exec(ctx, `UPDATE user_notifications n SET email_status=CASE WHEN $3='failed' THEN 'failed' WHEN EXISTS(SELECT 1 FROM notification_preferences p WHERE p.user_id=n.user_id AND p.email_enabled) AND `+emailMembership+` THEN 'pending' ELSE 'skipped' END WHERE id=ANY($1::uuid[]) AND user_id=$2::uuid AND email_status='digest'`, ids, user, state); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
