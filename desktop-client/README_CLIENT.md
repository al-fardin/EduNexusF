# EduNexus Desktop 1.5

## Student setup

1. Download the Windows app from the exam entry page and open it.
2. On the exam page, select **Connect Desktop Client**.
3. Review the activity permissions and select **Approve connection** in the app.
4. Enter the exam. For questions with a tester, select **Run Tests**, then **Approve & run** in the app. Results appear below the coding editor.

The app has Connection, Test runner and Activity tabs. Monitoring starts after exam entry and stops on expiry or Disconnect. It records foreground app names and Windows clipboard-change metadata, without reading clipboard text, messages, passwords, window titles or screenshots.

`.exe` testers require Windows. macOS/Linux retain exam monitoring support, with platform permission and X11/Wayland limitations. To run from source, use `START_WINDOWS.cmd` or `START_MAC_LINUX.sh` (Python 3 with Tkinter and the requirements file).

## Teacher testers

Testers are optional on coding questions in both **Create exam** and **Edit exam**. Attach a Windows PE `.exe` up to 10 MB, replace it or remove it before the first attempt. Questions without a tester keep their existing behavior. Attachments are immutable and scoped to the classroom; storage is limited to 200 MB per classroom, including draft uploads.

The executable must implement [TESTER_PROTOCOL.md](TESTER_PROTOCOL.md). An arbitrary GUI tester is not automatically compatible. A working Python-solution example is provided in `examples/sum_tester.py`.

Each run requires local approval. The app verifies SHA-256 and uses a short-lived, single-use server ticket, restricted loopback bridge, exact web-origin checks and the connected exam server. Runs have a 60-second limit, 128 KB per output stream, a 512 MB Windows Job Object memory limit and a 16-process limit. Cancellation/disconnection kills the job's processes.

**Execution uses the student's account permissions. Job Objects provide resource and lifetime limits, not a security sandbox. Only approve trusted teacher testers.** Local results provide feedback and do not change grades or attest submission correctness. Test cases distributed to a student's PC cannot be guaranteed secret.

## Build and deploy

- Apply `database/migrations/000022_question_testers.up.sql` after existing migrations. For standard Docker setup, run `powershell -File scripts/database/apply-question-testers.ps1` from the project root.
- Windows: `powershell -File desktop-client/BUILD_WINDOWS.ps1`. Produces the native app and refreshes the frontend download.
- macOS/Linux: `sh desktop-client/BUILD_NATIVE_ON_THIS_OS.sh` on the target OS. Windows testers are unsupported there.
- Set `NEXT_PUBLIC_EDUNEXUS_DESKTOP_API_ORIGIN` to the HTTPS API origin and `EDUNEXUS_WEB_ORIGINS` to the exact web origin on student clients for deployed installations. Source launchers inherit these environment variables.
- Builds are unsigned. Production distribution should use platform signing/notarization.
- Restart an already open client to use an update.

## Verify

```powershell
python -m unittest discover -s desktop-client/tests -v
python -m PyInstaller --onefile --console --name Sum-Tester --distpath release-builds --specpath release-builds desktop-client/examples/sum_tester.py
$env:EDUNEXUS_TESTER_EXE = (Resolve-Path release-builds/Sum-Tester.exe).Path
python -m unittest discover -s desktop-client/tests -v
```
