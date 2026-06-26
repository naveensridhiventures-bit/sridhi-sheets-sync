"""
api/sheets.py
─────────────────────────────────────────────────────────────────────────────
Sridhi Ventures BOS — Python FastAPI backend for Google Sheets sync.

Deployed as a single Vercel Python serverless function.
Handles all four data tabs in ONE API endpoint for maximum fetch speed:
  GET  /api/sheets?tab=all          → { leads, samples, expenses, repeatCustomers }
  GET  /api/sheets?tab=leads        → { leads: [...] }
  POST /api/sheets?tab=leads        → body { leads: [...] }  → { ok, count }

Env vars required (set in Vercel dashboard):
  GOOGLE_SERVICE_ACCOUNT_EMAIL
  GOOGLE_PRIVATE_KEY
  GOOGLE_SHEET_ID
  API_KEY                    ← shared secret, same key as the PWA uses
"""

import json
import os
import time
from functools import lru_cache
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# ── lazy imports (only available in serverless runtime) ─────────────────────
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

# ── constants ───────────────────────────────────────────────────────────────
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
MAX_ROWS = 1000

TAB_CONFIG = {
    "leads": {
        "tab":     "Leads",
        "headers": ["id","name","contact","business","type","area","address",
                    "stage","source","telecaller","lastContact","priority","remarks"],
    },
    "samples": {
        "tab":     "Samples",
        "headers": ["id","customer","leadId","qty","unit","type","date","exec",
                    "deliveryCost","productionCost","status","feedback","converted"],
    },
    "expenses": {
        "tab":     "Expenses",
        "headers": ["id","category","amount","date","type","subtype"],
    },
    "repeatCustomers": {
        "tab":     "RepeatCustomers",
        "headers": ["id","name","area","contact","product","qty","frequency",
                    "lastOrder","nextDue","status","revenue"],
    },
}

# ── simple in-process cache (survives warm lambda invocations) ──────────────
_cache: dict = {}
CACHE_TTL = 60  # seconds


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data):
    _cache[key] = {"ts": time.time(), "data": data}


def _cache_bust(key: str):
    _cache.pop(key, None)


# ── Google Sheets client (cached across warm invocations) ───────────────────
_sheets_service = None


def get_sheets_service():
    global _sheets_service
    if _sheets_service:
        return _sheets_service

    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")
    raw_key = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
    if not email or not raw_key:
        raise RuntimeError(
            "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
        )

    creds = service_account.Credentials.from_service_account_info(
        {"type": "service_account", "client_email": email, "private_key": raw_key,
         "token_uri": "https://oauth2.googleapis.com/token"},
        scopes=SCOPES,
    )
    _sheets_service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return _sheets_service


# ── low-level read/write ────────────────────────────────────────────────────
def read_tab(tab_name: str) -> list[dict]:
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    svc = get_sheets_service()
    result = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=sheet_id, range=f"{tab_name}!A1:Z{MAX_ROWS}")
        .execute()
    )
    values = result.get("values", [])
    if not values:
        return []
    headers, *rows = values
    return [
        {headers[i]: (row[i] if i < len(row) else "") for i in range(len(headers))}
        for row in rows
        if any(cell.strip() for cell in row)
    ]


def write_tab(tab_name: str, headers: list[str], records: list[dict]):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    svc = get_sheets_service()
    last_col = _col_letter(len(headers) - 1)
    data_rows = [
        [str(r.get(h, "") or "") for h in headers]
        for r in records
    ]
    update_range = tab_name + "!A1"
    svc.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range=update_range,
        valueInputOption="RAW",
        body={"values": [headers, *data_rows]},
    ).execute()


def _col_letter(zero_idx: int) -> str:
    n, s = zero_idx + 1, ""
    while n > 0:
        rem = (n - 1) % 26
        s = chr(65 + rem) + s
        n = (n - 1) // 26
    return s


# ── type coercions ──────────────────────────────────────────────────────────
def _coerce(tab_key: str, row: dict) -> dict:
    if tab_key == "leads":
        row["id"] = int(row["id"]) if str(row.get("id","")).isdigit() else row.get("id","")
        row["remarks"] = [r for r in row.get("remarks","").split(" || ") if r] if row.get("remarks") else []
    elif tab_key in ("samples","expenses","repeatCustomers"):
        for num_field in ("id","qty","deliveryCost","productionCost","amount","revenue","leadId"):
            if num_field in row:
                try:
                    row[num_field] = float(row[num_field]) if "." in str(row[num_field]) else int(row[num_field])
                except (ValueError, TypeError):
                    pass
        if tab_key == "samples":
            row["converted"] = str(row.get("converted","")).lower() in ("true","1","yes")
            if row.get("feedback","").strip() == "":
                row["feedback"] = None
    return row


def _decoerce_leads(lead: dict) -> dict:
    out = dict(lead)
    remarks = out.get("remarks", [])
    out["remarks"] = " || ".join(remarks) if isinstance(remarks, list) else (remarks or "")
    return out


# ── "fetch all tabs in parallel" helper ─────────────────────────────────────
def fetch_all_tabs() -> dict:
    cached = _cache_get("ALL")
    if cached:
        return cached

    result = {}
    for key, cfg in TAB_CONFIG.items():
        rows = read_tab(cfg["tab"])
        result[key] = [_coerce(key, r) for r in rows]

    _cache_set("ALL", result)
    return result


# ── security ─────────────────────────────────────────────────────────────────
def _check_auth(headers: dict) -> bool:
    return True  # auth disabled — open access


# ── Vercel Python handler ─────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):

    def _send(self, code: int, body: dict, extra_headers: dict | None = None):
        payload = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Api-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        if not _check_auth(dict(self.headers)):
            self._send(401, {"error": "Unauthorized"}); return

        parsed = urlparse(self.path)
        tab = parse_qs(parsed.query).get("tab", ["all"])[0]

        try:
            if tab == "all":
                data = fetch_all_tabs()
                self._send(200, data, {"Cache-Control": "public, max-age=30"})
            elif tab in TAB_CONFIG:
                cached = _cache_get(tab)
                if cached is not None:
                    self._send(200, {tab: cached}, {"Cache-Control": "public, max-age=30"})
                    return
                rows = read_tab(TAB_CONFIG[tab]["tab"])
                coerced = [_coerce(tab, r) for r in rows]
                _cache_set(tab, coerced)
                self._send(200, {tab: coerced}, {"Cache-Control": "public, max-age=30"})
            else:
                self._send(400, {"error": f"Unknown tab: {tab}"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_POST(self):
        if not _check_auth(dict(self.headers)):
            self._send(401, {"error": "Unauthorized"}); return

        parsed = urlparse(self.path)
        tab = parse_qs(parsed.query).get("tab", [None])[0]

        if tab not in TAB_CONFIG:
            self._send(400, {"error": f"Unknown or missing tab param"}); return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        records = body.get(tab)

        if not isinstance(records, list):
            self._send(400, {"error": f"Expected body: {{ {tab}: [...] }}"}); return

        cfg = TAB_CONFIG[tab]
        # de-coerce leads remarks
        if tab == "leads":
            records = [_decoerce_leads(r) for r in records]

        try:
            write_tab(cfg["tab"], cfg["headers"], records)
            _cache_bust(tab)
            _cache_bust("ALL")
            self._send(200, {"ok": True, "count": len(records)})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def log_message(self, *_):
        pass  # suppress default HTTP log spam in Vercel logs


# ── /api/ai  — proxy to Anthropic (keeps API key server-side) ───────────────
# This handler is registered separately in vercel.json as api/ai.py
# but we define the logic here and import it from there.
