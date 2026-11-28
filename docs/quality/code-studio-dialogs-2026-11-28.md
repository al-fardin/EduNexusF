# Code runner, confirmation dialogs and editor finish — 2026-11-28

## Compiler availability

Docker Desktop and all approved compiler images were already present. The
running API had not enabled `EXAM_RUNNER_ENABLED`. The untracked local `.env`
now enables it, and the managed API on port 8080 was rebuilt/restarted with that
setting. The frontend on port 3000 and original database were retained.

The example environment documents the opt-in flag. Public deployments retain a
disabled default unless an administrator configures isolated execution.
Requests still require a student membership, live exam and active attempt.
Existing no-network, non-root, read-only filesystem, capability, CPU/memory,
process and execution-time restrictions are retained; images never auto-pull.

Real Docker testing also exposed an output limit bypass: embedding `bytes.Buffer`
promoted its `ReadFrom` method, allowing `os/exec`'s `io.Copy` to bypass the bounded
`Write`. The runner now owns an unexported buffer without that promoted method.
Extra output is drained but only the first 8192 bytes per stream are retained,
with the response marked truncated. A standalone regression reproduces the
process-copy path, and actual Python execution verifies the output limit.

## Dialogs and editor

- App-controlled confirm/prompt/alert calls were replaced with shared themed
  dialogs or inline validation. This includes exam publish/submit, answer
  replacement, class/member/post/source deletion, question editing, compiler
  file/folder actions, download errors and unsaved-note navigation.
- Dialog requests wait for an explicit choice, keep queued responses separate,
  ignore stale settlement and cancel on route changes. Cancel/Escape do not
  authorize a mutation. Native browser tab-close/reload protection remains:
  browsers control `beforeunload` warnings and permission prompts themselves.
- Confirmation overlays appear above the editor's focus mode and use the
  existing accessible modal primitive, translated labels and theme colors.
- The code editor has a white halo in dark mode and a deep violet halo in light
  mode. Focus mode uses a body portal so workspace containment cannot shrink its
  fixed viewport, collapse the file area or let the terminal cover file actions.

## Checks

- Frontend lint, TypeScript and all 125 tests passed; the final production build
  generated 32 static pages and the existing dynamic routes.
- Full exam package integration tests and `go vet` passed.
- Real cached Docker execution passed C, C++, Python, JavaScript, TypeScript,
  Java, Go, Rust, Ruby and PHP. Every runtime produced `7`; single-source C++,
  compiler-error reporting and bounded output also passed. No image downloads
  were required.
- The real workspace HTTP handler passed against the separate
  `edunexus_features` database: an enrolled active student ran C++ with stdin
  `3 4` and received `7`; an outsider was rejected, and saved answers stayed
  unchanged. Fixtures clean up their own records.
- Chrome tested the actual Monaco editor in both themes, confirmation cancel
  and accept, file creation/rename, cancellation of deletion, dialogs above
  focus mode and 390/320-pixel layouts. No native action popup, client error or
  horizontal page overflow occurred. UI confirmation acceptance used a local
  fixture state; it did not publish a real exam. The temporary visual-check
  route was removed before the release build.

## Local launch

With Docker Desktop running:

```powershell
cd F:\EduNexus
.\scripts\dev\start-local.ps1
```

Open `http://localhost:3000`. The API uses port 8080. To rebuild/restart managed
processes after backend or environment changes, use `start-local.ps1 -Restart`.
