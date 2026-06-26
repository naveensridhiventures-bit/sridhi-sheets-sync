"""
api/sheets.py - Sridhi Ventures BOS Google Sheets sync
"""
import json
import os
import time
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

try:
    from google.oauth2 import service_account
    import google.auth.transport.requests
except ImportError:
    pass

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
MAX_ROWS = 500

TAB_CONFIG = {
    "leads": {
        "tab": "Leads",
        "headers": ["id","name","contact","business","type","area","address",
                    "stage","source","telecaller","lastContact","priority","remarks"],
    },
    "samples": {
        "tab": "Samples",
        "headers": ["id","customer","leadId","qty","unit","type","date","exec",
                    "deliveryCost","productionCost","status","feedback","converted"],
    },
    "expenses": {
        "tab": "Expenses",
        "headers": ["id","category","amount","date","type","subtype"],
    },
    "repeatCustomers": {
        "tab": "RepeatCustomers",
        "headers": ["id","name","area","contact","product","qty","frequency",
                    "lastOrder","nextDue","status","revenue"],
    },
}

_cache = {}
CACHE_TTL = 60
_creds = None

def get_creds():
    global _creds
    if _creds and _creds.valid:
        return _creds
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")
    raw_key = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
    _creds = service_account.Credentials.from_service_account_info(
        {"type": "service_account", "client_email": email, "private_key": raw_key,
         "token_uri": "https://oauth2.googleapis.com/token"},
        scopes=SCOPES,
    )
    req = google.auth.transport.requests.Request()
    _creds.refresh(req)
    return _creds

def sheets_get(sheet_id, tab_name):
    creds = get_creds()
    range_str = tab_name + "!A1:Z" + str(MAX_ROWS)
    encoded = urllib.parse.quote(range_str)
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}".format(sheet_id, encoded)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + creds.token})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def sheets_update(sheet_id, tab_name, values):
    creds = get_creds()
    range_str = tab_name + "!A1"
    encoded = urllib.parse.quote(range_str)
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}?valueInputOption=RAW".format(sheet_id, encoded)
    payload = json.dumps({"values": values}).encode()
    req = urllib.request.Request(url, data=payload, method="PUT",
        headers={"Authorization": "Bearer " + creds.token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def read_tab(tab_name):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    result = sheets_get(sheet_id, tab_name)
    values = result.get("values", [])
    if not values:
        return []
    headers, *rows = values
    return [
        {headers[i]: (row[i] if i < len(row) else "") for i in range(len(headers))}
        for row in rows
        if any(str(cell).strip() for cell in row)
    ]

def write_tab(tab_name, headers, records):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    data_rows = [[str(r.get(h, "") or "") for h in headers] for r in records]
    sheets_update(sheet_id, tab_name, [headers] + data_rows)

def _coerce(tab_key, row):
    if tab_key == "leads":
        row["id"] = int(row["id"]) if str(row.get("id","")).isdigit() else row.get("id","")
        row["remarks"] = [r for r in row.get("remarks","").split(" || ") if r] if row.get("remarks") else []
    elif tab_key in ("samples","expenses","repeatCustomers"):
        for f in ("id","qty","deliveryCost","productionCost","amount","revenue","leadId"):
            if f in row:
                try:
                    row[f] = float(row[f]) if "." in str(row[f]) else int(row[f])
                except: pass
        if tab_key == "samples":
            row["converted"] = str(row.get("converted","")).lower() in ("true","1","yes")
            if not row.get("feedback","").strip(): row["feedback"] = None
    return row

def _decoerce_leads(lead):
    out = dict(lead)
    remarks = out.get("remarks", [])
    out["remarks"] = " || ".join(remarks) if isinstance(remarks, list) else (remarks or "")
    return out

def fetch_all_tabs():
    cached = _cache.get("ALL")
    if cached and time.time() - cached["ts"] < CACHE_TTL:
        return cached["data"]
    result = {}
    for key, cfg in TAB_CONFIG.items():
        rows = read_tab(cfg["tab"])
        result[key] = [_coerce(key, r) for r in rows]
    _cache["ALL"] = {"ts": time.time(), "data": result}
    return result

class handler(BaseHTTPRequestHandler):

    def _send(self, code, body):
        payload = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Api-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        tab = parse_qs(parsed.query).get("tab", ["all"])[0]
        try:
            if tab == "all":
                self._send(200, fetch_all_tabs())
            elif tab in TAB_CONFIG:
                rows = read_tab(TAB_CONFIG[tab]["tab"])
                self._send(200, {tab: [_coerce(tab, r) for r in rows]})
            else:
                self._send(400, {"error": "Unknown tab: " + tab})
        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def do_POST(self):
        parsed = urlparse(self.path)
        tab = parse_qs(parsed.query).get("tab", [None])[0]
        if tab not in TAB_CONFIG:
            self._send(400, {"error": "Unknown tab"}); return
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        records = body.get(tab)
        if not isinstance(records, list):
            self._send(400, {"error": "Expected list"}); return
        cfg = TAB_CONFIG[tab]
        if tab == "leads":
            records = [_decoerce_leads(r) for r in records]
        try:
            write_tab(cfg["tab"], cfg["headers"], records)
            _cache.clear()
            self._send(200, {"ok": True, "count": len(records)})
        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_):
        pass
