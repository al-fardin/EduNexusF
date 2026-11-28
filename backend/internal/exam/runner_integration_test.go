package exam

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/edunexus/edunexus/internal/testsupport"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func TestBoundedRunnerOutput(t *testing.T) {
	buffer := &boundedBuffer{max: 8192}
	// Hide the source's WriterTo as a process output pipe does. io.Copy must
	// still pass through our Write limit instead of bytes.Buffer.ReadFrom.
	n, err := io.Copy(buffer, struct{ io.Reader }{strings.NewReader(strings.Repeat("x", 100000))})
	if err != nil || n != 100000 || buffer.Len() != 8192 || !buffer.clipped {
		t.Fatalf("copied=%d kept=%d clipped=%v err=%v", n, buffer.Len(), buffer.clipped, err)
	}
	if n, err := buffer.Write([]byte("extra")); n != 5 || err != nil || buffer.Len() != 8192 {
		t.Fatal("overflow must be drained without growing the buffer")
	}
}

func TestRunnerOptIn(t *testing.T) {
	t.Setenv("EXAM_RUNNER_ENABLED", "false")
	if _, err := runSandbox(context.Background(), "cpp", "", ""); !errors.Is(err, errRunnerDisabled) {
		t.Fatalf("disabled runner started: %v", err)
	}
	if _, err := runWorkspaceSandbox(context.Background(), "cpp", "main.cpp", "", nil); !errors.Is(err, errRunnerDisabled) {
		t.Fatalf("disabled workspace runner started: %v", err)
	}
	t.Setenv("EXAM_RUNNER_ENABLED", " TRUE ")
	if !runnerEnabled() {
		t.Fatal("runner flag normalization changed")
	}
}

func TestDockerWorkspaceEndpoint(t *testing.T) {
	if os.Getenv("EDUNEXUS_TEST_DOCKER_RUNNER") != "true" {
		t.Skip("Docker compiler verification is opt-in")
	}
	t.Setenv("EXAM_RUNNER_ENABLED", "true")
	f := testsupport.Database(t)
	examID, attemptID := uuid.NewString(), uuid.NewString()
	_, err := f.DB.Exec(t.Context(), `INSERT INTO classroom_exams(id,classroom_id,created_by,title,starts_at,ends_at,duration_minutes,status,questions) VALUES($1::uuid,$2::uuid,$3::uuid,'Compiler verification',now()-interval '5 minutes',now()+interval '1 hour',60,'published','[{"id":"q","kind":"coding","prompt":"Add integers","language":"cpp","points":10}]')`, examID, f.ClassID, f.Teacher)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.DB.Exec(t.Context(), `INSERT INTO classroom_exam_attempts(id,exam_id,student_id,expires_at) VALUES($1::uuid,$2::uuid,$3::uuid,now()+interval '1 hour')`, attemptID, examID, f.Student)
	if err != nil {
		t.Fatal(err)
	}
	h := New(f.DB)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error { c.Locals("user_id", c.Get("X-Test-User")); return c.Next() })
	app.Post("/classrooms/:id/exams/:examID/run-workspace", h.RunWorkspace)
	payload, _ := json.Marshal(workspaceRunRequest{QuestionID: "q", Entry: "main.cpp", Stdin: "3 4\n", Files: []workspaceFile{{Path: "main.cpp", Content: "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}"}}})
	for _, actor := range []string{f.Outsider, f.Student} {
		req := httptest.NewRequest("POST", "/classrooms/"+f.ClassID+"/exams/"+examID+"/run-workspace", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-User", actor)
		res, err := app.Test(req, 30000)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if actor == f.Outsider {
			if res.StatusCode != 403 {
				t.Fatalf("outsider admitted: %d %s", res.StatusCode, body)
			}
			continue
		}
		var result struct {
			Data runOutput `json:"data"`
		}
		if err := json.Unmarshal(body, &result); err != nil {
			t.Fatal(err)
		}
		if res.StatusCode != 200 || result.Data.Status != "ok" || result.Data.Stdout != "7" {
			t.Fatalf("%d %s", res.StatusCode, body)
		}
	}
	var answers string
	if err := f.DB.QueryRow(t.Context(), `SELECT answers::text FROM classroom_exam_attempts WHERE id=$1::uuid`, attemptID).Scan(&answers); err != nil || answers != "{}" {
		t.Fatalf("running code changed saved answers: %q %v", answers, err)
	}
}

// Explicit opt-in: uses cached approved images only, with the production
// network/user/resource restrictions. No database or image download is needed.
func TestDockerWorkspaceCompilers(t *testing.T) {
	if os.Getenv("EDUNEXUS_TEST_DOCKER_RUNNER") != "true" {
		t.Skip("Docker compiler verification is opt-in")
	}
	t.Setenv("EXAM_RUNNER_ENABLED", "true")
	cases := []struct{ language, entry, code string }{
		{"cpp", "main.cpp", "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}"},
		{"c", "main.c", "#include <stdio.h>\nint main(){int a,b;scanf(\"%d %d\",&a,&b);printf(\"%d\",a+b);}"},
		{"python", "main.py", "a,b=map(int,input().split()); print(a+b)"},
		{"javascript", "main.js", "const fs=require('fs');const [a,b]=fs.readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);console.log(a+b);"},
		{"typescript", "main.ts", "const sum: number = 3 + 4; console.log(sum);"},
		{"java", "Main.java", "import java.util.Scanner;public class Main{public static void main(String[] args){Scanner s=new Scanner(System.in);System.out.print(s.nextInt()+s.nextInt());}}"},
		{"go", "main.go", "package main\nimport \"fmt\"\nfunc main(){var a,b int;fmt.Scan(&a,&b);fmt.Print(a+b)}"},
		{"rust", "main.rs", "fn main(){println!(\"{}\",3+4);}"},
		{"ruby", "main.rb", "puts STDIN.read.split.map(&:to_i).sum"},
		{"php", "main.php", "<?php $a=array_map('intval',explode(' ',trim(stream_get_contents(STDIN)))); echo array_sum($a);"},
	}
	for _, tc := range cases {
		t.Run(tc.language, func(t *testing.T) {
			out, err := runWorkspaceSandbox(context.Background(), tc.language, tc.entry, "3 4\n", []workspaceFile{{Path: tc.entry, Content: tc.code}})
			if err != nil {
				t.Fatal(err)
			}
			if out.Status != "ok" || strings.TrimSpace(out.Stdout) != "7" {
				t.Fatalf("status=%s stdout=%q stderr=%q", out.Status, out.Stdout, out.Stderr)
			}
		})
	}
	t.Run("single-source", func(t *testing.T) {
		out, err := runSandbox(context.Background(), "cpp", cases[0].code, "3 4\n")
		if err != nil || out.Status != "ok" || strings.TrimSpace(out.Stdout) != "7" {
			t.Fatalf("%+v %v", out, err)
		}
	})
	t.Run("compile-error", func(t *testing.T) {
		out, err := runWorkspaceSandbox(context.Background(), "cpp", "main.cpp", "", []workspaceFile{{Path: "main.cpp", Content: "int main( broken"}})
		if err != nil || out.Status != "error" || out.Stderr == "" {
			t.Fatalf("%+v %v", out, err)
		}
	})
	t.Run("bounded-output", func(t *testing.T) {
		out, err := runSandbox(context.Background(), "python", "print('x'*10000)", "")
		if err != nil || out.Status != "ok" || !out.Truncated || len(out.Stdout) != 8192 {
			t.Fatalf("status=%s length=%d truncated=%v err=%v", out.Status, len(out.Stdout), out.Truncated, err)
		}
	})
}
