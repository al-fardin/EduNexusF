#!/usr/bin/env python3
"""EduNexus Secure Exam Client (Phase 14C).

Exam-time foreground apps and Windows clipboard-change metadata only.
No clipboard text, keystrokes, messages, window titles or screenshots.
"""
from __future__ import annotations

import ctypes
import datetime as dt
import json
import os
import platform
import queue
import re
import subprocess
import sys
from pathlib import Path
import threading
import time
import tkinter as tk
from tkinter import ttk
from local_bridge import DesktopPairingBridge, dev_lan_http_permitted
from test_runner import TestRunManager
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import urlsplit
from uuid import uuid4

try:
    import psutil
except ImportError:
    psutil = None

USER_AGENT = "EduNexus-Desktop-Client/15"
POLL_SECONDS = 2.0
HEARTBEAT_SECONDS = 8.0
MAX_BUFFER = 100


def platform_key() -> str:
    return {"Windows": "windows", "Darwin": "macos", "Linux": "linux"}.get(platform.system(), "unsupported")


def validate_server_url(raw: str) -> str:
    value = raw.strip().rstrip("/")
    parsed = urlsplit(value)
    try:
        _ = parsed.port
    except ValueError as ex:
        raise ValueError("Invalid API server port") from ex
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
        raise ValueError("Enter the API server root, without a path or credentials")
    if parsed.scheme == "https" and parsed.hostname:
        return value
    if parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1"):
        return value
    if dev_lan_http_permitted(parsed):
        return value
    raise ValueError("Use HTTPS; private LAN HTTP requires EDUNEXUS_ALLOW_LAN_HTTP=1 for development")


def api_post(url: str, path: str, data: dict, session_token: str | None = None) -> dict:
    body = json.dumps(data, separators=(",", ":")).encode("utf-8")
    headers = {"Content-Type": "application/json", "User-Agent": USER_AGENT}
    if session_token:
        headers["Authorization"] = "Bearer " + session_token
    req = urlrequest.Request(url + path, data=body, headers=headers, method="POST")
    try:
        with urlrequest.urlopen(req, timeout=6) as resp:
            parsed = json.load(resp)
    except urlerror.HTTPError as ex:
        try:
            message = json.load(ex).get("message", "Request rejected")
        except (ValueError, AttributeError):
            message = "Request rejected"
        raise RuntimeError(f"Server {ex.code}: {message}") from ex
    if not parsed.get("success", False):
        raise RuntimeError(parsed.get("message", "Server rejected request"))
    return parsed["data"]


def foreground_windows() -> tuple[str | None, str | None]:
    """Return (app_name, diagnostic). A missing permission is NOT 'no apps'."""
    system = platform.system()
    if system == "Windows":
        if psutil is None:
            return None, "Install psutil to detect Windows foreground app names"
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if not hwnd:
                return None, "No foreground window available"
            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if not pid.value:
                return None, "Foreground process ID unavailable"
            return psutil.Process(pid.value).name()[:160], None
        except Exception as ex:
            return None, "Windows foreground app access failed: " + type(ex).__name__
    if system == "Darwin":
        try:
            script = 'tell application "System Events" to get name of first application process whose frontmost is true'
            run = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=3)
            if run.returncode != 0:
                return None, "macOS requires Accessibility permission for this app"
            name = run.stdout.strip()
            return (name[:160], None) if name else (None, "Frontmost app unavailable")
        except Exception:
            return None, "macOS foreground app integration unavailable"
    if system == "Linux":
        if os.getenv("XDG_SESSION_TYPE", "").lower() == "wayland":
            return None, "Linux Wayland restricts system-wide app detection; X11 required in this preview"
        if psutil is None:
            return None, "Install psutil to detect Linux foreground app names"
        try:
            run = subprocess.run(["xdotool", "getactivewindow", "getwindowpid"], capture_output=True, text=True, timeout=3)
            if run.returncode:
                return None, "X11 xdotool foreground detection unavailable"
            pid = int(run.stdout.strip())
            return psutil.Process(pid).name()[:160], None
        except FileNotFoundError:
            return None, "Install xdotool for X11 app detection"
        except Exception:
            return None, "Linux foreground app integration unavailable"
    return None, "Unsupported operating system"


def normalized_app(value: str | None) -> str | None:
    if not value:
        return None
    # Deliberately do not log window titles, file paths or arbitrary text.
    name = value.strip()
    return name[:160] if name and not re.search(r"[\r\n\x00]", name) else None


