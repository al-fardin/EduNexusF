"""Explicitly approved Windows testers. No shell commands or arbitrary download URLs."""
from __future__ import annotations

import base64
import hashlib
import json
import platform
import re
import secrets
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from urllib import request as urlrequest

import psutil
from windows_job import WindowsJob

MAX_EXE = 10 * 1024 * 1024
MAX_OUTPUT = 128 * 1024
RUN_SECONDS = 60
PROTOCOL = "edunexus.tester.v1"


def validate_workspace(workspace):
    if not isinstance(workspace, dict) or not isinstance(workspace.get("files"), list):
        raise ValueError("Invalid source workspace")
    files = workspace["files"]
    if not 1 <= len(files) <= 24:
        raise ValueError("Select a source file before running tests")
    names = set()
    for file in files:
        if not isinstance(file, dict):
            raise ValueError("Invalid source file")
        name, content = file.get("path"), file.get("content")
        if (not isinstance(name, str) or not 1 <= len(name) <= 120 or
                not re.fullmatch(r"[A-Za-z0-9_./-]+", name) or name.startswith("/") or
                any(not part or part.startswith(".") for part in name.split("/")) or
                any(part.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)], *[f"LPT{i}" for i in range(1, 10)]} or part.endswith(".") for part in name.split("/")) or
                name.lower() in names or not isinstance(content, str)):
            raise ValueError("Invalid or duplicate source path")
        names.add(name.lower())
    for name in names:
        if any(other.startswith(name + "/") for other in names):
            raise ValueError("Conflicting source paths")
    if workspace.get("entry") not in [f["path"] for f in files]:
        raise ValueError("Select a valid entry file")
    if len(json.dumps(workspace).encode()) > 40000:
        raise ValueError("Source workspace is too large")
    return {"entry": workspace["entry"], "files": files}


def parse_result(raw):
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("Tester must return EduNexus JSON on stdout") from exc
    if not isinstance(result, dict):
        raise ValueError("Invalid tester result")
    passed, total = result.get("passed"), result.get("total")
    if type(passed) is not int or type(total) is not int or not 0 <= passed <= total <= 10000 or total < 1:
        raise ValueError("Tester returned invalid test counts")
    cases = result.get("cases", [])
    if not isinstance(cases, list) or len(cases) > min(total, 200):
        raise ValueError("Tester returned invalid cases")
    clean = []
    for case in cases:
        if not isinstance(case, dict) or case.get("status") not in ("passed", "failed", "error", "timeout"):
            raise ValueError("Tester returned an invalid case")
        clean.append({"name": str(case.get("name", "Test"))[:120], "status": case["status"],
                      "message": str(case.get("message", ""))[:1000]})
    return {"passed": passed, "total": total, "cases": clean}


def terminate_tree(process):
    try:
        parent = psutil.Process(process.pid)
        children = parent.children(recursive=True)
        # Stop parents first so they cannot create more children during cleanup.
        parent.kill()
        for child in children:
            try:
                child.kill()
            except psutil.Error:
                pass
        psutil.wait_procs(children, timeout=2)
    except psutil.Error:
        pass
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()


