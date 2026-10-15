"""Offline client smoke tests: python3 -m unittest discover -s integrations/hermes/tests."""

import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


CLIENT = Path(__file__).resolve().parents[1] / "meal-maestro/scripts/meal_maestro.py"
TOKEN = "test-token-" + "a" * 43
RECIPE_ID = "33333333-3333-4333-8333-333333333333"


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.status = 200
        self.payload = {"recipes": [], "today": "2026-10-15", "timezone": "Europe/Amsterdam"}
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.respond()

            def do_PUT(self):
                self.respond()

            def respond(self):
                owner.calls.append({
                    "method": self.command, "path": self.path,
                    "auth": self.headers.get("Authorization"),
                    "body": self.rfile.read(int(self.headers.get("Content-Length", 0))),
                })
                self.send_response(owner.status)
                self.send_header("Content-Type", "application/json")
                if owner.status == 302:
                    self.send_header("Location", "/must-not-follow")
                self.end_headers()
                self.wfile.write(json.dumps(owner.payload).encode())

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.env = {
            **os.environ,
            "MEAL_MAESTRO_URL": "http://127.0.0.1:%s" % self.server.server_port,
            "MEAL_MAESTRO_API_TOKEN": TOKEN,
        }

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def run_client(self, *args):
        result = subprocess.run([sys.executable, str(CLIENT), *args],
                                env=self.env, capture_output=True, text=True, timeout=5)
        self.assertNotIn(TOKEN, result.stdout + result.stderr)
        return result

    def test_list_encodes_data_and_authenticates(self):
        result = self.run_client("list", "--query", "pasta & soep", "--eaten-status", "recorded", "--offset", "20")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), self.payload)
        self.assertEqual(self.calls[0]["auth"], "Bearer " + TOKEN)
        self.assertIn("query=pasta+%26+soep", self.calls[0]["path"])
        self.assertIn("eaten_status=recorded", self.calls[0]["path"])
        self.assertIn("offset=20", self.calls[0]["path"])

    def test_get(self):
        result = self.run_client("get", RECIPE_ID)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls[0]["path"], "/api/agent/v1/recipes/" + RECIPE_ID)

    def test_today_is_decided_by_server(self):
        result = self.run_client("mark-eaten", RECIPE_ID)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls[0]["method"], "PUT")
        self.assertEqual(self.calls[0]["body"], b"{}")

    def test_explicit_date(self):
        result = self.run_client("mark-eaten", RECIPE_ID, "--date", "2026-01-01")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(self.calls[0]["body"]), {"date": "2026-01-01"})

    def test_never_follows_redirects_with_credentials(self):
        self.status = 302
        result = self.run_client("list")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("HTTP 302", result.stderr)
        self.assertEqual(len(self.calls), 1)

    def test_http_errors_do_not_claim_success_or_dump_server_contents(self):
        self.status = 401
        self.payload = {"private": "do-not-print"}
        result = self.run_client("list")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("HTTP 401", result.stderr)
        self.assertNotIn("do-not-print", result.stdout + result.stderr)

    def test_missing_token_does_not_make_request(self):
        self.env["MEAL_MAESTRO_API_TOKEN"] = ""
        result = self.run_client("list")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.calls, [])

    def test_rejects_remote_http_and_userinfo(self):
        for url in ["http://example.com", "https://user:password@example.com", "https://example.com/path"]:
            with self.subTest(url=url):
                self.env["MEAL_MAESTRO_URL"] = url
                self.assertEqual(self.run_client("list").returncode, 2)
        self.assertEqual(self.calls, [])

    def test_invalid_recipe_id_does_not_make_request(self):
        self.assertEqual(self.run_client("mark-eaten", "../../admin").returncode, 2)
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
