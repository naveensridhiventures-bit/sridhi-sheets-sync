"""
api/ai.py - AI proxy supporting both Anthropic and Groq
POST /api/ai  body: { system, messages }
Tries Anthropic first, falls back to Groq
"""
import json, os, urllib.request
from http.server import BaseHTTPRequestHandler

def call_anthropic(system, messages, api_key):
    payload = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 1000,
        "system": system,
        "messages": messages,
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def call_groq(system, messages, api_key):
    all_msgs = [{"role":"system","content":system}] + messages
    payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "max_tokens": 1000,
        "messages": all_msgs,
    }).encode()
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    text = data["choices"][0]["message"]["content"]
    return {"content": [{"type": "text", "text": text}]}

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

    def do_OPTIONS(self): self._send(200, {})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        system = body.get("system", "You are a helpful business assistant.")
        messages = body.get("messages", [])

        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        groq_key = os.environ.get("GROQ_API_KEY", "")

        # Try Anthropic first
        if anthropic_key:
            try:
                result = call_anthropic(system, messages, anthropic_key)
                self._send(200, result); return
            except Exception as e:
                pass  # Fall through to Groq

        # Try Groq
        if groq_key:
            try:
                result = call_groq(system, messages, groq_key)
                self._send(200, result); return
            except Exception as e:
                self._send(500, {"error": "Groq error: " + str(e)}); return

        self._send(503, {"error": "No AI API key configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY in Vercel dashboard."})

    def log_message(self, *_): pass
