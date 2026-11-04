package messaging

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"
)

const maxFileSize = 10 * 1024 * 1024

type Attachment struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"`
}
type sendRequest struct {
	Reply             string `json:"reply_to_id"`
	Body              string `json:"body"`
	Request           string `json:"client_request_id"`
	file              []byte
	name, media, hash string
}

func parseMessage(c *fiber.Ctx) (sendRequest, error) {
	var req sendRequest
	if strings.HasPrefix(c.Get("Content-Type"), "multipart/form-data") {
		req.Reply = c.FormValue("reply_to_id")
		req.Body = c.FormValue("body")
		req.Request = c.FormValue("client_request_id")
		form, err := c.MultipartForm()
		if err != nil {
			return req, fiber.NewError(400, "invalid file upload")
		}
		files := form.File["file"]
		if len(files) > 1 {
			return req, fiber.NewError(400, "attach one file per message")
		}
		if len(files) == 1 {
			header := files[0]
			if header.Size <= 0 || header.Size > maxFileSize {
				return req, fiber.NewError(400, "files must be between 1 byte and 10 MB")
			}
			file, err := header.Open()
			if err != nil {
				return req, err
			}
			defer file.Close()
			req.file, err = io.ReadAll(io.LimitReader(file, maxFileSize+1))
			if err != nil {
				return req, err
			}
			if len(req.file) == 0 || len(req.file) > maxFileSize {
				return req, fiber.NewError(400, "files must be between 1 byte and 10 MB")
			}
			req.name = filepath.Base(strings.ReplaceAll(header.Filename, "\\", "/"))
			req.name = strings.Map(func(r rune) rune {
				if unicode.IsControl(r) {
					return -1
				}
				return r
			}, req.name)
			req.name = string([]rune(req.name)[:min(len([]rune(req.name)), 180)])
			if req.name == "" || req.name == "." {
				req.name = "attachment"
			}
			req.media = http.DetectContentType(req.file)
			sum := sha256.Sum256(req.file)
			req.hash = hex.EncodeToString(sum[:])
		}
	} else if c.BodyParser(&req) != nil {
		return req, fiber.NewError(400, "invalid message")
	}
	return req, nil
}
func fileDirectory() string {
	if value := os.Getenv("EDUNEXUS_MESSAGE_UPLOAD_DIR"); value != "" {
		return value
	}
	return filepath.Join("uploads", "messages")
}
func storeFile(data []byte) (string, error) {
	if len(data) == 0 {
		return "", nil
	}
	if err := os.MkdirAll(fileDirectory(), 0700); err != nil {
		return "", err
	}
	key := uuid.NewString()
	path := filepath.Join(fileDirectory(), key)
	if err := os.WriteFile(path, data, 0600); err != nil {
		os.Remove(path)
		return "", err
	}
	return key, nil
}
func (h *Handler) File(c *fiber.Ctx) error {
	if _, err := h.thread(c); err != nil {
		return err
	}
	id, err := strconv.ParseInt(c.Params("messageID"), 10, 64)
	if err != nil || id <= 0 {
		return fiber.NewError(400, "invalid message")
	}
	var name, key string
	err = h.db.QueryRow(c.UserContext(), `SELECT file_name,storage_key FROM classroom_messages WHERE id=$1 AND conversation_id=$2::uuid AND storage_key<>''`, id, c.Params("threadID")).Scan(&name, &key)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(404, "attachment not found")
	}
	if err != nil {
		return err
	}
	if _, err = uuid.Parse(key); err != nil {
		return fiber.NewError(500, "invalid attachment storage")
	}
	path := filepath.Join(fileDirectory(), key)
	if _, err = os.Stat(path); os.IsNotExist(err) {
		return fiber.NewError(404, "attachment no longer available")
	} else if err != nil {
		return err
	}
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("Cache-Control", "private, no-store")
	c.Set("Content-Type", "application/octet-stream")
	c.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": name}))
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	info, err := file.Stat()
	if err != nil {
		file.Close()
		return err
	}
	return c.SendStream(file, int(info.Size()))
}
