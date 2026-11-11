package learning

import (
	"testing"
	"time"
)

func TestAssignmentLimits(t *testing.T) {
	a := Assignment{Title: "Practical", DueAt: time.Now().Add(time.Hour), MaxPoints: 100}
	if validAssignment(a) != nil {
		t.Fatal("valid assignment rejected")
	}
	a.MaxPoints = 0
	if validAssignment(a) == nil {
		t.Fatal("zero-point assignment accepted")
	}
}
func TestSubmissionFiles(t *testing.T) {
	for _, name := range []string{"solution.py", "report.pdf", "project.zip"} {
		if _, err := assignmentFileName(name); err != nil {
			t.Fatal(err)
		}
	}
	for _, name := range []string{"attack.exe", "evil\n.pdf", "run.ps1"} {
		if _, err := assignmentFileName(name); err == nil {
			t.Fatalf("unsafe upload accepted: %q", name)
		}
	}
}
