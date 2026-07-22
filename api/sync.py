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

_IMPORT_ERROR = None
try:
    from google.oauth2 import service_account
    import google.auth.transport.requests
except Exception as _e:
    import traceback
    _IMPORT_ERROR = traceback.format_exc()

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

TAB_CONFIG = {
    "leads":           {"tab": "Leads",           "headers": ["id","name","contact","business","type","area","address","stage","source","telecaller","lastContact","lastContactAt","createdAt","orderCount","callOutcome","priority","remarks","kgQty"]},
    "samples":         {"tab": "Samples",          "headers": ["id","customer","leadId","qty","unit","type","date","exec","deliveryCost","productionCost","status","feedback","converted"]},
    "expenses":        {"tab": "Expenses",         "headers": ["id","category","amount","date","type","subtype"]},
    "repeatCustomers": {"tab": "RepeatCustomers",  "headers": ["id","name","area","contact","product","qty","frequency","lastOrder","nextDue","status","revenue"]},
    "hrLeads": {"tab": "HRLeads", "headers": ["contact"]},
    "dailyOrders": {"tab": "DailyOrders", "headers": ["id","date","customer","area","contact","address","mapLink","deliveryTime","orderType","product","items","kgs","amount","telecaller","status","cancelReason","cancelRemarks","sampleType","amountMode","manualAmount","createdAt"]},
}

_cache = {}
CACHE_TTL = 60

def get_token():
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "")
    raw_key = os.environ.get("GOOGLE_PRIVATE_KEY", "")
    # Handle all Vercel key encoding variants
    raw_key = raw_key.replace("\\n", "\n").replace("\r", "").strip()
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

def _cell_str(v):
    # Lists/dicts (e.g. a dailyOrders row's multi-product "items" array) must
    # round-trip through JSON, not Python's str()/repr(), or they come back
    # as unparsable text on read (breaking anything keyed off that field,
    # like per-product totals for a newer product such as Vada Batter).
    if isinstance(v, (list, dict)):
        return json.dumps(v)
    return str(v or "")

def write_tab(tab_name, headers, records, token):
    sheet_id = os.environ["GOOGLE_SHEET_ID"]
    data_rows = [[_cell_str(r.get(h, "")) for h in headers] for r in records]
    sheets_update(sheet_id, tab_name, [headers] + data_rows, token)

# Tabs are never hard-deleted from in this app (everything is soft-managed via
# a status/cancel field), so it's always safe to upsert-merge rather than
# blindly overwrite. This is what prevents a second telecaller's save from
# silently erasing a row the first telecaller just added a moment earlier.
ID_FIELD = {"hrLeads": "contact"}

def _merge_key(row, id_field):
    v = row.get(id_field, "")
    if v not in (None, ""):
        return str(v)
    # No id at all (legacy row) — key on full content so it still dedupes
    # exact repeats but never collides with a genuinely different row.
    return "row::" + json.dumps(row, sort_keys=True, default=str)

def merge_records(existing_rows, incoming_records, tab_key):
    """Upsert incoming_records onto existing_rows by id, preserving any row
    that exists on the sheet but wasn't included in this particular write
    (i.e. rows another telecaller/device saved that this client doesn't know
    about yet). Incoming rows win on id collisions since they're the newer,
    intentional edit."""
    id_field = ID_FIELD.get(tab_key, "id")
    merged = {}
    order = []
    for row in existing_rows:
        k = _merge_key(row, id_field)
        if k not in merged:
            order.append(k)
        merged[k] = row
    for row in incoming_records:
        k = _merge_key(row, id_field)
        if k not in merged:
            order.append(k)
        merged[k] = row
    return [merged[k] for k in order]

