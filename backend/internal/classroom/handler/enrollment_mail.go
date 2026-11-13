package handler

import (
	"context"
	"errors"
	"html"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/edunexus/edunexus/internal/platform/mail"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func invitationOrigin() (*url.URL, bool) {
	base, e := url.Parse(os.Getenv("FRONTEND_URL"))
	ok := e == nil && base.Host != "" && base.User == nil && base.RawQuery == "" && base.Fragment == "" && (base.Path == "" || base.Path == "/") && (base.Scheme == "https" || base.Scheme == "http" && (base.Hostname() == "localhost" || base.Hostname() == "127.0.0.1"))
	return base, ok
}
func (h *EnrollmentPhase5) ConfigureEnrollmentMail(app *fiber.App, mailer mail.Mailer, configured bool) {
	h.mailer = mailer
	_, originOK := invitationOrigin()
	h.emailConfigured = configured && originOK && mailer != nil
	ctx, cancel := context.WithCancel(context.Background())
	app.Hooks().OnListen(func(fiber.ListenData) error {
		go func() {
			timer := time.NewTicker(30 * time.Second)
			defer timer.Stop()
			for {
				h.sendEnrollmentMail(ctx)
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
func (h *EnrollmentPhase5) sendEnrollmentMail(ctx context.Context) {
	if !h.emailConfigured {
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	_, _ = h.db.Exec(ctx, `UPDATE classroom_student_invitations SET email_status='failed',email_lease=NULL WHERE email_status='sending' AND email_attempts>=5 AND email_next_at<=now()`)
	for range 5 {
		if ctx.Err() != nil {
			return
		}
		err := h.deliverInvitation(ctx)
		if errors.Is(err, pgx.ErrNoRows) {
			return
		}
		if err != nil {
			log.Print("Invitation email delivery deferred")
			return
		}
	}
}

// Delivery is at least once. The lease/version guard prevents an old worker
// from overwriting a renewed, accepted or revoked invitation's delivery state.
func (h *EnrollmentPhase5) deliverInvitation(ctx context.Context) error {
	base, ok := invitationOrigin()
	if !ok || h.mailer == nil {
		return errors.New("Invitation delivery is not configured")
	}
	lease := uuid.NewString()
	var id, email, class, teacher string
	var expires time.Time
	var version, attempts int
	e := h.db.QueryRow(ctx, `UPDATE classroom_student_invitations i SET email_status='sending',email_attempts=i.email_attempts+1,email_next_at=now()+interval '2 minutes',email_lease=$1::uuid FROM (SELECT i.id FROM classroom_student_invitations i JOIN classrooms cl ON cl.id=i.classroom_id WHERE i.status='pending' AND i.expires_at>now() AND cl.status='active' AND cl.deleted_at IS NULL AND i.email_status IN ('pending','sending') AND i.email_attempts<5 AND i.email_next_at<=now() AND NOT EXISTS(SELECT 1 FROM users u JOIN classroom_memberships m ON m.user_id=u.id WHERE lower(u.email)=i.email AND m.classroom_id=i.classroom_id AND m.status='active') ORDER BY i.updated_at FOR UPDATE OF i SKIP LOCKED LIMIT 1) picked,classrooms cl LEFT JOIN users u ON u.id=cl.owner_id WHERE i.id=picked.id AND cl.id=i.classroom_id RETURNING i.id::text,i.email,cl.name,trim(u.first_name||' '||u.last_name),i.version,i.email_attempts,i.expires_at`, lease).Scan(&id, &email, &class, &teacher, &version, &attempts, &expires)
	if e != nil {
		return e
	}
	link := base.ResolveReference(&url.URL{Path: "/invitations", RawQuery: "invite=" + url.QueryEscape(id)}).String()
	body := "<h2>Class invitation</h2><p>" + html.EscapeString(teacher) + " invited you to <strong>" + html.EscapeString(class) + "</strong>.</p><p><a href=\"" + html.EscapeString(link) + "\">Review invitation</a></p><p>Sign in or register with this email address, verify it, and choose whether to join. Accepting does not require the class code.</p><p>Expires: " + html.EscapeString(expires.UTC().Format(time.RFC1123)) + ".</p><p>If this invitation is unexpected, you can ignore or decline it.</p>"
	sendErr := h.mailer.Send(email, "EduNexus · Class invitation", body)
	state := "sent"
	if sendErr != nil {
		state = "pending"
		if attempts >= 5 {
			state = "failed"
		}
	}
	_, e = h.db.Exec(ctx, `UPDATE classroom_student_invitations SET email_status=$2,email_sent_at=CASE WHEN $2='sent' THEN now() ELSE email_sent_at END,email_next_at=now()+($3::int*interval '1 minute'),email_lease=NULL WHERE id=$1::uuid AND version=$4 AND email_lease=$5::uuid AND status='pending'`, id, state, attempts*attempts, version, lease)
	if e != nil {
		return e
	}
	return sendErr
}
