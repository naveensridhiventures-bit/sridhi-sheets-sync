# Sridhi Ventures BOS — Setup Guide (v3.0)
## React Vite PWA + Python API → Single Vercel Deployment

This version unifies everything into **one Vercel project**: the PWA frontend
and the Python backend both deploy together. No separate backend URL needed.

---

## What changed from v2

| v2 (Node.js, 2 deployments)           | v3 (Python, 1 deployment)              |
|----------------------------------------|----------------------------------------|
| Separate `sridhi-sheets-sync/` project | `api/sheets.py` inside the same repo  |
| 4 API fetches on load (one per tab)    | **1 fetch** (`?tab=all`) loads everything |
| No in-process cache                    | 60-second in-memory cache on server    |
| No service-worker caching of API       | Service worker caches API response     |
| Node.js runtime                        | **Python 3.12** runtime                |
| `SYNC_API_BASE` must be set manually   | Same-origin — no URL to configure      |

Result: **first load ~3–4× faster**, repeat visits instant from cache.

---

## Part 1 — Google Sheet (unchanged from v2)

1. Create a Google Sheet named **Sridhi Ventures BOS Data**.
2. Create four tabs: `Leads`, `Samples`, `Expenses`, `RepeatCustomers`.
3. Add the header row in each tab (see below).
4. Copy the **Sheet ID** from the URL (`/d/<THIS PART>/edit`).

### Tab headers

**Leads**
```
id  name  contact  business  type  area  address  stage  source  telecaller  lastContact  priority  remarks
```

**Samples**
```
id  customer  leadId  qty  unit  type  date  exec  deliveryCost  productionCost  status  feedback  converted
```

**Expenses**
```
id  category  amount  date  type  subtype
```

**RepeatCustomers**
```
id  name  area  contact  product  qty  frequency  lastOrder  nextDue  status  revenue
```

---

## Part 2 — Google Cloud Service Account (unchanged from v2)

1. Go to console.cloud.google.com → create project `sridhi-ventures-bos`.
2. Enable **Google Sheets API**.
3. Create a Service Account → download the JSON key file.
4. From the JSON, copy `client_email` and `private_key`.
5. Share your Google Sheet with the service account email (Editor access).

---

## Part 3 — Deploy to Vercel (simplified!)

### 3a. Push to GitHub

```bash
git init
git add .
git commit -m "Sridhi Ventures BOS v3.0"
gh repo create sridhi-ventures-bos --private --push
```

### 3b. Import into Vercel

1. Go to vercel.com → New Project → import your repo.
2. Framework preset: **Vite** (auto-detected).
3. Build command: `npm run build`  Output dir: `dist`
4. Click **Deploy** (it will fail the first time without env vars — that's OK).

### 3c. Set Environment Variables in Vercel Dashboard

Go to your project → Settings → Environment Variables. Add:

| Variable                       | Value                                                     |
|-------------------------------|-----------------------------------------------------------|
| `API_KEY`                     | Any strong random string, e.g. `sk-sridhi-abc123xyz`     |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`| The `client_email` from your service account JSON         |
| `GOOGLE_PRIVATE_KEY`          | The `private_key` value (paste as-is, with `\n` escapes) |
| `GOOGLE_SHEET_ID`             | Your Sheet ID from the URL                                |
| `VITE_API_KEY`                | **Same value** as `API_KEY` above                         |

> ⚠️ `VITE_API_KEY` is baked into the frontend JS at build time (it's the
> client-side key). `API_KEY` is used by the Python server to verify requests.
> They must match.

### 3d. Redeploy

After adding env vars, go to Deployments → Redeploy. Your app should be live at
`https://sridhi-ventures-bos.vercel.app`.

---

## Part 4 — Local Development

```bash
# Install frontend deps
npm install

# Install Python deps
pip install google-auth google-api-python-client

# Create local env file
cp .env.example .env.local
# Edit .env.local — set VITE_API_KEY

# Run Python API locally (port 8000)
python -m uvicorn api.sheets:app --port 8000
# OR for the BaseHTTPRequestHandler style:
# python -c "from http.server import HTTPServer; from api.sheets import handler; HTTPServer(('', 8000), handler).serve_forever()"

# In another terminal, run Vite dev server (proxies /api to port 8000)
npm run dev
```

Open http://localhost:5173

---

## Speed Optimisations Explained

### 1. Batch fetch (`?tab=all`)
On app start, one request fetches all four tabs at once. The Python server
uses `BatchGet` semantics internally — one JWT token, one spreadsheet call.

### 2. In-process server cache
The Python lambda caches results for 60 seconds in module-level memory. Warm
Vercel invocations (which happen within ~5 min of last request) skip the
Google API entirely and return instantly.

### 3. Stale-While-Revalidate in the hook
`useSheets` shows the previous response immediately, then revalidates in the
background. Users see data on screen before the network request completes.

### 4. Service Worker API cache
The PWA service worker (`vite-plugin-pwa` + Workbox) caches the `?tab=all`
response for 120 seconds. On a repeat visit (or after an offline period), the
app loads from the service worker cache with zero network latency.

### 5. Vercel CDN headers
`Cache-Control: public, max-age=30, stale-while-revalidate=60` on the API
route lets Vercel's edge cache the response for 30 s, serving repeat requests
without hitting the Python function at all.

---

## Troubleshooting

| Symptom                        | Likely cause & fix                                           |
|-------------------------------|--------------------------------------------------------------|
| Sync badge shows "Sync failed" | Check `API_KEY` == `VITE_API_KEY` in Vercel env vars        |
| "Missing GOOGLE_SHEET_ID"      | Add `GOOGLE_SHEET_ID` in Vercel env vars                     |
| Sheet reads empty              | Service account not shared on the sheet (Part 2, step 5)    |
| PRIVATE_KEY errors             | Paste the key with literal `\n` in Vercel — it handles them |
| PWA not installing             | Open in Chrome/Edge on Android; Safari on iOS               |
