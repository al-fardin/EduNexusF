package exam

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Workspace sources are ephemeral: persisted student answers remain in the
// existing exam attempt JSON, NOT in compiler logs or a shared host directory.
type workspaceFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}
type workspaceRunRequest struct {
	QuestionID string          `json:"question_id"`
	Entry      string          `json:"entry"`
	Files      []workspaceFile `json:"files"`
	Stdin      string          `json:"stdin"`
}

var safeWorkPath = regexp.MustCompile(`^[A-Za-z0-9_./-]+$`)

// A workspace may contain several independent exercises, each with main().
// Compile only the chosen entry plus translation units without another main().
var cppMainPattern = regexp.MustCompile(`\b(?:int|signed|auto|void|int32_t|int64_t)\s+main\s*\(`)
var goMainPattern = regexp.MustCompile(`\bfunc\s+main\s*\(`)
var javaPackage = regexp.MustCompile(`(?m)^\s*package\s+([A-Za-z_$][A-Za-z0-9_$.]*)\s*;`)

func cleanWorkPath(p string) (string, error) {
	if len(p) == 0 || len(p) > 160 || !safeWorkPath.MatchString(p) {
		return "", errors.New("filename must use letters, digits, dash, underscore, dot and forward slash")
	}
	clean := path.Clean(p)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") || strings.HasPrefix(clean, "/") || clean != p {
		return "", errors.New("invalid source file path")
	}
	for _, seg := range strings.Split(clean, "/") {
		if seg == "." || seg == ".." || strings.HasPrefix(seg, ".") {
			return "", errors.New("hidden or relative path segments are not allowed")
		}
	}
	return clean, nil
}

func workspaceLanguage(entry string) (string, error) {
	switch strings.ToLower(path.Ext(entry)) {
	case ".py":
		return "python", nil
	case ".js", ".mjs", ".cjs":
		return "javascript", nil
	case ".ts", ".tsx":
		return "typescript", nil
	case ".java":
		return "java", nil
	case ".cpp", ".cc", ".cxx":
		return "cpp", nil
	case ".c":
		return "c", nil
	case ".go":
		return "go", nil
	case ".rs":
		return "rust", nil
	case ".rb":
		return "ruby", nil
	case ".php":
		return "php", nil
	}
	return "", errors.New("the selected file extension is not executable; choose a supported source file")
}

func workspaceSpec(lang string, entry string, files []workspaceFile) (image string, command string, err error) {
	quoted := func(p string) string { return "'/work/" + p + "'" } // already path-validated
	selected := make([]string, 0, len(files))
	for _, f := range files {
		selected = append(selected, f.Path)
	}
	sort.Strings(selected)
	ext := strings.ToLower(path.Ext(entry))
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "python", "py", "python3":
		if ext != ".py" {
			return "", "", errors.New("choose a .py entry file")
		}
		return "python:3.12-alpine", "PYTHONPATH=/work python -B " + quoted(entry), nil
	case "javascript", "js", "node":
		if ext != ".js" && ext != ".mjs" && ext != ".cjs" {
			return "", "", errors.New("choose a JavaScript entry file")
		}
		return "node:22-alpine", "node " + quoted(entry), nil
	case "typescript", "ts":
		if ext != ".ts" && ext != ".tsx" {
			return "", "", errors.New("choose a TypeScript entry file")
		}
		return "denoland/deno:alpine-2.2.4", "deno run --no-remote --no-prompt " + quoted(entry), nil
	case "java":
		if ext != ".java" {
			return "", "", errors.New("choose a .java entry file")
		}
		javaFiles := make([]string, 0)
		var entryCode string
		for _, f := range files {
			if strings.HasSuffix(f.Path, ".java") {
				javaFiles = append(javaFiles, quoted(f.Path))
			}
			if f.Path == entry {
				entryCode = f.Content
			}
		}
		if len(javaFiles) == 0 {
			return "", "", errors.New("no Java files")
		}
		mainClass := strings.TrimSuffix(path.Base(entry), ".java")
		if m := javaPackage.FindStringSubmatch(entryCode); len(m) == 2 {
			mainClass = m[1] + "." + mainClass
		}
		// Main class name comes only from identifier/package regex and filename.
		return "eclipse-temurin:21-jdk", "mkdir -p /tmp/classes && javac -encoding UTF-8 -d /tmp/classes " + strings.Join(javaFiles, " ") + " && java -Xmx128m -cp /tmp/classes '" + mainClass + "'", nil
	case "cpp", "c++", "c++17":
		if ext != ".cpp" && ext != ".cc" && ext != ".cxx" {
			return "", "", errors.New("choose a C++ entry file")
		}
		args := []string{quoted(entry)}
		for _, filepath := range selected {
			if filepath == entry {
				continue
			}
			if !strings.HasSuffix(filepath, ".cpp") && !strings.HasSuffix(filepath, ".cc") && !strings.HasSuffix(filepath, ".cxx") {
				continue
			}
			for _, f := range files {
				if f.Path == filepath && !cppMainPattern.MatchString(f.Content) {
					args = append(args, quoted(filepath))
				}
			}
		}
		return "gcc:14", "g++ -std=c++17 -O0 -I/work " + strings.Join(args, " ") + " -o /tmp/app && /tmp/app", nil
	case "c":
		if ext != ".c" {
			return "", "", errors.New("choose a .c entry file")
		}
		args := []string{quoted(entry)}
		for _, filepath := range selected {
			if filepath == entry || !strings.HasSuffix(filepath, ".c") {
				continue
			}
			for _, f := range files {
				if f.Path == filepath && !cppMainPattern.MatchString(f.Content) {
					args = append(args, quoted(filepath))
				}
			}
		}
		return "gcc:14", "gcc -std=c11 -O0 -I/work " + strings.Join(args, " ") + " -o /tmp/app && /tmp/app", nil
	case "go", "golang":
		if ext != ".go" {
			return "", "", errors.New("choose a .go entry file")
		}
		args := []string{quoted(entry)}
		for _, filepath := range selected {
			if filepath == entry || path.Dir(filepath) != path.Dir(entry) || !strings.HasSuffix(filepath, ".go") {
				continue
			}
			for _, f := range files {
				if f.Path == filepath && !goMainPattern.MatchString(f.Content) {
					args = append(args, quoted(filepath))
				}
			}
		}
		return "golang:1.25-alpine", "GOCACHE=/tmp/go-cache GOPATH=/tmp/gopath GO111MODULE=off GOTOOLCHAIN=local go build -o /tmp/app " + strings.Join(args, " ") + " && /tmp/app", nil
	case "rust", "rs":
		if ext != ".rs" {
			return "", "", errors.New("choose a .rs entry file")
		}
		return "rust:1.86-alpine", "rustc --edition=2021 " + quoted(entry) + " -o /tmp/app && /tmp/app", nil
	case "ruby", "rb":
		if ext != ".rb" {
			return "", "", errors.New("choose a .rb entry file")
		}
		return "ruby:3.4-alpine", "ruby -I/work " + quoted(entry), nil
	case "php":
		if ext != ".php" {
			return "", "", errors.New("choose a .php entry file")
		}
		return "php:8.4-cli-alpine", "php " + quoted(entry), nil
	}
	return "", "", fmt.Errorf("workspace runner does not support %s yet", lang)
}

