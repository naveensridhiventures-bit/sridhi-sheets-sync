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

TAB_CONFIG = {
    "leads":           {"tab": "Leads",           "headers": ["id","name","contact","business","type","area","address","stage","source","telecaller","lastContact","priority","remarks"]},
    "samples":         {"tab": "Samples",          "headers": ["id","customer","leadId","qty","unit","type","date","exec","deliveryCost","productionCost","status","feedback","converted"]},
    "expenses":        {"tab": "Expenses",         "headers": ["id","category","amount","date","type","subtype"]},
    "repeatCustomers": {"tab": "RepeatCustomers",  "headers": ["id","name","area","contact","product","qty","frequency","lastOrder","nextDue","status","revenue"]},
    "hrLeads": {"tab": "HRLeads", "headers": ["contact"]},
}

_cache = {}
CACHE_TTL = 60

def get_token():
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")
    raw_key = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")
    creds = service_account.Credentials.from_service_account_info(
        {"type": "service_account", "client_email": email, "private_key": raw_key,
         "token_uri": "https://oauth2.googleapis.com/token"},
        scopes=SCOPES,
    )
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def get_sheet_tabs(sheet_id, token):
    """Get all actual tab names from the spreadsheet."""
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}?fields=sheets.properties.title".format(sheet_id)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return [s["properties"]["title"] for s in data.get("sheets", [])]

def sheets_get(sheet_id, tab_name, token):
    encoded = urllib.parse.quote(tab_name + "!A1:Z500", safe="")
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}".format(sheet_id, encoded)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def sheets_update(sheet_id, tab_name, values, token):
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values:batchUpdate".format(sheet_id)
    payload = json.dumps({
        "valueInputOption": "RAW",
        "data": [{"range": tab_name + "!A1", "values": values}]
    }).encode()
    req = urllib.request.Request(url, data=payload, method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def read_tab(tab_name, token):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    result = sheets_get(sheet_id, tab_name, token)
    values = result.get("values", [])
    if not values:
        return []
    headers, *rows = values
    return [
        {headers[i]: (row[i] if i < len(row) else "") for i in range(len(headers))}
        for row in rows if any(str(c).strip() for c in row)
    ]

def write_tab(tab_name, headers, records, token):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    data_rows = [[str(r.get(h, "") or "") for h in headers] for r in records]
    sheets_update(sheet_id, tab_name, [headers] + data_rows, token)

def _normalize_phone(phone):
    """Normalize phone numbers to 10 digits: strip +91, 091, spaces, dashes."""
    import re
    digits = re.sub(r"[^0-9]", "", str(phone or ""))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("091") and len(digits) == 13:
        digits = digits[3:]
    return digits[-10:] if len(digits) >= 10 else digits

def _coerce(tab_key, row):
    if tab_key == "hrLeads":
        row["contact"] = _normalize_phone(row.get("contact",""))
        return row
    if tab_key == "leads":
        row["id"] = int(row["id"]) if str(row.get("id","")).isdigit() else row.get("id","")
        row["remarks"] = [r for r in row.get("remarks","").split(" || ") if r] if row.get("remarks") else []
    elif tab_key in ("samples","expenses","repeatCustomers"):
        for f in ("id","qty","deliveryCost","productionCost","amount","revenue","leadId"):
            if f in row:
                try: row[f] = float(row[f]) if "." in str(row[f]) else int(row[f])
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
    token = get_token()
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    # Get actual tab names first to match them correctly
    actual_tabs = get_sheet_tabs(sheet_id, token)
    result = {}
    for key, cfg in TAB_CONFIG.items():
        # Find matching tab (case-insensitive)
        matched = next((t for t in actual_tabs if t.strip().lower() == cfg["tab"].lower()), cfg["tab"])
        rows = read_tab(matched, token)
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

        # Debug endpoint
        if tab == "debug":
            try:
                token = get_token()
                sheet_id = os.environ.get("GOOGLE_SHEET_ID","")
                tabs = get_sheet_tabs(sheet_id, token)
                self._send(200, {"sheet_id": sheet_id, "tabs": tabs, "tab_repr": [repr(t) for t in tabs]})
            except Exception as e:
                import traceback
                self._send(500, {"error": str(e), "trace": traceback.format_exc()})
            return

        try:
            if tab == "all":
                self._send(200, fetch_all_tabs())
            elif tab in TAB_CONFIG:
                token = get_token()
                rows = read_tab(TAB_CONFIG[tab]["tab"], token)
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
            token = get_token()
            write_tab(cfg["tab"], cfg["headers"], records, token)
            _cache.clear()
            self._send(200, {"ok": True, "count": len(records)})
        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_):
        pass
