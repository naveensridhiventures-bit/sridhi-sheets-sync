"""
api/sheets.py - Sridhi Ventures BOS - Vercel Python Serverless Function
Uses Vercel's native handler format for reliable env var access
"""
from http.server import BaseHTTPRequestHandler
import json, os, time, urllib.request, urllib.parse

try:
    from google.oauth2 import service_account
    import google.auth.transport.requests
except ImportError:
    pass

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

TAB_CONFIG = {
    "leads":           {"tab":"Leads",          "headers":["id","name","contact","business","type","area","address","stage","source","telecaller","lastContact","priority","remarks","kgQty"]},
    "samples":         {"tab":"Samples",         "headers":["id","customer","leadId","qty","unit","type","date","exec","deliveryCost","productionCost","status","feedback","converted","scheduledDate","scheduledTime"]},
    "expenses":        {"tab":"Expenses",        "headers":["id","category","amount","date","type","subtype"]},
    "repeatCustomers": {"tab":"RepeatCustomers", "headers":["id","name","area","contact","product","qty","frequency","lastOrder","nextDue","status","revenue"]},
    "hrLeads":         {"tab":"HRLeads",         "headers":["contact"]},
}

_cache = {}
CACHE_TTL = 60

def _get_env(name):
    """Get env var - works in both GET and POST contexts."""
    val = os.environ.get(name, "")
    if not val:
        # Try lowercase variant
        val = os.environ.get(name.lower(), "")
    return val

def _clean_key(raw):
    """Clean private key - handle all Vercel encoding formats."""
    if not raw:
        return ""
    k = raw
    k = k.replace('\\r\\n', '\n').replace('\\r', '\n').replace('\\n', '\n')
    k = k.replace('\r\n', '\n').replace('\r', '\n')
    k = k.strip()
    if '-----BEGIN' not in k and k:
        k = '-----BEGIN PRIVATE KEY-----\n' + k + '\n-----END PRIVATE KEY-----'
    return k

def _make_creds():
    email = _get_env("GOOGLE_SERVICE_ACCOUNT_EMAIL")
    raw = _get_env("GOOGLE_PRIVATE_KEY")
    key = _clean_key(raw)
    sheet_id = _get_env("GOOGLE_SHEET_ID")
    if not email or not key or not sheet_id:
        raise RuntimeError(
            "Missing env vars. email={} key_len={} sheet_id={}. All env: {}".format(
                bool(email), len(key), bool(sheet_id),
                [k for k in os.environ.keys()]
            )
        )
    creds = service_account.Credentials.from_service_account_info(
        {"type":"service_account","client_email":email,"private_key":key,
         "token_uri":"https://oauth2.googleapis.com/token"},
        scopes=SCOPES,
    )
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token, sheet_id

