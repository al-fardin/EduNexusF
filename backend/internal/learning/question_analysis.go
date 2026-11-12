package learning

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func (h *Handler) QuestionAnalysis(c *fiber.Ctx) error {
	if _, _, err := h.member(c, true); err != nil {
		return err
	}
	if validID(c.Params("examID")) != nil {
		return fail(400, "Invalid exam")
	}
	var title string
	var questions []map[string]any
	err := h.db.QueryRow(c.UserContext(), `SELECT title,questions FROM classroom_exams WHERE id=$1::uuid AND classroom_id=$2::uuid`, c.Params("examID"), c.Params("id")).Scan(&title, &questions)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(404, "Exam not found")
	}
	if err != nil {
		return err
	}
	var attemptCount int
	var answerBytes int64
	if err = h.db.QueryRow(c.UserContext(), `SELECT count(*)::int,COALESCE(sum(octet_length(a.answers::text)),0)::bigint FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid AND (a.status='submitted' OR a.expires_at<=now() OR e.ends_at<=now() OR e.closed_at IS NOT NULL)`, c.Params("examID"), c.Params("id")).Scan(&attemptCount, &answerBytes); err != nil {
		return err
	}
	if attemptCount > 5000 || answerBytes > 20*1024*1024 {
		return fail(422, "Analysis supports 5000 completed attempts / 20 MB of answer text")
	}
	type attempt struct {
		answers map[string]string
		marks   map[string]int
	}
	attempts := []attempt{}
	rows, err := h.db.Query(c.UserContext(), `SELECT a.answers,COALESCE((SELECT jsonb_object_agg(m.question_id,m.awarded_points) FROM classroom_exam_question_marks m WHERE m.attempt_id=a.id),'{}'::jsonb) FROM classroom_exam_attempts a JOIN classroom_exams e ON e.id=a.exam_id WHERE e.id=$1::uuid AND e.classroom_id=$2::uuid AND (a.status='submitted' OR a.expires_at<=now() OR e.ends_at<=now() OR e.closed_at IS NOT NULL) ORDER BY a.id LIMIT 5001`, c.Params("examID"), c.Params("id"))
	if err != nil {
		return err
	}
	for rows.Next() {
		var a attempt
		if err = rows.Scan(&a.answers, &a.marks); err != nil {
			rows.Close()
			return err
		}
		attempts = append(attempts, a)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(attempts) > 5000 {
		return fail(422, "Analysis supports up to 5000 completed attempts")
	}
	result := []fiber.Map{}
	type topicScore struct {
		responses, graded int
		earned, maximum   float64
	}
	topics := map[string]*topicScore{}
	for _, q := range questions {
		id, _ := q["id"].(string)
		kind, _ := q["kind"].(string)
		prompt, _ := q["prompt"].(string)
		topic, _ := q["topic"].(string)
		if strings.TrimSpace(topic) == "" {
			topic = "General"
		}
		maximum, _ := q["points"].(float64)
		if maximum <= 0 {
			continue
		}
		options, _ := q["options"].([]any)
		counts := make([]int, len(options))
		correctOption, _ := q["correct_option"].(float64)
		unanswered, correct, graded := 0, 0, 0
		earned := 0.0
		for _, a := range attempts {
			answer := strings.TrimSpace(a.answers[id])
			if answer == "" {
				unanswered++
			}
			if kind == "mcq" && answer != "" {
				index, e := strconv.Atoi(answer)
				if e == nil && index >= 0 && index < len(counts) {
					counts[index]++
				}
				if e == nil && index == int(correctOption) {
					correct++
				}
			}
			score, marked := a.marks[id]
			if marked {
				earned += float64(score)
				graded++
			} else if answer == "" {
				graded++
			} else if kind == "mcq" {
				index, e := strconv.Atoi(answer)
				if e == nil && index == int(correctOption) {
					earned += maximum
				}
				graded++
			}
		}
		var percent *float64
		if graded > 0 {
			value := 100 * earned / (float64(graded) * maximum)
			percent = &value
		}
		choiceStats := []fiber.Map{}
		for i, option := range options {
			choiceStats = append(choiceStats, fiber.Map{"index": i, "text": option, "count": counts[i], "correct": kind == "mcq" && i == int(correctOption)})
		}
		var incorrect *int
		if kind == "mcq" {
			value := len(attempts) - unanswered - correct
			incorrect = &value
		}
		result = append(result, fiber.Map{"id": id, "kind": kind, "prompt": prompt, "topic": topic, "maximum": maximum, "attempts": len(attempts), "answered": len(attempts) - unanswered, "unanswered": unanswered, "correct": correct, "incorrect": incorrect, "graded": graded, "percent": percent, "options": choiceStats, "small_sample": len(attempts) < 5})
		if topics[topic] == nil {
			topics[topic] = &topicScore{}
		}
		s := topics[topic]
		s.responses += len(attempts)
		s.graded += graded
		s.earned += earned
		s.maximum += float64(graded) * maximum
	}
	topicRows := []fiber.Map{}
	for name, s := range topics {
		var p *float64
		if s.maximum > 0 {
			v := 100 * s.earned / s.maximum
			p = &v
		}
		topicRows = append(topicRows, fiber.Map{"topic": name, "responses": s.responses, "graded": s.graded, "percent": p})
	}
	c.Set("Cache-Control", "no-store")
	return respond(c, 200, fiber.Map{"title": title, "completed_attempts": len(attempts), "questions": result, "topics": topicRows})
}

// JSON score snapshots are canonicalized before hashing for recheck receipts.
func snapshotHash(value any) string { raw, _ := json.Marshal(value); return digestBytes(raw) }
