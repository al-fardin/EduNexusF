package learning

import (
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type personalCheck struct {
	ID   string `json:"id"`
	Text string `json:"text"`
	Done bool   `json:"done"`
}
type personalLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}
type personalItem struct {
	ID             string          `json:"id"`
	Title          string          `json:"title"`
	Body           string          `json:"body"`
	Checklist      []personalCheck `json:"checklist"`
	Links          []personalLink  `json:"links"`
	Class          string          `json:"context_class"`
	Kind           string          `json:"context_kind"`
	Resource       string          `json:"context_id"`
	ContextURL     string          `json:"context_url"`
	ContextExcerpt string          `json:"context_excerpt,omitempty"`
	Version        int             `json:"version"`
	Updated        time.Time       `json:"updated_at"`
}

func personalIdentity(c *fiber.Ctx) (string, error) {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return "", fail(401, "Authentication required")
	}
	c.Set("Cache-Control", "no-store")
	return user, nil
}
func validPersonal(item *personalItem) error {
	item.Title = strings.TrimSpace(item.Title)
	if len([]rune(item.Title)) < 1 || len([]rune(item.Title)) > 160 || len(item.Body) > 20000 || len(item.Checklist) > 100 || len(item.Links) > 20 {
		return fail(400, "Use a title, up to 20 KB of notes, 100 checklist items and 20 links")
	}
	seen := map[string]bool{}
	for i := range item.Checklist {
		v := &item.Checklist[i]
		v.Text = strings.TrimSpace(v.Text)
		if validID(v.ID) != nil || seen[v.ID] || len([]rune(v.Text)) < 1 || len([]rune(v.Text)) > 500 {
			return fail(400, "Checklist items need unique IDs and 1–500 characters")
		}
		seen[v.ID] = true
	}
	for i := range item.Links {
		v := &item.Links[i]
		v.URL = strings.TrimSpace(v.URL)
		v.Label = strings.TrimSpace(v.Label)
		u, e := url.Parse(v.URL)
		if e != nil || len(v.URL) > 2048 || len([]rune(v.Label)) > 160 || u.Hostname() == "" || u.User != nil || (u.Scheme != "https" && u.Scheme != "http") || strings.ContainsAny(v.URL, "\r\n\x00") {
			return fail(400, "Links must be HTTP or HTTPS addresses without embedded credentials")
		}
	}
	if item.Checklist == nil {
		item.Checklist = []personalCheck{}
	}
	if item.Links == nil {
		item.Links = []personalLink{}
	}
	if item.Kind == "" {
		if item.Class != "" || item.Resource != "" {
			return fail(400, "Invalid linked context")
		}
		return nil
	}
	if validID(item.Class) != nil {
		return fail(400, "Invalid linked context")
	}
	if item.Kind == "message" {
		id, e := strconv.ParseInt(item.Resource, 10, 64)
		if e != nil || id < 1 {
			return fail(400, "Invalid message reference")
		}
		item.Resource = strconv.FormatInt(id, 10)
		return nil
	}
	switch item.Kind {
	case "class", "material", "assignment", "exam", "post":
		if validID(item.Resource) != nil {
			return fail(400, "Invalid linked context")
		}
		return nil
	}
	return fail(400, "Invalid linked context")
}

