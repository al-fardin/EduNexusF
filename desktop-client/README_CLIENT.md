# EduNexus Secure Exam Client — Phase 14B Developer Preview

This is a **source-based preview**, NOT a signed Windows installer, macOS .dmg, or Linux AppImage. Do not deploy as a high-stakes proctoring product without native builds, security review, end-to-end tests and student accessibility review.

## One-time setup

- **Windows**: Install Python 3 (including Tkinter) from python.org; extract this ZIP; double-click `START_WINDOWS.cmd`. If your browser warns about an untrusted script, inspect it before running.
- **macOS**: Install Python 3 with Tkinter. Open Terminal in the extracted folder and run `sh START_MAC_LINUX.sh`. Grant the required macOS Accessibility permission if application-name monitoring is needed.
- **Linux (X11)**: Install Python 3, Tkinter, venv and xdotool (distro packages vary), then run `sh START_MAC_LINUX.sh`. On Wayland, cross-app foreground detection is unavailable in this preview: the teacher sees a coverage warning.

The app asks for a **Server API URL** and a one-time **pairing code**. On the student's own development computer with EduNexus on port 8080, the default `http://127.0.0.1:8080` works. For a deployed server use its HTTPS API origin, e.g. `https://api.your-school.example`. Pair codes expire after five minutes.

1. In the browser's exam setup page, verify the existing browser extension.
2. Generate a Desktop Client pairing code.
3. In this desktop app, enter the API origin and pairing code, review the monitoring notice, then connect.
4. Return to the browser and wait for `Connected` before `Agree & Enter Exam`.
5. **Before exam entry**, only connectivity heartbeats are sent; no foreground application events.
6. **During an active attempt**, foreground application *names* and times are sent. The existing Chrome/Edge extension separately records supported exam-time browser evidence. This app does not read app messages, passwords, screenshots, window titles, or file contents.
7. Stops on exam expiration or when the student clicks Stop. Teacher sees missing coverage after disconnection.

## Native packaging for developers

- Windows: run `BUILD_WINDOWS.ps1` **on Windows**. This produces an unsigned `.exe` in `dist/` if PyInstaller is available.
- macOS/Linux: run `sh BUILD_NATIVE_ON_THIS_OS.sh` **on the target OS**. You must package/sign/notarize as appropriate, and test permissions and desktop environments.
- Do not claim that these native executables are signed, notarized, or tested until they actually are.

Security model: the pairing token is random, one-use and scoped to an exam session. Heartbeats prove a connected agent, **not** that the student cannot bypass monitoring. Events are review signals, not automatic cheating proof.

## Phase 14C clipboard-change metadata (Windows)

When explicit monitoring consent is given AND an exam attempt is active, the
Windows client observes OS clipboard *sequence-number changes* (not clipboard
contents) and attaches the foreground application name and observation time.
It cannot confirm a copy command or which browser tab supplied text.
Browser-extension `external_copy` and exam `exam_paste` events remain separate.
The teacher review UI may correlate closely timed events as **possible source**,
not proof of cheating. Linux/macOS continue tracking foreground apps; clipboard
source tracking is not supported there in this preview. No global keylogging,
clipboard text reading, window-title capture or private messaging access.

Stop the running desktop client and start this updated version for 14C changes to
apply; installing backend/frontend files cannot update a running client.
