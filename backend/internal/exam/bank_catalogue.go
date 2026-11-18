package exam

import (
	"errors"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strconv"
	"strings"
)

func (h *Handler) BankCatalogue(c *fiber.Ctx) error {
	if _, e := h.member(c, true); e != nil {
		return e
	}
	offset, e := strconv.Atoi(c.Query("offset", "0"))
	if e != nil || offset < 0 || offset > 2000 {
		return failure(c, 400, "Invalid question bank page")
	}
	for _, key := range []string{"subject", "chapter", "topic", "q"} {
		if len(c.Query(key)) > 200 {
			return failure(c, 400, "Filter is too long")
		}
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT id::text,question,topic,difficulty,version,updated_at FROM classroom_question_bank WHERE classroom_id=$1::uuid AND($2='' OR question->>'subject'=$2) AND($3='' OR question->>'chapter'=$3) AND($4='' OR topic=$4) AND($5='' OR difficulty=$5) AND($6='' OR position(lower($6) in lower(question->>'prompt'))>0) ORDER BY updated_at DESC,id LIMIT 51 OFFSET $7`, c.Params("id"), c.Query("subject"), c.Query("chapter"), c.Query("topic"), c.Query("difficulty"), strings.TrimSpace(c.Query("q")), offset)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []BankItem{}
	for rows.Next() {
		var item BankItem
		if e = rows.Scan(&item.ID, &item.Question, &item.Topic, &item.Difficulty, &item.Version, &item.UpdatedAt); e != nil {
			return e
		}
		items = append(items, item)
	}
	if e = rows.Err(); e != nil {
		return e
	}
	next := -1
	if len(items) > 50 {
		items = items[:50]
		next = offset + 50
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"items": items, "next_offset": next})
}
func (h *Handler) BankTaxonomy(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	if _, e := h.member(c, true); e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT COALESCE(question->>'subject',''),COALESCE(question->>'chapter',''),topic,count(*)::int FROM classroom_question_bank WHERE classroom_id=$1::uuid GROUP BY 1,2,3 ORDER BY 1,2,3 LIMIT 2000`, c.Params("id"))
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var subject, chapter, topic string
		var count int
		if e = rows.Scan(&subject, &chapter, &topic, &count); e != nil {
			return e
		}
		items = append(items, fiber.Map{"subject": subject, "chapter": chapter, "topic": topic, "count": count})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	return result(c, 200, items)
}
func (h *Handler) BankUsage(c *fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	if _, e := h.member(c, true); e != nil {
		return e
	}
	if _, e := uuid.Parse(c.Params("bankID")); e != nil {
		return failure(c, 400, "Invalid bank question")
	}
	var prompt string
	e := h.db.QueryRow(c.UserContext(), `SELECT question->>'prompt' FROM classroom_question_bank WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("bankID"), c.Params("id")).Scan(&prompt)
	if errors.Is(e, pgx.ErrNoRows) {
		return failure(c, 404, "Bank question not found")
	}
	if e != nil {
		return e
	}
	rows, e := h.db.Query(c.UserContext(), `SELECT e.id::text,e.title,e.status,e.starts_at,COALESCE(bool_or(q->>'source_bank_id'=$2),false) FROM classroom_exams e CROSS JOIN LATERAL jsonb_array_elements(e.questions) q WHERE e.classroom_id=$1::uuid AND(q->>'source_bank_id'=$2 OR(COALESCE(q->>'source_bank_id','')='' AND lower(regexp_replace(trim(q->>'prompt'),'\s+',' ','g'))=lower(regexp_replace(trim($3),'\s+',' ','g')))) GROUP BY e.id ORDER BY e.starts_at DESC,e.id LIMIT 101`, c.Params("id"), c.Params("bankID"), prompt)
	if e != nil {
		return e
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, title, status string
		var start any
		var source bool
		if e = rows.Scan(&id, &title, &status, &start, &source); e != nil {
			return e
		}
		items = append(items, fiber.Map{"id": id, "title": title, "status": status, "starts_at": start, "match": map[bool]string{true: "source", false: "same_text"}[source]})
	}
	if e = rows.Err(); e != nil {
		return e
	}
	truncated := len(items) > 100
	if truncated {
		items = items[:100]
	}
	return result(c, 200, fiber.Map{"items": items, "truncated": truncated})
}
func (h *Handler) hydrateBankSources(c *fiber.Ctx, questions []Question) error {
	for i := range questions {
		q := &questions[i]
		if q.SourceBankID == "" {
			q.SourceBankVersion = 0
			continue
		}
		id, e := uuid.Parse(q.SourceBankID)
		if e != nil {
			return fiber.NewError(400, "Invalid question bank source")
		}
		q.SourceBankID = id.String()
		var class string
		var version int64
		e = h.db.QueryRow(c.UserContext(), `SELECT classroom_id::text,version FROM classroom_question_bank WHERE id=$1::uuid`, q.SourceBankID).Scan(&class, &version)
		if errors.Is(e, pgx.ErrNoRows) {
			q.SourceBankID = ""
			q.SourceBankVersion = 0
			continue
		}
		if e != nil {
			return e
		}
		if class != c.Params("id") {
			return fiber.NewError(400, "Bank question source must belong to this classroom")
		}
		if q.SourceBankVersion < 1 || q.SourceBankVersion > version {
			q.SourceBankVersion = version
		}
	}
	return nil
}
