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
import threading
import time
import tkinter as tk
from tkinter import ttk
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import urlsplit
from uuid import uuid4

try:
    import psutil
except ImportError:
    psutil = None

USER_AGENT = "EduNexus-Desktop-Client/14C"
POLL_SECONDS = 2.0
HEARTBEAT_SECONDS = 8.0
MAX_BUFFER = 100


def platform_key() -> str:
    return {"Windows": "windows", "Darwin": "macos", "Linux": "linux"}.get(platform.system(), "unsupported")


def validate_server_url(raw: str) -> str:
    value = raw.strip().rstrip("/")
    parsed = urlsplit(value)
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
        raise ValueError("Enter the API server root, without a path or credentials")
    if parsed.scheme == "https" and parsed.hostname:
        return value
    if parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1"):
        return value
    raise ValueError("Use HTTPS; plain HTTP is permitted only for local development")


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
            self.notice("READY · Waiting for exam entry (no app recording yet)")
            active = bool(response.get("active", False))
            if active:
                self.last_clip_seq = windows_clipboard_sequence()
                self.notice("MONITORING ACTIVE · Exam started")
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
                            self.notice("Clipboard updated while " + source + " was active (text not read)")
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
                            self.notice("MONITORING ACTIVE · Exam started")
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
    def __init__(self) -> None:
        self.window = tk.Tk()
        self.window.title("EduNexus · Secure Exam Client")
        self.window.geometry("545x510")
        self.window.minsize(500, 480)
        self.window.configure(bg="#F3F1EA")
        self.stop_signal = threading.Event()
        self.updates: queue.Queue[str] = queue.Queue()
        self.worker: MonitorWorker | None = None
        self.url = tk.StringVar(value="http://127.0.0.1:8080")
        self.code = tk.StringVar()
        self.agreed = tk.BooleanVar(value=False)
        self.status = tk.StringVar(value="Not connected")
        self.render()
        self.window.protocol("WM_DELETE_WINDOW", self.close)
        self.window.after(200, self.poll_updates)

    def render(self) -> None:
        body = tk.Frame(self.window, bg="#F3F1EA", padx=24, pady=22)
        body.pack(fill="both", expand=True)
        tk.Label(body, text="EduNexus Secure Exam", bg="#F3F1EA", fg="#2B342C", font=("Arial", 19, "bold")).pack(anchor="w")
        tk.Label(body, text="Desktop activity companion · Phase 14C", bg="#F3F1EA", fg="#62735D").pack(anchor="w", pady=(3,16))
        tk.Label(body, text="Server API URL", bg="#F3F1EA", anchor="w").pack(fill="x")
        ttk.Entry(body, textvariable=self.url).pack(fill="x", pady=(3,10))
        tk.Label(body, text="One-time pairing code (copy from your active exam)", bg="#F3F1EA", anchor="w").pack(fill="x")
        self.input = ttk.Entry(body, textvariable=self.code)
        self.input.pack(fill="x", pady=(3,12))
        tk.Label(body, text="During your exam: active app names and, on Windows, which app\nwas active when clipboard changed. No clipboard text, chats or passwords.",
                 justify="left", bg="#F3F1EA", fg="#2B342C", wraplength=480).pack(anchor="w", pady=(0,9))
        ttk.Checkbutton(body, text="I agree to exam-time app and clipboard metadata monitoring", variable=self.agreed).pack(anchor="w", pady=(0,12))
        buttons=tk.Frame(body, bg="#F3F1EA")
        buttons.pack(fill="x", pady=(0,12))
        self.connect_btn=ttk.Button(buttons,text="Connect & Start", command=self.start)
        self.connect_btn.pack(side="left")
        self.stop_btn=ttk.Button(buttons,text="Stop Monitoring",command=self.stop,state="disabled")
        self.stop_btn.pack(side="left", padx=10)
        tk.Label(body,textvariable=self.status,bg="#E8EEE4",fg="#2B342C",anchor="w",padx=12,pady=9).pack(fill="x")
        self.log=tk.Text(body,height=8,wrap="word",state="disabled",bg="#FBFAF6",fg="#2B342C",font=("Consolas",9))
        self.log.pack(fill="both",expand=True,pady=(10,0))
        tk.Label(body,text="Connected before exam: readiness checks only. App activity starts after entering. Stops on exam expiry or when you click Stop.",
                 bg="#F3F1EA",fg="#687365",wraplength=480,justify="left",font=("Arial",9)).pack(anchor="w",pady=(9,0))

    def start(self) -> None:
        if not self.agreed.get():
            self.status.set("Please agree before monitoring starts")
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
            self.status.set("Paste the full 64-character one-time pairing code")
            return
        if platform_key() == "unsupported":
            self.status.set("Unsupported operating system")
            return
        self.stop_signal=threading.Event()
        self.worker=MonitorWorker(server,code,self.updates,self.stop_signal)
        self.worker.start()
        self.code.set("")
        self.status.set("Connecting…")
        self.connect_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")

    def stop(self) -> None:
        self.stop_signal.set()
        self.status.set("Stopping…")
        self.stop_btn.configure(state="disabled")

    def close(self) -> None:
        self.stop()
        self.window.destroy()

    def poll_updates(self) -> None:
        try:
            while True:
                msg=self.updates.get_nowait()
                self.status.set(msg)
                self.log.configure(state="normal")
                self.log.insert("end", dt.datetime.now().strftime("%H:%M:%S")+"  "+msg+"\n")
                self.log.see("end")
                self.log.configure(state="disabled")
                if msg == "STOPPED":
                    self.connect_btn.configure(state="normal")
                    self.stop_btn.configure(state="disabled")
        except queue.Empty:
            pass
        self.window.after(200,self.poll_updates)

    def run(self) -> None:
        self.window.mainloop()


if __name__ == "__main__":
    ClientApp().run()
