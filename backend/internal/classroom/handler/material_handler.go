package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/activity"
	"github.com/edunexus/edunexus/internal/classroom/service"
	"github.com/edunexus/edunexus/internal/platform/audience"
	"github.com/edunexus/edunexus/internal/platform/contentrelease"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxMaterialBytes int64 = 15 * 1024 * 1024

var allowedMaterialExt = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".webp": true,
	".txt": true, ".md": true, ".csv": true, ".doc": true, ".docx": true,
	".ppt": true, ".pptx": true, ".xls": true, ".xlsx": true, ".zip": true,
	".mp3": true, ".wav": true, ".ogg": true, ".mp4": true, ".webm": true,
}

type MaterialHandler struct {
	pool      *pgxpool.Pool
	stream    *service.StreamService
	directory string
}

type materialRecord struct {
	Audience      json.RawMessage `json:"audience"`
	PublishAt     *time.Time      `json:"publish_at"`
	ScheduleState string          `json:"schedule_state,omitempty"`
	ImageAlt      string          `json:"image_alt"`
	ID            string          `json:"id"`
	ClassroomID   string          `json:"classroom_id"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	FileName      string          `json:"file_name"`
	MediaType     string          `json:"media_type"`
	FileSize      int64           `json:"file_size"`
	CreatedAt     time.Time       `json:"created_at"`
}

func NewMaterial(pool *pgxpool.Pool, stream *service.StreamService) *MaterialHandler {
	dir := os.Getenv("MATERIAL_UPLOAD_DIR")
	if dir == "" {
		dir = filepath.Join("uploads", "materials")
	}
	return &MaterialHandler{pool: pool, stream: stream, directory: dir}
}

func (h *MaterialHandler) authorize(c *fiber.Ctx, teacherOnly bool) error {
	userID, role, err := currentIdentity(c)
	if err != nil {
		return err
	}
	if err := h.stream.AuthorizeMaterialAccess(c.UserContext(), userID, role, c.Params("id"), teacherOnly); err != nil {
		return streamHTTPError(err)
	}
	if c.Params("materialID") != "" && !teacherOnly {
		user, _, e := currentIdentity(c)
		if e != nil {
			return e
		}
		if _, e = uuid.Parse(c.Params("materialID")); e != nil {
			return fiber.NewError(400, "Invalid material")
		}
		var allowed bool
		e = h.pool.QueryRow(c.UserContext(), `SELECT edunexus_resource_visible($1::uuid,'material',$2::uuid,$3::uuid)`, c.Params("id"), c.Params("materialID"), user).Scan(&allowed)
		if e != nil {
			return e
		}
		if !allowed {
			return fiber.NewError(403, "This material is not assigned to your roll")
		}
	}
	return nil
}

func (h *MaterialHandler) Upload(c *fiber.Ctx) error {
	if err := h.authorize(c, true); err != nil {
		return err
	}
	classID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid classroom id")
	}
	userID, _, err := currentIdentity(c)
	if err != nil {
		return err
	}
	authorID, err := uuid.Parse(userID)
	if err != nil {
		return errorResponse(c, fiber.StatusForbidden, "invalid user")
	}

	title := strings.TrimSpace(c.FormValue("title"))
	description := strings.TrimSpace(c.FormValue("description"))
	if len(title) == 0 || len([]rune(title)) > 200 || len([]rune(description)) > 5000 {
		return errorResponse(c, fiber.StatusBadRequest, "title is required (up to 200 characters); description up to 5000")
	}
	var rule *audience.Rule
	if raw := c.FormValue("audience"); raw != "" {
		if len(raw) > 131072 || json.Unmarshal([]byte(raw), &rule) != nil {
			return fiber.NewError(400, "Invalid audience settings")
		}
	}
	policy, e := audience.Encode(rule)
	if e != nil {
		return fiber.NewError(400, e.Error())
	}
	var publishAt *time.Time
	if raw := c.FormValue("publish_at"); raw != "" {
		at, e := time.Parse(time.RFC3339, raw)
		if e != nil || !at.After(time.Now()) || at.After(time.Now().AddDate(1, 0, 0)) {
			return errorResponse(c, 400, "Choose a future publish time within one year")
		}
		publishAt = &at
	}
	file, err := c.FormFile("file")
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "a file is required")
	}
	if file.Size < 1 || file.Size > maxMaterialBytes {
		return errorResponse(c, fiber.StatusBadRequest, "file must be between 1 byte and 15 MB")
	}
	original := safeMaterialName(file.Filename)
	ext := strings.ToLower(filepath.Ext(original))
	if !allowedMaterialExt[ext] {
		return errorResponse(c, fiber.StatusBadRequest, "unsupported file type")
	}
	reader, err := file.Open()
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "cannot open uploaded file")
	}
	defer reader.Close()
	sniff := make([]byte, 512)
	count, err := io.ReadFull(reader, sniff)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return err
	}
	mime := http.DetectContentType(sniff[:count])
	if !acceptableMaterialContent(ext, mime) {
		return errorResponse(c, fiber.StatusBadRequest, "file content does not match its extension")
	}
	if _, err := reader.Seek(0, io.SeekStart); err != nil {
		return err
	}

	storageKey := uuid.NewString()
	subdirectory := filepath.Join(h.directory, classID.String())
	if err := os.MkdirAll(subdirectory, 0700); err != nil {
		return err
	}
	storedPath := filepath.Join(subdirectory, storageKey)
	output, err := os.OpenFile(storedPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	bytesWritten, copyErr := io.Copy(output, io.LimitReader(reader, maxMaterialBytes+1))
	closeErr := output.Close()
	if copyErr != nil || closeErr != nil || bytesWritten != file.Size || bytesWritten > maxMaterialBytes {
		_ = os.Remove(storedPath)
		return errorResponse(c, fiber.StatusBadRequest, "could not save file safely")
	}

	// Material metadata and its public-in-classroom stream entry commit atomically.
	tx, err := h.pool.Begin(c.UserContext())
	if err != nil {
		_ = os.Remove(storedPath)
		return err
	}
	defer tx.Rollback(context.Background())
	var result materialRecord
	result.Audience = policy
	err = tx.QueryRow(c.UserContext(), `
        INSERT INTO classroom_materials
          (classroom_id, uploaded_by, title, description, original_filename, storage_key, file_size, media_type,audience)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        RETURNING id::text, classroom_id::text, title, description, original_filename, media_type, file_size, created_at`,
		classID.String(), authorID.String(), title, description, original, storageKey, bytesWritten, mime, policy,
	).Scan(&result.ID, &result.ClassroomID, &result.Title, &result.Description, &result.FileName, &result.MediaType, &result.FileSize, &result.CreatedAt)
	if err == nil && publishAt != nil {
		err = contentrelease.Save(c.UserContext(), tx, classID.String(), authorID.String(), "material", result.ID, publishAt)
		result.PublishAt = publishAt
		result.ScheduleState = "scheduled"
	}
	if err == nil && publishAt == nil {
		postContent := description
		if postContent == "" {
			postContent = "New learning material: " + title
		}
		_, err = tx.Exec(c.UserContext(), `
            INSERT INTO classroom_stream_posts(classroom_id, author_id, post_type, title, content, reference_type, reference_id,audience)
            VALUES($1,$2,'material',$3,$4,'material',$5::uuid,$6::jsonb)`,
			classID.String(), authorID.String(), title, postContent, result.ID, policy,
		)
	}
	if err == nil {
		err = tx.Commit(c.UserContext())
	}
	if err != nil {
		_ = os.Remove(storedPath)
		return err
	}
	message := "Material uploaded and posted to stream"
	if publishAt != nil {
		message = "Material uploaded and scheduled"
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "message": message, "data": result})
}

func (h *MaterialHandler) List(c *fiber.Ctx) error {
	if err := h.authorize(c, false); err != nil {
		return err
	}
	if _, err := uuid.Parse(c.Params("id")); err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid classroom id")
	}
	user, _, identityErr := currentIdentity(c)
	if identityErr != nil {
		return identityErr
	}
	rows, err := h.pool.Query(c.UserContext(), `
        SELECT m.id::text, m.classroom_id::text, m.title, m.description, m.original_filename, m.media_type, m.file_size, m.created_at,COALESCE(x.image_alt,''),CASE WHEN s.state='scheduled' THEN s.publish_at END,COALESCE(s.state,''),m.audience
        FROM classroom_materials m
        LEFT JOIN classroom_material_accessibility x ON x.material_id=m.id
        LEFT JOIN classroom_content_schedules s ON s.material_id=m.id
        WHERE m.classroom_id=$1::uuid AND edunexus_resource_visible(m.classroom_id,'material',m.id,$2::uuid) AND (EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_type='material' AND p.reference_id=m.id AND p.classroom_id=m.classroom_id AND p.deleted_at IS NULL) OR (s.state IN ('scheduled','blocked','cancelled') AND EXISTS(SELECT 1 FROM classroom_memberships mbr WHERE mbr.classroom_id=m.classroom_id AND mbr.user_id=$2::uuid AND mbr.member_role='teacher' AND mbr.status='active')))
        ORDER BY m.created_at DESC LIMIT 200`, c.Params("id"), user)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]materialRecord, 0)
	for rows.Next() {
		var item materialRecord
		if err := rows.Scan(&item.ID, &item.ClassroomID, &item.Title, &item.Description, &item.FileName, &item.MediaType, &item.FileSize, &item.CreatedAt, &item.ImageAlt, &item.PublishAt, &item.ScheduleState, &item.Audience); err != nil {
			return err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": items})
}

func (h *MaterialHandler) Download(c *fiber.Ctx) error {
	if err := h.authorize(c, false); err != nil {
		return err
	}
	classID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid classroom id")
	}
	materialID, err := uuid.Parse(c.Params("materialID"))
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid material id")
	}
	user, _, identityErr := currentIdentity(c)
	if identityErr != nil {
		return identityErr
	}
	var fileName, storageKey string
	err = h.pool.QueryRow(c.UserContext(), `
        SELECT m.original_filename, m.storage_key
        FROM classroom_materials m
        WHERE m.id=$1 AND m.classroom_id=$2 AND (EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_id=m.id AND p.reference_type='material' AND p.classroom_id=m.classroom_id AND p.deleted_at IS NULL) OR (EXISTS(SELECT 1 FROM classroom_content_schedules s WHERE s.material_id=m.id AND s.state IN ('scheduled','blocked','cancelled')) AND EXISTS(SELECT 1 FROM classroom_memberships mbr WHERE mbr.classroom_id=m.classroom_id AND mbr.user_id=$3::uuid AND mbr.member_role='teacher' AND mbr.status='active'))) LIMIT 1`, materialID.String(), classID.String(), user).Scan(&fileName, &storageKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return errorResponse(c, fiber.StatusNotFound, "material not found")
	}
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(storageKey); err != nil {
		return errorResponse(c, fiber.StatusInternalServerError, "invalid file storage key")
	}
	path := filepath.Join(h.directory, classID.String(), storageKey)
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return errorResponse(c, fiber.StatusNotFound, "material file missing from storage")
		}
		return err
	}
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Cache-Control", "private, no-store")
	c.Set("Content-Type", "application/octet-stream")
	if err := c.Download(path, safeMaterialName(fileName)); err != nil {
		return fmt.Errorf("material download: %w", err)
	}
	return nil
}

func safeMaterialName(s string) string {
	s = strings.ReplaceAll(s, "\\", "/")
	s = strings.TrimSpace(filepath.Base(strings.ReplaceAll(s, "/", string(filepath.Separator))))
	s = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, s)
	if s == "" || s == "." || s == ".." {
		return "material"
	}
	r := []rune(s)
	if len(r) > 180 {
		s = string(r[:180])
	}
	return s
}

func acceptableMaterialContent(ext, mime string) bool {
	switch ext {
	case ".pdf":
		return mime == "application/pdf"
	case ".png":
		return mime == "image/png"
	case ".jpg", ".jpeg":
		return mime == "image/jpeg"
	case ".webp":
		return mime == "image/webp"
	case ".mp3":
		return mime == "audio/mpeg"
	case ".wav":
		return mime == "audio/wave" || mime == "audio/wav" || mime == "audio/x-wav"
	case ".ogg":
		return mime == "application/ogg" || mime == "audio/ogg"
	case ".mp4":
		return mime == "video/mp4"
	case ".webm":
		return mime == "video/webm"
	default:
		return true // Office and archive files may have multiple valid MIME signatures.
	}
}

// Remove retains the file in class trash for a 30-day restore window. Only a teacher
// in this classroom may remove it.
func (h *MaterialHandler) Remove(c *fiber.Ctx) error {
	if err := h.authorize(c, true); err != nil {
		return err
	}
	classID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid classroom id")
	}
	materialID, err := uuid.Parse(c.Params("materialID"))
	if err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid material id")
	}
	tx, err := h.pool.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	actor, _, err := currentIdentity(c)
	if err != nil {
		return err
	}
	var attribution struct {
		Reason string `json:"reason"`
	}
	if len(c.Body()) > 0 && c.BodyParser(&attribution) != nil {
		return errorResponse(c, 400, "invalid reason")
	}
	if err = activity.SetActor(c.UserContext(), tx, actor, attribution.Reason); err != nil {
		return err
	}
	var storageKey string
	err = tx.QueryRow(c.UserContext(), `SELECT storage_key FROM classroom_materials WHERE id=$1 AND classroom_id=$2 AND NOT EXISTS(SELECT 1 FROM classroom_material_trash WHERE material_id=$1) FOR UPDATE`, materialID.String(), classID.String()).Scan(&storageKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return errorResponse(c, fiber.StatusNotFound, "material not found")
	}
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(storageKey); err != nil {
		return errorResponse(c, fiber.StatusInternalServerError, "invalid file key")
	}
	_, err = tx.Exec(c.UserContext(), `WITH hidden AS(UPDATE classroom_stream_posts SET deleted_at=now(),updated_at=now() WHERE classroom_id=$1::uuid AND reference_type='material' AND reference_id=$2::uuid AND deleted_at IS NULL RETURNING id) INSERT INTO classroom_material_trash(material_id,post_ids) SELECT $2::uuid,COALESCE(array_agg(id),'{}'::uuid[]) FROM hidden`, classID.String(), materialID.String())
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `UPDATE classroom_content_schedules SET state='cancelled',version=version+1,updated_at=now() WHERE resource_id=$1::uuid AND state IN ('scheduled','blocked')`, materialID.String())
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_activity(classroom_id,actor_id,actor_name,action,target_id,title,reason) SELECT $1::uuid,u.id,trim(u.first_name||' '||u.last_name),'material_deleted',m.id::text,m.title,$4 FROM users u JOIN classroom_materials m ON m.id=$2::uuid WHERE u.id=$3::uuid`, classID.String(), materialID.String(), actor, attribution.Reason)
	if err != nil {
		return err
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "Material moved to trash"})
}
