/**
 * useSheets — React hook for the Python /api/sync endpoint.
 * 1 fetch loads all tabs, stale-while-revalidate, short in-memory cache,
 * with write-through cache patching so a save in one screen is instantly
 * visible on every other screen (no more "reverts to old data" glitch),
 * plus background polling + refresh-on-focus so changes made by other
 * telecallers/devices show up without a manual reload.
 */

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_KEY  = import.meta.env.VITE_API_KEY  ?? "";
const SYNC_ENABLED = API_KEY !== "" && API_KEY !== "YOUR-API-KEY";

// in-memory cache shared across hook instances
const _mem = {};
const MEM_TTL = 20_000;      // how long a cached tab is considered "fresh" on mount
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
        if (!recentLocalWrite) {
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

export function useSheets(tab, initialData) {
  const [data, setDataRaw] = useState(() => {
    const cached = memGet(tab, { ignoreTTL: true });
    return Array.isArray(cached) ? cached : initialData;
  });
  const [status, setStatus] = useState(SYNC_ENABLED ? "loading" : "offline");

  const skipPush    = useRef(true);
  const pushTimer   = useRef(null);
  const latestData  = useRef(data);
  const lastLocalWriteTs = useRef(0);
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
    const stale = memGet(tab, { ignoreTTL: true });
    if (Array.isArray(stale)) {
      skipPush.current = true;
      setDataRaw(stale);
      setStatus("synced");
    }
    fetchAll()
      .then((all) => {
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
    setStatus("syncing");
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTab(tab, latestData.current)
        .then(() => setStatus("synced"))
        .catch(() => setStatus("error"));
    }, 400);
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [data, tab]);

  const setData = (action) => {
    setDataRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      lastLocalWriteTs.current = Date.now();
      memSet(tab, next);
      return next;
    });
  };

  return [data, setData, status];
}

export { SYNC_ENABLED };
