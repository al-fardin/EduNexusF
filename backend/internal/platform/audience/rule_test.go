package audience

import (
	"fmt"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
)

func TestEveryoneIsOptionalDefault(t *testing.T) {
	for _, rule := range []*Rule{nil, {}, {Mode: "all"}} {
		raw, err := Encode(rule)
		if err != nil || string(raw) != `{"mode":"all"}` {
			t.Fatalf("default: %s %v", raw, err)
		}
		for _, roll := range []string{"", "001", "CSE-002", "ALPHA"} {
			if !Matches(rule, roll) {
				t.Fatalf("default blocked %q", roll)
			}
		}
	}
	if _, err := Normalize(&Rule{Mode: "custom"}); err == nil {
		t.Fatal("empty explicit custom audience accepted")
	}
}
func TestRuleDatabaseParityAndBoundariesAgree(t *testing.T) {
	f := testsupport.Database(t)
	rules := []Rule{{Mode: "all"}, {Mode: "odd"}, {Mode: "even"}, {Mode: "ranges", Ranges: []Range{{1, 50}}}, {Mode: "ranges", Ranges: []Range{{51, 100}}}, {Mode: "custom", Rolls: []string{"001", "CSE-050", "ALPHA"}}, {Mode: "mixed", Parity: "odd", Ranges: []Range{{1, 50}}, Rolls: []string{"088"}, Exclude: []string{"003"}}, {Mode: "all", Exclude: []string{"001"}}, {Mode: "mixed", Rolls: []string{"ALPHA"}}, {Mode: "mixed", Parity: "even"}}
	rolls := []string{"", "ALPHA", "CSE-021", "CSE-050", "01", "001", "003", "000", "088", "CSE-12/001", "99999999999999999999999999999999"}
	for i := 0; i <= 101; i++ {
		rolls = append(rolls, fmt.Sprint(i))
	}
	for _, rule := range rules {
		raw, err := Encode(&rule)
		if err != nil {
			t.Fatal(err)
		}
		for _, roll := range rolls {
			var actual bool
			if err = f.DB.QueryRow(t.Context(), `SELECT edunexus_audience_matches($1::jsonb,$2)`, raw, roll).Scan(&actual); err != nil {
				t.Fatal(err)
			}
			if actual != Matches(&rule, roll) {
				t.Fatalf("rule=%s roll=%s sql=%v go=%v", raw, roll, actual, Matches(&rule, roll))
			}
		}
	}
}

func TestAudienceValidationAndCanonicalRolls(t *testing.T) {
	for _, r := range []Rule{{Mode: "invalid"}, {Mode: "ranges"}, {Mode: "ranges", Ranges: []Range{{50, 1}}}, {Mode: "ranges", Ranges: []Range{{-1, 50}}}, {Mode: "mixed"}, {Mode: "mixed", Parity: "invalid"}, {Mode: "custom", Rolls: []string{"bad space"}}} {
		if _, err := Normalize(&r); err == nil {
			t.Fatalf("accepted invalid %+v", r)
		}
	}
	normalized, err := Normalize(&Rule{Mode: "custom", Rolls: []string{" cse-001 ", "CSE-001", "002"}})
	if err != nil || len(normalized.Rolls) != 2 || normalized.Rolls[0] != "CSE-001" {
		t.Fatal(normalized, err)
	}
}

func TestSectionIntersectionAgreesWithDatabase(t *testing.T) {
	f := testsupport.Database(t)
	a := "11111111-1111-4111-8111-111111111111"
	b := "22222222-2222-4222-8222-222222222222"
	for _, rule := range []Rule{{Mode: "all"}, {Mode: "sections", Sections: []string{a}}, {Mode: "odd", Sections: []string{a}}, {Mode: "ranges", Sections: []string{a, b}, Ranges: []Range{{1, 50}}}} {
		raw, err := Encode(&rule)
		if err != nil {
			t.Fatal(err)
		}
		for _, section := range []string{"", a, b} {
			for _, roll := range []string{"", "001", "002", "CSE-051"} {
				var got bool
				if err = f.DB.QueryRow(t.Context(), `SELECT edunexus_audience_matches($1::jsonb,$2,NULLIF($3,'')::uuid)`, raw, roll, section).Scan(&got); err != nil {
					t.Fatal(err)
				}
				if got != CompileMember(&rule)(roll, section) {
					t.Fatalf("section predicate mismatch: %s %s %s", raw, roll, section)
				}
			}
		}
	}
}
