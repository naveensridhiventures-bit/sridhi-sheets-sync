// api/sheets.js - Node.js serverless function (no env var issues)
const https = require("https");

const TAB_CONFIG = {
  leads:           { tab:"Leads",          headers:["id","name","contact","business","type","area","address","stage","source","telecaller","lastContact","priority","remarks","kgQty"] },
  samples:         { tab:"Samples",        headers:["id","customer","leadId","qty","unit","type","date","exec","deliveryCost","productionCost","status","feedback","converted","scheduledDate","scheduledTime"] },
  expenses:        { tab:"Expenses",       headers:["id","category","amount","date","type","subtype"] },
  repeatCustomers: { tab:"RepeatCustomers",headers:["id","name","area","contact","product","qty","frequency","lastOrder","nextDue","status","revenue"] },
  hrLeads:         { tab:"HRLeads",        headers:["contact"] },
};

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const key = rawKey.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();

  // Create JWT
  const header = Buffer.from(JSON.stringify({ alg:"RS256", typ:"JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now,
  })).toString("base64url");

  const { createSign } = require("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(header + "." + claim);
  const sig = sign.sign(key, "base64url");
  const jwt = header + "." + claim + "." + sig;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt
  }).toString();

  const res = await httpsRequest({
    hostname: "oauth2.googleapis.com", path: "/token", method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body) }
  }, body);

  if (!res.body.access_token) throw new Error("Token error: " + JSON.stringify(res.body));
  return res.body.access_token;
}

async function sheetsGet(sid, tab, tok) {
  const range = encodeURIComponent(tab + "!A1:Z500");
  const res = await httpsRequest({
    hostname:"sheets.googleapis.com",
    path:`/v4/spreadsheets/${sid}/values/${range}`,
    headers:{ Authorization:"Bearer "+tok }
  });
  return res.body;
}

async function sheetsWrite(sid, tab, values, tok) {
  const body = JSON.stringify({ valueInputOption:"RAW", data:[{ range:tab+"!A1", values }] });
  const res = await httpsRequest({
    hostname:"sheets.googleapis.com",
    path:`/v4/spreadsheets/${sid}/values:batchUpdate`,
    method:"POST",
    headers:{ Authorization:"Bearer "+tok, "Content-Type":"application/json","Content-Length":Buffer.byteLength(body) }
  }, body);
  return res.body;
}

async function getTabNames(sid, tok) {
  const res = await httpsRequest({
    hostname:"sheets.googleapis.com",
    path:`/v4/spreadsheets/${sid}?fields=sheets.properties.title`,
    headers:{ Authorization:"Bearer "+tok }
  });
  return (res.body.sheets||[]).map(s => s.properties.title);
}

function readTab(data) {
  const vals = data.values || [];
  if (!vals.length) return [];
  const [headers, ...rows] = vals;
  return rows.filter(r => r.some(c => String(c).trim()))
    .map(r => Object.fromEntries(headers.map((h,i) => [h, r[i]||""])));
}

function coerce(key, row) {
  if (key === "leads") {
    row.id = /^\d+$/.test(String(row.id)) ? Number(row.id) : row.id;
    row.remarks = row.remarks ? row.remarks.split(" || ").filter(Boolean) : [];
  } else if (["samples","expenses","repeatCustomers"].includes(key)) {
    ["id","qty","deliveryCost","productionCost","amount","revenue"].forEach(f => {
      if (row[f] !== undefined) { const n = Number(row[f]); if (!isNaN(n)) row[f] = n; }
    });
    if (key === "samples") {
      row.converted = ["true","1","yes"].includes(String(row.converted||"").toLowerCase());
      if (!String(row.feedback||"").trim()) row.feedback = null;
    }
  }
  return row;
}

function deleads(lead) {
  const out = {...lead};
  out.remarks = Array.isArray(out.remarks) ? out.remarks.join(" || ") : (out.remarks || "");
  return out;
}

const _cache = {};
const CACHE_TTL = 60000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, X-Api-Key");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { tab = "all" } = req.query;
  const sid = process.env.GOOGLE_SHEET_ID;

  try {
    const tok = await getToken();

    if (req.method === "GET") {
      if (tab === "envcheck") {
        res.json({ email:!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key:!!process.env.GOOGLE_PRIVATE_KEY, sheet:!!sid }); return;
      }
      if (tab === "all") {
        const cached = _cache.ALL;
        if (cached && Date.now()-cached.ts < CACHE_TTL) { res.json(cached.data); return; }
        const tabs = await getTabNames(sid, tok);
        const result = {};
        for (const [key, cfg] of Object.entries(TAB_CONFIG)) {
          const matched = tabs.find(t => t.trim().toLowerCase() === cfg.tab.toLowerCase()) || cfg.tab;
          try {
            const data = await sheetsGet(sid, matched, tok);
            result[key] = readTab(data).map(r => coerce(key, r));
          } catch { result[key] = []; }
        }
        _cache.ALL = { ts:Date.now(), data:result };
        res.json(result);
      } else if (TAB_CONFIG[tab]) {
        const data = await sheetsGet(sid, TAB_CONFIG[tab].tab, tok);
        res.json({ [tab]: readTab(data).map(r => coerce(tab, r)) });
      } else {
        res.status(400).json({ error:"Unknown tab" });
      }
    } else if (req.method === "POST") {
      if (!TAB_CONFIG[tab]) { res.status(400).json({ error:"Unknown tab" }); return; }
      let records = req.body?.[tab];
      if (!Array.isArray(records)) { res.status(400).json({ error:"Expected list" }); return; }
      if (tab === "leads") records = records.map(deleads);
      const { headers } = TAB_CONFIG[tab];
      const rows = records.map(r => headers.map(h => String(r[h]||"")));
      await sheetsWrite(sid, TAB_CONFIG[tab].tab, [headers,...rows], tok);
      delete _cache.ALL;
      res.json({ ok:true, count:records.length });
    }
  } catch(e) {
    res.status(500).json({ error:e.message, stack:e.stack });
  }
};
