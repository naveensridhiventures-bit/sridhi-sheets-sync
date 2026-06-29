"""
api/sheets.py - Sridhi Ventures BOS
Reads env vars from VERCEL_ENV_FILE when standard os.environ doesn't have them
"""
from http.server import BaseHTTPRequestHandler
import json, os, time, urllib.request, urllib.parse

# ── Load env vars from Vercel encrypted env file at module load time ──────────
def _load_vercel_env():
    """Called once at module init to populate os.environ from Vercel's env file."""
    env_file = os.environ.get("VERCEL_ENV_FILE", "")
    enc_key = os.environ.get("VERCEL_ENV_ENC_KEY", "")
    if not env_file or not os.path.exists(env_file):
        return
    try:
        with open(env_file, "rb") as f:
            raw = f.read()
        # Try decryption
        if enc_key:
            try:
                import base64, hashlib
                key = base64.urlsafe_b64encode(hashlib.sha256(enc_key.encode()).digest())
                from cryptography.fernet import Fernet
                raw = Fernet(key).decrypt(raw)
            except Exception:
                pass  # maybe unencrypted
        # Parse .env format
        text = raw.decode("utf-8", "replace")
        for line in text.split("\n"):
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

_load_vercel_env()

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

def _clean_key(raw):
    k = raw.replace('\\r\\n','\n').replace('\\r','\n').replace('\\n','\n')
    k = k.replace('\r\n','\n').replace('\r','\n').strip()
    if k and '-----BEGIN' not in k:
        k = '-----BEGIN PRIVATE KEY-----\n' + k + '\n-----END PRIVATE KEY-----'
    return k

def _make_creds():
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL","")
    raw   = os.environ.get("GOOGLE_PRIVATE_KEY","")
    sid   = os.environ.get("GOOGLE_SHEET_ID","")
    key   = _clean_key(raw)
    if not email or not key or not sid:
        raise RuntimeError("Missing credentials after env load. email={} key_len={} sheet={}. Keys={}".format(
            bool(email),len(key),bool(sid),[k for k in os.environ if "GOOGLE" in k]))
    creds = service_account.Credentials.from_service_account_info(
        {"type":"service_account","client_email":email,"private_key":key,
         "token_uri":"https://oauth2.googleapis.com/token"}, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token, sid

def _sheets_get(sid, tab, tok):
    enc = urllib.parse.quote(tab+"!A1:Z500", safe="!:")
    req = urllib.request.Request(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}".format(sid,enc),
        headers={"Authorization":"Bearer "+tok})
    with urllib.request.urlopen(req,timeout=15) as r: return json.loads(r.read())

