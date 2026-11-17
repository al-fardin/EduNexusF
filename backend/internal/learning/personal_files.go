package learning

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"io"
	"mime"
	"path/filepath"
	"strconv"
	"strings"
)

func (h *Handler) PersonalFile(c *fiber.Ctx) error {
	user, e := personalIdentity(c)
	if e != nil {
		return e
	}
	id := c.Params("itemID")
	if validID(id) != nil {
		return fail(400, "Invalid note")
	}
	fileID := c.Params("fileID")
	if fileID != "" && validID(fileID) != nil {
		return fail(400, "Invalid file")
	}
	if c.Method() == "GET" {
		var name string
		var bytes []byte
		e = h.db.QueryRow(c.UserContext(), `SELECT f.name,f.bytes FROM personal_workspace_files f JOIN personal_workspace_items p ON p.id=f.item_id WHERE f.id=$1::uuid AND f.item_id=$2::uuid AND p.user_id=$3::uuid`, fileID, id, user).Scan(&name, &bytes)
		if errors.Is(e, pgx.ErrNoRows) {
			return fail(404, "File not found")
		}
		if e != nil {
			return e
		}
		c.Set("Content-Type", "application/octet-stream")
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": name}))
		return c.Send(bytes)
	}
	var version int
	var data []byte
	var name string
	if c.Method() == "POST" {
		version, e = strconv.Atoi(c.FormValue("version"))
		if e != nil || version < 1 {
			return fail(400, "Provide the current note version")
		}
		file, e := c.FormFile("file")
		if e != nil || file.Size < 1 || file.Size > 10*1024*1024 {
			return fail(400, "Choose a file up to 10 MB")
		}
		name = filepath.Base(file.Filename)
		if len(name) < 1 || len(name) > 180 || name == "." || strings.ContainsAny(name, "\\/\r\n\x00") {
			return fail(400, "Invalid private file name")
		}
		r, e := file.Open()
		if e != nil {
			return e
		}
		data, e = io.ReadAll(io.LimitReader(r, 10*1024*1024+1))
		r.Close()
		if e != nil {
			return e
		}
		if len(data) < 1 || len(data) > 10*1024*1024 {
			return fail(413, "File limit is 10 MB")
		}
	} else {
		var req struct {
			Version int `json:"version"`
		}
		if c.BodyParser(&req) != nil || req.Version < 1 {
			return fail(400, "Provide the current note version")
		}
		version = req.Version
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('personal:'||$1,0))`, user); e != nil {
		return e
	}
	var current int
	e = tx.QueryRow(c.UserContext(), `SELECT version FROM personal_workspace_items WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`, id, user).Scan(&current)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(404, "Note not found")
	}
	if e != nil {
		return e
	}
	if current != version {
		return fail(409, "Note changed. Reload before changing files")
	}
	if c.Method() == "POST" {
		var count int
		var used int64
		e = tx.QueryRow(c.UserContext(), `SELECT count(*) FILTER(WHERE f.item_id=$2::uuid)::int,COALESCE(sum(octet_length(f.bytes)),0)::bigint FROM personal_workspace_files f JOIN personal_workspace_items p ON p.id=f.item_id WHERE p.user_id=$1::uuid`, user, id).Scan(&count, &used)
		if e != nil {
			return e
		}
		if count >= 10 || used+int64(len(data)) > 50*1024*1024 {
			return fail(422, "Use up to 10 files per note and 50 MB per personal workspace")
		}
		e = tx.QueryRow(c.UserContext(), `INSERT INTO personal_workspace_files(item_id,name,bytes) VALUES($1::uuid,$2,$3) RETURNING id::text`, id, name, data).Scan(&fileID)
		if e != nil {
			return e
		}
	} else {
		tag, e := tx.Exec(c.UserContext(), `DELETE FROM personal_workspace_files WHERE id=$1::uuid AND item_id=$2::uuid`, fileID, id)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(404, "File not found")
		}
	}
	_, e = tx.Exec(c.UserContext(), `UPDATE personal_workspace_items SET version=version+1,updated_at=now() WHERE id=$1::uuid`, id)
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"id": fileID, "version": current + 1})
}