def _sheets_get(sheet_id, tab, token):
    enc = urllib.parse.quote(tab + "!A1:Z500", safe="!:")
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}".format(sheet_id, enc)
    req = urllib.request.Request(url, headers={"Authorization":"Bearer "+token})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def _sheets_write(sheet_id, tab, values, token):
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}/values:batchUpdate".format(sheet_id)
    body = json.dumps({"valueInputOption":"RAW","data":[{"range":tab+"!A1","values":values}]}).encode()
    req = urllib.request.Request(url, data=body, method="POST",
        headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def _read_tab(tab_name, token, sheet_id):
    result = _sheets_get(sheet_id, tab_name, token)
    values = result.get("values", [])
    if not values: return []
    headers, *rows = values
    return [{headers[i]:(row[i] if i<len(row) else "") for i in range(len(headers))}
            for row in rows if any(str(c).strip() for c in row)]

def _write_tab(tab_name, headers, records, token, sheet_id):
    rows = [[str(r.get(h,"") or "") for h in headers] for r in records]
    _sheets_write(sheet_id, tab_name, [headers]+rows, token)

def _coerce(key, row):
    if key == "leads":
        row["id"] = int(row["id"]) if str(row.get("id","")).isdigit() else row.get("id","")
        row["remarks"] = [r for r in row.get("remarks","").split(" || ") if r] if row.get("remarks") else []
    elif key in ("samples","expenses","repeatCustomers"):
        for f in ("id","qty","deliveryCost","productionCost","amount","revenue"):
            if f in row:
                try: row[f] = float(row[f]) if "." in str(row[f]) else int(row[f])
                except: pass
        if key == "samples":
            row["converted"] = str(row.get("converted","")).lower() in ("true","1","yes")
            if not row.get("feedback","").strip(): row["feedback"] = None
    return row

def _decoerce_leads(lead):
    out = dict(lead)
    remarks = out.get("remarks",[])
    out["remarks"] = " || ".join(remarks) if isinstance(remarks,list) else (remarks or "")
    return out

def _fetch_all(token, sheet_id):
    cached = _cache.get("ALL")
    if cached and time.time()-cached["ts"] < CACHE_TTL:
        return cached["data"]
    # Get actual tab names
    url = "https://sheets.googleapis.com/v4/spreadsheets/{}?fields=sheets.properties.title".format(sheet_id)
    req = urllib.request.Request(url, headers={"Authorization":"Bearer "+token})
    with urllib.request.urlopen(req, timeout=10) as r:
        meta = json.loads(r.read())
    actual = [s["properties"]["title"] for s in meta.get("sheets",[])]
    result = {}
    for k, cfg in TAB_CONFIG.items():
        matched = next((t for t in actual if t.strip().lower()==cfg["tab"].lower()), cfg["tab"])
        try:
            rows = _read_tab(matched, token, sheet_id)
            result[k] = [_coerce(k, r) for r in rows]
        except:
            result[k] = []
    _cache["ALL"] = {"ts":time.time(),"data":result}
    return result

def _cors_headers(self):
    self.send_header("Access-Control-Allow-Origin","*")
    self.send_header("Access-Control-Allow-Headers","Content-Type, X-Api-Key")
    self.send_header("Access-Control-Allow-Methods","GET, POST, OPTIONS")

def _send(self, code, body):
    payload = json.dumps(body, ensure_ascii=False).encode()
    self.send_response(code)
    self.send_header("Content-Type","application/json; charset=utf-8")
    self.send_header("Content-Length",str(len(payload)))
    _cors_headers(self)
    self.end_headers()
    self.wfile.write(payload)

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        _cors_headers(self)
        self.end_headers()

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        tab = parse_qs(urlparse(self.path).query).get("tab",["all"])[0]

        if tab == "envcheck":
            email = _get_env("GOOGLE_SERVICE_ACCOUNT_EMAIL")
            raw = _get_env("GOOGLE_PRIVATE_KEY")
            key = _clean_key(raw)
            try:
                c = service_account.Credentials.from_service_account_info(
                    {"type":"service_account","client_email":email,"private_key":key,
                     "token_uri":"https://oauth2.googleapis.com/token"},scopes=SCOPES)
                valid=True; err=""
            except Exception as e:
                valid=False; err=str(e)
            _send(self,200,{
                "email":email[:40],"raw_len":len(raw),"key_len":len(key),
                "newlines":key.count("\n"),"has_begin":"-----BEGIN" in key,
                "valid":valid,"err":err,"sheet_id":_get_env("GOOGLE_SHEET_ID"),
                "all_env_count":len(os.environ)
            })
            return

        try:
            token, sheet_id = _make_creds()
            if tab == "all":
                _send(self, 200, _fetch_all(token, sheet_id))
            elif tab in TAB_CONFIG:
                rows = _read_tab(TAB_CONFIG[tab]["tab"], token, sheet_id)
                _send(self, 200, {tab:[_coerce(tab,r) for r in rows]})
            else:
                _send(self, 400, {"error":"Unknown tab: "+tab})
        except Exception as e:
            import traceback
            _send(self, 500, {"error":str(e),"trace":traceback.format_exc()})

    def do_POST(self):
        from urllib.parse import urlparse, parse_qs
        tab = parse_qs(urlparse(self.path).query).get("tab",[None])[0]
        if tab not in TAB_CONFIG:
            _send(self, 400, {"error":"Unknown tab"}); return
        length = int(self.headers.get("Content-Length",0))
        body = json.loads(self.rfile.read(length) or b"{}")
        records = body.get(tab)
        if not isinstance(records, list):
            _send(self, 400, {"error":"Expected list"}); return
        cfg = TAB_CONFIG[tab]
        if tab == "leads":
            records = [_decoerce_leads(r) for r in records]
        try:
            token, sheet_id = _make_creds()
            _write_tab(cfg["tab"], cfg["headers"], records, token, sheet_id)
            _cache.clear()
            _send(self, 200, {"ok":True,"count":len(records)})
        except Exception as e:
            import traceback
            _send(self, 500, {"error":str(e),"trace":traceback.format_exc()})

    def log_message(self,*_): pass