def _apply_deletes(records, deleted_ids, tab_key):
    """Explicit deletions win over the upsert-merge above. Without this, a
    telecaller deleting a wrongly-entered order would see it vanish locally
    but then get silently resurrected on the next sync, because the merge
    logic (by design) preserves any row still present on the sheet."""
    if not deleted_ids:
        return records
    id_field = ID_FIELD.get(tab_key, "id")
    deleted_set = {str(d) for d in deleted_ids}
    return [r for r in records if str(r.get(id_field, "")) not in deleted_set]

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
        for f in ("lastContactAt", "createdAt", "orderCount", "kgQty"):
            if row.get(f, "") not in (None, ""):
                try: row[f] = int(float(row[f]))
                except: pass
            else:
                row[f] = None if f in ("lastContactAt", "createdAt") else 0
    elif tab_key in ("samples","expenses","repeatCustomers","dailyOrders"):
        for f in ("id","qty","deliveryCost","productionCost","amount","revenue","leadId","kgs","createdAt"):
            if f in row:
                try: row[f] = float(row[f]) if "." in str(row[f]) else int(row[f])
                except: pass
        if tab_key == "samples":
            row["converted"] = str(row.get("converted","")).lower() in ("true","1","yes")
            if not row.get("feedback","").strip(): row["feedback"] = None
        if tab_key == "dailyOrders":
            if not row.get("status","").strip(): row["status"] = "Active"
            raw_items = row.get("items", "")
            if isinstance(raw_items, str) and raw_items.strip():
                try:
                    parsed = json.loads(raw_items)
                    if isinstance(parsed, list):
                        for it in parsed:
                            if isinstance(it, dict):
                                for nf in ("kgs", "rate", "amount"):
                                    if nf in it:
                                        try: it[nf] = float(it[nf]) if "." in str(it[nf]) else int(it[nf])
                                        except: pass
                        row["items"] = parsed
                    else:
                        row["items"] = []
                except Exception:
                    row["items"] = []
            elif not isinstance(raw_items, list):
                row["items"] = []
    return row

def _decoerce_leads(lead):
    import time as _time
    out = dict(lead)
    # Assign a unique id if missing
    if not out.get("id"):
        out["id"] = str(int(_time.time() * 1000)) + "_" + str(abs(hash(out.get("contact","") + out.get("name",""))))[:6]
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
            if _IMPORT_ERROR:
                self._send(500, {"error": "google-auth import failed", "trace": _IMPORT_ERROR})
                return
            try:
                token = get_token()
                sheet_id = os.environ.get("GOOGLE_SHEET_ID","")
                tabs = get_sheet_tabs(sheet_id, token)
                self._send(200, {"sheet_id": sheet_id, "tabs": tabs, "tab_repr": [repr(t) for t in tabs]})
            except Exception as e:
                import traceback
                self._send(500, {"error": str(e), "trace": traceback.format_exc()})
            return

        # Handle writes via GET (Vercel rewrites block POST to Python functions)
        method = parse_qs(parsed.query).get("_method", ["GET"])[0]
        if method == "POST":
            b64_body = parse_qs(parsed.query).get("_body", [""])[0]
            if b64_body:
                import base64
                try:
                    body = json.loads(base64.b64decode(b64_body.encode()).decode())
                    records = body.get(tab, [])
                    deleted_ids = body.get("deletedIds", [])
                    if isinstance(records, list) and tab in TAB_CONFIG:
                        cfg = TAB_CONFIG[tab]
                        if tab == "leads":
                            records = [_decoerce_leads(r) for r in records]
                        token = get_token()
                        sheet_id = os.environ["GOOGLE_SHEET_ID"]
                        actual_tabs = get_sheet_tabs(sheet_id, token)
                        matched = next((t for t in actual_tabs if t.strip().lower() == cfg["tab"].lower()), cfg["tab"])
                        existing = read_tab(matched, token)
                        merged = merge_records(existing, records, tab)
                        merged = _apply_deletes(merged, deleted_ids, tab)
                        write_tab(matched, cfg["headers"], merged, token)
                        _cache.clear()
                        self._send(200, {"ok": True, "count": len(merged)})
                        return
                except Exception as exc:
                    import traceback
                    self._send(500, {"error": str(exc), "trace": traceback.format_exc()})
                    return
            self._send(400, {"error": "No body"})
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
        deleted_ids = body.get("deletedIds") or []
        if not isinstance(records, list):
            self._send(400, {"error": "Expected list"}); return
        cfg = TAB_CONFIG[tab]
        if tab == "leads":
            records = [_decoerce_leads(r) for r in records]
        try:
            token = get_token()
            actual_tabs = get_sheet_tabs(os.environ["GOOGLE_SHEET_ID"], token)
            matched = next((t for t in actual_tabs if t.strip().lower() == cfg["tab"].lower()), cfg["tab"])
            # Re-read fresh (not the 60s cache) right before merging+writing —
            # keeps the race window to milliseconds instead of minutes, and the
            # merge itself means even a same-instant collision can't drop rows.
            existing = read_tab(matched, token)
            merged = merge_records(existing, records, tab)
            merged = _apply_deletes(merged, deleted_ids, tab)
            write_tab(matched, cfg["headers"], merged, token)
            _cache.clear()
            self._send(200, {"ok": True, "count": len(merged)})
        except Exception as exc:
            import traceback
            self._send(500, {"error": str(exc), "trace": traceback.format_exc()})

    def log_message(self, *_):
        pass


# ── /api/prospects — proxy for OpenStreetMap search (avoids browser CORS) ───
# Called from ProspectFinder component
# GET /api/prospects?area=T+Nagar+Chennai&type=restaurant