// Context references are bookmarks, never a new route around classroom access.
// The note itself remains private and editable after leaving a class.
func (h *Handler) personalContext(c *fiber.Ctx, user string, item personalItem) (string, error) {
	if item.Kind == "" {
		return "", nil
	}
	var role string
	err := h.db.QueryRow(c.UserContext(), `SELECT m.member_role FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$2::uuid LEFT JOIN classroom_staff_permissions sp ON sp.classroom_id=cl.id AND sp.user_id=m.user_id WHERE cl.id=$1::uuid AND cl.status='active' AND cl.deleted_at IS NULL AND m.status='active' AND ($3='class' OR m.member_role<>'teacher' OR cl.owner_id=$2::uuid OR sp.user_id IS NULL OR COALESCE((sp.permissions->>CASE WHEN $3='message' THEN 'messaging' ELSE 'coursework' END)::boolean,false))`, item.Class, user, item.Kind).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	var allowed bool
	if item.Kind == "class" {
		allowed = item.Resource == item.Class
	} else if item.Kind == "message" {
		err = h.db.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_messages m JOIN classroom_conversations t ON t.id=m.conversation_id WHERE m.id=$1::bigint AND t.classroom_id=$2::uuid AND ($3::uuid=t.user_low OR $3::uuid=t.user_high) AND m.deleted_at IS NULL)`, item.Resource, item.Class, user).Scan(&allowed)
	} else {
		err = h.db.QueryRow(c.UserContext(), `SELECT edunexus_resource_visible($1::uuid,$2,$3::uuid,$4::uuid) AND CASE $2 WHEN 'exam' THEN EXISTS(SELECT 1 FROM classroom_exams WHERE id=$3::uuid AND classroom_id=$1::uuid AND($5='teacher' OR status='published')) WHEN 'assignment' THEN EXISTS(SELECT 1 FROM classroom_assignments WHERE id=$3::uuid AND classroom_id=$1::uuid AND($5='teacher' OR status='published')) WHEN 'material' THEN EXISTS(SELECT 1 FROM classroom_materials m WHERE id=$3::uuid AND classroom_id=$1::uuid AND($5='teacher' OR EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_type='material' AND p.reference_id=m.id AND p.deleted_at IS NULL))) WHEN 'post' THEN EXISTS(SELECT 1 FROM classroom_stream_posts WHERE id=$3::uuid AND classroom_id=$1::uuid AND deleted_at IS NULL) ELSE false END`, item.Class, item.Kind, item.Resource, user, role).Scan(&allowed)
	}
	if err != nil {
		return "", err
	}
	if !allowed {
		return "", nil
	}
	if item.Kind == "message" {
		var thread string
		if err = h.db.QueryRow(c.UserContext(), `SELECT conversation_id::text FROM classroom_messages WHERE id=$1::bigint`, item.Resource).Scan(&thread); err != nil {
			return "", err
		}
		return "/messages?class=" + item.Class + "&thread=" + thread + "&message=" + item.Resource, nil
	}
	prefix := "student"
	if role == "teacher" {
		prefix = "instructor"
	}
	base := "/" + prefix + "/classrooms/" + item.Class
	switch item.Kind {
	case "exam":
		return base + "?tab=exam", nil
	case "assignment":
		return base + "?tab=classwork&work=assignments&assignment=" + item.Resource, nil
	case "material":
		return base + "?tab=classwork&work=materials", nil
	case "post":
		return base + "?tab=stream", nil
	}
	return base, nil
}

func (h *Handler) PersonalItems(c *fiber.Ctx) error {
	user, e := personalIdentity(c)
	if e != nil {
		return e
	}
	if c.Method() == "GET" {
		if c.Params("itemID") != "" {
			return h.personalGet(c, user)
		}
		offset, e := strconv.Atoi(c.Query("offset", "0"))
		q := strings.TrimSpace(c.Query("q"))
		if e != nil || offset < 0 || offset > 10000 || len(q) > 200 {
			return fail(400, "Invalid personal workspace search")
		}
		rows, e := h.db.Query(c.UserContext(), `SELECT p.id::text,p.title,left(p.body,180),p.version,p.updated_at,jsonb_array_length(p.checklist),(SELECT count(*)::int FROM jsonb_array_elements(p.checklist) x WHERE (x->>'done')::boolean),(SELECT count(*)::int FROM personal_workspace_files f WHERE f.item_id=p.id) FROM personal_workspace_items p WHERE p.user_id=$1::uuid AND($2='' OR position(lower($2) in lower(p.title||' '||p.body))>0) ORDER BY p.updated_at DESC,p.id LIMIT 51 OFFSET $3`, user, q, offset)
		if e != nil {
			return e
		}
		defer rows.Close()
		items := []fiber.Map{}
		for rows.Next() {
			var id, title, excerpt string
			var version, total, done, files int
			var updated time.Time
			if e = rows.Scan(&id, &title, &excerpt, &version, &updated, &total, &done, &files); e != nil {
				return e
			}
			items = append(items, fiber.Map{"id": id, "title": title, "excerpt": excerpt, "version": version, "updated_at": updated, "total": total, "done": done, "files": files})
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
	var item personalItem
	if c.BodyParser(&item) != nil {
		return fail(400, "Invalid personal note")
	}
	if c.Method() == "DELETE" {
		if validID(c.Params("itemID")) != nil || item.Version < 1 {
			return fail(400, "Invalid note version")
		}
		tag, e := h.db.Exec(c.UserContext(), `DELETE FROM personal_workspace_items WHERE id=$1::uuid AND user_id=$2::uuid AND version=$3`, c.Params("itemID"), user, item.Version)
		if e != nil {
			return e
		}
		if tag.RowsAffected() == 0 {
			return fail(409, "Note changed or is unavailable")
		}
		return respond(c, 200, fiber.Map{"deleted": true})
	}
	if e = validPersonal(&item); e != nil {
		return e
	}
	item.ID = c.Params("itemID")
	if item.ID != "" && (validID(item.ID) != nil || item.Version < 1) {
		return fail(400, "Invalid note version")
	}
	context, e := h.personalContext(c, user, item)
	if e != nil {
		return e
	}
	tx, e := h.db.Begin(c.UserContext())
	if e != nil {
		return e
	}
	defer tx.Rollback(c.UserContext())
	if _, e = tx.Exec(c.UserContext(), `SELECT pg_advisory_xact_lock(hashtextextended('personal:'||$1,0))`, user); e != nil {
		return e
	}
	if context == "" && item.Kind != "" {
		var unchanged bool
		if item.ID != "" {
			e = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM personal_workspace_items WHERE id=$1::uuid AND user_id=$2::uuid AND context_class=$3::uuid AND context_kind=$4 AND context_id=$5)`, item.ID, user, item.Class, item.Kind, item.Resource).Scan(&unchanged)
			if e != nil {
				return e
			}
		}
		if !unchanged {
			return fail(403, "Linked classroom content is unavailable")
		}
	}
	checks, _ := json.Marshal(item.Checklist)
	links, _ := json.Marshal(item.Links)
	if item.ID == "" {
		var count int
		if e = tx.QueryRow(c.UserContext(), `SELECT count(*)::int FROM personal_workspace_items WHERE user_id=$1::uuid`, user).Scan(&count); e != nil {
			return e
		}
		if count >= 500 {
			return fail(422, "Personal workspace supports 500 notes")
		}
		e = tx.QueryRow(c.UserContext(), `INSERT INTO personal_workspace_items(user_id,title,body,checklist,links,context_class,context_kind,context_id) VALUES($1::uuid,$2,$3,$4::jsonb,$5::jsonb,NULLIF($6,'')::uuid,$7,NULLIF($8,'')) RETURNING id::text,version`, user, item.Title, item.Body, checks, links, item.Class, item.Kind, item.Resource).Scan(&item.ID, &item.Version)
	} else {
		e = tx.QueryRow(c.UserContext(), `UPDATE personal_workspace_items SET title=$3,body=$4,checklist=$5::jsonb,links=$6::jsonb,context_class=NULLIF($7,'')::uuid,context_kind=$8,context_id=NULLIF($9,''),version=version+1,updated_at=now() WHERE id=$1::uuid AND user_id=$2::uuid AND version=$10 RETURNING version`, item.ID, user, item.Title, item.Body, checks, links, item.Class, item.Kind, item.Resource, item.Version).Scan(&item.Version)
	}
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(409, "Note changed. Reload before saving")
	}
	if e != nil {
		return e
	}
	if e = tx.Commit(c.UserContext()); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"id": item.ID, "version": item.Version})
}
func (h *Handler) personalGet(c *fiber.Ctx, user string) error {
	if validID(c.Params("itemID")) != nil {
		return fail(400, "Invalid note")
	}
	var p personalItem
	e := h.db.QueryRow(c.UserContext(), `SELECT id::text,title,body,checklist,links,COALESCE(context_class::text,''),context_kind,COALESCE(context_id::text,''),version,updated_at FROM personal_workspace_items WHERE id=$1::uuid AND user_id=$2::uuid`, c.Params("itemID"), user).Scan(&p.ID, &p.Title, &p.Body, &p.Checklist, &p.Links, &p.Class, &p.Kind, &p.Resource, &p.Version, &p.Updated)
	if errors.Is(e, pgx.ErrNoRows) {
		return fail(404, "Note not found")
	}
	if e != nil {
		return e
	}
	p.ContextURL, e = h.personalContext(c, user, p)
	if e != nil {
		return e
	}
	if p.Kind == "message" && p.ContextURL != "" {
		e = h.db.QueryRow(c.UserContext(), `SELECT left(body,500) FROM classroom_messages WHERE id=$1::bigint AND deleted_at IS NULL`, p.Resource).Scan(&p.ContextExcerpt)
		if e != nil && !errors.Is(e, pgx.ErrNoRows) {
			return e
		}
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT id::text,name,octet_length(bytes)::int FROM personal_workspace_files WHERE item_id=$1::uuid ORDER BY created_at,id`, p.ID)
	if e != nil {
		return e
	}
	defer rows.Close()
	files := []fiber.Map{}
	for rows.Next() {
		var id, name string
		var size int
		if e = rows.Scan(&id, &name, &size); e != nil {
			return e
		}
		files = append(files, fiber.Map{"id": id, "name": name, "size": size})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return respond(c, 200, fiber.Map{"item": p, "files": files})
}
