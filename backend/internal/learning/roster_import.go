package learning

import (
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/mail"
	"strings"

	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

type rosterImportRow struct {
	Line        int    `json:"line"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Roll        string `json:"roll"`
	SectionName string `json:"section"`
	SectionID   string `json:"section_id"`
	User        string `json:"user_id"`
	Version     int    `json:"version"`
	State       string `json:"state"`
}

func (h *Handler) ImportRoster(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	var req struct {
		CSV      string `json:"csv"`
		Action   string `json:"action"`
		Revision string `json:"revision"`
		Reason   string `json:"reason"`
	}
	if c.BodyParser(&req) != nil || len(req.CSV) > 100000 || (req.Action != "preview" && req.Action != "commit") {
		return fail(400, "Use preview or commit with a CSV up to 100 KB")
	}
	reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(req.CSV, "\ufeff")))
	reader.TrimLeadingSpace = true
	header, e := reader.Read()
	if e != nil || len(header) != 4 {
		return fail(400, "CSV columns must be name,email,roll,section")
	}
	for i, v := range []string{"name", "email", "roll", "section"} {
		if strings.ToLower(strings.TrimSpace(header[i])) != v {
			return fail(400, "CSV columns must be name,email,roll,section")
		}
	}
	rows := []rosterImportRow{}
	emails, rolls := map[string]bool{}, map[string]bool{}
	for {
		record, e := reader.Read()
		if errors.Is(e, io.EOF) {
			break
		}
		if e != nil {
			return fail(400, "Invalid CSV")
		}
		if len(rows) >= 200 {
			return fail(400, "Import at most 200 students")
		}
		line, _ := reader.FieldPos(0)
		r := rosterImportRow{Line: line, Name: strings.TrimSpace(record[0]), Email: strings.ToLower(strings.TrimSpace(record[1])), Roll: strings.ToUpper(strings.TrimSpace(record[2])), SectionName: strings.TrimSpace(record[3]), State: "ready"}
		address, e := mail.ParseAddress(r.Email)
		if e != nil || address.Address != r.Email || len(r.Email) > 254 {
			r.State = "invalid_email"
		} else if emails[r.Email] {
			r.State = "duplicate_email"
		}
		emails[r.Email] = true
		if _, e := audience.Normalize(&audience.Rule{Mode: "custom", Rolls: []string{r.Roll}}); e != nil {
			r.State = "invalid_roll"
		}
		if rolls[r.Roll] {
			r.State = "duplicate_roll"
		}
		rolls[r.Roll] = true
		rows = append(rows, r)
	}
	if len(rows) == 0 {
		return fail(400, "CSV has no students")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if err = lockRoster(c.UserContext(), tx, c.Params("id"), actor); err != nil {
		return err
	}
	ready := 0
	for i := range rows {
		r := &rows[i]
		if r.State != "ready" {
			continue
		}
		var oldRoll, oldSection, name string
		err = tx.QueryRow(c.UserContext(), `SELECT u.id::text,trim(u.first_name||' '||u.last_name),COALESCE(m.student_roll,''),COALESCE(m.section_id::text,''),m.roster_version FROM users u JOIN classroom_memberships m ON m.user_id=u.id WHERE lower(u.email)=$2 AND m.classroom_id=$1::uuid AND m.member_role='student' AND m.status='active' AND u.status='active' AND u.deleted_at IS NULL FOR UPDATE OF m`, c.Params("id"), r.Email).Scan(&r.User, &name, &oldRoll, &oldSection, &r.Version)
		if errors.Is(err, pgx.ErrNoRows) {
			r.State = "not_enrolled"
			continue
		}
		if err != nil {
			return err
		}
		if r.Name != "" && !strings.EqualFold(r.Name, name) {
			r.State = "name_mismatch"
			continue
		}
		r.Name = name
		if r.SectionName != "" {
			err = tx.QueryRow(c.UserContext(), `SELECT id::text FROM classroom_sections WHERE classroom_id=$1::uuid AND lower(name)=lower($2)`, c.Params("id"), r.SectionName).Scan(&r.SectionID)
			if errors.Is(err, pgx.ErrNoRows) {
				r.State = "unknown_section"
				continue
			}
			if err != nil {
				return err
			}
		}
		if r.Roll == oldRoll && r.SectionID == oldSection {
			r.State = "unchanged"
			continue
		}
		var conflict, locked bool
		err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_memberships WHERE classroom_id=$1::uuid AND student_roll=$2 AND user_id<>$3::uuid),EXISTS(SELECT 1 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.classroom_id=$1::uuid AND a.student_id=$3::uuid) OR EXISTS(SELECT 1 FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id WHERE a.classroom_id=$1::uuid AND s.student_id=$3::uuid)`, c.Params("id"), r.Roll, r.User).Scan(&conflict, &locked)
		if err != nil {
			return err
		}
		if conflict {
			r.State = "roll_conflict"
			continue
		}
		if locked && oldRoll != r.Roll {
			r.State = "roll_locked"
			continue
		}
		ready++
	}
	raw, _ := json.Marshal([]any{c.Params("id"), actor, rows})
	sum := sha256.Sum256(raw)
	revision := hex.EncodeToString(sum[:])
	changed := 0
	if req.Action == "commit" {
		if req.Revision != revision {
			return fail(409, "Roster changed. Preview again")
		}
		if ready == 0 {
			return fail(400, "No roster changes are ready")
		}
		for _, r := range rows {
			if r.State == "ready" {
				roll := r.Roll
				if err = updateRoster(c.UserContext(), tx, c.Params("id"), actor, r.User, &roll, r.SectionID, r.Version, req.Reason); err != nil {
					return err
				}
				changed++
			}
		}
		if err = tx.Commit(c.UserContext()); err != nil {
			return err
		}
	}
	return respond(c, 200, fiber.Map{"rows": rows, "ready": ready, "revision": revision, "changed": changed})
}
