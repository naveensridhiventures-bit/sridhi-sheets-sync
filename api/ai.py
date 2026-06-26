"""
api/ai.py
─────────────────────────────────────────────────────────────────────────────
AI proxy — keeps ANTHROPIC_API_KEY on the server, never exposed to the browser.

POST /api/ai
  Body: { system: "...", messages: [{role, content}, ...] }
  Returns: { content: [{type:"text", text:"..."}] }

Env var required (Vercel dashboard):
  ANTHROPIC_API_KEY   ← get from console.anthropic.com
"""

import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-6"


def _check_auth(headers):
    api_key = os.environ.get("API_KEY", "")
    if not api_key:
        return True
    provided = headers.get("x-api-key") or headers.get("X-Api-Key") or ""
    return provided == api_key


class handler(BaseHTTPRequestHandler):

    def _send(self, code, body):
        payload = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Api-Key")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send(200, {})

    def do_POST(self):
        if not _check_auth(dict(self.headers)):
            self._send(401, {"error": "Unauthorized"})
            return

        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not anthropic_key:
            self._send(503, {"error": "ANTHROPIC_API_KEY not configured on server."})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")

        system   = body.get("system", "You are a helpful business assistant.")
        messages = body.get("messages", [])

        payload = json.dumps({
            "model": MODEL,
            "max_tokens": 1000,
            "system": system,
            "messages": messages,
        }).encode()

        req = urllib.request.Request(
            ANTHROPIC_API_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": anthropic_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            self._send(200, result)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode()
            self._send(e.code, {"error": err_body})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def log_message(self, *_):
        pass