// runWorkspaceSandbox enforces filesystem, network, process, CPU and time limits.
// As with Phase 3, Docker daemon access must be moved to a separate runner host
// before handling Internet-facing/untrusted public submissions.
func runWorkspaceSandbox(ctx context.Context, language, entry, stdin string, files []workspaceFile) (runOutput, error) {
	if !runnerEnabled() {
		return runOutput{}, errRunnerDisabled
	}
	image, command, err := workspaceSpec(language, entry, files)
	if err != nil {
		return runOutput{}, err
	}
	dir, err := os.MkdirTemp("", "edunexus-ws-")
	if err != nil {
		return runOutput{}, err
	}
	defer os.RemoveAll(dir)
	if err = os.Chmod(dir, 0755); err != nil {
		return runOutput{}, err
	}
	for _, f := range files {
		p := filepath.Join(dir, filepath.FromSlash(f.Path))
		if err = os.MkdirAll(filepath.Dir(p), 0755); err != nil {
			return runOutput{}, err
		}
		if err = os.WriteFile(p, []byte(f.Content), 0644); err != nil {
			return runOutput{}, err
		}
	}
	if err = os.WriteFile(filepath.Join(dir, "stdin.txt"), []byte(stdin), 0644); err != nil {
		return runOutput{}, err
	}
	name := "edunexus-ws-" + filepath.Base(dir)
	limited, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	defer func() {
		cleanup, stop := context.WithTimeout(context.Background(), 4*time.Second)
		defer stop()
		_ = exec.CommandContext(cleanup, "docker", "rm", "-f", name).Run()
	}()
	args := []string{"run", "--pull", "never", "--rm", "--name", name, "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--memory", "768m", "--memory-swap", "768m", "--cpus", "1", "--user", "65534:65534", "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=320m,mode=1777", "--mount", "type=bind,source=" + dir + ",target=/work,readonly", "--workdir", "/work", "--entrypoint", "/bin/sh", image, "-c", "exec </work/stdin.txt; " + command}
	cmd := exec.CommandContext(limited, "docker", args...)
	stdout := &boundedBuffer{max: 8192}
	stderr := &boundedBuffer{max: 8192}
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	started := time.Now()
	err = cmd.Run()
	out := runOutput{Status: "ok", Stdout: stdout.String(), Stderr: stderr.String(), Truncated: stdout.clipped || stderr.clipped, DurationMS: time.Since(started).Milliseconds()}
	if errors.Is(limited.Err(), context.DeadlineExceeded) {
		out.Status = "timeout"
		return out, nil
	}
	if err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			out.Status = "error"
			return out, nil
		}
		return runOutput{}, fmt.Errorf("compiler unavailable: %w", err)
	}
	return out, nil
}