def execute_tester(executable, workspace, language, cancel):
    """Runs a trusted teacher executable as the current user, not a security sandbox."""
    if platform.system() != "Windows":
        raise ValueError("Windows is required for .exe testers")
    with tempfile.TemporaryDirectory(prefix="edunexus-test-") as folder:
        root = Path(folder)
        binary = root / "tester.exe"
        binary.write_bytes(executable)
        source = root / "source"
        source.mkdir()
        for file in workspace["files"]:
            path = source / file["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(file["content"], encoding="utf-8")
        request = {"protocol": PROTOCOL, "language": language, **workspace, "source_dir": str(source)}
        started = time.monotonic()
        process = subprocess.Popen([str(binary)], cwd=folder, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            job_limits = WindowsJob(process)
        except Exception:
            terminate_tree(process)
            for stream in (process.stdin, process.stdout, process.stderr):
                stream.close()
            raise ValueError("Windows could not apply tester process limits")
        output, errors = bytearray(), bytearray()
        overflow = threading.Event()

        def read(stream, target):
            while True:
                chunk = stream.read(4096)
                if not chunk:
                    break
                if len(target) + len(chunk) > MAX_OUTPUT:
                    overflow.set()
                    break
                target.extend(chunk)

        def write():
            try:
                process.stdin.write(json.dumps(request).encode("utf-8"))
                process.stdin.close()
            except (OSError, ValueError):
                pass

        readers = [threading.Thread(target=read, args=(process.stdout, output), daemon=True),
                   threading.Thread(target=read, args=(process.stderr, errors), daemon=True)]
        for thread in readers:
            thread.start()
        writer = threading.Thread(target=write, daemon=True)
        writer.start()
        problem = None
        try:
            while process.poll() is None:
                if cancel.wait(0.05):
                    problem = "Test run cancelled"
                    break
                if overflow.is_set():
                    problem = "Tester output exceeded 128 KB"
                    break
                if time.monotonic() - started > RUN_SECONDS:
                    problem = "Tester exceeded the 60-second limit"
                    break
            if problem:
                raise ValueError(problem)
            # Clean up child compilers/programs even if the tester exits early.
        finally:
            job_limits.close()
            terminate_tree(process)
            for thread in readers:
                thread.join(timeout=2)
            writer.join(timeout=1)
            process.stdout.close()
            process.stderr.close()
        if overflow.is_set():
            raise ValueError("Tester output exceeded 128 KB")
        if process.returncode:
            raise ValueError("Tester exited with code " + str(process.returncode) + ": " + errors.decode("utf-8", "replace")[:500])
        result = parse_result(bytes(output))
        result["duration_ms"] = round((time.monotonic() - started) * 1000)
        return result


class TestRunManager:
    def __init__(self, updates, authorize):
        self.updates, self.authorize = updates, authorize
        self.jobs = {}
        self.lock = threading.RLock()

    def create(self, payload, origin):
        if platform.system() != "Windows":
            raise ValueError("Windows is required for .exe testers")
        if not isinstance(payload, dict):
            raise ValueError("Invalid test request")
        server, ticket = payload.get("server"), payload.get("ticket")
        if not isinstance(server, str) or not self.authorize(server):
            raise ValueError("Connect the desktop client to this exam first")
        if not isinstance(ticket, str) or not re.fullmatch(r"[a-f0-9]{64}", ticket):
            raise ValueError("Invalid tester ticket")
        workspace = validate_workspace(payload.get("workspace"))
        language = payload.get("language")
        if not isinstance(language, str) or len(language) > 50:
            raise ValueError("Invalid source language")
        with self.lock:
            self.jobs = {k: v for k, v in self.jobs.items() if time.monotonic() - v["created"] < 300}
            for stale_id, stale in self.jobs.items():
                if time.monotonic() - stale["created"] > 120:
                    self.reject(stale_id)
            if any(j["state"] in ("preparing", "awaiting_approval", "running") for j in self.jobs.values()):
                raise ValueError("A test run is already pending")
            if len(self.jobs) >= 12:
                oldest = next(iter(self.jobs))
                del self.jobs[oldest]
            job_id = secrets.token_hex(32)
            job = {"state": "preparing", "created": time.monotonic(), "origin": origin,
                   "server": server, "cancel": threading.Event(), "workspace": workspace, "language": language}
            self.jobs[job_id] = job
        threading.Thread(target=self.prepare, args=(job_id, ticket), daemon=True).start()
        return {"id": job_id, "state": "preparing"}

    def prepare(self, job_id, ticket):
        job = self.jobs[job_id]
        try:
            req = urlrequest.Request(job["server"] + "/local-testers/download", headers={"User-Agent": "EduNexus-Desktop/15", "Authorization": "Bearer " + ticket})
            # Do not send a capability token to a redirected destination.
            class NoRedirect(urlrequest.HTTPRedirectHandler):
                def redirect_request(self, *args, **kwargs):
                    return None
            with urlrequest.build_opener(NoRedirect).open(req, timeout=15) as response:
                raw = response.read(15 * 1024 * 1024 + 1)
            if len(raw) > 15 * 1024 * 1024:
                raise ValueError("Tester download is too large")
            bundle = json.loads(raw)["data"]
            if bundle.get("protocol") != PROTOCOL:
                raise ValueError("Unsupported tester protocol")
            binary = base64.b64decode(bundle["executable"], validate=True)
            info = bundle["tester"]
            if (not 64 <= len(binary) <= MAX_EXE or binary[:2] != b"MZ" or
                    hashlib.sha256(binary).hexdigest() != info["sha256"] or info["size"] != len(binary)):
                raise ValueError("Tester integrity verification failed")
            if job["cancel"].is_set() or not self.authorize(job["server"]):
                raise ValueError("Exam session disconnected")
            with self.lock:
                job.update(state="awaiting_approval", binary=binary, tester=info)
            self.updates.put(("test_request", {"id": job_id, "tester": info}))
        except Exception as exc:
            with self.lock:
                job.update(state="error", error=str(exc)[:500])
                job.pop("binary", None)

    def approve(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["state"] != "awaiting_approval":
                return
            if time.monotonic() - job["created"] > 120 or not self.authorize(job["server"]) or job["cancel"].is_set():
                job.update(state="error", error="Request expired. Run tests again from the exam.")
                job.pop("binary", None)
                return
            job["state"] = "running"
        threading.Thread(target=self.run, args=(job_id,), daemon=True).start()

    def run(self, job_id):
        job = self.jobs[job_id]
        try:
            result = execute_tester(job["binary"], job["workspace"], job["language"], job["cancel"])
            with self.lock:
                job.update(state="completed", result=result)
            self.updates.put(("test_finished", f"{result['passed']} / {result['total']} tests passed"))
        except Exception as exc:
            with self.lock:
                job.update(state="error", error=str(exc)[:500])
            self.updates.put(("test_finished", "Test run failed"))
        finally:
            with self.lock:
                job.pop("binary", None)

    def status(self, job_id, origin):
        with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["origin"] != origin:
                return None
            if not self.authorize(job["server"]) or time.monotonic() - job["created"] > 120:
                job["cancel"].set()
                if job["state"] in ("preparing", "awaiting_approval"):
                    job.update(state="error", error="Test request expired or disconnected")
                    job.pop("binary", None)
            return {k: job[k] for k in ("state", "result", "error") if k in job}

    def reject(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if job:
                job["cancel"].set()
                if job["state"] in ("preparing", "awaiting_approval"):
                    job.update(state="error", error="Test run cancelled")
                    job.pop("binary", None)

    def cancel_all(self):
        with self.lock:
            for job_id in self.jobs:
                self.reject(job_id)
