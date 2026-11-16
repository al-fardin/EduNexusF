// Package audience defines roll-based classroom content selection.
package audience

import (
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"strings"
)

type Range struct {
	From int64 `json:"from"`
	To   int64 `json:"to"`
}
type Rule struct {
	Mode    string   `json:"mode"`
	Parity  string   `json:"parity,omitempty"`
	Ranges  []Range  `json:"ranges,omitempty"`
	Rolls   []string `json:"rolls,omitempty"`
	Exclude []string `json:"exclude_rolls,omitempty"`
}

var rollPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_/-]{0,31}$`)
var suffixPattern = regexp.MustCompile(`[0-9]+$`)

// Matches mirrors the database predicate for teacher-side gradebook cells.
func Matches(rule *Rule, roll string) bool { return Compile(rule)(roll) }

// Compile validates once and builds sets for large gradebooks.
func Compile(rule *Rule) func(string) bool {
	r, err := Normalize(rule)
	if err != nil {
		return func(string) bool { return false }
	}
	custom, excluded := map[string]bool{}, map[string]bool{}
	for _, v := range r.Rolls {
		custom[v] = true
	}
	for _, v := range r.Exclude {
		excluded[v] = true
	}
	return func(roll string) bool {
		value := strings.ToUpper(strings.TrimSpace(roll))
		if excluded[value] {
			return false
		}
		if r.Mode == "all" {
			return true
		}
		if value == "" {
			return false
		}
		if r.Mode == "custom" {
			return custom[value]
		}
		matched := false
		if digits := suffixPattern.FindString(value); digits != "" {
			n, _ := new(big.Int).SetString(digits, 10)
			parity := r.Parity
			if r.Mode == "odd" || r.Mode == "even" {
				parity = r.Mode
			}
			if parity == "" {
				parity = "any"
			}
			matched = parity == "any" || parity == "odd" && n.Bit(0) == 1 || parity == "even" && n.Bit(0) == 0
			if r.Mode == "ranges" || r.Mode == "mixed" && len(r.Ranges) > 0 {
				inRange := false
				if n.IsInt64() {
					for _, v := range r.Ranges {
						if n.Int64() >= v.From && n.Int64() <= v.To {
							inRange = true
							break
						}
					}
				}
				matched = matched && inRange
			} else if r.Mode == "mixed" && parity == "any" {
				matched = false
			}
		}
		return matched || r.Mode == "mixed" && custom[value]
	}
}

func Normalize(rule *Rule) (Rule, error) {
	r := Rule{Mode: "all"}
	if rule != nil {
		r = *rule
	}
	if r.Mode == "" {
		r.Mode = "all"
	}
	switch r.Mode {
	case "all", "odd", "even", "ranges", "custom", "mixed":
	default:
		return r, fmt.Errorf("Choose everyone, odd, even, ranges, custom or mixed audience")
	}
	if len(r.Ranges) > 20 || len(r.Rolls) > 1000 || len(r.Exclude) > 1000 {
		return r, fmt.Errorf("Use at most 20 ranges and 1000 custom/excluded rolls")
	}
	if r.Mode != "mixed" {
		r.Parity = ""
	}
	if r.Mode != "mixed" && r.Mode != "ranges" {
		r.Ranges = nil
	}
	if r.Mode != "mixed" && r.Mode != "custom" {
		r.Rolls = nil
	}
	if r.Mode == "mixed" {
		if r.Parity == "" {
			r.Parity = "any"
		}
		if r.Parity != "any" && r.Parity != "odd" && r.Parity != "even" {
			return r, fmt.Errorf("Choose any, odd or even parity")
		}
	}
	for _, v := range r.Ranges {
		if v.From < 0 || v.To < v.From || v.To > 999999999999 {
			return r, fmt.Errorf("Roll ranges require inclusive bounds from 0 to 999999999999")
		}
	}
	for _, list := range []*[]string{&r.Rolls, &r.Exclude} {
		seen := map[string]bool{}
		out := []string{}
		for _, raw := range *list {
			v := strings.ToUpper(strings.TrimSpace(raw))
			if !rollPattern.MatchString(v) {
				return r, fmt.Errorf("Use full valid roll values, up to 32 characters each")
			}
			if !seen[v] {
				out = append(out, v)
				seen[v] = true
			}
		}
		*list = out
	}
	if r.Mode == "ranges" && len(r.Ranges) == 0 {
		return r, fmt.Errorf("Add at least one roll range")
	}
	if r.Mode == "custom" && len(r.Rolls) == 0 {
		return r, fmt.Errorf("Add at least one custom roll")
	}
	if r.Mode == "mixed" && r.Parity == "any" && len(r.Ranges) == 0 && len(r.Rolls) == 0 {
		return r, fmt.Errorf("Add a numeric rule or custom rolls for a mixed audience")
	}
	return r, nil
}
func Encode(rule *Rule) ([]byte, error) {
	r, err := Normalize(rule)
	if err != nil {
		return nil, err
	}
	return json.Marshal(r)
}
