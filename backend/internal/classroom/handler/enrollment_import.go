package handler

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

type invitationImportRow struct {
	Line    int    `json:"line"`
	Email   string `json:"email"`
	State   string `json:"state"`
	Version int    `json:"version"`
}

func parseInvitationCSV(raw string) ([]invitationImportRow, error) {
	if len(raw) > 32768 {
		return nil, fiber.NewError(400, "CSV must be at most 32 KB")
	}
	r := csv.NewReader(strings.NewReader(strings.TrimPrefix(raw, "\ufeff")))
	r.TrimLeadingSpace = true
	header, err := r.Read()
	if err != nil || len(header) != 1 || strings.ToLower(strings.TrimSpace(header[0])) != "email" {
		return nil, fiber.NewError(400, "Use one email column with the header email")
	}
	rows := []invitationImportRow{}
	seen := map[string]bool{}
	for {
		record, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fiber.NewError(400, "Invalid CSV format")
		}
		if len(rows) >= 100 {
			return nil, fiber.NewError(400, "Import at most 100 emails at a time")
		}
		line, _ := r.FieldPos(0)
		email, valid := normalizedInvitationEmail(record[0])
		state := "ready"
		if !valid {
			state = "invalid"
		} else if seen[email] {
			state = "duplicate"
		}
		seen[email] = true
		rows = append(rows, invitationImportRow{Line: line, Email: email, State: state})
	}
	if len(rows) == 0 {
		return nil, fiber.NewError(400, "Add at least one student email")
	}
	return rows, nil
}

// Preview and commit share a locked snapshot. A stale preview cannot resend changed invitations.
func (h *EnrollmentPhase5) ImportInvitations(c *fiber.Ctx) error {
	user, err := h.teacher(c, false)
	if err != nil {
		return err
	}
	var req struct {
		CSV      string `json:"csv"`
		Action   string `json:"action"`
		Revision string `json:"revision"`
	}
	if c.BodyParser(&req) != nil || (req.Action != "preview" && req.Action != "commit") {
		return fiber.NewError(400, "Choose preview or commit")
	}
	rows, err := parseInvitationCSV(req.CSV)
	if err != nil {
		return err
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = lockEnrollmentTeacher(c.UserContext(), tx, c.Params("id"), user, false); err != nil {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM users WHERE id=$1::uuid FOR UPDATE`, user); err != nil {
		return err
	}
	var used int
	if err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_invitation_events WHERE actor_id=$1::uuid AND status='pending' AND created_at>now()-interval '1 day'`, user).Scan(&used); err != nil {
		return err
	}
	ready := 0
	for i := range rows {
		r := &rows[i]
		if r.State != "ready" {
			continue
		}
		var member bool
		if err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM users u JOIN classroom_memberships m ON m.user_id=u.id WHERE lower(u.email)=$2 AND m.classroom_id=$1::uuid AND (m.status='active' OR m.member_role='teacher'))`, c.Params("id"), r.Email).Scan(&member); err != nil {
			return err
		}
		if member {
			r.State = "member"
			continue
		}
		var updated time.Time
		err = tx.QueryRow(c.UserContext(), `SELECT version,updated_at FROM classroom_student_invitations WHERE classroom_id=$1::uuid AND email=$2`, c.Params("id"), r.Email).Scan(&r.Version, &updated)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err == nil && time.Since(updated) < 10*time.Minute {
			r.State = "cooldown"
			continue
		}
		ready++
	}
	encoded, _ := json.Marshal([]any{c.Params("id"), user, rows, used})
	hash := sha256.Sum256(encoded)
	revision := hex.EncodeToString(hash[:])
	if req.Action == "commit" {
		if req.Revision != revision {
			return fiber.NewError(409, "Invitation preview changed. Preview again")
		}
		if ready == 0 {
			return fiber.NewError(400, "No invitations are ready")
		}
		if ready > 100-used {
			return fiber.NewError(429, "Daily invitation limit reached")
		}
		for _, r := range rows {
			if r.State == "ready" {
				if _, err = inviteEnrollment(c.UserContext(), tx, c.Params("id"), user, r.Email); err != nil {
					return err
				}
			}
		}
		if err = tx.Commit(c.UserContext()); err != nil {
			return err
		}
	}
	return enrollmentResult(c, 200, fiber.Map{"rows": rows, "ready": ready, "remaining": max(0, 100-used), "revision": revision, "created": func() int {
		if req.Action == "commit" {
			return ready
		}
		return 0
	}(), "email_configured": h.emailConfigured})
}