def windows_clipboard_sequence() -> int | None:
    """Windows clipboard change sequence; NEVER opens or reads clipboard content."""
    if platform.system() != "Windows":
        return None
    try:
        value = int(ctypes.windll.user32.GetClipboardSequenceNumber())
        return value if value > 0 else None
    except Exception:
        return None


def changed_clipboard_app(previous: int | None, current: int | None, app: str | None) -> str | None:
    """Indicates a clipboard update while app was foreground, NOT a proven copy."""
    if previous is None or current is None or previous == current:
        return None
    return normalized_app(app)


def make_event(kind: str, app: str = "") -> dict:
    return {"id": str(uuid4()), "kind": kind, "app_name": app,
            "at": dt.datetime.now(dt.timezone.utc).isoformat()}


class MonitorWorker(threading.Thread):
    def __init__(self, server: str, pair_code: str, updates: queue.Queue, stop_event: threading.Event):
        super().__init__(daemon=True)
        self.server, self.pair_code = server, pair_code
        self.updates, self.stop_event = updates, stop_event
        self.token = ""
        self.buffer: list[dict] = []
        self.last_app: str | None = None
        self.last_clip_seq: int | None = None
        self.capability_reported = False
        self.expires_at: dt.datetime | None = None

    def notice(self, value: str) -> None:
        self.updates.put(value)

    def add(self, kind: str, app: str = "") -> None:
        self.buffer.append(make_event(kind, app))
        self.buffer = self.buffer[-MAX_BUFFER:]

    def send(self) -> None:
        if self.buffer:
            batch = self.buffer[:25]
            api_post(self.server, "/desktop-monitor/events", {"events": batch}, self.token)
            self.buffer = self.buffer[len(batch):]
        else:
            api_post(self.server, "/desktop-monitor/heartbeat", {}, self.token)

    def run(self) -> None:
        try:
            response = api_post(self.server, "/desktop-monitor/connect", {
                "pair_code": self.pair_code,
                "platform": platform_key(),
            })
            self.token = response["session_token"]
            self.pair_code = ""
            date_value = response.get("expires_at")
            if not isinstance(date_value, str):
                raise RuntimeError("Server did not provide exam session expiry")
            self.expires_at = dt.datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            self.notice("Ready · Waiting for exam")
            active = bool(response.get("active", False))
            if active:
                self.last_clip_seq = windows_clipboard_sequence()
                self.notice("Monitoring · Exam in progress")
                self.add("client_started")
            last_send, last_poll = 0.0, 0.0
            failures = 0
            while not self.stop_event.wait(0.2):
                if dt.datetime.now(dt.timezone.utc) >= self.expires_at:
                    self.notice("Exam session expired — monitoring stopped")
                    break
                t = time.monotonic()
                if active and platform_key() == "windows":
                    seq = windows_clipboard_sequence()
                    if self.last_clip_seq is not None and seq is not None and seq != self.last_clip_seq:
                        current_app, _ = foreground_windows()
                        source = changed_clipboard_app(self.last_clip_seq, seq, current_app)
                        if source:
                            self.add("clipboard_changed", source)
                            self.notice("Clipboard activity · " + source)
                    self.last_clip_seq = seq
                if active and t - last_poll >= POLL_SECONDS:
                    app, warning = foreground_windows()
                    app = normalized_app(app)
                    if warning and not self.capability_reported:
                        self.add("capability_unavailable")
                        self.notice("LIMITED COVERAGE · " + warning)
                        self.capability_reported = True
                    if app and app != self.last_app:
                        self.add("foreground_app", app)
                        self.last_app = app
                        self.notice("Active app: " + app)
                    last_poll = t
                if t - last_send >= HEARTBEAT_SECONDS:
                    try:
                        # Only send foreground evidence after the server confirms
                        # the exam attempt exists. Before entry: heartbeat only.
                        state = api_post(self.server, "/desktop-monitor/heartbeat", {}, self.token)
                        now_active = bool(state.get("active", False))
                        if now_active and not active:
                            self.last_clip_seq = windows_clipboard_sequence()
                            self.notice("Monitoring · Exam in progress")
                            self.add("client_started")
                        if not now_active and active:
                            self.notice("Exam session ended — monitoring stopped")
                            break
                        active = now_active
                        if active and self.buffer:
                            self.send()
                        failures = 0
                        last_send = t
                    except RuntimeError as ex:
                        failures += 1
                        if ("401" in str(ex) or "403" in str(ex)) and failures >= 3:
                            self.notice("Session ended by server — monitoring stopped")
                            break
                        self.notice("Connection problem — retrying")
                        last_send = t
                    except Exception:
                        failures += 1
                        self.notice("Network unavailable — retrying (bounded queue)")
                        last_send = t
            # User-requested stop, send the last buffered events then revoke token.
            if self.token:
                if active: self.add("client_stopped")
                try:
                    if active:
                        for _ in range(5):
                            if not self.buffer:
                                break
                            self.send()
                    api_post(self.server, "/desktop-monitor/stop", {}, self.token)
                except Exception:
                    self.notice("Stopped locally; the server token also expires at the exam deadline")
        except Exception as ex:
            self.notice("ERROR · " + str(ex)[:230])
        finally:
            self.token = ""
            self.notice("STOPPED")


