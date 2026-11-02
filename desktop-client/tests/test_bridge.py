import http.client
import json
import pathlib
import queue
import sys
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import local_bridge
from test_runner import TestRunManager


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.manager = TestRunManager(queue.Queue(), lambda _: False)
        with patch.object(local_bridge, "PORT", 0):
            self.server = local_bridge.BridgeServer(lambda value: self.requests.append(value) or True, self.manager)
        self.port = self.server.server_address[1]
        self.port_patch = patch.object(local_bridge, "PORT", self.port)
        self.port_patch.start()
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.port_patch.stop()

    def request(self, method, path, body=None, origin="http://localhost:3000"):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        headers = {"Origin": origin, "Content-Type": "application/json"}
        connection.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        response = connection.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        connection.close()
        return result

    def test_health_negotiates_protocol_and_rejects_foreign_origins(self):
        status, _, body = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["tester_protocol"], "edunexus.tester.v1")
        status, headers, _ = self.request("GET", "/health", origin="https://attacker.test")
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_pairing_stays_pending_local_approval(self):
        status, _, body = self.request("POST", "/pair", {"pair_code": "a" * 64, "server": "https://school.test"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["status"], "awaiting_user_approval")
        self.assertEqual(len(self.requests), 1)

    def test_unconnected_execution_is_rejected(self):
        with patch("test_runner.platform.system", return_value="Windows"):
            status, _, body = self.request("POST", "/test-runs", {"server": "https://school.test"})
        self.assertEqual(status, 400)
        self.assertIn("Connect", json.loads(body)["error"])

    def test_preflight_and_job_capability(self):
        job_id = "a" * 64
        self.manager.jobs[job_id] = {"origin": "http://localhost:3000", "server": "https://school.test",
                                    "state": "completed", "created": 0, "cancel": threading.Event(),
                                    "result": {"passed": 1, "total": 1, "cases": []}}
        status, headers, _ = self.request("OPTIONS", f"/test-runs/{job_id}/cancel")
        self.assertEqual(status, 204)
        self.assertIn("POST", headers["Access-Control-Allow-Methods"])
        status, _, body = self.request("GET", f"/test-runs/{job_id}")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["result"]["passed"], 1)
        self.assertEqual(self.request("GET", "/test-runs/" + "b" * 64)[0], 404)


if __name__ == "__main__":
    unittest.main()
