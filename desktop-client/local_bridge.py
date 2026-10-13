"""Restricted loopback bridge between an EduNexus exam page and the desktop app.

Browser pairing requires a user gesture on the authenticated exam page AND
an approval click inside the app. A localhost POST alone never starts monitoring.
"""
from __future__ import annotations

import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

PORT = 47913
LOCAL_HOST = "127.0.0.1"
DEFAULT_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")
MAX_BODY = 1024


def allowed_origins() -> frozenset[str]:
    # For deployment, ship ONLY the operator-owned HTTPS exam origin here.
    extra = [o.strip().rstrip("/") for o in os.environ.get("EDUNEXUS_WEB_ORIGINS", "").split(",") if o.strip()]
    extra = [o for o in extra if urlsplit(o).scheme == "https" and urlsplit(o).hostname]
    return frozenset((*DEFAULT_ORIGINS, *extra))


def valid_request(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    code = data.get("pair_code")
    raw_server = data.get("server")
    if not isinstance(code, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", code):
        return False
    if not isinstance(raw_server, str) or len(raw_server) > 250:
        return False
    url = urlsplit(raw_server)
    if url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
        return False
    return bool(url.scheme == "https" and url.hostname or
                url.scheme == "http" and url.hostname in ("localhost", "127.0.0.1", "::1"))


class BridgeServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def __init__(self, callback):
        super().__init__((LOCAL_HOST, PORT), BridgeHandler)
        self.callback = callback


class BridgeHandler(BaseHTTPRequestHandler):
    server: BridgeServer

    def log_message(self, *_args):
        pass  # No secrets in logs.

    def _authorized(self) -> bool:
        host = self.headers.get("Host", "")
        return (self.headers.get("Origin") in allowed_origins() and
                host == f"{LOCAL_HOST}:{PORT}")

    def _reply(self, code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        if self._authorized():
            self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.path not in ("/pair", "/health") or not self._authorized():
            return self._reply(403, {"ok": False})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS" if self.path == "/pair" else "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):
        if self.path != "/health" or not self._authorized():
            return self._reply(403, {"ok": False})
        self._reply(200, {"ok": True, "client": "EduNexus Secure Exam", "pairing": "local-confirmation"})

    def do_POST(self):
        if self.path != "/pair" or not self._authorized():
            return self._reply(403, {"ok": False, "error": "not_allowed"})
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            return self._reply(415, {"ok": False})
        try:
            length = int(self.headers.get("Content-Length", "-1"))
            if not 0 < length <= MAX_BODY:
                return self._reply(413, {"ok": False})
            data = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeDecodeError):
            return self._reply(400, {"ok": False})
        if not valid_request(data):
            return self._reply(400, {"ok": False, "error": "invalid_pair"})
        if not self.server.callback(data):
            return self._reply(409, {"ok": False, "error": "client_busy"})
        self._reply(200, {"ok": True, "status": "awaiting_user_approval"})


class DesktopPairingBridge:
    def __init__(self, callback):
        self.httpd = BridgeServer(callback)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    def start(self):
        self.thread.start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
