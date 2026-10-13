package handler

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/edunexus/edunexus/internal/classroom/service"
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
}

type MaterialHandler struct {
	pool      *pgxpool.Pool
	stream    *service.StreamService
	directory string
}

type materialRecord struct {
	ID          string    `json:"id"`
	ClassroomID string    `json:"classroom_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	FileName    string    `json:"file_name"`
	MediaType   string    `json:"media_type"`
	FileSize    int64     `json:"file_size"`
	CreatedAt   time.Time `json:"created_at"`
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
		return handleStreamError(c, err)
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
	err = tx.QueryRow(c.UserContext(), `
        INSERT INTO classroom_materials
          (classroom_id, uploaded_by, title, description, original_filename, storage_key, file_size, media_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id::text, classroom_id::text, title, description, original_filename, media_type, file_size, created_at`,
		classID.String(), authorID.String(), title, description, original, storageKey, bytesWritten, mime,
	).Scan(&result.ID, &result.ClassroomID, &result.Title, &result.Description, &result.FileName, &result.MediaType, &result.FileSize, &result.CreatedAt)
	if err == nil {
		postContent := description
		if postContent == "" {
			postContent = "New learning material: " + title
		}
		_, err = tx.Exec(c.UserContext(), `
            INSERT INTO classroom_stream_posts(classroom_id, author_id, post_type, title, content, reference_type, reference_id)
            VALUES($1,$2,'material',$3,$4,'material',$5::uuid)`,
			classID.String(), authorID.String(), title, postContent, result.ID,
		)
	}
	if err == nil {
		err = tx.Commit(c.UserContext())
	}
	if err != nil {
		_ = os.Remove(storedPath)
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "message": "Material uploaded and posted to stream", "data": result})
}

func (h *MaterialHandler) List(c *fiber.Ctx) error {
	if err := h.authorize(c, false); err != nil {
		return err
	}
	if _, err := uuid.Parse(c.Params("id")); err != nil {
		return errorResponse(c, fiber.StatusBadRequest, "invalid classroom id")
	}
	rows, err := h.pool.Query(c.UserContext(), `
        SELECT m.id::text, m.classroom_id::text, m.title, m.description, m.original_filename, m.media_type, m.file_size, m.created_at
        FROM classroom_materials m
        JOIN classroom_stream_posts p ON p.reference_type='material' AND p.reference_id=m.id
           AND p.classroom_id=m.classroom_id AND p.deleted_at IS NULL
        WHERE m.classroom_id=$1::uuid
        ORDER BY m.created_at DESC LIMIT 200`, c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]materialRecord, 0)
	for rows.Next() {
		var item materialRecord
		if err := rows.Scan(&item.ID, &item.ClassroomID, &item.Title, &item.Description, &item.FileName, &item.MediaType, &item.FileSize, &item.CreatedAt); err != nil {
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
	var fileName, storageKey string
	err = h.pool.QueryRow(c.UserContext(), `
        SELECT m.original_filename, m.storage_key
        FROM classroom_materials m
        JOIN classroom_stream_posts p ON p.reference_id=m.id AND p.reference_type='material'
            AND p.classroom_id=m.classroom_id AND p.deleted_at IS NULL
        WHERE m.id=$1 AND m.classroom_id=$2 LIMIT 1`, materialID.String(), classID.String()).Scan(&fileName, &storageKey)
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
	default:
		return true // Office and archive files may have multiple valid MIME signatures.
	}
}

// Remove hides the material from the stream and destroys its stored file. Only a teacher
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
	var storageKey string
	err = tx.QueryRow(c.UserContext(), `SELECT storage_key FROM classroom_materials WHERE id=$1 AND classroom_id=$2 FOR UPDATE`, materialID.String(), classID.String()).Scan(&storageKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return errorResponse(c, fiber.StatusNotFound, "material not found")
	}
	if err != nil {
		return err
	}
	if _, err := uuid.Parse(storageKey); err != nil {
		return errorResponse(c, fiber.StatusInternalServerError, "invalid file key")
	}
	_, err = tx.Exec(c.UserContext(), `UPDATE classroom_stream_posts SET deleted_at=now() WHERE classroom_id=$1 AND reference_type='material' AND reference_id=$2 AND deleted_at IS NULL`, classID.String(), materialID.String())
	if err != nil {
		return err
	}
	_, err = tx.Exec(c.UserContext(), `DELETE FROM classroom_materials WHERE id=$1 AND classroom_id=$2`, materialID.String(), classID.String())
	if err != nil {
		return err
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return err
	}
	// Deleting a nonexistent file is harmless; the DB record and public-in-class link
	// have already been removed. Do not risk rolling back successful DB changes.
	_ = os.Remove(filepath.Join(h.directory, classID.String(), storageKey))
	return c.JSON(fiber.Map{"success": true, "message": "Material deleted"})
}
