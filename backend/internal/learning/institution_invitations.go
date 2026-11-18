package learning

import (
	"errors"
	orgs "github.com/edunexus/edunexus/internal/platform/institutions"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"net/mail"
	"strings"
	"time"
)

func (h *Handler) InstitutionInvitations(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if _, e = h.institutionRole(c, user, true); e != nil {
		return e
	}
	org := c.Params("institutionID")
	if c.Method() == "GET" {
		offset, e := institutionPage(c)
		if e != nil {
			return e
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT id::text,email,role,status,version,expires_at FROM institution_invitations WHERE institution_id=$1::uuid ORDER BY created_at DESC,id LIMIT 51 OFFSET $2`, org, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, email, role, status string
			var version int
			var expires time.Time
			if e = rows.Scan(&id, &email, &role, &status, &version, &expires); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "email": email, "role": role, "status": status, "version": version, "expires_at": expires})
		}
		if e = rows.Err(); e != nil {
			return e
		}
		next := -1
		if len(items) > 50 {
			items = items[:50]
			next = offset + 50
		}
		return respond(c, 200, fiber.Map{"items": items, "next_offset": next})
	}
	var req struct {
		Email   string `json:"email"`
		Role    string `json:"role"`
		Version int    `json:"version"`
	}
	if c.BodyParser(&req) != nil {
		return fail(400, "Invalid invitation")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	actorRole, e := orgs.Lock(c.UserContext(), tx, org, user, true)
	if e != nil {
		return e
	}
	id := c.Params("invitationID")
	if c.Method() == "DELETE" {
		if validID(id) != nil || req.Version < 1 {
			return fail(400, "Invalid invitation version")
		}
		var role string
		e = tx.QueryRow(c.UserContext(), `SELECT role FROM institution_invitations WHERE id=$1::uuid AND institution_id=$2::uuid AND status='pending' AND version=$3 FOR UPDATE`, id, org, req.Version).Scan(&role)
		if errors.Is(e, pgx.ErrNoRows) {
			return fail(409, "Invitation changed or was already answered")
		}
		if e != nil {
			return e
		}
		if role == "admin" && actorRole != "owner" {
			return fail(403, "Only the owner can manage administrator invitations")
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE institution_invitations SET status='revoked',version=version+1 WHERE id=$1::uuid`, id); e != nil {
			return e
		}
		if e = orgs.Record(c.UserContext(), tx, org, user, "invitation_revoked", id, nil, nil, ""); e != nil {
			return e
		}
	} else {
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		address, err := mail.ParseAddress(req.Email)
		if err != nil || address.Address != req.Email || len(req.Email) > 254 || req.Role != "admin" && req.Role != "teacher" && req.Role != "student" {
			return fail(400, "Choose an email address and institution role")
		}
		if req.Role == "admin" && actorRole != "owner" {
			return fail(403, "Only the owner can invite administrators")
		}
		var joined bool
		if e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM institution_members m JOIN users u ON u.id=m.user_id WHERE m.institution_id=$1::uuid AND lower(u.email)=$2 AND m.active)`, org, req.Email).Scan(&joined); e != nil {
			return e
		}
		if joined {
			return fail(409, "This account is already an institution member")
		}
		var count int
		if e = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM institution_invitations WHERE institution_id=$1::uuid AND status='pending' AND expires_at>now()`, org).Scan(&count); e != nil {
			return e
		}
		if count >= 500 {
			return fail(422, "Use up to 500 pending invitations")
		}
		if _, e = tx.Exec(c.UserContext(), `UPDATE institution_invitations SET status='expired',version=version+1 WHERE institution_id=$1::uuid AND email=$2 AND status='pending' AND expires_at<=now()`, org, req.Email); e != nil {
			return e
		}
		e = tx.QueryRow(c.UserContext(), `INSERT INTO institution_invitations(institution_id,email,role,invited_by) VALUES($1::uuid,$2,$3,$4::uuid) RETURNING id::text`, org, req.Email, req.Role, user).Scan(&id)
		if e != nil {
			return institutionUnique(e)
		}
		if e = orgs.Record(c.UserContext(), tx, org, user, "member_invited", id, nil, fiber.Map{"email": req.Email, "role": req.Role}, ""); e != nil {
			return e
		}
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"id": id})
}
func (h *Handler) InstitutionInbox(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	offset, e := institutionPage(c)
	if e != nil {
		return e
	}
	var email string
	var verified bool
	e = h.db.QueryRow(c.UserContext(), `SELECT lower(email),email_verified FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL`, user).Scan(&email, &verified)
	if e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT inv.id::text,i.id::text,i.name,inv.role,inv.version,inv.expires_at FROM institution_invitations inv JOIN institutions i ON i.id=inv.institution_id WHERE $3 AND inv.email=$1 AND inv.status='pending' AND inv.expires_at>now() AND NOT EXISTS(SELECT 1 FROM institution_members m WHERE m.institution_id=i.id AND m.user_id=$2::uuid AND m.active) ORDER BY inv.created_at DESC,inv.id LIMIT 51 OFFSET $4`, email, user, verified, offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, org, name, role string
		var version int
		var expires time.Time
		if e = rows.Scan(&id, &org, &name, &role, &version, &expires); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "institution_id": org, "name": name, "role": role, "version": version, "expires_at": expires})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	return respond(c, 200, fiber.Map{"items": items, "next_offset": next, "verified": verified})
}
func (h *Handler) RespondInstitutionInvite(c *fiber.Ctx) error {
	user, e := institutionActor(c)
	if e != nil {
		return e
	}
	if validID(c.Params("invitationID")) != nil {
		return fail(400, "Invalid invitation")
	}
	var req struct {
		Version int    `json:"version"`
		Action  string `json:"action"`
	}
	if c.BodyParser(&req) != nil || req.Version < 1 || req.Action != "accept" && req.Action != "decline" {
		return fail(400, "Choose accept or decline with the current invitation version")
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	var email string
	var verified bool
	e = tx.QueryRow(c.UserContext(), `SELECT lower(email),email_verified FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR UPDATE`, user).Scan(&email, &verified)
	if e != nil {
		return e
	}
	if !verified {
		return fail(403, "Verify your email before accepting institution invitations")
	}
	var org string
	e = tx.QueryRow(c.UserContext(), `SELECT institution_id::text FROM institution_invitations WHERE id=$1::uuid AND email=$2`, c.Params("invitationID"), email).Scan(&org)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(404, "Invitation not found")
	}
	if e != nil {
		return e
	}
	var exists bool
	if e = tx.QueryRow(c.UserContext(), `SELECT true FROM institutions WHERE id=$1::uuid FOR UPDATE`, org).Scan(&exists); e != nil {
		return e
	}
	var role, inviter string
	e = tx.QueryRow(c.UserContext(), `SELECT role,COALESCE(invited_by::text,'') FROM institution_invitations WHERE id=$1::uuid AND email=$2 AND version=$3 AND status='pending' AND expires_at>now() FOR UPDATE`, c.Params("invitationID"), email, req.Version).Scan(&role, &inviter)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(409, "Invitation expired, changed or was already answered")
	}
	if e != nil {
		return e
	}
	status := "declined"
	if req.Action == "accept" {
		var allowed bool
		if inviter != "" {
			e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM institution_members m JOIN users u ON u.id=m.user_id WHERE m.institution_id=$1::uuid AND m.user_id=$2::uuid AND m.active AND u.status='active' AND u.deleted_at IS NULL AND(m.role='owner' OR(m.role='admin' AND $3<>'admin')))`, org, inviter, role).Scan(&allowed)
			if e != nil {
				return e
			}
		}
		if !allowed {
			return fail(409, "The inviter no longer has permission to grant this role")
		}
		var count, total int
		e = tx.QueryRow(c.UserContext(), `SELECT(SELECT count(*)::int FROM institution_members WHERE institution_id=$1::uuid AND active),(SELECT count(*)::int FROM institution_members WHERE user_id=$2::uuid AND active)`, org, user).Scan(&count, &total)
		if e != nil {
			return e
		}
		if count >= 10000 || total >= 100 {
			return fail(422, "Institution membership limit reached")
		}
		tag, e := tx.Exec(c.UserContext(), `INSERT INTO institution_members(institution_id,user_id,role) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(institution_id,user_id) DO UPDATE SET active=true,role=excluded.role,version=institution_members.version+1,joined_at=now() WHERE NOT institution_members.active AND institution_members.role<>'owner'`, org, user, role)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "This account is already an institution member")
		}
		status = "accepted"
	}
	if _, e = tx.Exec(c.UserContext(), `UPDATE institution_invitations SET status=$2,version=version+1 WHERE id=$1::uuid`, c.Params("invitationID"), status); e != nil {
		return e
	}
	if e = orgs.Record(c.UserContext(), tx, org, user, "invitation_"+status, c.Params("invitationID"), nil, fiber.Map{"role": role}, ""); e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"institution_id": org, "status": status})
}
