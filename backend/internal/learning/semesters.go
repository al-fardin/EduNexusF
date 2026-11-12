package learning

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) Terms(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if c.Method() == "POST" {
		var req struct {
			Title string `json:"title"`
			Start string `json:"starts_on"`
			End   string `json:"ends_on"`
		}
		if c.BodyParser(&req) != nil {
			return fail(400, "Invalid semester")
		}
		start, e := time.Parse("2006-01-02", req.Start)
		end, e2 := time.Parse("2006-01-02", req.End)
		req.Title = strings.TrimSpace(req.Title)
		if e != nil || e2 != nil || end.Before(start) || end.Sub(start) > 730*24*time.Hour || len([]rune(req.Title)) < 2 || len([]rune(req.Title)) > 100 {
			return fail(400, "Provide a semester title and dates within two years")
		}
		var id string
		err := h.db.QueryRow(c.UserContext(), `INSERT INTO academic_terms(owner_id,title,starts_on,ends_on) SELECT $1::uuid,$2,$3,$4 WHERE (SELECT count(*) FROM academic_terms WHERE owner_id=$1::uuid)<100 ON CONFLICT DO NOTHING RETURNING id::text`, user, req.Title, start, end).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(409, "Semester already exists or the 100 semester limit was reached")
		}
		if err != nil {
			return err
		}
		return respond(c, 201, fiber.Map{"id": id})
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT DISTINCT t.id::text,t.title,t.starts_on::text,t.ends_on::text,t.owner_id::text FROM academic_terms t LEFT JOIN classrooms cl ON cl.term_id=t.id AND cl.deleted_at IS NULL LEFT JOIN classroom_memberships m ON m.classroom_id=cl.id AND m.user_id=$1::uuid AND m.status='active' WHERE t.owner_id=$1::uuid OR m.user_id IS NOT NULL ORDER BY 3 DESC LIMIT 500`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, title, start, end, owner string
		if err = rows.Scan(&id, &title, &start, &end, &owner); err != nil {
			return err
		}
		items = append(items, fiber.Map{"id": id, "title": title, "starts_on": start, "ends_on": end, "owned": owner == user})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return respond(c, 200, items)
}
func (h *Handler) SemesterClasses(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT cl.id::text,cl.name,cl.status,COALESCE(cl.term_id::text,''),COALESCE(t.title,''),cl.syllabus,m.member_role,cl.owner_id=$1::uuid,COALESCE(cl.subject,''),COALESCE(cl.description,'') FROM classrooms cl JOIN classroom_memberships m ON m.classroom_id=cl.id LEFT JOIN academic_terms t ON t.id=cl.term_id WHERE m.user_id=$1::uuid AND m.status='active' AND cl.deleted_at IS NULL ORDER BY cl.created_at DESC LIMIT 501`, user)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, name, status, term, termTitle, syllabus, role, subject, description string
		var owned bool
		if err = rows.Scan(&id, &name, &status, &term, &termTitle, &syllabus, &role, &owned, &subject, &description); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "name": name, "status": status, "term_id": term, "term_title": termTitle, "syllabus": syllabus, "role": role, "owned": owned, "subject": subject, "description": description})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(out) > 500 {
		return fail(422, "Semester workspace supports up to 500 classes")
	}
	return respond(c, 200, out)
}
func (h *Handler) SaveSemesterClass(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if validID(c.Params("id")) != nil {
		return fail(400, "Invalid class")
	}
	var req struct {
		Term     string `json:"term_id"`
		Syllabus string `json:"syllabus"`
		Status   string `json:"status"`
	}
	if c.BodyParser(&req) != nil || len([]rune(req.Syllabus)) > 50000 || (req.Term != "" && validID(req.Term) != nil) || (req.Status != "active" && req.Status != "archived") {
		return fail(400, "Invalid class semester settings")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var owned bool
	if err = tx.QueryRow(c.UserContext(), `SELECT owner_id=$2::uuid FROM classrooms WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, c.Params("id"), user).Scan(&owned); errors.Is(err, pgx.ErrNoRows) || err == nil && !owned {
		return fail(403, "Class owner permission required")
	} else if err != nil {
		return err
	}
	if req.Term != "" {
		var allowed bool
		if err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM academic_terms WHERE id=$1::uuid AND owner_id=$2::uuid)`, req.Term, user).Scan(&allowed); err != nil {
			return err
		}
		if !allowed {
			return fail(403, "Choose a semester you own")
		}
	}
	if req.Status == "archived" {
		var running bool
		if err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.classroom_id=$1::uuid AND a.status='in_progress' AND a.expires_at>now() AND e.ends_at>now() AND e.closed_at IS NULL)`, c.Params("id")).Scan(&running); err != nil {
			return err
		}
		if running {
			return fail(409, "An exam attempt is active. Finish or close the exam before archiving")
		}
	}
	if _, err = tx.Exec(c.UserContext(), `UPDATE classrooms SET term_id=NULLIF($2,'')::uuid,syllabus=$3,status=$4::text,archived_at=CASE WHEN $4::text='archived' THEN COALESCE(archived_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1::uuid`, c.Params("id"), req.Term, req.Syllabus, req.Status); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return respond(c, 200, fiber.Map{"saved": true})
}
func (h *Handler) ArchiveContents(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if validID(c.Params("id")) != nil {
		return fail(400, "Invalid class")
	}
	var role string
	err := h.db.QueryRow(c.UserContext(), `SELECT m.member_role FROM classroom_memberships m JOIN classrooms cl ON cl.id=m.classroom_id WHERE cl.id=$1::uuid AND m.user_id=$2::uuid AND m.status='active' AND cl.deleted_at IS NULL`, c.Params("id"), user).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(403, "Class membership required")
	}
	if err != nil {
		return err
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id::text,kind,title,status FROM(SELECT id,'assignment'::text kind,title,status FROM classroom_assignments WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published') UNION ALL SELECT id,'exam',title,status FROM classroom_exams WHERE classroom_id=$1::uuid AND ($2='teacher' OR status='published') UNION ALL SELECT m.id,'material',m.title,'published' FROM classroom_materials m WHERE m.classroom_id=$1::uuid AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.reference_type='material' AND p.reference_id=m.id AND p.classroom_id=m.classroom_id AND p.deleted_at IS NULL))w ORDER BY kind,title,id LIMIT 501`, c.Params("id"), role)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []fiber.Map{}
	for rows.Next() {
		var id, kind, title, status string
		if err = rows.Scan(&id, &kind, &title, &status); err != nil {
			return err
		}
		out = append(out, fiber.Map{"id": id, "kind": kind, "title": title, "status": status})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(out) > 500 {
		return fail(422, "Archive catalogue supports up to 500 resources")
	}
	return respond(c, 200, out)
}
func (h *Handler) RolloverClass(c *fiber.Ctx) error {
	user, _ := c.Locals("user_id").(string)
	if validID(user) != nil {
		return fail(401, "Authentication required")
	}
	if validID(c.Params("id")) != nil {
		return fail(400, "Invalid source class")
	}
	var req struct {
		Name        string `json:"name"`
		Term        string `json:"term_id"`
		Request     string `json:"request_id"`
		Shift       int    `json:"day_shift"`
		Assignments bool   `json:"assignments"`
		Exams       bool   `json:"exams"`
		Materials   bool   `json:"materials"`
	}
	if c.BodyParser(&req) != nil || len([]rune(strings.TrimSpace(req.Name))) < 2 || len([]rune(req.Name)) > 150 || validID(req.Term) != nil || validID(req.Request) != nil || req.Shift < 0 || req.Shift > 730 {
		return fail(400, "Provide a new class name, semester and date shift of 0–730 days")
	}
	raw, _ := json.Marshal(req)
	hash := sha256.Sum256(append([]byte(c.Params("id")+":"), raw...))
	signature := hex.EncodeToString(hash[:])
	tx, err := h.db.BeginTx(c.UserContext(), pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	var allowed bool
	if err = tx.QueryRow(c.UserContext(), `SELECT owner_id=$2::uuid FROM classrooms WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, c.Params("id"), user).Scan(&allowed); errors.Is(err, pgx.ErrNoRows) || err == nil && !allowed {
		return fail(403, "Source class owner permission required")
	} else if err != nil {
		return err
	}
	var previous, oldHash string
	err = tx.QueryRow(c.UserContext(), `SELECT new_classroom_id::text,payload_hash FROM classroom_rollovers WHERE actor_id=$1::uuid AND request_id=$2::uuid`, user, req.Request).Scan(&previous, &oldHash)
	if err == nil {
		if oldHash != signature {
			return fail(409, "Request identifier already used")
		}
		return respond(c, 200, fiber.Map{"id": previous, "replayed": true})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err = tx.QueryRow(c.UserContext(), `SELECT EXISTS(SELECT 1 FROM academic_terms WHERE id=$1::uuid AND owner_id=$2::uuid)`, req.Term, user).Scan(&allowed); err != nil {
		return err
	}
	if !allowed {
		return fail(403, "Choose a semester you own")
	}
	var count int
	if err = tx.QueryRow(c.UserContext(), `SELECT (SELECT count(*) FROM classroom_assignments WHERE classroom_id=$1::uuid)+(SELECT count(*) FROM classroom_exams WHERE classroom_id=$1::uuid)+(SELECT count(*) FROM classroom_topics WHERE classroom_id=$1::uuid)`, c.Params("id")).Scan(&count); err != nil {
		return err
	}
	if count > 400 {
		return fail(422, "Rollover supports up to 400 coursework items and topics")
	}
	id := uuid.NewString()
	if _, err = tx.Exec(c.UserContext(), `INSERT INTO classrooms(id,owner_id,name,subject,section,room,description,class_code,term_id,syllabus) SELECT $3::uuid,$2::uuid,$4,subject,section,room,description,upper(substr(replace($3::text,'-',''),1,8)),$5::uuid,syllabus FROM classrooms WHERE id=$1::uuid`, c.Params("id"), user, id, strings.TrimSpace(req.Name), req.Term); err != nil {
		return err
	}
	if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_memberships(classroom_id,user_id,member_role,status) VALUES($1::uuid,$2::uuid,'teacher','active') ON CONFLICT DO NOTHING`, id, user); err != nil {
		return err
	}
	topics := map[string]string{}
	rows, err := tx.Query(c.UserContext(), `SELECT id::text,title FROM classroom_topics WHERE classroom_id=$1::uuid`, c.Params("id"))
	if err != nil {
		return err
	}
	titles := map[string]string{}
	for rows.Next() {
		var old, title string
		if err = rows.Scan(&old, &title); err != nil {
			rows.Close()
			return err
		}
		topics[old] = uuid.NewString()
		titles[old] = title
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for old, newID := range topics {
		if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_topics(id,classroom_id,created_by,title) VALUES($1::uuid,$2::uuid,$3::uuid,$4)`, newID, id, user, titles[old]); err != nil {
			return err
		}
	}
	resources := map[string]string{}
	if req.Assignments {
		rows, err = tx.Query(c.UserContext(), `SELECT id::text FROM classroom_assignments WHERE classroom_id=$1::uuid`, c.Params("id"))
		if err != nil {
			return err
		}
		oldIDs := []string{}
		for rows.Next() {
			var old string
			if err = rows.Scan(&old); err != nil {
				rows.Close()
				return err
			}
			oldIDs = append(oldIDs, old)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
		for _, old := range oldIDs {
			fresh := uuid.NewString()
			if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_assignments(id,classroom_id,created_by,title,instructions,due_at,max_points,allow_late,allow_resubmit,rubric,status) SELECT $3::uuid,$4::uuid,$5::uuid,title,instructions,due_at+$6*interval '1 day',max_points,allow_late,allow_resubmit,rubric,'draft' FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid`, old, c.Params("id"), fresh, id, user, req.Shift); err != nil {
				return err
			}
			resources["assignment:"+old] = fresh
		}
	}
	if req.Exams {
		if err = copySemesterExams(c.UserContext(), tx, c.Params("id"), id, user, req.Shift, resources); err != nil {
			return err
		}
	}
	createdFiles := []string{}
	committed := false
	defer func() {
		if !committed {
			for _, path := range createdFiles {
				_ = os.Remove(path)
			}
		}
	}()
	if req.Materials {
		if err = copySemesterMaterials(c.UserContext(), tx, c.Params("id"), id, user, resources, &createdFiles); err != nil {
			return err
		}
	}
	rows, err = tx.Query(c.UserContext(), `SELECT topic_id::text,resource_kind,resource_id::text FROM classroom_topic_resources WHERE classroom_id=$1::uuid`, c.Params("id"))
	if err != nil {
		return err
	}
	links := [][3]string{}
	for rows.Next() {
		var topic, kind, resource string
		if err = rows.Scan(&topic, &kind, &resource); err != nil {
			rows.Close()
			return err
		}
		if fresh := resources[kind+":"+resource]; fresh != "" {
			links = append(links, [3]string{topics[topic], kind, fresh})
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, link := range links {
		if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_topic_resources(classroom_id,topic_id,resource_kind,resource_id) VALUES($1::uuid,$2::uuid,$3,$4::uuid)`, id, link[0], link[1], link[2]); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_rollovers(source_classroom_id,actor_id,request_id,new_classroom_id,payload_hash) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)`, c.Params("id"), user, req.Request, id, signature); err != nil {
		return err
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	committed = true
	return respond(c, 201, fiber.Map{"id": id, "status": "draft_coursework"})
}
func copySemesterExams(ctx context.Context, tx pgx.Tx, source, dest, actor string, shift int, resources map[string]string) error {
	type sourceExam struct {
		id        string
		questions []map[string]any
	}
	items := []sourceExam{}
	rows, err := tx.Query(ctx, `SELECT id::text,questions FROM classroom_exams WHERE classroom_id=$1::uuid`, source)
	if err != nil {
		return err
	}
	for rows.Next() {
		var item sourceExam
		if err = rows.Scan(&item.id, &item.questions); err != nil {
			rows.Close()
			return err
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	testers := map[string]string{}
	copiedBytes := 0
	for _, item := range items {
		for _, q := range item.questions {
			q["id"] = uuid.NewString()
			if tester, ok := q["tester"].(map[string]any); ok {
				old, _ := tester["id"].(string)
				if validID(old) != nil {
					return fail(409, "An exam has an invalid tester attachment")
				}
				fresh := testers[old]
				if fresh == "" {
					var size int
					if err = tx.QueryRow(ctx, `SELECT octet_length(executable) FROM classroom_question_testers WHERE id=$1::uuid AND classroom_id=$2::uuid`, old, source).Scan(&size); err != nil {
						return err
					}
					copiedBytes += size
					if copiedBytes > 50*1024*1024 {
						return fail(422, "Copied question testers exceed 50 MB")
					}
					fresh = uuid.NewString()
					if _, err = tx.Exec(ctx, `INSERT INTO classroom_question_testers(id,classroom_id,uploaded_by,name,sha256,executable) SELECT $3::uuid,$4::uuid,$5::uuid,name,sha256,executable FROM classroom_question_testers WHERE id=$1::uuid AND classroom_id=$2::uuid`, old, source, fresh, dest, actor); err != nil {
						return err
					}
					testers[old] = fresh
				}
				tester["id"] = fresh
			}
		}
		fresh := uuid.NewString()
		raw, _ := json.Marshal(item.questions)
		if _, err = tx.Exec(ctx, `INSERT INTO classroom_exams(id,classroom_id,created_by,title,description,starts_at,ends_at,duration_minutes,questions,allow_mobile_mcq,status) SELECT $3::uuid,$4::uuid,$5::uuid,title,description,starts_at+$6*interval '1 day',ends_at+$6*interval '1 day',duration_minutes,$7::jsonb,allow_mobile_mcq,'draft' FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid`, item.id, source, fresh, dest, actor, shift, raw); err != nil {
			return err
		}
		resources["exam:"+item.id] = fresh
	}
	return nil
}
func copySemesterMaterials(ctx context.Context, tx pgx.Tx, source, dest, actor string, resources map[string]string, created *[]string) error {
	type material struct {
		id, key string
		size    int64
	}
	items := []material{}
	rows, err := tx.Query(ctx, `SELECT m.id::text,m.storage_key,m.file_size FROM classroom_materials m WHERE m.classroom_id=$1::uuid AND EXISTS(SELECT 1 FROM classroom_stream_posts p WHERE p.classroom_id=m.classroom_id AND p.reference_type='material' AND p.reference_id=m.id AND p.deleted_at IS NULL) ORDER BY m.id LIMIT 51 FOR SHARE OF m`, source)
	if err != nil {
		return err
	}
	var total int64
	for rows.Next() {
		var m material
		if err = rows.Scan(&m.id, &m.key, &m.size); err != nil {
			rows.Close()
			return err
		}
		total += m.size
		items = append(items, m)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(items) > 50 || total > 100*1024*1024 {
		return fail(422, "Copy at most 50 materials / 100 MB per rollover")
	}
	base := os.Getenv("MATERIAL_UPLOAD_DIR")
	if base == "" {
		base = filepath.Join("uploads", "materials")
	}
	folder := filepath.Join(base, dest)
	if err = os.MkdirAll(folder, 0700); err != nil {
		return err
	}
	for _, m := range items {
		if validID(m.key) != nil {
			return fail(409, "Material storage reference is invalid")
		}
		key := uuid.NewString()
		target := filepath.Join(folder, key)
		input, e := os.Open(filepath.Join(base, source, m.key))
		if e != nil {
			return fail(409, "A source material file is unavailable")
		}
		output, e := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if e != nil {
			input.Close()
			return e
		}
		*created = append(*created, target)
		n, e := io.Copy(output, io.LimitReader(input, m.size+1))
		input.Close()
		closed := output.Close()
		if e != nil || closed != nil || n != m.size {
			return fail(409, "A source material changed during copying")
		}
		fresh := uuid.NewString()
		if _, err = tx.Exec(ctx, `INSERT INTO classroom_materials(id,classroom_id,uploaded_by,title,description,original_filename,storage_key,file_size,media_type) SELECT $3::uuid,$4::uuid,$5::uuid,title,description,original_filename,$6,file_size,media_type FROM classroom_materials WHERE id=$1::uuid AND classroom_id=$2::uuid`, m.id, source, fresh, dest, actor, key); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO classroom_material_accessibility(material_id,image_alt,caption,plain_text,transcript,captions_vtt,updated_by) SELECT $2::uuid,image_alt,caption,plain_text,transcript,captions_vtt,$3::uuid FROM classroom_material_accessibility WHERE material_id=$1::uuid`, m.id, fresh, actor); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO classroom_stream_posts(classroom_id,author_id,post_type,title,content,reference_type,reference_id) SELECT $2::uuid,$3::uuid,'material',title,COALESCE(NULLIF(description,''),'Learning material'),'material',$1::uuid FROM classroom_materials WHERE id=$1::uuid`, fresh, dest, actor); err != nil {
			return err
		}
		resources["material:"+m.id] = fresh
	}
	return nil
}
