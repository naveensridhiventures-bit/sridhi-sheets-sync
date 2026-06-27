/**
 * useSheets — React hook for the Python /api/sheets endpoint.
 * Always tries to sync — no API key required.
 * 1 fetch loads all tabs, stale-while-revalidate, 60s in-memory cache.
 */

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
// Always enabled — no API key check needed since backend auth is disabled
const SYNC_ENABLED = true;

// in-memory cache shared across hook instances
const _mem = {};
const MEM_TTL = 60_000;

function memGet(key) {
  const e = _mem[key];
  return e && Date.now() - e.ts < MEM_TTL ? e.data : null;
}
function memSet(key, data) {
  _mem[key] = { data, ts: Date.now() };
}

function getHeaders() {
  return { "Content-Type": "application/json" };
}

let _allFetchPromise = null;

async function fetchAll() {
  const cached = memGet("ALL");
  if (cached) return cached;
  if (_allFetchPromise) return _allFetchPromise;

  _allFetchPromise = fetch(`${API_BASE}/api/sheets?tab=all`, { headers: getHeaders() })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      memSet("ALL", data);
      Object.entries(data).forEach(([k, v]) => memSet(k, v));
      return data;
    })
    .finally(() => { _allFetchPromise = null; });

  return _allFetchPromise;
}

async function pushTab(tab, data) {
  const r = await fetch(`${API_BASE}/api/sheets?tab=${tab}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ [tab]: data }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  delete _mem["ALL"];
}

export function useSheets(tab, initialData) {
  const [data, setDataRaw] = useState(() => {
    const cached = memGet(tab);
    return Array.isArray(cached) && cached.length > 0 ? cached : initialData;
  });
  const [status, setStatus] = useState("loading");

  const skipPush  = useRef(true);
  const pushTimer = useRef(null);
  const latestData = useRef(data);
  latestData.current = data;

  useEffect(() => {
    const stale = memGet(tab);
    if (Array.isArray(stale) && stale.length > 0) {
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
  }, [tab]);

  useEffect(() => {
    if (skipPush.current) { skipPush.current = false; return; }
    setStatus("syncing");
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTab(tab, latestData.current)
        .then(() => setStatus("synced"))
        .catch(() => setStatus("error"));
    }, 800);
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [data, tab]);

  const setData = (action) => {
    setDataRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      memSet(tab, next);
      return next;
    });
  };

  return [data, setData, status];
}

export { SYNC_ENABLED };
