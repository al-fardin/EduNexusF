import base64
import hashlib
import json
import os
import pathlib
import queue
import sys
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from test_runner import TestRunManager, execute_tester, parse_result, validate_workspace


def workspace(code="a,b=map(int,input().split()); print(a+b)"):
    return {"entry": "main.py", "files": [{"path": "main.py", "content": code}]}


class TestRunnerTests(unittest.TestCase):
    def test_rejects_unsafe_paths_and_collisions(self):
        for path in ("../a.py", "/main.py", "src//main.py", "a\\b.py", "CON.py", "src/NUL.txt", "main.py."):
            with self.subTest(path=path), self.assertRaises(ValueError):
                validate_workspace({"entry": path, "files": [{"path": path, "content": ""}]})
        for paths in (("a.py", "A.py"), ("src", "src/main.py")):
            with self.assertRaises(ValueError):
                validate_workspace({"entry": paths[0], "files": [{"path": p, "content": ""} for p in paths]})

    def test_valid_multifile_workspace(self):
        value = {"entry": "src/main.py", "files": [{"path": "src/main.py", "content": "import helper"}, {"path": "src/helper.py", "content": "x=1"}]}
        self.assertEqual(validate_workspace(value), value)

    def test_rejects_invalid_results(self):
        for value in ({"passed": True, "total": 2}, {"passed": 3, "total": 2}, {"passed": 0, "total": 0}, {"passed": 1, "total": 2, "cases": [{"status": "unknown"}]}):
            with self.assertRaises(ValueError):
                parse_result(json.dumps(value))
        with self.assertRaises(ValueError):
            parse_result("GUI tester output")

    def test_result_details_are_bounded(self):
        result = parse_result(json.dumps({"passed": 1, "total": 1, "cases": [{"name": "x" * 500, "status": "passed", "message": "y" * 4000}]}))
        self.assertEqual(len(result["cases"][0]["name"]), 120)
        self.assertEqual(len(result["cases"][0]["message"]), 1000)

    def test_jobs_require_connected_server_and_never_autorun(self):
        manager = TestRunManager(queue.Queue(), lambda server: server == "https://school.test")
        with patch("test_runner.platform.system", return_value="Windows"), patch.object(manager, "prepare"):
            with self.assertRaises(ValueError):
                manager.create({"server": "https://other.test"}, "https://school.test")
            job = manager.create({"server": "https://school.test", "ticket": "a" * 64, "workspace": workspace(), "language": "python"}, "https://school.test")
            self.assertEqual(manager.status(job["id"], "https://school.test")["state"], "preparing")
            self.assertIsNone(manager.status(job["id"], "https://other.test"))
            manager.approve(job["id"])  # Not verified or ready; no execution.
            self.assertEqual(manager.status(job["id"], "https://school.test")["state"], "preparing")
            manager.reject(job["id"])
            self.assertEqual(manager.status(job["id"], "https://school.test")["state"], "error")

    def test_expired_approval_cannot_execute(self):
        manager = TestRunManager(queue.Queue(), lambda _: True)
        manager.jobs["test"] = {"state": "awaiting_approval", "created": time.monotonic() - 121,
                                "server": "https://school.test", "cancel": threading.Event(), "binary": b"MZ"}
        with patch.object(manager, "run") as run:
            manager.approve("test")
            self.assertFalse(run.called)
            self.assertEqual(manager.jobs["test"]["state"], "error")
            self.assertNotIn("binary", manager.jobs["test"])


@unittest.skipUnless(os.environ.get("EDUNEXUS_TESTER_EXE"), "Set EDUNEXUS_TESTER_EXE to the built example tester")
class WindowsExecutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binary = pathlib.Path(os.environ["EDUNEXUS_TESTER_EXE"]).read_bytes()

    def test_real_tester_runs_correct_and_incorrect_solutions(self):
        good = execute_tester(self.binary, workspace(), "python", threading.Event())
        self.assertEqual((good["passed"], good["total"]), (4, 4))
        bad = execute_tester(self.binary, workspace("print(0)"), "python", threading.Event())
        self.assertEqual((bad["passed"], bad["total"]), (1, 4))

    def test_real_tester_cancellation(self):
        cancel = threading.Event()
        timer = threading.Timer(0.8, cancel.set)
        timer.start()
        started = time.monotonic()
        try:
            with self.assertRaisesRegex(ValueError, "cancelled"):
                execute_tester(self.binary, workspace("while True: pass"), "python", cancel)
        finally:
            timer.cancel()
        self.assertLess(time.monotonic() - started, 8)


if __name__ == "__main__":
    unittest.main()