def _sheets_write(sid, tab, values, tok):
    body = json.dumps({"valueInputOption":"RAW","data":[{"range":tab+"!A1","values":values}]}).encode()
    req = urllib.request.Request(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values:batchUpdate".format(sid),
        data=body, method="POST",
        headers={"Authorization":"Bearer "+tok,"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=15) as r: return json.loads(r.read())

def _read(tab, tok, sid):
    res = _sheets_get(sid, tab, tok)
    vals = res.get("values",[])
    if not vals: return []
    h,*rows = vals
    return [{h[i]:(r[i] if i<len(r) else "") for i in range(len(h))} for r in rows if any(str(c).strip() for c in r)]

def _write(tab, headers, records, tok, sid):
    rows = [[str(r.get(h,"") or "") for h in headers] for r in records]
    _sheets_write(sid, tab, [headers]+rows, tok)

def _coerce(k, row):
    if k=="leads":
        row["id"]=int(row["id"]) if str(row.get("id","")).isdigit() else row.get("id","")
        row["remarks"]=[r for r in row.get("remarks","").split(" || ") if r] if row.get("remarks") else []
    elif k in ("samples","expenses","repeatCustomers"):
        for f in ("id","qty","deliveryCost","productionCost","amount","revenue"):
            if f in row:
                try: row[f]=float(row[f]) if "." in str(row[f]) else int(row[f])
                except: pass
        if k=="samples":
            row["converted"]=str(row.get("converted","")).lower() in ("true","1","yes")
            if not row.get("feedback","").strip(): row["feedback"]=None
    return row

def _deleads(lead):
    out=dict(lead); r=out.get("remarks",[])
    out["remarks"]=" || ".join(r) if isinstance(r,list) else (r or "")
    return out

def _fetch_all(tok, sid):
    cached=_cache.get("ALL")
    if cached and time.time()-cached["ts"]<CACHE_TTL: return cached["data"]
    req=urllib.request.Request(
        "https://sheets.googleapis.com/v4/spreadsheets/{}?fields=sheets.properties.title".format(sid),
        headers={"Authorization":"Bearer "+tok})
    with urllib.request.urlopen(req,timeout=10) as r: meta=json.loads(r.read())
    actual=[s["properties"]["title"] for s in meta.get("sheets",[])]
    result={}
    for k,cfg in TAB_CONFIG.items():
        matched=next((t for t in actual if t.strip().lower()==cfg["tab"].lower()),cfg["tab"])
        try: result[k]=[_coerce(k,r) for r in _read(matched,tok,sid)]
        except: result[k]=[]
    _cache["ALL"]={"ts":time.time(),"data":result}
    return result

def _hdr(self):
    self.send_header("Access-Control-Allow-Origin","*")
    self.send_header("Access-Control-Allow-Headers","Content-Type")
    self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")

def _send(self, code, body):
    p=json.dumps(body,ensure_ascii=False).encode()
    self.send_response(code)
    self.send_header("Content-Type","application/json; charset=utf-8")
    self.send_header("Content-Length",str(len(p)))
    _hdr(self); self.end_headers(); self.wfile.write(p)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _hdr(self); self.end_headers()

    def do_GET(self):
        from urllib.parse import urlparse,parse_qs
        qs=parse_qs(urlparse(self.path).query)
        tab=qs.get("tab",["all"])[0]

        if tab=="envcheck":
            _load_vercel_env()  # reload
            email=os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL","")
            raw=os.environ.get("GOOGLE_PRIVATE_KEY","")
            sid=os.environ.get("GOOGLE_SHEET_ID","")
            env_file=os.environ.get("VERCEL_ENV_FILE","")
            file_exists=bool(env_file and os.path.exists(env_file))
            _send(self,200,{
                "email":bool(email),"key_len":len(raw),"sheet_id":bool(sid),
                "env_file":env_file,"file_exists":file_exists,
                "google_keys":[k for k in os.environ if "GOOGLE" in k],
                "total_env":len(os.environ)
            })
            return

        try:
            tok,sid=_make_creds()
            if tab=="all": _send(self,200,_fetch_all(tok,sid))
            elif tab in TAB_CONFIG:
                rows=_read(TAB_CONFIG[tab]["tab"],tok,sid)
                _send(self,200,{tab:[_coerce(tab,r) for r in rows]})
            else: _send(self,400,{"error":"Unknown tab"})
        except Exception as e:
            import traceback; _send(self,500,{"error":str(e),"trace":traceback.format_exc()})

    def do_POST(self):
        from urllib.parse import urlparse,parse_qs
        _load_vercel_env()  # reload env from file
        tab=parse_qs(urlparse(self.path).query).get("tab",[None])[0]
        if tab not in TAB_CONFIG: _send(self,400,{"error":"Unknown tab"}); return
        length=int(self.headers.get("Content-Length",0))
        body=json.loads(self.rfile.read(length) or b"{}")
        records=body.get(tab)
        if not isinstance(records,list): _send(self,400,{"error":"Expected list"}); return
        if tab=="leads": records=[_deleads(r) for r in records]
        try:
            tok,sid=_make_creds()
            _write(TAB_CONFIG[tab]["tab"],TAB_CONFIG[tab]["headers"],records,tok,sid)
            _cache.clear()
            _send(self,200,{"ok":True,"count":len(records)})
        except Exception as e:
            import traceback; _send(self,500,{"error":str(e),"trace":traceback.format_exc()})

    def log_message(self,*_): pass
