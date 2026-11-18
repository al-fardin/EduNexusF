package exam

import (
	"errors"
	"sort"
	"strconv"
	"strings"
)

func normalizeMCQ(q *Question) error {
	if q.Selection == "" {
		q.Selection = "single"
	}
	switch q.Selection {
	case "single", "dropdown":
		if q.CorrectOption == nil || *q.CorrectOption < 0 || *q.CorrectOption >= len(q.Options) {
			return errors.New("MCQ correct option is required")
		}
		q.CorrectOptions = nil
	case "multiple":
		if len(q.CorrectOptions) == 0 || len(q.CorrectOptions) > len(q.Options) {
			return errors.New("select at least one correct checkbox answer")
		}
		seen := map[int]bool{}
		for _, i := range q.CorrectOptions {
			if i < 0 || i >= len(q.Options) || seen[i] {
				return errors.New("invalid or duplicate correct checkbox answer")
			}
			seen[i] = true
		}
		sort.Ints(q.CorrectOptions)
		q.CorrectOption = nil
	default:
		return errors.New("MCQ selection must be single, multiple or dropdown")
	}
	return nil
}

// Answers use original option indices even when the student sees shuffled choices.
// Canonical ascending indices prevent duplicate selections and ambiguous grading.
func mcqIndices(q Question, value string) ([]int, error) {
	if value == "" {
		return nil, nil
	}
	parts := strings.Split(value, ",")
	if q.Selection != "multiple" && len(parts) != 1 {
		return nil, errors.New("select one MCQ answer")
	}
	if len(parts) > len(q.Options) {
		return nil, errors.New("too many MCQ choices")
	}
	out := make([]int, 0, len(parts))
	last := -1
	for _, part := range parts {
		i, e := strconv.Atoi(part)
		if e != nil || i < 0 || i >= len(q.Options) || i <= last || strconv.Itoa(i) != part {
			return nil, errors.New("invalid MCQ answer")
		}
		out = append(out, i)
		last = i
	}
	return out, nil
}
func mcqKey(q Question) string {
	if q.Selection == "multiple" {
		parts := make([]string, len(q.CorrectOptions))
		for i, n := range q.CorrectOptions {
			parts[i] = strconv.Itoa(n)
		}
		return strings.Join(parts, ",")
	}
	if q.CorrectOption != nil {
		return strconv.Itoa(*q.CorrectOption)
	}
	return ""
}
func mcqAnswerText(q Question, answer string) string {
	indices, e := mcqIndices(q, answer)
	if e != nil || len(indices) == 0 {
		return "No response"
	}
	out := make([]string, len(indices))
	for i, n := range indices {
		out[i] = q.Options[n]
	}
	return strings.Join(out, "; ")
}
