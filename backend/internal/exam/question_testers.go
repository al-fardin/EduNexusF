package exam

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
	"path/filepath"
	"strings"

	authMiddleware "github.com/edunexus/edunexus/internal/auth/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const maxTesterBytes = 10 * 1024 * 1024

type TesterAttachment struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	SHA256 string `json:"sha256"`
	Size   int    `json:"size"`
}

func registerQuestionTesters(app *fiber.App, h *Handler) {
	app.Post("/classrooms/:id/exams/testers", authMiddleware.JWTProtected(), h.UploadTester)
	app.Post("/classrooms/:id/exams/:examID/tester-ticket", authMiddleware.JWTProtected(), h.TesterTicket)
	// Short-lived bearer capability; never accepts paths or arbitrary download URLs.
	app.Get("/local-testers/download", h.DownloadTesterBundle)
}

func validWindowsTester(name string, data []byte) bool {
	if !strings.EqualFold(filepath.Ext(name), ".exe") || len(name) > 120 ||
		strings.ContainsAny(name, "\\/\r\n\x00") || len(data) < 64 || len(data) > maxTesterBytes || string(data[:2]) != "MZ" {
		return false
	}
	offset := uint64(binary.LittleEndian.Uint32(data[60:64]))
	return offset >= 64 && offset+4 <= uint64(len(data)) && string(data[offset:offset+4]) == "PE\x00\x00"
}

func (h *Handler) UploadTester(c *fiber.Ctx) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	file, err := c.FormFile("file")
	if err != nil {
		return failure(c, 400, "select a Windows .exe tester")
	}
	if file.Size > maxTesterBytes {
		return failure(c, 413, "tester must be 10 MB or smaller")
	}
	stream, err := file.Open()
	if err != nil {
		return err
	}
	defer stream.Close()
	data, err := io.ReadAll(io.LimitReader(stream, maxTesterBytes+1))
	if err != nil {
		return err
	}
	if !validWindowsTester(file.Filename, data) {
		return failure(c, 400, "a valid Windows PE .exe file is required (max 10 MB)")
	}
	user, _ := identity(c)
	digest := sha256.Sum256(data)
	attachment := TesterAttachment{ID: uuid.NewString(), Name: file.Filename, SHA256: hex.EncodeToString(digest[:]), Size: len(data)}
	// Bound classroom storage, including unattached draft uploads.
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE`, c.Params("id")); err != nil {
		return err
	}
	var used int64
	if err = tx.QueryRow(c.UserContext(), `SELECT COALESCE(sum(octet_length(executable)),0) FROM classroom_question_testers WHERE classroom_id=$1::uuid`, c.Params("id")).Scan(&used); err != nil {
		return err
	}
	if used+int64(len(data)) > 200*1024*1024 {
		return failure(c, 413, "classroom tester storage limit reached (200 MB)")
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_question_testers(id,classroom_id,uploaded_by,name,sha256,executable) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6)`, attachment.ID, c.Params("id"), user, attachment.Name, attachment.SHA256, data)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 201, attachment)
}

// Always load canonical metadata; a teacher cannot attach another classroom's binary.
func (h *Handler) hydrateTesters(c *fiber.Ctx, questions []Question) error {
	if len(questions) < 1 || len(questions) > 40 {
		return fiber.NewError(400, "1-40 questions required")
	}
	for i := range questions {
		q := &questions[i]
		if q.Tester == nil {
			continue
		}
		if q.Kind != "coding" {
			return fiber.NewError(400, "testers can only be attached to coding questions")
		}
		if _, err := uuid.Parse(q.Tester.ID); err != nil {
			return fiber.NewError(400, "invalid tester attachment")
		}
		var canonical TesterAttachment
		err := h.db.QueryRow(c.UserContext(), `SELECT id::text,name,sha256,octet_length(executable) FROM classroom_question_testers WHERE id=$1::uuid AND classroom_id=$2::uuid`, q.Tester.ID, c.Params("id")).Scan(&canonical.ID, &canonical.Name, &canonical.SHA256, &canonical.Size)
		if errors.Is(err, pgx.ErrNoRows) {
			return fiber.NewError(400, "tester attachment not found in this classroom")
		}
		if err != nil {
			return err
		}
		q.Tester = &canonical
	}
	return nil
}

func (h *Handler) TesterTicket(c *fiber.Ctx) error {
	attempt, questions, err := h.activeAttempt(c)
	if err != nil {
		return err
	}
	var req struct {
		QuestionID string `json:"question_id"`
	}
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid request")
	}
	var tester *TesterAttachment
	for _, q := range questions {
		if q.ID == req.QuestionID && q.Kind == "coding" {
			tester = q.Tester
			break
		}
	}
	if tester == nil {
		return failure(c, 404, "this question has no tester")
	}
	random := make([]byte, 32)
	if _, err = rand.Read(random); err != nil {
		return err
	}
	token := hex.EncodeToString(random)
	digest := sha256.Sum256([]byte(token))
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	if _, err = tx.Exec(c.UserContext(), `SELECT id FROM classroom_exam_attempts WHERE id=$1::uuid FOR UPDATE`, attempt); err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_tester_tickets WHERE expires_at < now() OR attempt_id=$1::uuid`, attempt)
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_tester_tickets(token_hash,tester_id,attempt_id,expires_at) SELECT $1,$2::uuid,id,LEAST(expires_at,now()+interval '2 minutes') FROM classroom_exam_attempts WHERE id=$3::uuid AND status='in_progress' AND expires_at>now()`, hex.EncodeToString(digest[:]), tester.ID, attempt)
	if err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"ticket": token, "tester": tester})
}

func (h *Handler) DownloadTesterBundle(c *fiber.Ctx) error {
	token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	if len(token) != 64 {
		return failure(c, 404, "tester ticket not found")
	}
	digest := sha256.Sum256([]byte(token))
	var attachment TesterAttachment
	var data []byte
	// Atomically consume a one-use ticket and recheck exam/attempt state.
	err := h.db.QueryRow(c.UserContext(), `WITH consumed AS (
        DELETE FROM classroom_tester_tickets t USING classroom_exam_attempts a,classroom_exams e
        WHERE t.token_hash=$1 AND t.expires_at>now() AND a.id=t.attempt_id AND a.status='in_progress'
        AND a.expires_at>now() AND e.id=a.exam_id AND e.status='published' AND e.closed_at IS NULL AND e.ends_at>now()
        RETURNING t.tester_id
    ) SELECT q.id::text,q.name,q.sha256,octet_length(q.executable),q.executable FROM consumed c JOIN classroom_question_testers q ON q.id=c.tester_id`, hex.EncodeToString(digest[:])).Scan(&attachment.ID, &attachment.Name, &attachment.SHA256, &attachment.Size, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 403, "tester ticket expired or already used")
	}
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"tester": attachment, "executable": data, "protocol": "edunexus.tester.v1"})
}
