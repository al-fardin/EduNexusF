package notifications

import (
	"errors"
	"github.com/edunexus/edunexus/internal/testsupport"
	"testing"
)

type recordingMailer struct {
	calls int
	fail  bool
}

func (m *recordingMailer) Send(to, subject, body string) error {
	m.calls++
	if m.fail {
		return errors.New("temporary SMTP failure")
	}
	return nil
}
func TestNotificationOutboxAndReminders(t *testing.T) {
	f := testsupport.Database(t)
	mailer := &recordingMailer{}
	h := &Handler{db: f.DB, mailer: mailer, emailConfigured: true}
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_assignments(classroom_id,created_by,title,due_at,max_points,status) VALUES($1::uuid,$2::uuid,'Due assignment',now()+interval '30 minutes',100,'draft');`, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `UPDATE classroom_assignments SET status='published' WHERE classroom_id=$1::uuid`, f.ClassID)
	if err != nil {
		t.Fatal(err)
	}
	// Keep this test's delivery query from claiming other fixtures' pending mail.
	_, err = f.DB.Exec(t.Context(), `UPDATE user_notifications SET email_status='skipped' WHERE classroom_id<>$1::uuid AND email_status='pending'`, f.ClassID)
	if err != nil {
		t.Fatal(err)
	}
	mailer.fail = true
	if err = h.deliver(t.Context()); err != nil {
		t.Fatal(err)
	}
	var state string
	var attempts int
	err = f.DB.QueryRow(t.Context(), `SELECT email_status,email_attempts FROM user_notifications WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&state, &attempts)
	if err != nil || state != "pending" || attempts != 1 {
		t.Fatalf("failed delivery not retained: %s %d %v", state, attempts, err)
	}
	mailer.fail = false
	f.DB.Exec(t.Context(), `UPDATE user_notifications SET email_next_at=now() WHERE classroom_id=$1::uuid`, f.ClassID)
	if err = h.deliver(t.Context()); err != nil {
		t.Fatal(err)
	}
	err = f.DB.QueryRow(t.Context(), `SELECT email_status,email_attempts FROM user_notifications WHERE classroom_id=$1::uuid`, f.ClassID).Scan(&state, &attempts)
	if err != nil || state != "sent" || attempts != 2 {
		t.Fatalf("retry did not complete: %s %d %v", state, attempts, err)
	}
	h.tick(t.Context())
	before := mailer.calls
	h.tick(t.Context())
	if mailer.calls != before {
		t.Fatal("reminders duplicated on the next poll")
	}
	if before < 3 {
		t.Fatal("upcoming deadline reminders not generated")
	}
}
