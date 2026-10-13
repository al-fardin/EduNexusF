# EduNexus Phase 14B — Mandatory Desktop Pre-exam Pairing (Developer Preview)

Built against the uploaded `EduNexus.zip` source (October 13, 2026). This is a targeted incremental patch, not a replacement for the whole project.

## What changes

- Student Exam Entry Gate now includes a Windows/macOS/Linux Desktop Client setup, illustrative images, pairing code and live heartbeat status. Browser extension setup/AI-prompt/search/copy-paste evidence stays intact.
- The Go backend rejects `POST /start` unless **both** the existing browser-monitoring consent admission and a recently connected Desktop Client are present.
- New `classroom_exam_desktop_preflight` table allows pairing **before** any attempt is created. **No application activity is recorded before the exam starts.** On start, its authenticated token is transferred to the attempt's existing Phase 14A session, preserving the teacher's roll-wise evidence path.
- The cross-platform Python client distinguishes `READY (waiting for exam)` from `MONITORING ACTIVE`; its application switching telemetry begins only after the exam starts.
- Browser receives `/downloads/EduNexus-Secure-Exam-Client.zip` with Python source and launch scripts. **This is not a packaged/signed executable.** For wide deployment, create and test native installers on each target OS and host them separately.

## Install on your Windows development machine

1. Stop Go and Next.js and back up your project/database externally.
2. Download `EduNexus_Phase14B_PreExam_Desktop_Gate.zip` to Downloads.
3. In **PowerShell** (not CMD):

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\EduNexus_Phase14B_PreExam_Desktop_Gate.zip" -DestinationPath 'F:\EduNexus_Phase14B_Patch' -Force
powershell -ExecutionPolicy Bypass -File 'F:\EduNexus_Phase14B_Patch\INSTALL_PHASE14B.ps1' -Project 'F:\EduNexus'
```

4. **Only if the installer succeeded**:

```powershell
cd 'F:\EduNexus'
docker compose up -d
powershell -ExecutionPolicy Bypass -File 'F:\EduNexus_Phase14B_Patch\APPLY_PHASE14B.ps1' -Project 'F:\EduNexus'
```

5. Backend in one terminal:

```powershell
cd 'F:\EduNexus'
$env:EXAM_RUNNER_ENABLED='true'
go run ./apps/api
```

6. Frontend in a second terminal:

```powershell
cd 'F:\EduNexus\frontend'
npm run dev
```

7. Student: Join a **new test exam** → Extension ready → Download Desktop Client → extract → run the relevant start script → Generate pairing code in exam page → paste it in Client → allow exam-time app-name monitoring → verify `Connected` → Agree & Enter. The clock does not start before entry.
8. Teacher: View Submissions → Roll → Desktop activity evidence. Check separate Browser Monitoring Evidence for browser prompts/searches/pastes.

## Security and cross-platform caveats

- The client only reports foreground application **names**, not chat messages, clipboard contents, window titles or screenshots. Existing extension may capture supported browser AI prompts as previously implemented; it still cannot capture a different browser's private content or off-device activity.
- This is a development prototype, not an anti-tamper endpoint agent. Pairing confirms heartbeat from a client process; it does not prove that the client runs untampered. Students can stop a client after starting; teacher sees connection gaps, but the backend does not yet pause attempts on disconnection.
- macOS permissions and Linux X11/Wayland behave differently. On Linux Wayland foreground app detection is **not supported** by this prototype, even when client heartbeat works.
- Native Windows `.exe`, macOS signed/notarized `.dmg`, Linux AppImage/deb/rpm **are not included**. They cannot be responsibly claimed as tested from a single Linux sandbox without target OS builds and signing.
- Host over HTTPS in production, define clear retention/access controls and obtain informed consent. No invisible monitoring or automatic cheating verdict.

## Validation status

The source was checked with Python unit tests, JavaScript/TypeScript syntax transpilation, Go format parser, and ZIP integrity. Running a full Go test suite required Go 1.26.4, which was not available for download in this offline runtime. PostgreSQL + browser + native client end-to-end verification must be done on your test machine.
