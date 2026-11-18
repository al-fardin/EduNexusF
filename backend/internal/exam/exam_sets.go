package exam

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"math/big"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

type ExamSet struct {
	ID        string     `json:"id"`
	Label     string     `json:"label"`
	Questions []Question `json:"questions"`
}
type setReceipt struct {
	Class   string           `json:"class"`
	Actor   string           `json:"actor"`
	Exam    string           `json:"exam"`
	Base    string           `json:"base"`
	Sets    string           `json:"sets"`
	Expires int64            `json:"expires"`
	Banks   map[string]int64 `json:"bank_versions,omitempty"`
}

func objectDigest(v any) string {
	raw, _ := json.Marshal(v)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
func setSecret() ([]byte, error) {
	key := []byte(os.Getenv("JWT_SECRET"))
	if len(key) < 32 {
		return nil, fiber.NewError(503, "Exam set previews require the server signing configuration")
	}
	return key, nil
}
func signSets(r setReceipt) (string, error) {
	key, e := setSecret()
	if e != nil {
		return "", e
	}
	raw, e := json.Marshal(r)
	if e != nil {
		return "", e
	}
	part := base64.RawURLEncoding.EncodeToString(raw)
	m := hmac.New(sha256.New, key)
	m.Write([]byte("edunexus:exam-sets:v1:" + part))
	return part + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil)), nil
}
func readSetReceipt(token string) (setReceipt, error) {
	var r setReceipt
	key, e := setSecret()
	if e != nil {
		return r, e
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 || len(token) > 16384 {
		return r, fiber.NewError(400, "Invalid set preview receipt")
	}
	sig, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil {
		return r, fiber.NewError(400, "Invalid set preview receipt")
	}
	m := hmac.New(sha256.New, key)
	m.Write([]byte("edunexus:exam-sets:v1:" + parts[0]))
	if !hmac.Equal(sig, m.Sum(nil)) {
		return r, fiber.NewError(400, "Set preview changed; generate it again")
	}
	raw, e := base64.RawURLEncoding.DecodeString(parts[0])
	if e != nil || json.Unmarshal(raw, &r) != nil {
		return r, fiber.NewError(400, "Invalid set preview receipt")
	}
	return r, nil
}
func permutation(n int) ([]int, error) {
	out := make([]int, n)
	for i := range out {
		out[i] = i
	}
	for i := n - 1; i > 0; i-- {
		pick, e := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if e != nil {
			return nil, e
		}
		j := int(pick.Int64())
		out[i], out[j] = out[j], out[i]
	}
	return out, nil
}
func shuffledQuestion(q Question) (Question, error) {
	q.ID = uuid.NewString()
	if q.Kind != "mcq" {
		return q, nil
	}
	order, e := permutation(len(q.Options))
	if e != nil {
		return q, e
	}
	options := make([]string, len(order))
	pictures := map[string]*QuestionImage{}
	keys := []int{}
	correct := map[int]bool{}
	if q.Selection == "multiple" {
		for _, n := range q.CorrectOptions {
			correct[n] = true
		}
	} else if q.CorrectOption != nil {
		correct[*q.CorrectOption] = true
	}
	for next, old := range order {
		options[next] = q.Options[old]
		if p := q.OptionImages[strconv.Itoa(old)]; p != nil {
			pictures[strconv.Itoa(next)] = p
		}
		if correct[old] {
			keys = append(keys, next)
		}
	}
	q.Options = options
	q.OptionImages = pictures
	if q.Selection == "multiple" {
		q.CorrectOptions = keys
		q.CorrectOption = nil
	} else if len(keys) > 0 {
		q.CorrectOptions = nil
		q.CorrectOption = new(int)
		*q.CorrectOption = keys[0]
	}
	return q, nil
}
func shuffleSections(qs []Question) ([]Question, error) {
	out := append([]Question(nil), qs...)
	for start := 0; start < len(qs); {
		end := start + 1
		for end < len(qs) && qs[end].Section == qs[start].Section {
			end++
		}
		order, e := permutation(end - start)
		if e != nil {
			return nil, e
		}
		for i, n := range order {
			out[start+i] = qs[start+n]
		}
		start = end
	}
	return out, nil
}
func baseSetDigest(e Exam, qs []Question) string {
	return objectDigest(struct {
		Exam      Exam
		Questions []Question
	}{e, qs})
}
func questionText(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(value), " "))
}
func (h *Handler) PreviewExamSets(c *fiber.Ctx) error {
	e, base, err := h.checkedTeacherExam(c)
	if err != nil {
		return err
	}
	if err = h.db.QueryRow(c.UserContext(), `SELECT duration_minutes FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid`, e.ID, e.ClassroomID).Scan(&e.DurationMinutes); err != nil {
		return err
	}
	if e.Status != "draft" {
		return failure(c, 409, "Create sets from a private draft")
	}
	var req struct {
		Count int    `json:"count"`
		Mode  string `json:"mode"`
	}
	if len(c.Body()) > 1000 || c.BodyParser(&req) != nil || req.Count < 2 || req.Count > 3 || (req.Mode != "shuffle" && req.Mode != "equivalent") {
		return failure(c, 400, "Choose two/three sets and shuffle/equivalent mode")
	}
	baseFingerprint := baseSetDigest(e, base)
	if r := inspectExam(CreateRequest{Title: e.Title, Description: e.Description, StartsAt: e.StartsAt, EndsAt: e.EndsAt, DurationMinutes: e.DurationMinutes, Questions: base, AllowMobileMCQ: e.AllowMobileMCQ}, time.Now()); !r.Ready {
		return failure(c, 400, "Fix draft readiness issues before generating sets")
	}
	sets := []ExamSet{}
	warnings := []string{}
	used := map[string]bool{}
	for _, q := range base {
		used[questionText(q.Prompt)] = true
	}
	for setIndex := 0; setIndex < req.Count; setIndex++ {
		questions := make([]Question, 0, len(base))
		for slot, q := range base {
			candidate := q
			if setIndex > 0 && req.Mode == "equivalent" {
				if q.Subject == "" && q.Chapter == "" && q.Topic == "" {
					return failure(c, 422, fmt.Sprintf("Add syllabus tags to question %d before drawing equivalent questions", slot+1))
				}
				rows, queryErr := h.db.Query(c.UserContext(), `SELECT id::text,question,version,difficulty FROM classroom_question_bank WHERE classroom_id=$1::uuid AND question->>'kind'=$2 AND(question->>'points')::int=$3 AND($4='' OR question->>'subject'=$4) AND($5='' OR question->>'chapter'=$5) AND($6='' OR topic=$6) AND($7='' OR difficulty=$7) AND lower(regexp_replace(trim(question->>'prompt'),'\s+',' ','g'))<>ALL($8::text[]) ORDER BY random() LIMIT 1`, e.ClassroomID, q.Kind, q.Points, q.Subject, q.Chapter, q.Topic, q.Difficulty, sortedKeys(used))
				if queryErr != nil {
					return queryErr
				}
				if !rows.Next() {
					rows.Close()
					return failure(c, 422, fmt.Sprintf("Not enough distinct matching bank questions for Set %c, question %d. Add questions or use shuffle mode", 'A'+setIndex, slot+1))
				}
				var bank string
				var version int64
				var difficulty string
				if err = rows.Scan(&bank, &candidate, &version, &difficulty); err != nil {
					rows.Close()
					return err
				}
				rows.Close()
				candidate.SourceBankID = bank
				candidate.SourceBankVersion = version
				candidate.Difficulty = difficulty
				candidate.Required = q.Required
				candidate.Section = q.Section
				used[questionText(candidate.Prompt)] = true
			}
			copied, copyErr := shuffledQuestion(candidate)
			if copyErr != nil {
				return copyErr
			}
			questions = append(questions, copied)
		}
		if req.Mode == "shuffle" && setIndex > 0 {
			questions, err = shuffleSections(questions)
			if err != nil {
				return err
			}
		}
		if err = h.hydrateTesters(c, questions); err != nil {
			return err
		}
		if _, err = normalizeQuestions(questions); err != nil {
			return failure(c, 400, err.Error())
		}
		sets = append(sets, ExamSet{uuid.NewString(), string(rune('A' + setIndex)), questions})
	}
	if req.Mode == "shuffle" {
		warnings = append(warnings, "Shuffle mode uses the same questions; short sections may share an ordering.")
	} else {
		for i, q := range base {
			if q.Difficulty == "" {
				warnings = append(warnings, fmt.Sprintf("Question %d has no difficulty tag; equivalent draws match syllabus/type/points only", i+1))
			}
		}
	}
	banks := map[string]int64{}
	for _, set := range sets {
		for _, q := range set.Questions {
			if q.SourceBankID == "" {
				continue
			}
			if _, ok := banks[q.SourceBankID]; ok {
				continue
			}
			var version int64
			err = h.db.QueryRow(c.UserContext(), `SELECT version FROM classroom_question_bank WHERE id=$1::uuid AND classroom_id=$2::uuid`, q.SourceBankID, e.ClassroomID).Scan(&version)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return err
			}
			banks[q.SourceBankID] = version
		}
	}
	actor, _ := identity(c)
	receipt, err := signSets(setReceipt{Class: e.ClassroomID, Actor: actor, Exam: e.ID, Base: baseFingerprint, Sets: objectDigest(sets), Expires: time.Now().Add(10 * time.Minute).Unix(), Banks: banks})
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store")
	return result(c, 200, fiber.Map{"sets": sets, "receipt": receipt, "warnings": warnings, "total_points": inspectExam(CreateRequest{Questions: base}, time.Now()).Total})
}
func sortedKeys(values map[string]bool) []string {
	out := make([]string, 0, len(values))
	for k := range values {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func (h *Handler) ApproveExamSets(c *fiber.Ctx) error {
	if _, err := h.member(c, true); err != nil {
		return err
	}
	var req struct {
		Sets    []ExamSet `json:"sets"`
		Receipt string    `json:"receipt"`
	}
	if len(c.Body()) > 8*1024*1024 || c.BodyParser(&req) != nil || len(req.Sets) < 2 || len(req.Sets) > 3 {
		return failure(c, 400, "Invalid set approval")
	}
	r, err := readSetReceipt(req.Receipt)
	if err != nil {
		return err
	}
	actor, _ := identity(c)
	if r.Class != c.Params("id") || r.Actor != actor || r.Exam != c.Params("examID") || r.Sets != objectDigest(req.Sets) {
		return failure(c, 400, "Set approval does not match its preview")
	}
	ids := []string{}
	for _, set := range req.Sets {
		if _, err = uuid.Parse(set.ID); err != nil {
			return failure(c, 400, "Invalid set identifier")
		}
		ids = append(ids, set.ID)
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.UserContext())
	var active bool
	err = tx.QueryRow(c.UserContext(), `SELECT true FROM classrooms WHERE id=$1::uuid AND status='active' AND deleted_at IS NULL FOR UPDATE`, r.Class).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 403, "Class is no longer active")
	}
	if err != nil {
		return err
	}
	err = tx.QueryRow(c.UserContext(), `SELECT true FROM classroom_memberships WHERE classroom_id=$1::uuid AND user_id=$2::uuid AND member_role='teacher' AND status='active' FOR SHARE`, r.Class, actor).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 403, "Active teacher membership required")
	}
	if err != nil {
		return err
	}

	var existing int
	err = tx.QueryRow(c.UserContext(), `SELECT count(*) FROM classroom_exams WHERE id=ANY($1::uuid[]) AND classroom_id=$2::uuid AND created_by=$3::uuid`, ids, r.Class, actor).Scan(&existing)
	if err != nil {
		return err
	}
	if existing == len(ids) {
		return result(c, 200, fiber.Map{"ids": ids, "already_created": true})
	}
	if existing > 0 {
		return failure(c, 409, "Some approved drafts changed or were removed. Generate a new preview")
	}
	if time.Now().Unix() > r.Expires {
		return failure(c, 409, "Set preview expired; generate it again")
	}
	var e Exam
	var raw []byte
	err = tx.QueryRow(c.UserContext(), `SELECT id::text,classroom_id::text,title,description,starts_at,ends_at,duration_minutes,status,jsonb_array_length(questions),created_at,allow_mobile_mcq,audience,questions FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, r.Exam, r.Class).Scan(&e.ID, &e.ClassroomID, &e.Title, &e.Description, &e.StartsAt, &e.EndsAt, &e.DurationMinutes, &e.Status, &e.QuestionCount, &e.CreatedAt, &e.AllowMobileMCQ, &e.Audience, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 409, "Source draft unavailable")
	}
	if err != nil {
		return err
	}
	var base []Question
	if err = json.Unmarshal(raw, &base); err != nil {
		return err
	}
	if e.Status != "draft" || baseSetDigest(e, base) != r.Base {
		return failure(c, 409, "Source exam changed. Review new sets before approving")
	}
	for _, set := range req.Sets {
		if len(set.Questions) != len(base) {
			return failure(c, 400, "Set question count changed")
		}
		for _, q := range set.Questions {
			if q.SourceBankID != "" {
				var version int64
				err = tx.QueryRow(c.UserContext(), `SELECT version FROM classroom_question_bank WHERE id=$1::uuid AND classroom_id=$2::uuid`, q.SourceBankID, r.Class).Scan(&version)
				if err != nil && !errors.Is(err, pgx.ErrNoRows) {
					return err
				}
				expected, ok := r.Banks[q.SourceBankID]
				if !ok || version != expected {
					return failure(c, 409, "Bank question changed. Generate a new preview")
				}
			}
		}
		if err = h.hydrateTesters(c, set.Questions); err != nil {
			return err
		}
		questions, normalizeErr := normalizeQuestions(set.Questions)
		if normalizeErr != nil {
			return failure(c, 400, normalizeErr.Error())
		}
		title := e.Title
		for len(title) > 180 {
			_, size := utf8.DecodeLastRuneInString(title)
			title = title[:len(title)-size]
		}
		title += " · Set " + set.Label
		if _, err = tx.Exec(c.UserContext(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,description,starts_at,ends_at,duration_minutes,questions,allow_mobile_mcq,audience) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb)`, set.ID, r.Class, actor, title, e.Description, e.StartsAt, e.EndsAt, e.DurationMinutes, questions, e.AllowMobileMCQ, e.Audience); err != nil {
			return err
		}
	}
	if err = tx.Commit(c.UserContext()); err != nil {
		return err
	}
	return result(c, 201, fiber.Map{"ids": ids, "already_created": false})
}