class ClientApp:
    BG = "#F4F6F5"
    INK = "#182B24"
    MUTED = "#55665E"
    GREEN = "#24634B"

    def __init__(self) -> None:
        if platform.system() == "Windows":
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("EduNexus.Desktop.1.5")
        self.window = tk.Tk()
        icon_path = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "assets" / "icon.png"
        if icon_path.exists():
            self.app_icon = tk.PhotoImage(file=str(icon_path))
            self.window.iconphoto(True, self.app_icon)
        self.window.title("EduNexus Desktop")
        self.window.geometry("920x720")
        self.window.minsize(820, 660)
        self.window.configure(bg=self.BG)
        self.stop_signal = threading.Event()
        self.updates = queue.Queue()
        self.worker = None
        self.pending_test = None
        self.url = tk.StringVar(value="http://127.0.0.1:8080")
        self.code = tk.StringVar()
        self.agreed = tk.BooleanVar(value=False)
        self.status = tk.StringVar(value="Not connected")
        self.server_label = tk.StringVar(value="Connect from your exam page")
        self.test_status = tk.StringVar(value="No test request")
        self.tester_name = tk.StringVar(value="Question tester")
        self.tester_hash = tk.StringVar(value="")
        self.test_runs = TestRunManager(self.updates, self.can_test)
        self.render()
        self.bridge = None
        try:
            self.bridge = DesktopPairingBridge(self.receive_pairing, self.test_runs)
            self.bridge.start()
        except OSError:
            self.status.set("Desktop bridge unavailable. Close other EduNexus clients.")
        self.window.protocol("WM_DELETE_WINDOW", self.close)
        self.window.after(200, self.poll_updates)

    def render(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="white")
        style.configure("TLabel", background="white", foreground=self.INK, font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI", 10), padding=(16, 10), background="#EEF2EF", foreground=self.INK, borderwidth=0)
        style.map("TButton", background=[("active", "#DFE8E1")], foreground=[("disabled", "#89958D")])
        style.configure("Primary.TButton", background=self.GREEN, foreground="white")
        style.map("Primary.TButton", background=[("active", "#1B4C39"), ("disabled", "#CED9D1")], foreground=[("disabled", "#55665E")])
        style.configure("TCheckbutton", background="white", foreground=self.INK, font=("Segoe UI", 10), padding=(0, 8))
        style.map("TCheckbutton", background=[("active", "white")])
        style.configure("TNotebook", background=self.BG, borderwidth=0)
        style.configure("TNotebook.Tab", padding=(18, 12), font=("Segoe UI", 10), background=self.BG)
        style.map("TNotebook.Tab", background=[("selected", "white")], foreground=[("selected", self.GREEN)])

        rail = tk.Frame(self.window, bg="#173C2E", width=190, padx=22, pady=28)
        rail.pack(side="left", fill="y")
        rail.pack_propagate(False)
        tk.Label(rail, text="EN", font=("Segoe UI", 24, "bold"), bg="#2B5743", fg="white", padx=13, pady=8).pack(anchor="w")
        tk.Label(rail, text="EduNexus", font=("Segoe UI", 18, "bold"), bg="#173C2E", fg="white").pack(anchor="w", pady=(18, 2))
        tk.Label(rail, text="DESKTOP", font=("Segoe UI", 9, "bold"), bg="#173C2E", fg="#BBD2C1").pack(anchor="w")
        tk.Frame(rail, height=1, bg="#3B604D").pack(fill="x", pady=24)
        tk.Label(rail, text="Exam companion", font=("Segoe UI", 10), bg="#173C2E", fg="#D8E5DA").pack(anchor="w")
        tk.Label(rail, text="Session & local tests", font=("Segoe UI", 9), bg="#173C2E", fg="#BBD2C1").pack(anchor="w", pady=(6, 0))
        tk.Label(rail, text="EduNexus Desktop 1.5", font=("Segoe UI", 8), bg="#173C2E", fg="#BBD2C1").pack(side="bottom", anchor="w")

        body = tk.Frame(self.window, bg=self.BG, padx=28, pady=26)
        body.pack(side="left", fill="both", expand=True)
        tk.Label(body, text="Exam workspace", font=("Segoe UI", 23, "bold"), bg=self.BG, fg=self.INK).pack(anchor="w")
        tk.Label(body, text="Manage your connection and question tests.", font=("Segoe UI", 10), bg=self.BG, fg=self.MUTED).pack(anchor="w", pady=(5, 20))
        tk.Label(body, textvariable=self.status, bg="#E2EBE4", fg="#214E36", font=("Segoe UI", 10, "bold"), anchor="w", padx=16, pady=14, wraplength=560).pack(fill="x", pady=(0, 18))
        self.tabs = ttk.Notebook(body)
        self.tabs.pack(fill="both", expand=True)
        session = tk.Frame(self.tabs, bg="white", padx=22, pady=22)
        tests = tk.Frame(self.tabs, bg="white", padx=22, pady=22)
        activity = tk.Frame(self.tabs, bg="white", padx=16, pady=16)
        self.tabs.add(session, text="Connection")
        self.tabs.add(tests, text="Test runner")
        self.tabs.add(activity, text="Activity")
        self.test_tab = tests

        tk.Label(session, text="Desktop connection", font=("Segoe UI", 15, "bold"), bg="white", fg=self.INK).pack(anchor="w")
        tk.Label(session, textvariable=self.server_label, bg="white", fg=self.MUTED, font=("Segoe UI", 10), wraplength=520, justify="left").pack(anchor="w", pady=(8, 24))
        tk.Label(session, text="Exam permissions", font=("Segoe UI", 10, "bold"), bg="white", fg=self.INK).pack(anchor="w")
        tk.Label(session, text="Records active app names and clipboard-change metadata during the exam. Clipboard text is not read.", bg="white", fg=self.MUTED, font=("Segoe UI", 10), wraplength=510, justify="left").pack(anchor="w", pady=(8, 12))
        ttk.Checkbutton(session, text="Allow exam activity monitoring", variable=self.agreed).pack(anchor="w")
        buttons = tk.Frame(session, bg="white")
        buttons.pack(fill="x", pady=(18, 18))
        self.connect_btn = ttk.Button(buttons, text="Approve connection", command=self.start, style="Primary.TButton", state="disabled")
        self.connect_btn.pack(side="left")
        self.stop_btn = ttk.Button(buttons, text="Disconnect", command=self.stop, state="disabled")
        self.stop_btn.pack(side="left", padx=10)
        tk.Label(session, text="Activity recording begins when your exam starts.", bg="white", fg=self.MUTED, font=("Segoe UI", 9)).pack(anchor="w")

        tk.Label(tests, text="Local test runner", font=("Segoe UI", 15, "bold"), bg="white", fg=self.INK).pack(anchor="w")
        tk.Label(tests, text="Choose Run Tests on a coding question to begin.", bg="white", fg=self.MUTED, font=("Segoe UI", 10)).pack(anchor="w", pady=(8, 22))
        tk.Label(tests, textvariable=self.tester_name, bg="white", fg=self.INK, font=("Segoe UI", 12, "bold"), wraplength=510).pack(anchor="w")
        tk.Label(tests, textvariable=self.tester_hash, bg="white", fg=self.MUTED, font=("Consolas", 9), wraplength=510, justify="left").pack(anchor="w", pady=(8, 14))
        tk.Label(tests, text="Runs the teacher's Windows executable on this PC with your account permissions. Approve only a tester you trust.", bg="white", fg=self.MUTED, font=("Segoe UI", 10), wraplength=510, justify="left").pack(anchor="w", pady=(0, 16))
        tk.Label(tests, textvariable=self.test_status, bg="#F1F5F2", fg=self.INK, font=("Segoe UI", 10), padx=12, pady=12, anchor="w").pack(fill="x")
        actions = tk.Frame(tests, bg="white")
        actions.pack(fill="x", pady=18)
        self.run_btn = ttk.Button(actions, text="Approve & run", style="Primary.TButton", command=self.approve_test, state="disabled")
        self.run_btn.pack(side="left")
        self.cancel_test_btn = ttk.Button(actions, text="Cancel", command=self.cancel_test, state="disabled")
        self.cancel_test_btn.pack(side="left", padx=10)
        self.log = tk.Text(activity, wrap="word", state="disabled", bg="white", fg=self.MUTED, font=("Consolas", 10), borderwidth=0, padx=4, pady=4)
        self.log.pack(fill="both", expand=True)
        tk.Label(body, text="Windows testers · Results appear on your exam page", bg=self.BG, fg=self.MUTED, font=("Segoe UI", 9)).pack(anchor="w", pady=(16, 0))

    def can_test(self, server):
        worker = self.worker
        return bool(worker and worker.is_alive() and worker.token and worker.server == server and
                    not self.stop_signal.is_set() and worker.expires_at and
                    dt.datetime.now(dt.timezone.utc) < worker.expires_at)

    def receive_pairing(self, request: dict) -> bool:
        if self.worker and self.worker.is_alive():
            return False
        self.updates.put(("pair_request", request))
        return True

    def start(self) -> None:
        if not self.agreed.get():
            self.status.set("Allow exam activity monitoring to connect")
            return
        if self.worker and self.worker.is_alive():
            return
        try:
            server = validate_server_url(self.url.get())
        except ValueError as ex:
            self.status.set(str(ex))
            return
        code = self.code.get().strip()
        if not re.fullmatch(r"[a-fA-F0-9]{64}", code):
            self.status.set("Connect from your exam page")
            return
        if platform_key() == "unsupported":
            self.status.set("Unsupported operating system")
            return
        self.stop_signal = threading.Event()
        self.worker = MonitorWorker(server, code, self.updates, self.stop_signal)
        self.worker.start()
        self.code.set("")
        self.status.set("Connecting…")
        self.connect_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")

    def approve_test(self):
        if self.pending_test:
            self.test_runs.approve(self.pending_test)
            state = self.test_runs.status(self.pending_test, self.test_runs.jobs[self.pending_test]["origin"])
            self.test_status.set("Running tests…" if state["state"] == "running" else state.get("error", "Request expired"))
            self.run_btn.configure(state="disabled")

    def cancel_test(self):
        if self.pending_test:
            self.test_runs.reject(self.pending_test)
        self.test_status.set("Test run cancelled")
        self.run_btn.configure(state="disabled")
        self.cancel_test_btn.configure(state="disabled")

    def stop(self) -> None:
        self.stop_signal.set()
        self.test_runs.cancel_all()
        self.status.set("Disconnecting…")
        self.stop_btn.configure(state="disabled")
        self.run_btn.configure(state="disabled")
        self.cancel_test_btn.configure(state="disabled")

    def close(self) -> None:
        self.stop()
        if self.bridge:
            self.bridge.close()
        self.window.destroy()

    def poll_updates(self) -> None:
        try:
            while True:
                msg = self.updates.get_nowait()
                if isinstance(msg, tuple):
                    kind, payload = msg
                    if kind == "pair_request":
                        try:
                            self.url.set(validate_server_url(payload["server"]))
                            self.code.set(payload["pair_code"])
                            self.server_label.set(urlsplit(self.url.get()).netloc)
                            self.status.set("Connection request received")
                            self.agreed.set(False)
                            self.connect_btn.configure(state="normal")
                            self.tabs.select(0)
                            self.window.deiconify()
                            self.window.lift()
                        except (KeyError, ValueError):
                            self.status.set("Invalid connection request")
                    elif kind == "test_request":
                        self.pending_test = payload["id"]
                        info = payload["tester"]
                        self.tester_name.set(info["name"])
                        self.tester_hash.set("SHA-256  " + info["sha256"])
                        self.test_status.set("Ready for approval")
                        self.run_btn.configure(state="normal")
                        self.cancel_test_btn.configure(state="normal")
                        self.tabs.select(self.test_tab)
                        self.window.deiconify()
                        self.window.lift()
                    elif kind == "test_finished":
                        self.test_status.set(payload)
                        self.run_btn.configure(state="disabled")
                        self.cancel_test_btn.configure(state="disabled")
                    continue
                # Activity events stay in Activity; session status remains stable.
                if not msg.startswith(("Active app:", "Clipboard activity")):
                    self.status.set(msg)
                self.log.configure(state="normal")
                self.log.insert("end", dt.datetime.now().strftime("%H:%M:%S") + "  " + msg + "\n")
                if int(self.log.index("end-1c").split(".")[0]) > 250:
                    self.log.delete("1.0", "2.0")
                self.log.see("end")
                self.log.configure(state="disabled")
                if msg == "STOPPED":
                    self.status.set("Disconnected")
                    self.connect_btn.configure(state="disabled")
                    self.stop_btn.configure(state="disabled")
                    self.test_runs.cancel_all()
                    self.run_btn.configure(state="disabled")
                    self.cancel_test_btn.configure(state="disabled")
        except queue.Empty:
            pass
        self.window.after(200, self.poll_updates)

    def run(self) -> None:
        self.window.mainloop()


if __name__ == "__main__":
    ClientApp().run()
