/**
 * useSheets — React hook for the Python /api/sync endpoint.
 * 1 fetch loads all tabs, stale-while-revalidate, short in-memory cache,
 * with write-through cache patching so a save in one screen is instantly
 * visible on every other screen (no more "reverts to old data" glitch),
 * background polling + refresh-on-focus so changes made by other
 * telecallers/devices show up without a manual reload, AND durable saves:
 * every write is mirrored to localStorage until the server confirms it,
 * and retried automatically (with backoff) on failure or reload — so a
 * flaky connection can no longer silently lose an entry a telecaller
 * just typed in.
 */

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_KEY  = import.meta.env.VITE_API_KEY  ?? "";
const SYNC_ENABLED = API_KEY !== "" && API_KEY !== "YOUR-API-KEY";

// in-memory cache shared across hook instances
const _mem = {};
const MEM_TTL = 20_000;       // how long a cached tab is considered "fresh" on mount
const POLL_INTERVAL = 15_000; // background refresh cadence while a screen is open
const QUIET_WINDOW = 4_000;   // don't let a background poll clobber a very-recent local edit

// listeners notified whenever a tab's cached data changes (from a push,
// a poll, or another hook instance) so every open screen stays in sync
const _listeners = {}; // tab -> Set<fn>
function notify(tab, data) {
  (_listeners[tab] || new Set()).forEach((fn) => fn(data));
}
function subscribe(tab, fn) {
  if (!_listeners[tab]) _listeners[tab] = new Set();
  _listeners[tab].add(fn);
  return () => _listeners[tab].delete(fn);
}

function memGet(key, { ignoreTTL = false } = {}) {
  const e = _mem[key];
  if (!e) return null;
  if (!ignoreTTL && Date.now() - e.ts >= MEM_TTL) return null;
  return e.data;
}
// Write-through: updates the tab's own cache entry AND patches it into the
// combined "ALL" snapshot, so a stale ALL fetch can never overwrite a fresher
// local write. This is the fix for updates "not showing up" after a save.
function memSet(key, data, { touchAll = true } = {}) {
  _mem[key] = { data, ts: Date.now() };
  if (touchAll && key !== "ALL" && _mem["ALL"]) {
    _mem["ALL"] = { data: { ..._mem["ALL"].data, [key]: data }, ts: _mem["ALL"].ts };
  }
  notify(key, data);
}

// ── Durable pending-write persistence (survives reloads / crashes) ────────
function pendingKey(tab) { return `bos_pending_${tab}`; }
function loadPending(tab) {
  try {
    const raw = localStorage.getItem(pendingKey(tab));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.data) ? parsed : null;
  } catch { return null; }
}
function savePending(tab, data) {
  try { localStorage.setItem(pendingKey(tab), JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function clearPending(tab) {
  try { localStorage.removeItem(pendingKey(tab)); } catch {}
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    ...(API_KEY ? { "X-Api-Key": API_KEY } : {}),
  };
}

let _allFetchPromise = null;

async function fetchAll({ force = false } = {}) {
  if (!force) {
    const cached = memGet("ALL");
    if (cached) return cached;
  }
  if (_allFetchPromise) return _allFetchPromise;

  _allFetchPromise = fetch(`${API_BASE}/api/sync?tab=all`, { headers: getHeaders() })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      // Merge onto whatever's already cached rather than blindly replacing —
      // protects any tab that has an in-flight/very-recent local write.
      const merged = { ...(_mem["ALL"]?.data || {}), ...data };
      _mem["ALL"] = { data: merged, ts: Date.now() };
      Object.entries(data).forEach(([k, v]) => {
        const existing = _mem[k];
        const recentLocalWrite = existing && Date.now() - existing.ts < QUIET_WINDOW;
        const hasPending = !!loadPending(k); // an unsynced write is waiting — never clobber it
        if (!recentLocalWrite && !hasPending) {
          _mem[k] = { data: v, ts: Date.now() };
          notify(k, v);
        }
      });
      return merged;
    })
    .finally(() => { _allFetchPromise = null; });

  return _allFetchPromise;
}

async function pushTab(tab, data) {
  const url = API_BASE + "/api/sync?tab=" + tab;
  const r = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ [tab]: data }),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
}

