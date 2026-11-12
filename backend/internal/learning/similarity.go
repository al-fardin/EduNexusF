package learning

import (
	"sort"
	"strings"
	"unicode"

	"github.com/gofiber/fiber/v2"
)

func textShingles(text string) map[string]struct{} {
	words := strings.FieldsFunc(strings.ToLower(text), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) })
	out := map[string]struct{}{}
	if len(words) < 20 {
		return out
	}
	for i := 0; i+5 <= len(words); i++ {
		out[strings.Join(words[i:i+5], " ")] = struct{}{}
	}
	return out
}
func textSimilarity(a, b map[string]struct{}) (float64, int) {
	if len(a) == 0 || len(b) == 0 {
		return 0, 0
	}
	small, large := a, b
	if len(small) > len(large) {
		small, large = large, small
	}
	shared := 0
	for key := range small {
		if _, ok := large[key]; ok {
			shared++
		}
	}
	return float64(shared) / float64(len(a)+len(b)-shared), shared
}
func (h *Handler) SimilarityRoster(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT DISTINCT ON(s.student_id) s.student_id::text,trim(u.first_name||' '||u.last_name),s.id::text,s.version FROM classroom_assignment_submissions s JOIN classroom_assignments a ON a.id=s.assignment_id JOIN users u ON u.id=s.student_id WHERE a.id=$1::uuid AND a.classroom_id=$2::uuid ORDER BY s.student_id,s.version DESC LIMIT 501`, c.Params("assignmentID"), c.Params("id"))
	if err != nil {
		return err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var student, name, id string
		var version int
		if err = rows.Scan(&student, &name, &id, &version); err != nil {
			return err
		}
		items = append(items, fiber.Map{"student_id": student, "name": name, "submission_id": id, "version": version})
	}
	if err = rows.Err(); err != nil {
		return err
	}
	if len(items) > 500 {
		return fail(422, "Similarity roster supports up to 500 students")
	}
	return respond(c, 200, items)
}
func (h *Handler) Similarity(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	var req struct {
		Students []string `json:"students"`
	}
	if c.BodyParser(&req) != nil || len(req.Students) < 2 || len(req.Students) > 100 {
		return fail(400, "Select 2–100 students for comparison")
	}
	seen := map[string]bool{}
	for _, id := range req.Students {
		if validID(id) != nil || seen[id] {
			return fail(400, "Invalid or repeated student")
		}
		seen[id] = true
	}
	var instructions string
	if err := h.db.QueryRow(c.UserContext(), `SELECT instructions FROM classroom_assignments WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("assignmentID"), c.Params("id")).Scan(&instructions); err != nil {
		return fail(404, "Assignment not found")
	}
	prompt := textShingles(instructions)
	type response struct {
		id, student, name, answer string
		version                   int
		shingles                  map[string]struct{}
	}
	items := []response{}
	rows, err := h.db.Query(c.UserContext(), `SELECT DISTINCT ON(s.student_id) s.id::text,s.student_id::text,trim(u.first_name||' '||u.last_name),s.answer,s.version FROM classroom_assignment_submissions s JOIN users u ON u.id=s.student_id WHERE s.assignment_id=$1::uuid AND s.student_id=ANY($2::uuid[]) ORDER BY s.student_id,s.version DESC`, c.Params("assignmentID"), req.Students)
	if err != nil {
		return err
	}
	for rows.Next() {
		var item response
		if err = rows.Scan(&item.id, &item.student, &item.name, &item.answer, &item.version); err != nil {
			rows.Close()
			return err
		}
		item.shingles = textShingles(item.answer)
		for shared := range prompt {
			delete(item.shingles, shared)
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(items) != len(req.Students) {
		return fail(409, "A selected student has no submission in this assignment")
	}
	reviews := map[string]fiber.Map{}
	ids := make([]string, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.id)
	}
	rows, err = h.db.Query(c.UserContext(), `SELECT submission_low::text,submission_high::text,note,updated_at FROM classroom_similarity_reviews WHERE assignment_id=$1::uuid AND submission_low=ANY($2::uuid[]) AND submission_high=ANY($2::uuid[])`, c.Params("assignmentID"), ids)
	if err != nil {
		return err
	}
	for rows.Next() {
		var low, high, note string
		var at any
		if err = rows.Scan(&low, &high, &note, &at); err != nil {
			rows.Close()
			return err
		}
		reviews[low+":"+high] = fiber.Map{"note": note, "at": at}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	pairs := []fiber.Map{}
	insufficient := 0
	for _, item := range items {
		if len(item.shingles) == 0 {
			insufficient++
		}
	}
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			a, b := items[i], items[j]
			score, shared := textSimilarity(a.shingles, b.shingles)
			if score < .15 {
				continue
			}
			low, high := a.id, b.id
			if low > high {
				low, high = high, low
			}
			pairs = append(pairs, fiber.Map{"low": low, "high": high, "percent": score * 100, "shared_fragments": shared, "a": fiber.Map{"id": a.id, "name": a.name, "version": a.version, "answer": a.answer}, "b": fiber.Map{"id": b.id, "name": b.name, "version": b.version, "answer": b.answer}, "review": reviews[low+":"+high]})
		}
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i]["percent"].(float64) > pairs[j]["percent"].(float64) })
	total := len(pairs)
	if len(pairs) > 50 {
		pairs = pairs[:50]
	}
	return respond(c, 200, fiber.Map{"pairs": pairs, "matching_pairs": total, "compared": len(items), "insufficient_text": insufficient, "truncated": total > 50})
}
func (h *Handler) ReviewSimilarity(c *fiber.Ctx) error {
	actor, _, err := h.member(c, true)
	if err != nil {
		return err
	}
	if validID(c.Params("assignmentID")) != nil {
		return fail(400, "Invalid assignment")
	}
	var req struct {
		Low  string `json:"low"`
		High string `json:"high"`
		Note string `json:"note"`
	}
	if c.BodyParser(&req) != nil || validID(req.Low) != nil || validID(req.High) != nil || req.Low >= req.High || len([]rune(strings.TrimSpace(req.Note))) < 5 || len([]rune(req.Note)) > 2000 {
		return fail(400, "Provide a pair and a review note of 5–2000 characters")
	}
	tag, err := h.db.Exec(c.UserContext(), `INSERT INTO classroom_similarity_reviews(assignment_id,submission_low,submission_high,reviewed_by,note) SELECT a.id,s.id,t.id,$5::uuid,$6 FROM classroom_assignments a JOIN classroom_assignment_submissions s ON s.assignment_id=a.id JOIN classroom_assignment_submissions t ON t.assignment_id=a.id AND t.student_id<>s.student_id WHERE a.id=$1::uuid AND a.classroom_id=$2::uuid AND s.id=$3::uuid AND t.id=$4::uuid AND s.version=(SELECT max(version) FROM classroom_assignment_submissions WHERE assignment_id=a.id AND student_id=s.student_id) AND t.version=(SELECT max(version) FROM classroom_assignment_submissions WHERE assignment_id=a.id AND student_id=t.student_id) ON CONFLICT(assignment_id,submission_low,submission_high) DO UPDATE SET reviewed_by=excluded.reviewed_by,note=excluded.note,updated_at=now()`, c.Params("assignmentID"), c.Params("id"), req.Low, req.High, actor, strings.TrimSpace(req.Note))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fail(409, "Submission pair changed. Run comparison again")
	}
	return respond(c, 200, fiber.Map{"reviewed": true})
}
