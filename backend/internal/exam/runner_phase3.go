package exam

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// This runner is for local development. Do NOT give public Internet users access
// to a privileged Docker daemon on the same host as your production API/database.
// In production use an isolated runner pool/VM with egress controls and quotas.
var errRunnerDisabled = errors.New("code runner is disabled: set EXAM_RUNNER_ENABLED=true and pull the required Docker images")

type runOutput struct {
	Status     string `json:"status"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	DurationMS int64  `json:"duration_ms"`
	Truncated  bool   `json:"truncated"`
}

type boundedBuffer struct {
	bytes.Buffer
	max     int
	clipped bool
}

func (b *boundedBuffer) Write(p []byte) (int, error) {
	n := len(p)
	remain := b.max - b.Len()
	if remain < 0 {
		remain = 0
	}
	writeN := remain
	if writeN > n {
		writeN = n
	}
	if writeN > 0 {
		_, _ = b.Buffer.Write(p[:writeN])
	}
	if n > writeN {
		b.clipped = true
	}
	return n, nil
}

func compilerSpec(lang string) (string, string, string, string, bool) {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "python", "py", "python3":
		return "python", "python:3.12-alpine", "main.py", "python -I -B /work/main.py", true
	case "javascript", "js", "node":
		return "javascript", "node:22-alpine", "main.js", "node /work/main.js", true
	case "cpp", "c++", "c++17":
		return "cpp", "gcc:14", "main.cpp", "g++ -std=c++17 -O0 /work/main.cpp -o /tmp/main && /tmp/main", true
	case "c":
		return "c", "gcc:14", "main.c", "gcc -std=c11 -O0 /work/main.c -o /tmp/main && /tmp/main", true
	case "go", "golang":
		return "go", "golang:1.25-alpine", "main.go", "GOCACHE=/tmp/go-cache GOTOOLCHAIN=local go build -o /tmp/main /work/main.go && /tmp/main", true
	case "java":
		return "java", "eclipse-temurin:21-jdk", "Main.java", "javac -d /tmp /work/Main.java && java -Xmx96m -cp /tmp Main", true
	}
	return "", "", "", "", false
}

func runSandbox(ctx context.Context, language, code, stdin string) (runOutput, error) {
	if os.Getenv("EXAM_RUNNER_ENABLED") != "true" {
		return runOutput{}, errRunnerDisabled
	}
	_, image, filename, command, ok := compilerSpec(language)
	if !ok {
		return runOutput{}, fmt.Errorf("unsupported compiler language: %s", language)
	}
	folder, err := os.MkdirTemp("", "edunexus-run-")
	if err != nil {
		return runOutput{}, err
	}
	defer os.RemoveAll(folder)
	// Non-root user inside container must be able to read the mounted file.
	if err = os.Chmod(folder, 0755); err != nil {
		return runOutput{}, err
	}
	source := filepath.Join(folder, filename)
	if err = os.WriteFile(source, []byte(code), 0644); err != nil {
		return runOutput{}, err
	}
	if err = os.WriteFile(filepath.Join(folder, "stdin.txt"), []byte(stdin), 0644); err != nil {
		return runOutput{}, err
	}
	name := "edunexus-run-" + strings.ReplaceAll(filepath.Base(folder), "edunexus-run-", "")
	limitedCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	// Always try to remove the named container, including when a timed-out CLI
	// has been killed and Docker may have left it running.
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		_ = exec.CommandContext(cleanup, "docker", "rm", "-f", name).Run()
	}()
	args := []string{"run", "--pull", "never", "--rm", "--name", name, "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--memory", "512m", "--memory-swap", "512m", "--cpus", "1", "--user", "65534:65534", "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=192m,mode=1777", "--mount", "type=bind,source=" + folder + ",target=/work,readonly", "--workdir", "/tmp", "--entrypoint", "/bin/sh", image, "-c", "exec </work/stdin.txt; " + command}
	cmd := exec.CommandContext(limitedCtx, "docker", args...)
	var stdout = &boundedBuffer{max: 8192}
	var stderr = &boundedBuffer{max: 8192}
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	started := time.Now()
	err = cmd.Run()
	out := runOutput{Stdout: stdout.String(), Stderr: stderr.String(), DurationMS: time.Since(started).Milliseconds(), Truncated: stdout.clipped || stderr.clipped, Status: "ok"}
	if errors.Is(limitedCtx.Err(), context.DeadlineExceeded) {
		out.Status = "timeout"
		return out, nil
	}
	if err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			out.Status = "error"
			return out, nil
		}
		return runOutput{}, fmt.Errorf("Docker runner unavailable: %w", err)
	}
	return out, nil
}
