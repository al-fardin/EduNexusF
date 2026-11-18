// Package institutions supplies transactional organization placement without
// changing classroom enrollment, ownership or coursework permissions.
package institutions

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"sort"
)

type Placement struct {
	Institution string `json:"institution_id"`
	Department  string `json:"department_id"`
	Term        string `json:"term_id"`
}

func (p *Placement) Normalize() error {
	if p.Institution == "" {
		if p.Department != "" || p.Term != "" {
			return fiber.NewError(400, "Choose an institution before a department or semester")
		}
		return nil
	}
	for _, v := range []*string{&p.Institution, &p.Department, &p.Term} {
		if *v == "" {
			continue
		}
		id, e := uuid.Parse(*v)
		if e != nil {
			return fiber.NewError(400, "Invalid institution placement")
		}
		*v = id.String()
	}
	return nil
}
func Record(ctx context.Context, tx pgx.Tx, org, actor, action, target string, before, after any, reason string) error {
	a, e := json.Marshal(before)
	if e != nil {
		return e
	}
	b, e := json.Marshal(after)
	if e != nil {
		return e
	}
	_, e = tx.Exec(ctx, `INSERT INTO institution_activity(institution_id,actor_id,actor_name,action,target_id,before_value,after_value,reason) SELECT $1::uuid,id,trim(first_name||' '||last_name),$3,$4,$5::jsonb,$6::jsonb,$7 FROM users WHERE id=$2::uuid`, org, actor, action, target, a, b, reason)
	return e
}

// Lock serializes institution administration. Placement takes shared locks,
// before locking the placement row, so revocation and attachment cannot race.
func Lock(ctx context.Context, tx pgx.Tx, org, user string, admin bool) (string, error) {
	var exists bool
	if e := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR SHARE`, user).Scan(&exists); e != nil {
		if errors.Is(e, pgx.ErrNoRows) {
			return "", fiber.NewError(403, "Active account required")
		}
		return "", e
	}
	var role string
	e := tx.QueryRow(ctx, `SELECT m.role FROM institutions i JOIN institution_members m ON m.institution_id=i.id AND m.user_id=$2::uuid JOIN users u ON u.id=m.user_id WHERE i.id=$1::uuid AND m.active AND u.status='active' AND u.deleted_at IS NULL FOR UPDATE OF i FOR SHARE OF m,u`, org, user).Scan(&role)
	if errors.Is(e, pgx.ErrNoRows) || e == nil && admin && role != "owner" && role != "admin" {
		return "", fiber.NewError(403, "Institution administrator permission required")
	}
	return role, e
}
func Place(ctx context.Context, tx pgx.Tx, class, actor string, p *Placement, expected int, reason string) (int, error) {
	if p == nil {
		p = &Placement{}
	}
	if e := p.Normalize(); e != nil {
		return 0, e
	}
	if expected < 0 {
		return 0, fiber.NewError(400, "Invalid placement version")
	}
	var actorExists bool
	if e := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR SHARE`, actor).Scan(&actorExists); e != nil {
		if errors.Is(e, pgx.ErrNoRows) {
			return 0, fiber.NewError(403, "Active account required")
		}
		return 0, e
	}
	var owner string
	e := tx.QueryRow(ctx, `SELECT owner_id::text FROM classrooms WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, class).Scan(&owner)
	if errors.Is(e, pgx.ErrNoRows) {
		return 0, fiber.NewError(404, "Class not found")
	}
	if e != nil {
		return 0, e
	}
	if owner != actor {
		return 0, fiber.NewError(403, "Only the class owner can choose its institution")
	}
	var previous string
	e = tx.QueryRow(ctx, `SELECT COALESCE(institution_id::text,'') FROM institution_classrooms WHERE classroom_id=$1::uuid`, class).Scan(&previous)
	if e != nil && !errors.Is(e, pgx.ErrNoRows) {
		return 0, e
	}
	keys := []string{}
	for _, id := range []string{previous, p.Institution} {
		if id != "" && (len(keys) == 0 || keys[0] != id) {
			keys = append(keys, id)
		}
	}
	sort.Strings(keys)
	for _, id := range keys {
		var found string
		e = tx.QueryRow(ctx, `SELECT id::text FROM institutions WHERE id=$1::uuid FOR SHARE`, id).Scan(&found)
		if e != nil && !errors.Is(e, pgx.ErrNoRows) {
			return 0, e
		}
		if errors.Is(e, pgx.ErrNoRows) && id == p.Institution {
			return 0, fiber.NewError(403, "Institution is unavailable")
		}
	}
	if p.Institution != "" {
		var role string
		e = tx.QueryRow(ctx, `SELECT m.role FROM institutions i JOIN institution_members m ON m.institution_id=i.id AND m.user_id=$2::uuid WHERE i.id=$1::uuid AND m.active FOR SHARE OF i,m`, p.Institution, actor).Scan(&role)
		if errors.Is(e, pgx.ErrNoRows) || e == nil && role != "owner" && role != "admin" && role != "teacher" {
			return 0, fiber.NewError(403, "Active institution teaching membership required")
		}
		if e != nil {
			return 0, e
		}
		var valid bool
		e = tx.QueryRow(ctx, `SELECT ($2='' OR EXISTS(SELECT 1 FROM institution_departments WHERE institution_id=$1::uuid AND id=NULLIF($2,'')::uuid)) AND($3='' OR EXISTS(SELECT 1 FROM institution_terms WHERE institution_id=$1::uuid AND id=NULLIF($3,'')::uuid))`, p.Institution, p.Department, p.Term).Scan(&valid)
		if e != nil {
			return 0, e
		}
		if !valid {
			return 0, fiber.NewError(400, "Choose a department and semester from the selected institution")
		}
	}
	var old Placement
	var current int
	e = tx.QueryRow(ctx, `SELECT COALESCE(institution_id::text,''),COALESCE(department_id::text,''),COALESCE(term_id::text,''),version FROM institution_classrooms WHERE classroom_id=$1::uuid FOR UPDATE`, class).Scan(&old.Institution, &old.Department, &old.Term, &current)
	if e != nil && !errors.Is(e, pgx.ErrNoRows) {
		return 0, e
	}
	if current != expected {
		return 0, fiber.NewError(409, "Class placement changed. Reload before saving")
	}
	if old == *p {
		return current, nil
	}
	var version int
	e = tx.QueryRow(ctx, `INSERT INTO institution_classrooms(classroom_id,institution_id,department_id,term_id) VALUES($1::uuid,NULLIF($2,'')::uuid,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid) ON CONFLICT(classroom_id) DO UPDATE SET institution_id=excluded.institution_id,department_id=excluded.department_id,term_id=excluded.term_id,version=institution_classrooms.version+1,updated_at=now() RETURNING version`, class, p.Institution, p.Department, p.Term).Scan(&version)
	if e != nil {
		return 0, e
	}
	for _, org := range []string{old.Institution, p.Institution} {
		if org == "" {
			continue
		}
		if e = Record(ctx, tx, org, actor, "class_placement", class, old, *p, reason); e != nil {
			return 0, e
		}
		if old.Institution == p.Institution {
			break
		}
	}
	return version, nil
}