// Push with automatic retry + backoff. Always sends whatever is currently
// the latest pending payload for the tab, so a rapid string of edits during
// a retry backoff still ends up sending the newest data, not a stale one.
const _retryTimers = {};
const _retryAttempt = {};
function schedulePush(tab, data, setStatus) {
  savePending(tab, data);
  setStatus("syncing");
  clearTimeout(_retryTimers[tab]);
  _retryAttempt[tab] = 0;

  const attemptPush = () => {
    const toSend = loadPending(tab)?.data ?? data;
    pushTab(tab, toSend)
      .then(() => {
        // Only clear if nothing newer has been queued while this was in flight.
        const stillPending = loadPending(tab);
        if (stillPending && JSON.stringify(stillPending.data) === JSON.stringify(toSend)) {
          clearPending(tab);
        }
        setStatus("synced");
      })
      .catch(() => {
        setStatus("error");
        _retryAttempt[tab] = (_retryAttempt[tab] || 0) + 1;
        const delay = Math.min(2000 * 2 ** _retryAttempt[tab], 30_000);
        _retryTimers[tab] = setTimeout(attemptPush, delay);
      });
  };
  _retryTimers[tab] = setTimeout(attemptPush, 400);
}

export function useSheets(tab, initialData) {
  const pendingAtInit = loadPending(tab);
  const [data, setDataRaw] = useState(() => {
    if (pendingAtInit) return pendingAtInit.data;
    const cached = memGet(tab, { ignoreTTL: true });
    return Array.isArray(cached) ? cached : initialData;
  });
  const [status, setStatus] = useState(SYNC_ENABLED ? "loading" : "offline");

  const skipPush    = useRef(true);
  const latestData  = useRef(data);
  const lastLocalWriteTs = useRef(pendingAtInit ? Date.now() : 0);
  latestData.current = data;

  // Any other hook instance (another open screen) writing this tab should
  // be reflected here immediately too.
  useEffect(() => {
    return subscribe(tab, (fresh) => {
      if (Array.isArray(fresh)) {
        skipPush.current = true;
        setDataRaw(fresh);
      }
    });
  }, [tab]);

  useEffect(() => {
    if (!SYNC_ENABLED) return;

    // Recover any write that never made it to the server (crash, closed
    // tab, dead network) and retry it right away — this is what stops a
    // freshly-entered record from vanishing after a reload.
    const pending = loadPending(tab);
    if (pending) {
      memSet(tab, pending.data);
      schedulePush(tab, pending.data, setStatus);
    }

    const stale = memGet(tab, { ignoreTTL: true });
    if (Array.isArray(stale)) {
      skipPush.current = true;
      setDataRaw(stale);
      if (!pending) setStatus("synced");
    }
    fetchAll()
      .then((all) => {
        if (loadPending(tab)) return; // don't let a fetch overwrite an unsynced write
        const fresh = all[tab];
        if (Array.isArray(fresh)) {
          skipPush.current = true;
          setDataRaw(fresh);
        }
        setStatus("synced");
      })
      .catch(() => setStatus("error"));

    // Background poll: pick up edits made by other telecallers/devices
    // without needing a manual reload. Skipped while this tab has a very
    // recent local write in flight, so it can't clobber your own edit.
    const poll = setInterval(() => {
      if (Date.now() - lastLocalWriteTs.current < QUIET_WINDOW) return;
      fetchAll({ force: true }).catch(() => {});
    }, POLL_INTERVAL);

    // Instant refresh the moment the tab/app regains focus — covers the
    // common case of switching screens or coming back from the background.
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastLocalWriteTs.current < QUIET_WINDOW) return;
      fetchAll({ force: true }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [tab]);

  useEffect(() => {
    if (!SYNC_ENABLED) return;
    if (skipPush.current) { skipPush.current = false; return; }
    schedulePush(tab, latestData.current, setStatus);
  }, [data, tab]);

  const setData = (action) => {
    setDataRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      lastLocalWriteTs.current = Date.now();
      memSet(tab, next);
      savePending(tab, next); // persist immediately, before the push debounce even fires
      return next;
    });
  };

  return [data, setData, status];
}

export { SYNC_ENABLED };