// RunWorkspace keeps the exact same student, classroom, exam and attempt checks
// as Phase 3 RunCode. No compilation occurs without an active student attempt.
func (h *Handler) RunWorkspace(c *fiber.Ctx) error {
	attemptID, questions, err := h.activeAttempt(c)
	if err != nil {
		return err
	}
	if len(c.Body()) > 27000 {
		return failure(c, 413, "workspace request too large")
	}
	var req workspaceRunRequest
	if err = c.BodyParser(&req); err != nil {
		return failure(c, 400, "invalid workspace JSON")
	}
	if len(req.Files) == 0 || len(req.Files) > 24 || len(req.Stdin) > 4096 {
		return failure(c, 400, "provide 1-24 files and input under 4096 bytes")
	}
	entry, err := cleanWorkPath(req.Entry)
	if err != nil {
		return failure(c, 400, err.Error())
	}
	seen := map[string]bool{}
	found := false
	total := 0
	for _, f := range req.Files {
		p, e := cleanWorkPath(f.Path)
		if e != nil {
			return failure(c, 400, e.Error())
		}
		if seen[p] {
			return failure(c, 400, "duplicate file path")
		}
		seen[p] = true
		if p == entry {
			found = true
		}
		if strings.ContainsRune(f.Content, '\x00') {
			return failure(c, 400, "binary source files are not allowed")
		}
		total += len(f.Content)
	}
	if !found || total == 0 || total > 17000 {
		return failure(c, 400, "select an entry file; total source limited to 17 KB")
	}
	var language string
	for _, q := range questions {
		if q.ID == req.QuestionID && q.Kind == "coding" {
			language = "coding"
			break
		}
	}
	if language == "" {
		return failure(c, 400, "coding question not found")
	}
	// Teacher's chosen language is a suggested default, not a compiler lock.
	// The selected entry filename determines the compiler on every run.
	language, err = workspaceLanguage(entry)
	if err != nil {
		return failure(c, 422, err.Error())
	}
	if _, _, err = workspaceSpec(language, entry, req.Files); err != nil {
		return failure(c, 422, err.Error())
	}
	if !runnerEnabled() {
		return failure(c, 503, errRunnerDisabled.Error())
	}
	select {
	case codeRunSlots <- struct{}{}:
		defer func() { <-codeRunSlots }()
	default:
		return failure(c, 429, "sandbox busy")
	}
	_, err = h.db.Exec(c.UserContext(), `UPDATE classroom_exam_code_runs SET status='interrupted' WHERE attempt_id=$1::uuid AND status='running' AND created_at < now()-interval '45 seconds'`, attemptID)
	if err != nil {
		return err
	}
	sort.Slice(req.Files, func(i, j int) bool { return req.Files[i].Path < req.Files[j].Path })
	digest := sha256.New()
	for _, f := range req.Files {
		_, _ = digest.Write([]byte(f.Path))
		_, _ = digest.Write([]byte{0})
		_, _ = digest.Write([]byte(f.Content))
		_, _ = digest.Write([]byte{0})
	}
	var runID string
	err = h.db.QueryRow(c.UserContext(), `INSERT INTO classroom_exam_code_runs(attempt_id,question_id,language,source_sha256)
       SELECT $1::uuid,$2::text,$3::text,$4::text WHERE
       (SELECT count(*) FROM classroom_exam_code_runs WHERE attempt_id=$1::uuid)<35 AND
       NOT EXISTS (SELECT 1 FROM classroom_exam_code_runs WHERE attempt_id=$1::uuid AND created_at>now()-interval '5 seconds')
       RETURNING id::text`, attemptID, req.QuestionID, language, hex.EncodeToString(digest.Sum(nil))).Scan(&runID)
	if errors.Is(err, pgx.ErrNoRows) {
		return failure(c, 429, "wait 5 seconds between runs (max 35)")
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return failure(c, 429, "another run is already in progress")
		}
		return err
	}
	output, runErr := runWorkspaceSandbox(c.UserContext(), language, entry, req.Stdin, req.Files)
	if runErr != nil {
		output.Status = "unavailable"
		output.Stderr = runErr.Error()
	}
	_, dbErr := h.db.Exec(c.UserContext(), `UPDATE classroom_exam_code_runs SET status=$2,duration_ms=$3,stdout_preview=$4,stderr_preview=$5 WHERE id=$1::uuid`, runID, output.Status, output.DurationMS, output.Stdout, output.Stderr)
	if dbErr != nil {
		return dbErr
	}
	if runErr != nil {
		return failure(c, 503, output.Stderr)
	}
	return result(c, 200, output)
}
