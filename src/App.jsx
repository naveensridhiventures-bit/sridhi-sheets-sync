import { useState, useEffect, useRef } from "react";
import { useSheets, SYNC_ENABLED } from "./useSheets.js";

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────
const T = {
  bg:       "#060B16",
  surface:  "#0C1526",
  card:     "#0F1C33",
  cardHigh: "#132038",
  glass:    "rgba(15,28,51,0.85)",

  border:   "#1A2D4A",
  borderHi: "#243D64",

  accent:    "#00C9A7",
  accentSub: "rgba(0,201,167,0.12)",
  accentGlow:"rgba(0,201,167,0.25)",

  emerald:  "#10B981",
  amber:    "#F59E0B",
  rose:     "#F43F5E",
  indigo:   "#818CF8",
  sky:      "#38BDF8",
  orange:   "#FB923C",

  t1: "#F0F6FF",
  t2: "#7B9DC4",
  t3: "#3A5578",
  t4: "#1E3A5F",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// ─── SHEETS SYNC CONFIG ───────────────────────────────────────────────────
// Set VITE_API_KEY in your .env.local (and Vercel dashboard).
// Sync auto-enables once VITE_API_KEY is set. (See SETUP.md)

// ─── SEED DATA ────────────────────────────────────────────────────────────
const INITIAL_LEADS = [];

const PIPELINE_STAGES = [
  { id:"New Lead",               color:T.t3,      count:0 },
  { id:"Contacted",              color:T.sky,     count:0 },
  { id:"Interested",             color:T.indigo,  count:0 },
  { id:"Callback Requested",     color:T.amber,   count:0  },
  { id:"Sample Requested",       color:T.orange,  count:0 },
  { id:"Assigned to Field Sales",color:"#FC8181", count:0  },
  { id:"Sample Delivered",       color:T.emerald, count:0  },
  { id:"Feedback Pending",       color:T.sky,     count:0  },
  { id:"Positive Feedback",      color:T.emerald, count:0 },
  { id:"Negotiation",            color:T.amber,   count:0  },
  { id:"Order Received",         color:T.accent,  count:0 },
  { id:"Repeat Order Follow-up", color:T.indigo,  count:0 },
  { id:"Active Customer",        color:T.emerald, count:0 },
  { id:"Lost Customer",          color:T.rose,    count:0 },
  { id:"Invalid Number",         color:T.t3,      count:0  },
];

const INITIAL_SAMPLES = [
];


const INITIAL_EXPENSES = [
];


const REPEAT_CUSTOMERS = [
];


const FIELD_TASKS = [
];


const TEAM_DATA = [];

const MARKETING_SOURCES = [];

const META_CAMPAIGNS = [];

// ─── UTILITIES ────────────────────────────────────────────────────────────
function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

// useSheetSynced — thin alias over useSheets (from useSheets.js)
// Keeps backward-compatible call signature: useSheetSynced(endpoint, _key, initialData)
function useSheetSynced(_endpoint, _key, initialData) {
  // The new useSheets hook uses the tab name (same as _endpoint) and batches all tabs.
  return useSheets(_endpoint, initialData);
}

function SyncBadge({ status }) {
  if (!SYNC_ENABLED) return <Chip label="Offline copy" color={T.t3} />;
  const map = {
    loading: { label: "Loading…",   color: T.t2     },
    syncing: { label: "Syncing…",   color: T.amber  },
    synced:  { label: "Synced",     color: T.emerald},
    error:   { label: "Sync failed",color: T.rose   },
    offline: { label: "Offline copy",color: T.t3    },
  };
  const s = map[status] || map.offline;
  return <Chip label={s.label} color={s.color} />;
}

function getStageColor(stage) {
  const s = PIPELINE_STAGES.find(p => p.id === stage);
  return s ? s.color : T.t3;
}
function getPriorityColor(p) {
  return p === "High" ? T.rose : p === "Medium" ? T.amber : T.t2;
}

// ─── DESIGN PRIMITIVES ────────────────────────────────────────────────────
function Card({ children, style = {}, accent, noPad }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${accent ? accent + "30" : T.border}`,
      borderRadius: 20,
      padding: noPad ? 0 : "18px 18px",
      boxShadow: accent ? `0 0 32px ${accent}10` : "0 1px 3px rgba(0,0,0,0.4)",
      overflow: "hidden",
      ...style,
    }}>{children}</div>
  );
}

function Chip({ label, color, small }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      fontSize: small ? 9 : 10, fontWeight:700, letterSpacing:"0.04em",
      textTransform:"uppercase",
      padding: small ? "2px 7px" : "3px 9px", borderRadius:6,
      background: color + "1A", color, border:`1px solid ${color}30`,
      whiteSpace:"nowrap",
    }}>{label}</span>
  );
}

function Label({ children, sub, size = 13 }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize: size, fontWeight:700, color:T.t1, letterSpacing:"-0.01em" }}>{children}</div>
      {sub && <div style={{ fontSize:11, color:T.t3, marginTop:3, fontWeight:500 }}>{sub}</div>}
    </div>
  );
}

function Rule() {
  return <div style={{ height:1, background:T.border, margin:"0 -18px" }} />;
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────
function KPI({ label, value, unit, change, color, icon }) {
  const numVal = typeof value === "number" ? value : 0;
  const animated = useAnimatedCounter(numVal);
  const display = typeof value === "number" ? animated.toLocaleString("en-IN") : value;
  const pos = change === undefined || change >= 0;
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${color}22`,
      borderRadius:16, padding:"14px 14px 12px",
      flex:"1 1 130px", minWidth:120,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, ${color}88, transparent)`,
      }} />
      <div style={{ fontSize:18, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1, letterSpacing:"-0.02em" }}>
        {display}
        {unit && <span style={{ fontSize:11, fontWeight:600, color:T.t3, marginLeft:3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize:11, color:T.t2, marginTop:4, fontWeight:500 }}>{label}</div>
      {change !== undefined && (
        <div style={{
          position:"absolute", top:14, right:12,
          fontSize:10, fontWeight:700,
          color: pos ? T.emerald : T.rose,
          background: pos ? T.emerald+"18" : T.rose+"18",
          padding:"2px 6px", borderRadius:5,
        }}>{pos ? "↑" : "↓"} {Math.abs(change)}%</div>
      )}
    </div>
  );
}

// ─── BAR CHART ────────────────────────────────────────────────────────────
function BarChart({ data, color, height = 64 }) {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height: height + 20 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max((d.val / max) * height, 3);
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <div style={{
              width:"100%", borderRadius:"4px 4px 0 0",
              height:`${h}px`,
              background: isLast ? color : T.cardHigh,
              border: isLast ? `none` : `1px solid ${T.borderHi}`,
              borderBottom:"none",
              boxShadow: isLast ? `0 -4px 16px ${color}40` : "none",
              transition:"height 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
            <span style={{ fontSize:9, color: isLast ? T.t2 : T.t3, fontWeight:600 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── DONUT ────────────────────────────────────────────────────────────────
function Donut({ segments, size=110, centerLabel, centerSub }) {
  const total = segments.reduce((a,b) => a+b.value, 0);
  const r=40, cx=50, cy=50, circ=2*Math.PI*r;
  let cum=0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth="11" />
      {segments.map((seg,i) => {
        const pct=seg.value/total, dash=pct*circ, offset=circ-cum*circ;
        cum+=pct;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={seg.color} strokeWidth="11"
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%" }} />;
      })}
      {centerLabel && <>
        <text x="50" y="46" textAnchor="middle" fill={T.t1} fontSize="13" fontWeight="800" fontFamily={FONT}>{centerLabel}</text>
        <text x="50" y="58" textAnchor="middle" fill={T.t3} fontSize="8" fontFamily={FONT}>{centerSub}</text>
      </>}
    </svg>
  );
}

// ─── PIPELINE STRIP ───────────────────────────────────────────────────────
function PipelineStrip({ stages }) {
  const total = stages.reduce((a,b) => a+b.count, 0);
  return (
    <div>
      <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:8, marginBottom:12 }}>
        {stages.map((s,i) => (
          <div key={i} title={`${s.id}: ${s.count}`}
            style={{ width:`${(s.count/total)*100}%`, background:s.color, transition:"width 0.4s" }} />
        ))}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px" }}>
        {stages.map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:2, background:s.color }} />
            <span style={{ fontSize:10, color:T.t2, fontWeight:500 }}>{s.id}</span>
            <span style={{ fontSize:10, fontWeight:700, color:s.color }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BOTTOM SHEET ─────────────────────────────────────────────────────────
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:200, display:"flex", alignItems:"flex-end", backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:T.surface, borderRadius:"24px 24px 0 0",
        padding:"24px 20px 36px",
        width:"100%", maxHeight:"88vh", overflowY:"auto",
        borderTop:`1px solid ${T.border}`,
        borderLeft:`1px solid ${T.border}`,
        borderRight:`1px solid ${T.border}`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1, letterSpacing:"-0.02em" }}>{title}</div>
          <button onClick={onClose} style={{
            background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
            color:T.t2, width:32, height:32, cursor:"pointer", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FORM PRIMITIVES ──────────────────────────────────────────────────────
const inputStyle = {
  width:"100%", background:T.surface, border:`1px solid ${T.border}`,
  borderRadius:12, padding:"11px 14px", color:T.t1, fontSize:13,
  outline:"none", boxSizing:"border-box", fontFamily:FONT,
  transition:"border-color 0.2s",
};

function Field({ label, value, onChange, type="text", placeholder }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontSize:11, color:T.t2, marginBottom:6, fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase" }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...inputStyle, borderColor: focus ? T.accent+"66" : T.border }} />
    </div>
  );
}

function Dropdown({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontSize:11, color:T.t2, marginBottom:6, fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase" }}>{label}</div>}
      <select value={value} onChange={onChange}
        style={{ ...inputStyle, appearance:"none", cursor:"pointer" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ label, color=T.accent, onClick, full, ghost, small }) {
  return (
    <button onClick={onClick} style={{
      background: ghost ? "transparent" : color,
      color: ghost ? color : "#060B16",
      border: `1px solid ${ghost ? color+"55" : color}`,
      borderRadius:12, padding: small ? "8px 14px" : "12px 20px",
      fontWeight:700, fontSize: small ? 12 : 13, cursor:"pointer",
      width: full ? "100%" : "auto", fontFamily:FONT,
      letterSpacing:"-0.01em",
      transition:"opacity 0.15s",
    }}>{label}</button>
  );
}

function Stars({ value, onChange, max=5 }) {
  return (
    <div style={{ display:"flex", gap:4 }}>
      {Array.from({ length:max }, (_,i) => (
        <button key={i} onClick={() => onChange?.(i+1)}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, padding:2,
            color: i < value ? T.amber : T.border, lineHeight:1 }}>★</button>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
// ─── PROSPECT FINDER ─────────────────────────────────────────────────────────
function ProspectFinder() {
  const [leads, setLeads] = useSheetSynced("leads","leads",[]);
  const [area, setArea] = useState("T Nagar, Chennai");
  const [type, setType] = useState("restaurant");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState({});
  const [filling, setFilling] = useState(null); // prospect being filled
  const [form, setForm] = useState({ name:"", business:"", type2:"Restaurant", area2:"", address:"", telecaller:"Thulasi", notes:"" });

  const AREAS = [
    // Chennai
    "T Nagar, Chennai","Anna Nagar, Chennai","Adyar, Chennai","Velachery, Chennai",
    "Porur, Chennai","Tambaram, Chennai","Mylapore, Chennai","Nungambakkam, Chennai",
    "Guindy, Chennai","Vadapalani, Chennai","Chromepet, Chennai","Perambur, Chennai",
    "Kolathur, Chennai","Villivakkam, Chennai","Ambattur, Chennai","Avadi, Chennai",
    "Sholinganallur, Chennai","OMR, Chennai","ECR, Chennai","Perungudi, Chennai",
    "Royapuram, Chennai","Tondiarpet, Chennai","Egmore, Chennai","Kilpauk, Chennai",
    "Chetpet, Chennai","Pattabiram, Chennai","Thiruvottiyur, Chennai",
    "Madipakkam, Chennai","Pallikaranai, Chennai","Keelkattalai, Chennai",
    "Nanganallur, Chennai","Alandur, Chennai","St Thomas Mount, Chennai",
    // Bengaluru
    "Koramangala, Bengaluru","BTM Layout, Bengaluru","Indiranagar, Bengaluru",
    "HSR Layout, Bengaluru","Whitefield, Bengaluru","JP Nagar, Bengaluru",
    "Jayanagar, Bengaluru","Marathahalli, Bengaluru","Rajajinagar, Bengaluru",
  ];

  const TYPES = [
    { val:"restaurant", label:"🍽️ Restaurants" },
    { val:"meal_provider", label:"🍱 Mess / Tiffin" },
    { val:"catering", label:"🎪 Catering" },
    { val:"hotel", label:"🏨 Hotels" },
    { val:"bakery", label:"🥐 Bakeries" },
    { val:"food", label:"🥘 All Food" },
  ];

  async function search() {
    setLoading(true); setError(""); setResults([]);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "";
      const res = await fetch(API_BASE + "/api/prospects?area=" + encodeURIComponent(area) + "&type=" + type);
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setResults(data.results || []);
      if ((data.results||[]).length === 0) setError("No results found. Try a different area or type.");
    } catch(e) {
      setError("Search failed: " + e.message);
    }
    setLoading(false);
  }

  function startFill(r) {
    setFilling(r);
    setForm({
      name: r.name,
      business: r.name,
      type2: r.type === "hotel" ? "Hotel" : r.type === "bakery" ? "Bakery" : "Restaurant",
      area2: area.split(",")[0],
      address: r.address,
      telecaller: "Thulasi",
      notes: "",
    });
  }

  function confirmAdd() {
    if (!filling || !form.name) return;
    const newLead = {
      id: Date.now() + Math.random(),
      name: form.name,
      contact: filling.phone || "",
      business: form.business,
      type: form.type2,
      area: form.area2,
      address: form.address,
      stage: "New Lead",
      source: "Prospect Finder",
      telecaller: form.telecaller,
      lastContact: "Not contacted",
      priority: "Medium",
      remarks: form.notes ? ["[Prospect Finder] " + form.notes] : [],
    };
    setLeads([newLead, ...leads]);
    setAdded({ ...added, [filling.name]: true });
    setFilling(null);
  }

  // ── Fill details view ──
  if (filling) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setFilling(null)}
            style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, color:T.t2, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:FONT }}>← Back</button>
          <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>Add to Pipeline</div>
        </div>

        <div style={{ background:T.card, border:`1px solid ${T.accentGlow}`, borderRadius:14, padding:14 }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.t1 }}>{filling.name}</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:3 }}>📍 {filling.address}</div>
          {filling.phone && <div style={{ fontSize:12, color:T.accent, marginTop:3 }}>📞 {filling.phone}</div>}
        </div>

        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["Customer Name *", "name", "text", "e.g. Anand Tiffin Center"],
            ["Business Name", "business", "text", "e.g. Anand Foods Pvt Ltd"],
            ["Area", "area2", "text", "e.g. T Nagar"],
            ["Address", "address", "text", "Full address"],
          ].map(([label, key, inputType, placeholder]) => (
            <div key={key}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>{label.toUpperCase()}</div>
              <input type={inputType} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                placeholder={placeholder}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                  padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>BUSINESS TYPE</div>
            <select value={form.type2} onChange={e => setForm({...form, type2:e.target.value})}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
              {["Restaurant","Mess","Hotel","Bakery","Cloud Kitchen","Catering","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>ASSIGN TELECALLER</div>
            <select value={form.telecaller} onChange={e => setForm({...form, telecaller:e.target.value})}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
              {["Thulasi","Ramya"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>FIRST NOTES (optional)</div>
            <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}
              placeholder="e.g. Found via prospect search, needs 20 KG/week..."
              rows={3}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box", resize:"none" }} />
          </div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          {filling.phone && (
            <button onClick={() => { const p=filling.phone.replace(/[^0-9]/g,""); if(p) window.location.href="tel:+"+p; }}
              style={{ flex:1, background:T.emerald+"22", border:`1px solid ${T.emerald}44`, borderRadius:12,
                color:T.emerald, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
              📞 Call First
            </button>
          )}
          <button onClick={confirmAdd} disabled={!form.name}
            style={{ flex:2, background: form.name ? T.accent : T.border, border:"none", borderRadius:12,
              color: form.name ? "#060B16" : T.t3, padding:"12px", fontSize:14, fontWeight:800,
              cursor: form.name ? "pointer" : "default", fontFamily:FONT }}>
            ✓ Add to CRM Pipeline
          </button>
        </div>
      </div>
    );
  }

  // ── Search & results view ──
  const existingNames = new Set(leads.map(l => l.name.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>Prospect Finder</div>
        <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>Find hotels, restaurants & caterers — add to CRM instantly</div>
      </div>

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>AREA / LOCATION</div>
          <select value={area} onChange={e => setArea(e.target.value)}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box", marginBottom:6 }}>
            {AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
          <input value={area} onChange={e => setArea(e.target.value)} placeholder="Or type any area..."
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
        </div>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>BUSINESS TYPE</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {TYPES.map(t => (
              <button key={t.val} onClick={() => setType(t.val)}
                style={{ background: type===t.val ? T.accentSub : T.surface,
                  border:`1px solid ${type===t.val ? T.accent : T.border}`,
                  borderRadius:20, color: type===t.val ? T.accent : T.t2,
                  padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={search} disabled={loading}
          style={{ background: loading ? T.border : T.accent, border:"none", borderRadius:12,
            color: loading ? T.t3 : "#060B16", padding:"13px", fontSize:14, fontWeight:800,
            cursor: loading ? "default" : "pointer", fontFamily:FONT }}>
          {loading ? "🔍 Searching..." : "🔍 Find Prospects"}
        </button>
      </div>

      {error && (
        <div style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:12, padding:12, fontSize:12, color:T.rose }}>{error}</div>
      )}

      {results.length > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600 }}>{results.length} PROSPECTS FOUND</div>
          <div style={{ fontSize:11, color:T.accent, fontWeight:700 }}>{Object.keys(added).length} ADDED TO CRM</div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {results.map((r, i) => {
          const isExisting = existingNames.has(r.name.toLowerCase());
          const isAdded = added[r.name] || isExisting;
          return (
            <div key={i} style={{ background:T.card, border:`1px solid ${isAdded ? T.border : T.accentGlow}`, borderRadius:14, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.t1 }}>{r.name}</div>
                  <div style={{ fontSize:11, color:T.t3, marginTop:3 }}>📍 {r.address}</div>
                  {r.phone
                    ? <div style={{ fontSize:12, color:T.accent, marginTop:3, fontWeight:600 }}>📞 {r.phone}</div>
                    : <div style={{ fontSize:11, color:T.t3, marginTop:3 }}>📞 No number — search manually</div>}
                  {r.website ? <div style={{ fontSize:10, color:T.sky, marginTop:2 }}>🌐 {r.website.replace("https://","").slice(0,30)}</div> : null}
                  <div style={{ fontSize:10, color:T.t3, marginTop:2, textTransform:"capitalize" }}>{r.type}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginLeft:8, flexShrink:0 }}>
                  {isAdded ? (
                    <div style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8, color:T.accent, padding:"5px 10px", fontSize:11, fontWeight:700 }}>
                      {isExisting ? "In CRM" : "✓ Added"}
                    </div>
                  ) : (
                    <button onClick={() => startFill(r)}
                      style={{ background:T.accent, border:"none", borderRadius:8, color:"#060B16", padding:"6px 12px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
                      + Add Lead
                    </button>
                  )}
                  {r.phone && (
                    <button onClick={() => { const p=r.phone.replace(/[^0-9]/g,""); if(p) window.location.href="tel:+"+p; }}
                      style={{ background:T.emerald+"22", border:`1px solid ${T.emerald}44`, borderRadius:8, color:T.emerald, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                      📞 Call
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {results.length === 0 && !loading && !error && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:24, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🗺️</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.t1, marginBottom:6 }}>Find New Customers</div>
          <div style={{ fontSize:12, color:T.t3, lineHeight:1.7 }}>Search hotels, restaurants, mess and catering in any Chennai or Bengaluru area. One tap to add to your CRM pipeline.</div>
        </div>
      )}
    </div>
  );
}


// ─── TODAY'S TASKS ────────────────────────────────────────────────────────────
function TodayTasks() {
  const [leads] = useSheetSynced("leads","leads",[]);
  const [samples] = useSheetSynced("samples","samples",[]);
  const [repeatCustomers] = useSheetSynced("repeatCustomers","repeatCustomers",[]);

  const todayStr = new Date().toISOString().slice(0,10);
  const todayDisplay = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  // Scheduled samples for today
  const samplesScheduledToday = samples.filter(s =>
    s.status === "Pending" && s.scheduledDate === todayStr
  );

  // Scheduled samples for future dates
  const upcomingSamples = samples.filter(s =>
    s.status === "Pending" && s.scheduledDate && s.scheduledDate > todayStr
  ).sort((a,b) => a.scheduledDate.localeCompare(b.scheduledDate));

  // Callback leads
  const callbackLeads = leads.filter(l => l.stage === "Callback Requested");

  // Sample requested leads
  const sampleRequestedLeads = leads.filter(l => l.stage === "Sample Requested");

  // Repeat orders due today
  const dueToday = repeatCustomers.filter(c => c.status === "Due Today");

  // Pending samples (no date set)
  const pendingNoDate = samples.filter(s => s.status === "Pending" && !s.scheduledDate);

  const totalTasks = samplesScheduledToday.length + callbackLeads.length + sampleRequestedLeads.length + dueToday.length;

  function Section({ icon, title, color, count, children }) {
    const [open, setOpen] = useState(true);
    if (count === 0) return null;
    return (
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
        <div onClick={() => setOpen(!open)}
          style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 14px", cursor:"pointer", borderBottom: open ? `1px solid ${T.border}` : "none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>{icon}</span>
            <span style={{ fontSize:13, fontWeight:800, color:T.t1 }}>{title}</span>
            <div style={{ background:color+"22", border:`1px solid ${color}44`, borderRadius:20,
              padding:"2px 8px", fontSize:11, fontWeight:800, color }}>{count}</div>
          </div>
          <span style={{ color:T.t3, fontSize:12 }}>{open ? "▲" : "▼"}</span>
        </div>
        {open && <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>{children}</div>}
      </div>
    );
  }

  function TaskCard({ lead, extra, callAction, whatsappAction }) {
    return (
      <div style={{ background:T.surface, borderRadius:12, padding:"10px 12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{lead.name || lead.customer}</div>
            {lead.area && <div style={{ fontSize:11, color:T.t3, marginTop:1 }}>📍 {lead.area}</div>}
            {lead.contact && <div style={{ fontSize:11, color:T.t2, marginTop:1 }}>📞 {lead.contact}</div>}
            {lead.telecaller && <div style={{ fontSize:11, color:T.accent, marginTop:1 }}>👤 {lead.telecaller}</div>}
            {extra && <div style={{ fontSize:11, color:T.amber, marginTop:3, fontWeight:600 }}>{extra}</div>}
          </div>
        </div>
        {(callAction || whatsappAction) && (
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            {callAction && (
              <button onClick={callAction}
                style={{ flex:1, background:T.emerald+"22", border:`1px solid ${T.emerald}44`, borderRadius:8,
                  color:T.emerald, padding:"6px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                📞 Call
              </button>
            )}
            {whatsappAction && (
              <button onClick={whatsappAction}
                style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:8,
                  color:"#25D366", padding:"6px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                💬 WhatsApp
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:`linear-gradient(135deg, ${T.card}, ${T.cardHigh})`,
        border:`1px solid ${T.borderHi}`, borderRadius:16, padding:16 }}>
        <div style={{ fontSize:11, color:T.accent, fontWeight:700, letterSpacing:"0.1em", marginBottom:4 }}>TODAY</div>
        <div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>{todayDisplay}</div>
        <div style={{ fontSize:13, color:T.t3, marginTop:4 }}>
          {totalTasks > 0
            ? <span style={{color:T.rose, fontWeight:700}}>{totalTasks} tasks pending</span>
            : <span style={{color:T.emerald, fontWeight:700}}>All clear! No pending tasks 🎉</span>}
        </div>
      </div>

      <Section icon="🧪" title="Sample Deliveries Today" color={T.amber} count={samplesScheduledToday.length}>
        {samplesScheduledToday.map((s,i) => (
          <TaskCard key={i} lead={{ name:s.customer, contact:"", area:"" }}
            extra={`${s.qty} KG ${s.type}${s.scheduledTime ? " · " + s.scheduledTime : ""} · Exec: ${s.exec}`} />
        ))}
      </Section>

      <Section icon="📅" title="Upcoming Samples" color={T.sky} count={upcomingSamples.length}>
        {upcomingSamples.map((s,i) => (
          <TaskCard key={i} lead={{ name:s.customer }}
            extra={`${s.qty} KG ${s.type} · ${new Date(s.scheduledDate).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}${s.scheduledTime ? " " + s.scheduledTime : ""}`} />
        ))}
      </Section>

      <Section icon="📞" title="Callback Requested" color={T.rose} count={callbackLeads.length}>
        {callbackLeads.map((l,i) => (
          <TaskCard key={i} lead={l}
            extra={l.remarks?.[l.remarks.length-1] || ""}
            callAction={() => { const p=(l.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
            whatsappAction={() => { const p=(l.contact||"").replace(/[^0-9]/g,""); window.open("https://wa.me/91"+p,"_blank"); }}
          />
        ))}
      </Section>

      <Section icon="🎁" title="Sample Requested" color={T.orange} count={sampleRequestedLeads.length}>
        {sampleRequestedLeads.map((l,i) => (
          <TaskCard key={i} lead={l}
            extra={l.remarks?.[l.remarks.length-1] || ""}
            callAction={() => { const p=(l.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
            whatsappAction={() => { const p=(l.contact||"").replace(/[^0-9]/g,""); window.open("https://wa.me/91"+p,"_blank"); }}
          />
        ))}
      </Section>

      <Section icon="🔁" title="Repeat Orders Due Today" color={T.accent} count={dueToday.length}>
        {dueToday.map((c,i) => (
          <TaskCard key={i} lead={{ name:c.name, contact:c.contact, area:c.area }}
            extra={`${c.qty} KG ${c.product} · ${c.frequency}`}
            callAction={() => { const p=(c.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
            whatsappAction={() => { const p=(c.contact||"").replace(/[^0-9]/g,""); window.open("https://wa.me/91"+p,"_blank"); }}
          />
        ))}
      </Section>

      {pendingNoDate.length > 0 && (
        <Section icon="⏳" title="Pending Samples (No Date Set)" color={T.t3} count={pendingNoDate.length}>
          {pendingNoDate.map((s,i) => (
            <TaskCard key={i} lead={{ name:s.customer }}
              extra={`${s.qty} KG ${s.type} · No schedule set`} />
          ))}
        </Section>
      )}

      {totalTasks === 0 && pendingNoDate.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:T.t3 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>All tasks done for today!</div>
          <div style={{ fontSize:12, marginTop:6 }}>Check back tomorrow for new tasks</div>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const salesData = [
    { label:"Jan", val:0 }, { label:"Feb", val:0 }, { label:"Mar", val:0 },
    { label:"Apr", val:0 }, { label:"May", val:0 }, { label:"Jun", val:0 },
  ];
  const expSegs = [
    { label:"Marketing", value:0, color:T.indigo },
    { label:"Delivery",  value:0,  color:T.amber  },
    { label:"Samples",   value:0, color:T.accent  },
    { label:"Staff",     value:0,  color:T.sky    },
  ];
  const totalExp = expSegs.reduce((a,b) => a+b.value, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* KPIs */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Sales this month" value={0}   unit="KG" change={0} color={T.accent}  icon="📦" />
        <KPI label="Revenue"          value={0}  unit="₹"  change={0} color={T.emerald} icon="💰" />
        <KPI label="Active customers" value={0}                change={0}  color={T.indigo}  icon="🏪" />
        <KPI label="Leads this month" value={0}               change={0} color={T.amber}   icon="📋" />
        <KPI label="Conversion"       value="0%"               change={0}  color={T.accent}  icon="🎯" />
        <KPI label="Samples sent"     value={0}    unit="KG"  change={0} color={T.orange}  icon="🧪" />
        <KPI label="Ad spend"         value={0}  unit="₹"  change={0}   color={T.rose}    icon="📢" />
        <KPI label="Est. profit"      value={0}  unit="₹"  change={0} color={T.emerald} icon="📈" />
      </div>

      {/* Sales chart */}
      <Card accent={T.accent}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <Label sub="Monthly KG dispatched">Sales Trend</Label>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:20, fontWeight:800, color:T.accent, letterSpacing:"-0.02em" }}>0 KG</div>
            <div style={{ fontSize:10, color:T.emerald, fontWeight:600 }}>↑ 0% vs May</div>
          </div>
        </div>
        <BarChart data={salesData} color={T.accent} height={72} />
      </Card>

      {/* Pipeline */}
      <Card>
        <Label sub={`${PIPELINE_STAGES.reduce((a,b) => a+b.count, 0)} total leads`}>Telecalling Pipeline</Label>
        <PipelineStrip stages={PIPELINE_STAGES} />
      </Card>

      {/* Repeat order alerts */}
      <Card accent={T.amber}>
        <Label sub="Customers due for re-order today">Re-order Alerts</Label>
        {REPEAT_CUSTOMERS.filter(c => c.status==="Due Today").map(c => (
          <div key={c.id} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"11px 0", borderBottom:`1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{c.name}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{c.qty} KG {c.product} · {c.frequency}</div>
            </div>
            <Chip label="Call Now" color={T.amber} />
          </div>
        ))}
      </Card>

      {/* Expense breakdown */}
      <Card>
        <Label sub="June 2025">Expense Breakdown</Label>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <Donut segments={expSegs} size={110} centerLabel={"₹"+(totalExp/1000).toFixed(0)+"K"} centerSub="Total" />
          <div style={{ flex:1 }}>
            {expSegs.map((s,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:s.color }} />
                  <span style={{ fontSize:12, color:T.t2, fontWeight:500 }}>{s.label}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:s.color }}>₹{s.value.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        <Label>Team Leaderboard</Label>
        {[...TEAM_DATA].sort((a,b) => b.score-a.score).map((m,i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"11px 0", borderBottom: i < TEAM_DATA.length-1 ? `1px solid ${T.border}` : "none",
          }}>
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800,
              background: i===0 ? "#F59E0B18" : i===1 ? "#94A3B818" : i===2 ? "#CD7F3218" : T.cardHigh,
              color: i===0 ? "#F59E0B" : i===1 ? "#94A3B8" : i===2 ? "#CD7F32" : T.t3,
              border:`1px solid ${i===0 ? "#F59E0B30" : i===1 ? "#94A3B830" : i===2 ? "#CD7F3230" : T.border}`,
            }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{m.name}</div>
              <div style={{ fontSize:10, color:T.t3, fontWeight:500 }}>{m.role}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:52, height:4, borderRadius:3, background:T.border, overflow:"hidden" }}>
                <div style={{ width:`${m.score}%`, height:"100%", background:m.color, borderRadius:3 }} />
              </div>
              <span style={{ fontSize:15, fontWeight:800, color:m.color, minWidth:26, textAlign:"right" }}>{m.score}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── LEADS CRM ────────────────────────────────────────────────────────────

// ── GroupMsgDialog — proper component so hooks work correctly ─────────────────
function GroupMsgDialog({ groupMsg, buildGroupMsg, onClose }) {
  const { lead, targetStage, method, kgQty } = groupMsg;
  const defaultMsg = buildGroupMsg(lead, targetStage, method, "");
  const [editedMsg, setEditedMsg] = useState(defaultMsg);

  function copyAndClose() {
    const copy = () => {
      try {
        navigator.clipboard.writeText(editedMsg).then(() => {
          alert("✅ Message copied! Open WhatsApp → Batter sales and sample group → Paste → Send");
          onClose();
        });
      } catch {
        const ta = document.createElement("textarea");
        ta.value = editedMsg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("✅ Message copied! Open WhatsApp → Batter sales and sample group → Paste → Send");
        onClose();
      }
    };
    copy();
  }

  return (
    <div style={{ padding:"0 0 80px" }}>
      <div style={{ background:T.card, border:`1px solid ${T.accentGlow}`, borderRadius:18, padding:20, margin:"16px 0" }}>
        <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>
          {targetStage === "Sample Requested" ? "🧪 Share Sample Update" : "🎉 Share Order Update"}
        </div>
        <div style={{ fontSize:12, color:T.t3, marginBottom:16 }}>Send to Batter sales and sample group</div>
        <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>MESSAGE (tap to edit)</div>
        <textarea value={editedMsg} onChange={e => setEditedMsg(e.target.value)} rows={10}
          style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
            color:T.t1, padding:"12px", fontSize:13, fontFamily:FONT,
            outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical", lineHeight:1.7 }} />
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={onClose}
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
              color:T.t2, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
            Skip
          </button>
          <button onClick={copyAndClose}
            style={{ flex:2, background:"#25D366", border:"none", borderRadius:12,
              color:"white", padding:"11px", fontSize:13, fontWeight:800,
              cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            📋 Copy & Send to Group
          </button>
        </div>
        <div style={{ fontSize:11, color:T.amber, textAlign:"center", marginTop:8, fontWeight:600 }}>
          Copy → WhatsApp → Batter sales and sample group → Paste → Send
        </div>
      </div>
    </div>
  );
}

// ── WATemplatePicker — shown when WhatsApp tapped on a lead ──────────────────
function WATemplatePicker({ lead, onClose }) {
  const templates = (() => {
    try { const s = localStorage.getItem("wa_templates"); return s ? JSON.parse(s) : DEFAULT_TEMPLATES; } catch { return DEFAULT_TEMPLATES; }
  })();
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (selected) setMsg(fillTemplate(selected.message, lead));
  }, [selected]);

  function send() {
    const phone = (lead.contact||"").replace(/[^0-9]/g,"");
    const number = phone.startsWith("91") ? phone : "91"+phone;
    window.open("https://wa.me/"+number+"?text="+encodeURIComponent(msg), "_blank");
    onClose();
  }

  return (
    <Sheet open={true} onClose={onClose} title={"WhatsApp: " + lead.name}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, color:T.t3, fontWeight:600 }}>SELECT TEMPLATE</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => setSelected(t)}
              style={{ background: selected?.id===t.id ? T.accentSub : T.surface,
                border:`1px solid ${selected?.id===t.id ? T.accent : T.border}`,
                borderRadius:12, padding:"10px 14px", cursor:"pointer" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{t.name}</div>
              <div style={{ fontSize:11, color:T.accent, marginTop:2 }}>{t.stage}</div>
            </div>
          ))}
        </div>
        {selected && (
          <>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginTop:4 }}>EDIT MESSAGE</div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
                color:T.t1, padding:"10px 12px", fontSize:13, fontFamily:FONT,
                outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical" }} />
            <button onClick={send}
              style={{ background:"#25D366", border:"none", borderRadius:14, color:"white",
                padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:FONT,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📲 Send on WhatsApp
            </button>
          </>
        )}
        <button onClick={() => { window.open("https://wa.me/"+(lead.contact||"").replace(/[^0-9]/g,"").replace(/^(?!91)/,"91"), "_blank"); onClose(); }}
          style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
            color:T.t2, padding:"10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
          Open WhatsApp without template
        </button>
      </div>
    </Sheet>
  );
}

// ─── HR LEADS IMPORT ─────────────────────────────────────────────────────────
function HRLeads() {
  const [hrLeads] = useSheetSynced("hrLeads","hrLeads",[]);
  const [leads, setLeads] = useSheetSynced("leads","leads",[]);
  const [imported, setImported] = useState(() => {
    try { const s = localStorage.getItem("hr_imported"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [editingLead, setEditingLead] = useState(null); // contact number being filled in
  const [form, setForm] = useState({ name:"", business:"", type:"Restaurant", area:"", address:"", telecaller:"Thulasi" });

  function saveImported(obj) {
    setImported(obj);
    try { localStorage.setItem("hr_imported", JSON.stringify(obj)); } catch {}
  }

  function normalizePhone(raw) {
    const digits = (raw||"").replace(/[^0-9]/g,"");
    if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
    if (digits.startsWith("091") && digits.length === 13) return digits.slice(3);
    return digits.slice(-10);
  }

  function startImport(contact) {
    setEditingLead(contact);
    setForm({ name:"", business:"", type:"Restaurant", area:"", address:"", telecaller:"Thulasi" });
  }

  function confirmImport() {
    if (!form.name || !editingLead) return;
    const phone = normalizePhone(editingLead);
    const alreadyExists = leads.some(l => normalizePhone(l.contact) === phone);
    if (!alreadyExists) {
      setLeads([{
        id: Date.now(),
        name: form.name,
        contact: phone,
        business: form.business,
        type: form.type,
        area: form.area,
        address: form.address,
        stage: "New Lead",
        source: "HR Assignment",
        telecaller: form.telecaller,
        lastContact: "Today",
        priority: "Medium",
        remarks: [],
      }, ...leads]);
    }
    saveImported({ ...imported, [editingLead]: true });
    setEditingLead(null);
  }

  // ── Edit form view ──
  if (editingLead) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setEditingLead(null)}
            style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, color:T.t2, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:FONT }}>← Back</button>
          <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>Fill Lead Details</div>
        </div>
        <div style={{ background:T.card, border:`1px solid ${T.accentGlow}`, borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, color:T.accent, fontWeight:700, marginBottom:4 }}>HR NUMBER</div>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>📞 {editingLead}</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>Normalized: {normalizePhone(editingLead)}</div>
        </div>
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["Customer Name *", "name", "text", "e.g. Anand Tiffin Center"],
            ["Business Name", "business", "text", "e.g. Anand Foods Pvt Ltd"],
            ["Area / Location", "area", "text", "e.g. Koramangala"],
            ["Full Address", "address", "text", "e.g. 12, 5th Block, Koramangala"],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>{label.toUpperCase()}</div>
              <input type={type} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                placeholder={placeholder}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                  padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>BUSINESS TYPE</div>
            <select value={form.type} onChange={e => setForm({...form, type:e.target.value})}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
              {["Restaurant","Mess","Hotel","Bakery","Cloud Kitchen","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>ASSIGN TELECALLER</div>
            <select value={form.telecaller} onChange={e => setForm({...form, telecaller:e.target.value})}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
              {["Thulasi","Ramya"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={confirmImport} disabled={!form.name}
          style={{ background: form.name ? T.accent : T.border, border:"none", borderRadius:14,
            color: form.name ? "#060B16" : T.t3, padding:"14px", fontSize:14, fontWeight:800,
            cursor: form.name ? "pointer" : "default", fontFamily:FONT }}>
          ✓ Add to CRM Pipeline
        </button>
      </div>
    );
  }

  // ── List view ──
  const numbers = hrLeads.map(r => r.contact || r[Object.keys(r)[0]] || "").filter(Boolean);
  const pending = numbers.filter(n => !imported[n] && !leads.some(l => normalizePhone(l.contact) === normalizePhone(n)));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>HR Assigned Numbers</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{numbers.length} total · {pending.length} pending</div>
        </div>
        {pending.length > 0 && (
          <div style={{ background:T.rose, borderRadius:20, padding:"4px 10px", fontSize:12, fontWeight:800, color:"white" }}>
            {pending.length} New
          </div>
        )}
      </div>

      {numbers.length === 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:24, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.t1, marginBottom:8 }}>No Numbers Yet</div>
          <div style={{ fontSize:12, color:T.t3, lineHeight:1.7 }}>
            Ask HR to create a tab named HRLeads in the Google Sheet and add phone numbers in column A — one number per row. Any format works.
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {numbers.map((num, i) => {
          const isImported = imported[num] || leads.some(l => normalizePhone(l.contact) === normalizePhone(num));
          const normalized = normalizePhone(num);
          const existingLead = leads.find(l => normalizePhone(l.contact) === normalized);
          return (
            <div key={i} style={{ background:T.card, border:`1px solid ${isImported ? T.border : T.accentGlow}`,
              borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:T.t1 }}>📞 {normalized}</div>
                <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>HR format: {num}</div>
                {existingLead && (
                  <div style={{ fontSize:11, color:T.accent, marginTop:3, fontWeight:600 }}>✓ {existingLead.name} · {existingLead.stage}</div>
                )}
              </div>
              {isImported ? (
                <div style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8,
                  color:T.accent, padding:"5px 12px", fontSize:11, fontWeight:700 }}>✓ Done</div>
              ) : (
                <button onClick={() => startImport(num)}
                  style={{ background:T.accent, border:"none", borderRadius:10, color:"#060B16",
                    padding:"8px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
                  Fill & Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:12, marginTop:4 }}>
        <div style={{ fontSize:11, color:T.accent, fontWeight:700, marginBottom:6 }}>Setup Guide</div>
        <div style={{ fontSize:11, color:T.t3, lineHeight:1.7 }}>
          Google Sheet tab name: HRLeads. Column A header: contact. HR enters one number per row in any format — +91 98765 43210, 091-9876543210, 9876543210 etc. Telecaller sees new numbers here and taps Fill and Add to enter details and push to CRM pipeline.
        </div>
      </div>
    </div>
  );
}


function Leads() {
  const [leads, setLeads, leadsSyncStatus] = useSheetSynced("leads", "leads", INITIAL_LEADS);
  const [expenses, setExpenses] = useSheetSynced("expenses", "expenses", INITIAL_EXPENSES);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [remark, setRemark] = useState("");
  const [showWAForLead, setShowWAForLead] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [deliveryDialog, setDeliveryDialog] = useState(null); // { lead, targetStage }
  const [porterAmt, setPorterAmt] = useState("");
  const [kgQty, setKgQty] = useState("");
  const [groupMsg, setGroupMsg] = useState(null); // { lead, stage, method }
  const [newLead, setNewLead] = useState({ name:"", contact:"", business:"", type:"Restaurant", area:"", address:"", source:"Instagram", telecaller:"Thulasi" });

  const filtered = leads.filter(l =>
    (filterStage==="All" || l.stage===filterStage) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
     l.area.toLowerCase().includes(search.toLowerCase()) ||
     l.contact.includes(search))
  );

  const addRemark = (id, role) => {
    if (!remark.trim()) return;
    const now = new Date();
    const stamp = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) + " " + now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const remarkWithStamp = "[" + stamp + " · " + (role||"Team") + "] " + remark.trim();
    setLeads(leads.map(l => l.id===id ? { ...l, remarks:[...(l.remarks||[]),remarkWithStamp], lastContact:"Today" } : l));
    setRemark("");
  };
  const updateStage = (id, stage) => {
    const lead = leads.find(l => l.id === id);
    if ((stage === "Sample Requested" || stage === "Order Received") && lead) {
      setDeliveryDialog({ lead, targetStage: stage });
      setPorterAmt("");
      setKgQty("");
    } else {
      setLeads(leads.map(l => l.id===id ? { ...l, stage, lastContact:"Today" } : l));
    }
  };

  const confirmDelivery = (method) => {
    if (!deliveryDialog) return;
    const { lead, targetStage } = deliveryDialog;
    // Update lead stage
    setLeads(leads.map(l => l.id===lead.id ? { ...l, stage:targetStage, lastContact:"Today" } : l));
    // Log expense if Porter
    if (method === "porter" && porterAmt) {
      const today = new Date();
      const dateStr = today.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
      const newExp = {
        id: expenses.length + Date.now(),
        category: "Porter Delivery — " + lead.name,
        amount: parseInt(porterAmt) || 0,
        date: dateStr,
        type: "Delivery",
        subtype: "Porter"
      };
      setExpenses([newExp, ...expenses]);
    }
    setGroupMsg({ lead, targetStage, method, kgQty });
    setDeliveryDialog(null);
    setPorterAmt("");
    setKgQty("");
  };
  const addLead = () => {
    if (!newLead.name || !newLead.contact) return;
    setLeads([{ ...newLead, id:leads.length+1, stage:"New Lead", lastContact:"Today", priority:"Medium", remarks:[] }, ...leads]);
    setShowAdd(false);
    setNewLead({ name:"", contact:"", business:"", type:"Restaurant", area:"", address:"", source:"Instagram", telecaller:"Priya" });
  };

  // ── Group WhatsApp message ──
  function buildGroupMsg(lead, targetStage, method, customMsg) {
    const time = new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const date = new Date().toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short"});
    if (targetStage === "Sample Requested") {
      return customMsg || (
        "🧪 *Sample Dispatched*\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "👤 Customer: " + lead.name + "\n" +
        "📍 Area: " + (lead.area||"-") + "\n" +
        (kgQty ? "⚖️ Quantity: " + kgQty + " KG\n" : "") +
        "🚚 Via: " + (method === "porter" ? "Porter" : "Company Vehicle") + "\n" +
        "🕐 Time: " + time + " · " + date + "\n" +
        "👩 Telecaller: " + (lead.telecaller||"Team") + "\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "Sridhi Ventures 🌿"
      );
    } else {
      return customMsg || (
        "🎉 *Order Confirmed!*\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "👤 Customer: " + lead.name + "\n" +
        "📍 Area: " + (lead.area||"-") + "\n" +
        "🏪 Business: " + (lead.business||lead.name) + "\n" +
        (kgQty ? "⚖️ Quantity: " + kgQty + " KG\n" : "") +
        "🚚 Delivery: " + (method === "porter" ? "Porter" : "Company Vehicle") + "\n" +
        "🕐 Time: " + time + " · " + date + "\n" +
        "👩 Telecaller: " + (lead.telecaller||"Team") + "\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "Sridhi Ventures 🌿"
      );
    }
  }

  if (groupMsg) {
    return <GroupMsgDialog groupMsg={groupMsg} buildGroupMsg={buildGroupMsg} onClose={() => setGroupMsg(null)} />;
  }
  
  if (false) { return (
      <div style={{ padding:"0 0 80px" }}>
        <div style={{ background:T.card, border:`1px solid ${T.accentGlow}`, borderRadius:18, padding:20, margin:"16px 0" }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>
            {targetStage === "Sample Requested" ? "🧪 Share Sample Update" : "🎉 Share Order Update"}
          </div>
          <div style={{ fontSize:12, color:T.t3, marginBottom:16 }}>Send to Sridhi Ventures WhatsApp group</div>

          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>MESSAGE PREVIEW (tap to edit)</div>
          <textarea
            value={editedMsg}
            onChange={e => setEditedMsg(e.target.value)}
            rows={10}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
              color:T.t1, padding:"12px", fontSize:13, fontFamily:FONT,
              outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical",
              lineHeight:1.7 }}
          />

          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={() => setGroupMsg(null)}
              style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
                color:T.t2, padding:"11px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
              Skip
            </button>
            <button onClick={() => {
                navigator.clipboard.writeText(editedMsg).then(() => {
                  alert("✅ Message copied! Now open WhatsApp → Batter sales and sample group → Paste → Send");
                  setGroupMsg(null);
                }).catch(() => {
                  // Fallback for devices where clipboard API is blocked
                  const ta = document.createElement("textarea");
                  ta.value = editedMsg;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  document.body.removeChild(ta);
                  alert("✅ Message copied! Now open WhatsApp → Batter sales and sample group → Paste → Send");
                  setGroupMsg(null);
                });
              }}
              style={{ flex:2, background:"#25D366", border:"none", borderRadius:12,
                color:"white", padding:"11px", fontSize:14, fontWeight:800,
                cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              📋 Copy & Open WhatsApp
            </button>
          </div>
          <div style={{ fontSize:11, color:T.amber, textAlign:"center", marginTop:8, fontWeight:600 }}>
            👆 Tap to copy → Open WhatsApp → Open Batter group → Paste → Send
          </div>
        </div>
      </div>
    );
  }

  // ── Delivery method dialog ──
  if (deliveryDialog) {
    const { lead, targetStage } = deliveryDialog;
    const isPorter = porterAmt !== "";
    return (
      <div style={{ padding:"0 0 80px" }}>
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:20, margin:"16px 0" }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.t1, marginBottom:4 }}>
            {targetStage === "Sample Requested" ? "🧪 Sample Delivery" : "📦 Order Delivery"}
          </div>
          <div style={{ fontSize:12, color:T.t3, marginBottom:20 }}>
            Moving <b style={{color:T.t1}}>{lead.name}</b> → <b style={{color:T.accent}}>{targetStage}</b>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>QUANTITY (KG)</div>
            <input type="number" value={kgQty} onChange={e => setKgQty(e.target.value)}
              placeholder="Enter KG e.g. 10"
              style={{ background:T.surface, border:`1px solid ${T.accentGlow}`, borderRadius:10,
                color:T.t1, padding:"10px 12px", fontSize:15, fontFamily:FONT,
                outline:"none", width:"100%", boxSizing:"border-box", fontWeight:700 }} />
          </div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:700, marginBottom:12 }}>SELECT DELIVERY METHOD</div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* Porter option */}
            <div style={{ background:T.surface, border:`1px solid ${T.borderHi}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ fontSize:24 }}>🛵</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.t1 }}>Porter</div>
                  <div style={{ fontSize:11, color:T.t3 }}>3rd party delivery — cost logged as expense</div>
                </div>
              </div>
              <input
                type="number"
                value={porterAmt}
                onChange={e => setPorterAmt(e.target.value)}
                placeholder="Enter Porter cost (₹)"
                style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
                  color:T.t1, padding:"10px 12px", fontSize:14, fontFamily:FONT,
                  outline:"none", width:"100%", boxSizing:"border-box", marginBottom:10 }}
              />
              <button onClick={() => confirmDelivery("porter")}
                disabled={!porterAmt}
                style={{ background: porterAmt ? T.amber : T.border, border:"none", borderRadius:12,
                  color: porterAmt ? "#060B16" : T.t3, padding:"12px", fontSize:13, fontWeight:800,
                  cursor: porterAmt ? "pointer" : "default", fontFamily:FONT, width:"100%" }}>
                🛵 Confirm Porter — ₹{porterAmt || "0"} (logged to expenses)
              </button>
            </div>

            {/* Company Vehicle option */}
            <div style={{ background:T.surface, border:`1px solid ${T.borderHi}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ fontSize:24 }}>🚗</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.t1 }}>Company Vehicle</div>
                  <div style={{ fontSize:11, color:T.t3 }}>Own vehicle — no delivery cost logged</div>
                </div>
              </div>
              <button onClick={() => confirmDelivery("company")}
                style={{ background:T.emerald, border:"none", borderRadius:12,
                  color:"#060B16", padding:"12px", fontSize:13, fontWeight:800,
                  cursor:"pointer", fontFamily:FONT, width:"100%" }}>
                🚗 Confirm Company Vehicle
              </button>
            </div>

            <button onClick={() => setDeliveryDialog(null)}
              style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:12,
                color:T.t3, padding:"10px", fontSize:12, cursor:"pointer", fontFamily:FONT }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    const lead = leads.find(l => l.id===selected);
    if (!lead) return null;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={() => setSelected(null)}
          style={{ background:"none", border:"none", color:T.accent, fontSize:13, cursor:"pointer", padding:0, textAlign:"left", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
          ← Back to leads
        </button>
        {showEdit ? (
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <Label>Edit Lead Details</Label>
              <button onClick={() => setShowEdit(false)}
                style={{ background:"none", border:"none", color:T.t3, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {[
              ["Customer Name", "name", "text"],
              ["Business Name", "business", "text"],
              ["Contact Number", "contact", "tel"],
              ["Area", "area", "text"],
              ["Full Address", "address", "text"],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>{label.toUpperCase()}</div>
                <input type={type} value={editForm[key]||""} onChange={e => setEditForm({...editForm,[key]:e.target.value})}
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1,
                    padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>BUSINESS TYPE</div>
              <select value={editForm.type||""} onChange={e => setEditForm({...editForm,type:e.target.value})}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
                {["Restaurant","Mess","Hotel","Bakery","Cloud Kitchen","Catering","Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>ASSIGN TELECALLER</div>
              <select value={editForm.telecaller||""} onChange={e => setEditForm({...editForm,telecaller:e.target.value})}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
                {["Thulasi","Ramya"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>PRIORITY</div>
              <select value={editForm.priority||""} onChange={e => setEditForm({...editForm,priority:e.target.value})}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
                {["High","Medium","Low"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Btn label="✓ Save Changes" full color={T.accent} onClick={() => {
              setLeads(leads.map(l => l.id===lead.id ? { ...l, ...editForm } : l));
              setShowEdit(false);
            }} />
          </Card>
        ) : (
        <Card accent={getStageColor(lead.stage)}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:T.t1, letterSpacing:"-0.02em" }}>{lead.name}</div>
              <div style={{ fontSize:12, color:T.t2, marginTop:2 }}>{lead.business}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:1 }}>{lead.type} · {lead.area}</div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={() => { setEditForm({...lead}); setShowEdit(true); }}
                style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8,
                  color:T.accent, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                ✏️ Edit
              </button>
              <Chip label={lead.priority+" Priority"} color={getPriorityColor(lead.priority)} />
            </div>
          </div>
          <Chip label={lead.stage} color={getStageColor(lead.stage)} />
          <div style={{ marginTop:16 }}>
            {[["Contact",lead.contact],["Address",lead.address||lead.area],["Source",lead.source],["Telecaller",lead.telecaller],["Last contact",lead.lastContact]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11, color:T.t3, width:100, flexShrink:0, fontWeight:600 }}>{k}</span>
                <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <Btn label="📞 Call" color={T.emerald} ghost full onClick={() => {
              const phone = (lead.contact||"").replace(/[^0-9]/g,"");
              if (phone) window.location.href = "tel:+" + (phone.startsWith("91") ? phone : "91"+phone);
            }} />
            <Btn label="💬 WhatsApp" color={T.accent} ghost full onClick={() => {
              setShowWAForLead(lead);
            }} />
          </div>
        </Card>
        )}

        {showWAForLead && (
          <WATemplatePicker lead={showWAForLead} onClose={() => setShowWAForLead(null)} />
        )}

        <Card>
          <Label>Update Stage</Label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {PIPELINE_STAGES.map(s => (
              <button key={s.id} onClick={() => updateStage(lead.id, s.id)}
                style={{
                  padding:"5px 10px", borderRadius:7, cursor:"pointer", fontSize:10, fontWeight:700,
                  border:`1px solid ${lead.stage===s.id ? s.color : T.border}`,
                  background: lead.stage===s.id ? s.color+"1A" : "transparent",
                  color: lead.stage===s.id ? s.color : T.t2, fontFamily:FONT,
                }}>{s.id}</button>
            ))}
          </div>
        </Card>

        <Card>
          <Label sub={`${(lead.remarks||[]).length} entries`}>Remarks</Label>
          {(lead.remarks||[]).length===0 && <div style={{ fontSize:12, color:T.t3, marginBottom:12 }}>No remarks yet.</div>}
          {(lead.remarks||[]).slice().reverse().map((r,i) => {
            const match = r.match(/^\[(.+?) · (.+?)\] (.+)$/);
            const timestamp = match ? match[1] : null;
            const who = match ? match[2] : null;
            const text = match ? match[3] : r;
            return (
              <div key={i} style={{
                background:T.surface, borderRadius:10, padding:"10px 12px", marginBottom:8,
                borderLeft:`3px solid ${T.accent}`,
              }}>
                {timestamp && (
                  <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:10, color:T.accent, fontWeight:700 }}>🕐 {timestamp}</span>
                    <span style={{ fontSize:10, color:T.t3 }}>·</span>
                    <span style={{ fontSize:10, color:T.indigo, fontWeight:600 }}>👤 {who}</span>
                  </div>
                )}
                <div style={{ fontSize:12, color:T.t1, lineHeight:1.5 }}>{text}</div>
              </div>
            );
          })}
          <textarea value={remark} onChange={e => setRemark(e.target.value)}
            placeholder="Add a remark..."
            style={{
              width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
              padding:12, color:T.t1, fontSize:13, resize:"none", outline:"none",
              boxSizing:"border-box", height:72, fontFamily:FONT,
            }} />
          <div style={{ marginTop:8 }}><Btn label="Save Remark" full onClick={() => addRemark(lead.id, lead.telecaller)} /></div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, area, contact…"
          style={{ ...inputStyle, flex:1 }} />
        <button onClick={() => setShowAdd(true)} style={{
          background:T.accent, color:"#060B16", border:"none",
          borderRadius:12, width:42, height:42, fontWeight:800, fontSize:20, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>+</button>
      </div>

      <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:4 }}>
        {["All","New Lead","Interested","Sample Requested","Positive Feedback","Negotiation","Order Received","Active Customer","Lost Customer"].map(s => {
          const active = filterStage===s;
          const col = s==="All" ? T.accent : getStageColor(s);
          return (
            <button key={s} onClick={() => setFilterStage(s)}
              style={{
                padding:"5px 12px", borderRadius:8, whiteSpace:"nowrap",
                border:`1px solid ${active ? col : T.border}`,
                background: active ? col+"1A" : "transparent",
                color: active ? col : T.t2,
                fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT,
              }}>{s==="All" ? `All (${leads.length})` : s}</button>
          );
        })}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:T.t3, fontWeight:500 }}>{filtered.length} lead{filtered.length!==1?"s":""}</span>
        <SyncBadge status={leadsSyncStatus} />
      </div>

      {filtered.map(lead => (
        <div key={lead.id} onClick={() => setSelected(lead.id)}
          style={{
            background:T.card, border:`1px solid ${T.border}`,
            borderRadius:16, padding:14, cursor:"pointer",
            borderLeft:`3px solid ${getStageColor(lead.stage)}`,
            transition:"background 0.15s",
          }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:9 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{lead.name}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{lead.type} · {lead.area}</div>
            </div>
            <Chip label={lead.priority} color={getPriorityColor(lead.priority)} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Chip label={lead.stage} color={getStageColor(lead.stage)} />
            <div style={{ display:"flex", gap:10 }}>
              <span style={{ fontSize:10, color:T.t3 }}>{lead.contact}</span>
              <span style={{ fontSize:10, color:T.t3 }}>{lead.lastContact}</span>
            </div>
          </div>
          {lead.remarks?.length>0 && (
            <div style={{ marginTop:10, fontSize:11, color:T.t2, background:T.surface, borderRadius:8, padding:"7px 10px", lineHeight:1.5 }}>
              {lead.remarks[lead.remarks.length-1]}
            </div>
          )}
        </div>
      ))}

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="New Lead">
        <Field label="Customer Name *" value={newLead.name} onChange={e => setNewLead({...newLead,name:e.target.value})} />
        <Field label="Contact *" value={newLead.contact} onChange={e => setNewLead({...newLead,contact:e.target.value})} type="tel" />
        <Field label="Business Name" value={newLead.business} onChange={e => setNewLead({...newLead,business:e.target.value})} />
        <Field label="Area" value={newLead.area} onChange={e => setNewLead({...newLead,area:e.target.value})} />
        <Field label="Address" value={newLead.address} onChange={e => setNewLead({...newLead,address:e.target.value})} />
        <Dropdown label="Business Type" value={newLead.type} onChange={e => setNewLead({...newLead,type:e.target.value})} options={["Restaurant","Mess","Hotel","Bakery","Cloud Kitchen","Distributor","Retailer"]} />
        <Dropdown label="Lead Source" value={newLead.source} onChange={e => setNewLead({...newLead,source:e.target.value})} options={["Instagram","Facebook","WhatsApp","Google","Referral","Field Sales","Telecalling"]} />
        <Dropdown label="Assigned Telecaller" value={newLead.telecaller} onChange={e => setNewLead({...newLead,telecaller:e.target.value})} options={["Thulasi","Ramya"]} />
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowAdd(false)} />
          <Btn label="Add Lead" full onClick={addLead} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────
function Pipeline() {
  const [expanded, setExpanded] = useState(null);
  const total = PIPELINE_STAGES.reduce((a,b) => a+b.count, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Card accent={T.accent}>
        <Label sub={`${total} total leads across all stages`}>Pipeline Overview</Label>
        <PipelineStrip stages={PIPELINE_STAGES} />
      </Card>
      {PIPELINE_STAGES.map(stage => {
        const pct = ((stage.count/total)*100).toFixed(1);
        const isOpen = expanded===stage.id;
        const stageLeads = INITIAL_LEADS.filter(l => l.stage===stage.id);
        return (
          <div key={stage.id} style={{
            background: isOpen ? stage.color+"0D" : T.card,
            border:`1px solid ${isOpen ? stage.color+"44" : T.border}`,
            borderRadius:16, overflow:"hidden",
          }}>
            <div onClick={() => setExpanded(isOpen ? null : stage.id)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer" }}>
              <div style={{ width:8, height:8, borderRadius:2, background:stage.color, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:T.t1 }}>{stage.id}</span>
              <span style={{ fontSize:10, color:T.t3, fontWeight:500 }}>{pct}%</span>
              <div style={{
                background:stage.color+"1A", color:stage.color,
                borderRadius:8, padding:"3px 10px", fontSize:13, fontWeight:800,
                minWidth:32, textAlign:"center",
              }}>{stage.count}</div>
              <span style={{ color:T.t3, fontSize:12 }}>{isOpen?"▲":"▼"}</span>
            </div>
            <div style={{ height:2, background:T.border }}>
              <div style={{ width:`${pct}%`, height:"100%", background:stage.color }} />
            </div>
            {isOpen && stageLeads.length>0 && (
              <div style={{ padding:"8px 16px 14px" }}>
                {stageLeads.map(l => (
                  <div key={l.id} style={{
                    background:T.surface, borderRadius:10, padding:"10px 12px", marginTop:8,
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{l.name}</div>
                      <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>{l.area} · {l.telecaller}</div>
                    </div>
                    <Chip label={l.priority} color={getPriorityColor(l.priority)} />
                  </div>
                ))}
                {stageLeads.length<stage.count && (
                  <div style={{ fontSize:11, color:T.t3, textAlign:"center", marginTop:8, fontStyle:"italic" }}>
                    +{stage.count-stageLeads.length} more leads
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SAMPLES ──────────────────────────────────────────────────────────────
function Samples() {
  const [samples, setSamples, samplesSyncStatus] = useSheetSynced("samples", "samples", INITIAL_SAMPLES);
  const [leads, setLeads] = useSheetSynced("leads","leads",[]);
  const [showAdd, setShowAdd] = useState(false);
  const [showFeedback, setShowFeedback] = useState(null);
  const [ratings, setRatings] = useState({ taste:0, texture:0, quality:0, pricing:"", competitor:"", interest:"Yes", comments:"" });
  const [newSample, setNewSample] = useState({ customer:"", qty:"", type:"Dosa Batter", exec:"Arjun P.", deliveryCost:"", scheduledDate:"", scheduledTime:"" });

  const totalKG = samples.reduce((a,b) => a+b.qty, 0);
  const converted = samples.filter(s => s.converted).length;
  const totalCost = samples.reduce((a,b) => a+b.deliveryCost+b.productionCost, 0);

  const saveFeedback = id => {
    const sample = samples.find(s => s.id === id);
    const isConverted = ratings.interest === "Yes";
    const feedbackVal = ratings.taste>=4?"Positive":ratings.taste>=3?"Neutral":"Negative";
    setSamples(samples.map(s => s.id===id ? { ...s, feedback:feedbackVal, converted:isConverted, status:"Delivered" } : s));
    // Auto update lead stage based on feedback
    if (sample) {
      const matchedLead = leads.find(l => l.name === sample.customer || l.contact === sample.customer);
      if (matchedLead) {
        const newStage = isConverted ? "Order Received" : feedbackVal === "Positive" ? "Positive Feedback" : feedbackVal === "Neutral" ? "Feedback Pending" : "Lost Customer";
        const now = new Date();
        const stamp = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) + " " + now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
        const autoRemark = "[" + stamp + " · System] Sample feedback: " + feedbackVal + (isConverted ? " — Converted to Order! 🎉" : "");
        setLeads(leads.map(l => l.id===matchedLead.id ? { ...l, stage:newStage, lastContact:"Today", remarks:[...(l.remarks||[]), autoRemark] } : l));
      }
    }
    setShowFeedback(null);
    setRatings({ taste:0, texture:0, quality:0, pricing:"", competitor:"", interest:"Yes", comments:"" });
  };

  const addSample = () => {
    if (!newSample.customer || !newSample.qty) return;
    const today2 = new Date(); const dateStr = today2.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
    setSamples([{ ...newSample, id:samples.length+1, qty:parseInt(newSample.qty), unit:"KG", date:dateStr, deliveryCost:parseInt(newSample.deliveryCost)||0, productionCost:parseInt(newSample.qty)*50, status:"Pending", feedback:null, converted:false }, ...samples]);
    setShowAdd(false);
    setNewSample({ customer:"", qty:"", type:"Dosa Batter", exec:"Arjun P.", deliveryCost:"" });
  };

  const fbColor = f => f==="Positive" ? T.emerald : f==="Neutral" ? T.amber : T.rose;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Total samples"    value={totalKG}  unit="KG" color={T.amber}   icon="🧪" />
        <KPI label="Converted"        value={converted}           color={T.emerald} icon="✅" />
        <KPI label="Sample cost"      value={totalCost} unit="₹" color={T.rose}    icon="💸" />
        <KPI label="Conversion rate"  value={`${Math.round((converted/samples.length)*100)}%`} color={T.accent} icon="🎯" />
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SyncBadge status={samplesSyncStatus} />
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        background:T.amber+"18", border:`1px solid ${T.amber}33`, borderRadius:14,
        color:T.amber, padding:13, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT,
      }}>+ Log New Sample</button>

      <Card>
        <Label sub="Tap a sample to log feedback">Sample Log</Label>
        {samples.map(s => (
          <div key={s.id} style={{ padding:"14px 0", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{s.customer}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{s.exec} · {s.date} · ₹{(s.deliveryCost+s.productionCost).toLocaleString("en-IN")}</div>
              <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                <Chip label={`${s.qty} ${s.unit} ${s.type}`} color={T.amber} />
                <Chip label={s.status} color={s.status==="Delivered" ? T.emerald : T.amber} />
                {s.feedback && <Chip label={s.feedback} color={fbColor(s.feedback)} />}
                {s.converted && <Chip label="Converted" color={T.accent} />}
              </div>
            </div>
            {s.status==="Delivered" && !s.feedback && (
              <button onClick={() => setShowFeedback(s.id)} style={{
                background:T.accentSub, border:`1px solid ${T.accent}33`,
                borderRadius:10, color:T.accent, padding:"7px 12px",
                fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0, fontFamily:FONT,
              }}>Log Feedback</button>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <Label>By Field Executive</Label>
        {["Arjun P.","Suresh R."].map(exec => {
          const es = samples.filter(s => s.exec===exec);
          const kg = es.reduce((a,b) => a+b.qty, 0);
          return (
            <div key={exec} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{exec}</div>
                <div style={{ fontSize:11, color:T.t3, fontWeight:500 }}>{es.length} deliveries</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:800, color:T.amber }}>{kg} KG</div>
                <div style={{ fontSize:11, color:T.emerald, fontWeight:600 }}>{es.filter(s => s.converted).length} converted</div>
              </div>
            </div>
          );
        })}
      </Card>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Log New Sample">
        <Field label="Customer Name" value={newSample.customer} onChange={e => setNewSample({...newSample,customer:e.target.value})} />
        <Field label="Quantity (KG)" value={newSample.qty} onChange={e => setNewSample({...newSample,qty:e.target.value})} type="number" />
        <Dropdown label="Product Type" value={newSample.type} onChange={e => setNewSample({...newSample,type:e.target.value})} options={["Dosa Batter","Idli Batter","Mixed Batter"]} />
        <Dropdown label="Delivery Executive" value={newSample.exec} onChange={e => setNewSample({...newSample,exec:e.target.value})} options={["Arjun P.","Suresh R."]} />
        <Field label="Delivery Cost (₹)" value={newSample.deliveryCost} onChange={e => setNewSample({...newSample,deliveryCost:e.target.value})} type="number" />
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>SCHEDULED DATE (optional)</div>
          <input type="date" value={newSample.scheduledDate} onChange={e => setNewSample({...newSample,scheduledDate:e.target.value})}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
        </div>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>SCHEDULED TIME (optional)</div>
          <input type="time" value={newSample.scheduledTime} onChange={e => setNewSample({...newSample,scheduledTime:e.target.value})}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowAdd(false)} />
          <Btn label="Log Sample" full onClick={addSample} />
        </div>
      </Sheet>

      <Sheet open={!!showFeedback} onClose={() => setShowFeedback(null)} title="Log Customer Feedback">
        {[["Taste Rating","taste"],["Texture Rating","texture"],["Quality Rating","quality"]].map(([label,key]) => (
          <div key={key} style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:T.t2, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.03em" }}>{label}</div>
            <Stars value={ratings[key]} onChange={v => setRatings({...ratings,[key]:v})} />
          </div>
        ))}
        <Field label="Pricing Feedback" value={ratings.pricing} onChange={e => setRatings({...ratings,pricing:e.target.value})} placeholder="Too high / Fair / Good value" />
        <Field label="Competitor Brand" value={ratings.competitor} onChange={e => setRatings({...ratings,competitor:e.target.value})} placeholder="Brand name" />
        <Dropdown label="Purchase Interest" value={ratings.interest} onChange={e => setRatings({...ratings,interest:e.target.value})} options={["Yes","Maybe","No"]} />
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.t2, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.03em" }}>Additional Comments</div>
          <textarea value={ratings.comments} onChange={e => setRatings({...ratings,comments:e.target.value})}
            placeholder="Customer's exact words…"
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:12, color:T.t1, fontSize:13, resize:"none", outline:"none", boxSizing:"border-box", height:72, fontFamily:FONT }} />
        </div>
        <Btn label="Save Feedback" full onClick={() => saveFeedback(showFeedback)} />
      </Sheet>
    </div>
  );
}

// ─── FIELD SYNC ───────────────────────────────────────────────────────────
function FieldSync() {
  const [tasks, setTasks] = useState(FIELD_TASKS);
  const [filter, setFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ customer:"", area:"", address:"", task:"Sample Delivery", product:"Dosa Batter", qty:"", priority:"High", assignedTo:"Arjun P.", notes:"" });

  const filtered = tasks.filter(t => filter==="All" || t.status===filter);
  const updateStatus = (id, status) => setTasks(tasks.map(t => t.id===id ? {...t,status} : t));
  const statusColor = { Pending:T.amber, "In Progress":T.sky, Completed:T.emerald };
  const createTask = () => {
    if (!newTask.customer) return;
    setTasks([{ ...newTask, id:tasks.length+1, status:"Pending", createdBy:"Manual" }, ...tasks]);
    setShowCreate(false);
    setNewTask({ customer:"", area:"", address:"", task:"Sample Delivery", product:"Dosa Batter", qty:"", priority:"High", assignedTo:"Arjun P.", notes:"" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:T.accent, boxShadow:`0 0 8px ${T.accent}` }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.accent }}>Real-time Sync Active</div>
          <div style={{ fontSize:11, color:T.t2, fontWeight:500 }}>Telecalling CRM ↔ Field Sales · last synced just now</div>
        </div>
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Open tasks"   value={tasks.filter(t => t.status==="Pending").length}     color={T.amber}   icon="📌" />
        <KPI label="In progress"  value={tasks.filter(t => t.status==="In Progress").length}  color={T.sky}     icon="🚗" />
        <KPI label="Completed"    value={tasks.filter(t => t.status==="Completed").length}    color={T.emerald} icon="✅" />
      </div>

      <div style={{ display:"flex", gap:7 }}>
        {["All","Pending","In Progress","Completed"].map(s => {
          const active = filter===s;
          const col = statusColor[s] || T.accent;
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                flex:1, padding:"8px 4px", borderRadius:10, fontSize:11, fontWeight:700,
                border:`1px solid ${active ? col : T.border}`,
                background: active ? col+"1A" : "transparent",
                color: active ? col : T.t2, cursor:"pointer", fontFamily:FONT,
              }}>{s}</button>
          );
        })}
      </div>

      <button onClick={() => setShowCreate(true)} style={{
        background:T.indigo+"18", border:`1px solid ${T.indigo}33`,
        borderRadius:14, color:T.indigo, padding:13,
        fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT,
      }}>+ Create Field Task</button>

      {filtered.map(task => (
        <Card key={task.id} accent={statusColor[task.status]}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:T.t1, letterSpacing:"-0.01em" }}>{task.customer}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{task.area}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
              <Chip label={task.status} color={statusColor[task.status]} />
              <Chip label={task.priority+" Priority"} color={getPriorityColor(task.priority)} />
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <Chip label={task.task} color={T.sky} />
            {task.qty!=="—" && <Chip label={`${task.qty} ${task.product}`} color={T.amber} />}
            <Chip label={`→ ${task.assignedTo}`} color={T.indigo} />
          </div>
          <div style={{ fontSize:11, color:T.t2, background:T.surface, borderRadius:10, padding:"8px 12px", marginBottom:12, lineHeight:1.6 }}>
            {task.address}
            {task.notes && <><br />{task.notes}</>}
            <br /><span style={{ color:T.t3 }}>By {task.createdBy}</span>
          </div>
          {task.status!=="Completed" && (
            <div style={{ display:"flex", gap:8 }}>
              {task.status==="Pending" && <Btn label="Start" color={T.sky} ghost full onClick={() => updateStatus(task.id,"In Progress")} />}
              <Btn label="Mark Complete" color={T.emerald} ghost full onClick={() => updateStatus(task.id,"Completed")} />
            </div>
          )}
        </Card>
      ))}

      <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="Create Field Task">
        <Field label="Customer Name" value={newTask.customer} onChange={e => setNewTask({...newTask,customer:e.target.value})} />
        <Field label="Area" value={newTask.area} onChange={e => setNewTask({...newTask,area:e.target.value})} />
        <Field label="Address" value={newTask.address} onChange={e => setNewTask({...newTask,address:e.target.value})} />
        <Dropdown label="Task Type" value={newTask.task} onChange={e => setNewTask({...newTask,task:e.target.value})} options={["Sample Delivery","Customer Visit","Order Collection","Retail Onboarding"]} />
        <Dropdown label="Product" value={newTask.product} onChange={e => setNewTask({...newTask,product:e.target.value})} options={["Dosa Batter","Idli Batter","Mixed Batter","—"]} />
        <Field label="Quantity (KG)" value={newTask.qty} onChange={e => setNewTask({...newTask,qty:e.target.value})} type="number" />
        <Dropdown label="Assign To" value={newTask.assignedTo} onChange={e => setNewTask({...newTask,assignedTo:e.target.value})} options={["Arjun P.","Suresh R."]} />
        <Dropdown label="Priority" value={newTask.priority} onChange={e => setNewTask({...newTask,priority:e.target.value})} options={["High","Medium","Low"]} />
        <Field label="Notes" value={newTask.notes} onChange={e => setNewTask({...newTask,notes:e.target.value})} placeholder="Special instructions…" />
        <div style={{ display:"flex", gap:10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowCreate(false)} />
          <Btn label="Create Task" full onClick={createTask} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── REPEAT ORDERS ────────────────────────────────────────────────────────
function RepeatOrders() {
  const [repeatCustomers, , repeatSyncStatus] = useSheetSynced("repeatCustomers", "repeatCustomers", REPEAT_CUSTOMERS);
  const statusColor = { "Due Today":T.rose, Tomorrow:T.amber, Upcoming:T.emerald };
  const grouped = {
    "Due Today": repeatCustomers.filter(c => c.status==="Due Today"),
    "Tomorrow":  repeatCustomers.filter(c => c.status==="Tomorrow"),
    "Upcoming":  repeatCustomers.filter(c => c.status==="Upcoming"),
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Active customers" value={0}      color={T.accent}  icon="🏪" />
        <KPI label="Monthly revenue"  value={0} unit="₹" color={T.emerald} icon="💰" />
        <KPI label="Due today"        value={grouped["Due Today"].length} color={T.rose} icon="⚠️" />
        <KPI label="Avg order"        value="28 KG"  color={T.amber}   icon="📦" />
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SyncBadge status={repeatSyncStatus} />
      </div>
      {Object.entries(grouped).map(([group, customers]) => customers.length>0 && (
        <div key={group}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:statusColor[group] }} />
            <span style={{ fontSize:13, fontWeight:700, color:statusColor[group] }}>{group}</span>
            <span style={{ fontSize:11, color:T.t3 }}>({customers.length})</span>
          </div>
          {customers.map(c => (
            <Card key={c.id} style={{ marginBottom:10 }} accent={statusColor[group]}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.t1, letterSpacing:"-0.01em" }}>{c.name}</div>
                  <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{c.area} · {c.contact}</div>
                </div>
                <Chip label={c.status} color={statusColor[group]} />
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                <Chip label={`${c.qty} KG / order`} color={T.amber} />
                <Chip label={c.frequency} color={T.indigo} />
                <Chip label={c.product} color={T.sky} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.t3, marginBottom:12, fontWeight:500 }}>
                <span>Last: {c.lastOrder}</span>
                <span>Next: {c.nextDue}</span>
                <span style={{ color:T.emerald, fontWeight:700 }}>₹{(c.revenue/12).toLocaleString("en-IN")}/mo</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn label="📞 Call" color={T.emerald} ghost full onClick={() => { const p = (c.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }} />
                <Btn label="Remind" color={T.accent} ghost full onClick={() => {}} />
                {group==="Due Today" && <Btn label="Confirm Order" color={T.rose} ghost full onClick={() => {}} />}
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────
function Expenses() {
  const [expenses, setExpenses, expensesSyncStatus] = useSheetSynced("expenses", "expenses", INITIAL_EXPENSES);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [newExp, setNewExp] = useState({ category:"", amount:"", type:"Marketing", subtype:"Facebook" });

  const typeColor = { Marketing:T.indigo, Delivery:T.amber, Sample:T.accent, Employee:T.sky };
  const filtered = expenses.filter(e => filterType==="All" || e.type===filterType);
  const totals = Object.fromEntries(["Marketing","Delivery","Sample","Employee"].map(t => [t, expenses.filter(e => e.type===t).reduce((a,b) => a+b.amount,0)]));
  const grand = Object.values(totals).reduce((a,b) => a+b, 0);

  const addExpense = () => {
    if (!newExp.category || !newExp.amount) return;
    setExpenses([{ ...newExp, id:expenses.length+1, amount:parseInt(newExp.amount), date:"Jun 25" }, ...expenses]);
    setShowAdd(false);
    setNewExp({ category:"", amount:"", type:"Marketing", subtype:"Facebook" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        {Object.entries(totals).map(([type,val]) => (
          <KPI key={type} label={type} value={val} unit="₹" color={typeColor[type]}
            icon={type==="Marketing"?"📢":type==="Delivery"?"🚚":type==="Sample"?"🧪":"👥"} />
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SyncBadge status={expensesSyncStatus} />
      </div>

      <Card>
        <Label sub={`₹${grand.toLocaleString("en-IN")} total`}>Expense Distribution</Label>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <Donut segments={Object.entries(totals).map(([k,v]) => ({ label:k, value:v, color:typeColor[k] }))}
            size={110} centerLabel={"₹"+(grand/1000).toFixed(0)+"K"} centerSub="Total" />
          <div style={{ flex:1 }}>
            {Object.entries(totals).map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:typeColor[k] }} />
                  <span style={{ fontSize:12, color:T.t2, fontWeight:500 }}>{k}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:typeColor[k] }}>₹{v.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", gap:7 }}>
        {["All","Marketing","Delivery","Sample","Employee"].map(t => {
          const active = filterType===t;
          const col = typeColor[t] || T.accent;
          return (
            <button key={t} onClick={() => setFilterType(t)}
              style={{
                flex:1, padding:"7px 3px", borderRadius:9, fontSize:10, fontWeight:700,
                border:`1px solid ${active ? col : T.border}`,
                background: active ? col+"1A" : "transparent",
                color: active ? col : T.t2, cursor:"pointer", fontFamily:FONT,
              }}>{t}</button>
          );
        })}
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        background:T.indigo+"18", border:`1px solid ${T.indigo}33`,
        borderRadius:14, color:T.indigo, padding:13,
        fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT,
      }}>+ Add Expense</button>

      <Card>
        <Label sub={`${filtered.length} entries`}>Expense Log</Label>
        {filtered.map(e => (
          <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{e.category}</div>
              <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{e.date}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Chip label={e.type} color={typeColor[e.type]} />
              <span style={{ fontSize:14, fontWeight:800, color:T.rose }}>₹{e.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        ))}
      </Card>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <Field label="Description" value={newExp.category} onChange={e => setNewExp({...newExp,category:e.target.value})} placeholder="e.g. Facebook Ads — June Week 3" />
        <Field label="Amount (₹)" value={newExp.amount} onChange={e => setNewExp({...newExp,amount:e.target.value})} type="number" placeholder="0" />
        <Dropdown label="Category" value={newExp.type} onChange={e => setNewExp({...newExp,type:e.target.value})} options={["Marketing","Delivery","Sample","Employee"]} />
        <div style={{ display:"flex", gap:10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowAdd(false)} />
          <Btn label="Add" full onClick={addExpense} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── MARKETING ────────────────────────────────────────────────────────────
function Marketing() {
  const [tab, setTab] = useState("overview");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name:"", platform:"Facebook", objective:"Lead Generation", budget:"", budgetType:"Daily" });

  const totalLeads = MARKETING_SOURCES.reduce((a,b) => a+b.leads, 0);
  const totalSpend = MARKETING_SOURCES.reduce((a,b) => a+b.spend, 0);
  const totalConverted = MARKETING_SOURCES.reduce((a,b) => a+b.converted, 0);
  const metaLeads = META_CAMPAIGNS.reduce((a,b) => a+b.leads, 0);
  const metaSpend = META_CAMPAIGNS.reduce((a,b) => a+b.spend, 0);
  const metaActive = META_CAMPAIGNS.filter(c => c.status==="Active").length;
  const platformIcon = { Facebook:"f", Instagram:"▶", WhatsApp:"W" };
  const statusColor = { Active:T.emerald, Paused:T.amber, Ended:T.t2 };
  const tabs = [{ id:"overview",label:"Overview" },{ id:"meta",label:"Meta Ads" },{ id:"channels",label:"Channels" },{ id:"roi",label:"ROI" }];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", background:T.surface, borderRadius:12, padding:3, gap:2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"7px 4px", borderRadius:9, fontSize:11, fontWeight:700,
            background: tab===t.id ? T.card : "transparent",
            color: tab===t.id ? T.accent : T.t3,
            border: tab===t.id ? `1px solid ${T.border}` : "1px solid transparent",
            cursor:"pointer", fontFamily:FONT, letterSpacing:"-0.01em",
          }}>{t.label}</button>
        ))}
      </div>

      {tab==="overview" && <>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          <KPI label="Total leads"  value={totalLeads}  color={T.accent}  icon="📋" />
          <KPI label="Ad spend"     value={totalSpend}  unit="₹" color={T.rose}    icon="💸" />
          <KPI label="Converted"    value={totalConverted} color={T.emerald} icon="✅" />
          <KPI label="Avg CPL"      value={`₹${Math.round(totalSpend/totalLeads)}`} color={T.amber} icon="🎯" />
        </div>
        <div style={{
          background:`linear-gradient(135deg, rgba(24,119,242,0.12), rgba(225,48,108,0.08))`,
          border:`1px solid rgba(24,119,242,0.3)`, borderRadius:18, padding:"14px 16px",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"#1877F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"white" }}>f</div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.t1 }}>Meta Ads Manager</div>
                <div style={{ fontSize:10, color:T.emerald, fontWeight:600 }}>Connected · Act #160703</div>
              </div>
            </div>
            <button onClick={() => setTab("meta")} style={{ background:"rgba(24,119,242,0.15)", border:"1px solid rgba(24,119,242,0.3)", borderRadius:10, color:"#1877F2", padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>Open →</button>
          </div>
          <div style={{ display:"flex" }}>
            {[{ label:"Active", value:metaActive, color:T.emerald },{ label:"Leads", value:metaLeads, color:"#1877F2" },{ label:"Spend", value:`₹${(metaSpend/1000).toFixed(1)}K`, color:T.rose }].map((s,i) => (
              <div key={i} style={{ flex:1, textAlign:"center", borderRight:i<2?`1px solid ${T.border}`:"none" }}>
                <div style={{ fontSize:18, fontWeight:800, color:s.color, letterSpacing:"-0.02em" }}>{s.value}</div>
                <div style={{ fontSize:10, color:T.t3, fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <Card>
          <Label sub="By channel">Channel Summary</Label>
          {MARKETING_SOURCES.slice(0,4).map((s,i) => {
            const conv = Math.round((s.converted/s.leads)*100);
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                  <span style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{s.source}</span>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.accent }}>{s.leads}</div>
                    <div style={{ fontSize:9, color:T.t3 }}>Leads</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:T.emerald }}>{conv}%</div>
                    <div style={{ fontSize:9, color:T.t3 }}>Conv.</div>
                  </div>
                  {s.spend>0 ? <Chip label={`₹${s.spend.toLocaleString("en-IN")}`} color={T.rose} small /> : <Chip label="Organic" color={T.emerald} small />}
                </div>
              </div>
            );
          })}
        </Card>
      </>}

      {tab==="meta" && <>
        <div style={{ background:`linear-gradient(135deg, rgba(24,119,242,0.14), rgba(225,48,108,0.1))`, border:`1px solid rgba(24,119,242,0.3)`, borderRadius:18, padding:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"#1877F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"white", flexShrink:0 }}>f</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.t1 }}>Sridhi Ventures</div>
              <div style={{ fontSize:11, color:T.t2 }}>Business Portfolio</div>
              <div style={{ fontSize:10, color:T.emerald, fontWeight:600, marginTop:1 }}>Ad Account #120215709476160703</div>
            </div>
            <Chip label="Active" color={T.emerald} />
          </div>
          <div style={{ marginBottom:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
              <span style={{ color:T.t2, fontWeight:500 }}>Monthly Spend</span>
              <span style={{ color:T.t1, fontWeight:700 }}>₹15,500 / ₹20,000</span>
            </div>
            <div style={{ height:5, background:"rgba(0,0,0,0.3)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:"77.5%", height:"100%", borderRadius:3, background:`linear-gradient(90deg, #1877F2, #E1306C)` }} />
            </div>
          </div>
          <div style={{ fontSize:10, color:T.t3, fontWeight:500 }}>Daily budget: ₹1,100 · Billing threshold: ₹20,000</div>
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          <KPI label="Active campaigns" value={metaActive}  color={T.emerald} icon="📡" />
          <KPI label="Total leads"      value={metaLeads}   color={"#1877F2"} icon="📋" />
          <KPI label="Total spend"      value={metaSpend}  unit="₹" color={T.rose} icon="💸" />
          <KPI label="Avg CPL"          value={`₹${Math.round(metaSpend/metaLeads)}`} color={T.amber} icon="🎯" />
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>Campaigns</div>
          <button onClick={() => setShowNewCampaign(true)} style={{ background:"rgba(24,119,242,0.14)", border:"1px solid rgba(24,119,242,0.3)", borderRadius:10, color:"#1877F2", padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>+ New</button>
        </div>

        {META_CAMPAIGNS.map(c => (
          <div key={c.id} onClick={() => setSelectedCampaign(selectedCampaign?.id===c.id ? null : c)}
            style={{ background:T.card, border:`1px solid ${selectedCampaign?.id===c.id ? c.color+"44" : T.border}`, borderRadius:18, padding:16, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ flex:1, paddingRight:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:20, height:20, borderRadius:5, background:c.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"white", flexShrink:0 }}>{platformIcon[c.platform]||"•"}</div>
                  <span style={{ fontSize:10, color:c.color, fontWeight:700 }}>{c.platform} · {c.objective}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:T.t1, lineHeight:1.3 }}>{c.name}</div>
              </div>
              <Chip label={c.status} color={statusColor[c.status]} />
            </div>
            <div style={{ display:"flex", gap:0, background:T.surface, borderRadius:10, overflow:"hidden", marginBottom:10 }}>
              {[{ label:"Reach", value:(c.reach/1000).toFixed(0)+"K", color:T.sky },{ label:"Clicks", value:c.clicks.toLocaleString("en-IN"), color:T.indigo },{ label:"Leads", value:c.leads, color:T.emerald },{ label:"CPL", value:`₹${c.cpl}`, color:T.amber }].map((m,i) => (
                <div key={i} style={{ flex:1, padding:"9px 4px", textAlign:"center", borderRight:i<3?`1px solid ${T.border}`:"none" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:m.color }}>{m.value}</div>
                  <div style={{ fontSize:9, color:T.t3, fontWeight:500 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.t3, fontWeight:500 }}>
              <span>Spend: <span style={{ color:T.rose, fontWeight:700 }}>₹{c.spend.toLocaleString("en-IN")}</span></span>
              <span>Budget: ₹{c.budget}/day</span>
              <span>Since {c.startDate}</span>
            </div>
            {selectedCampaign?.id===c.id && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                  {[["Impressions",c.impressions.toLocaleString("en-IN")],["CPM",`₹${c.cpm}`],["CPC",`₹${c.cpc}`],["CTR",`${((c.clicks/c.impressions)*100).toFixed(2)}%`],["Lead Rate",`${((c.leads/c.clicks)*100).toFixed(1)}%`]].map(([k,v]) => (
                    <div key={k} style={{ background:T.surface, borderRadius:9, padding:"7px 10px", border:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.t1 }}>{v}</div>
                      <div style={{ fontSize:9, color:T.t3, fontWeight:500 }}>{k}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn label={c.status==="Active"?"Pause":"Resume"} color={c.status==="Active"?T.amber:T.emerald} ghost full onClick={() => {}} />
                  <Btn label="View in Meta" color={"#1877F2"} ghost full onClick={() => {}} />
                </div>
              </div>
            )}
          </div>
        ))}
      </>}

      {tab==="channels" && (
        <Card>
          <Label sub="Cost per lead and conversion by channel">All Channels</Label>
          {MARKETING_SOURCES.map((s,i) => {
            const cpl = s.spend>0 ? Math.round(s.spend/s.leads) : 0;
            const conv = Math.round((s.converted/s.leads)*100);
            return (
              <div key={i} style={{ padding:"12px 0", borderBottom:i<MARKETING_SOURCES.length-1?`1px solid ${T.border}`:"none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:s.color }} />
                    <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{s.source}</span>
                  </div>
                  {s.spend>0 ? <Chip label={`₹${s.spend.toLocaleString("en-IN")}`} color={T.rose} /> : <Chip label="Organic" color={T.emerald} />}
                </div>
                <div style={{ display:"flex", gap:16, marginBottom:7 }}>
                  {[["Leads",s.leads,T.accent],["Conv.",s.converted,T.emerald],[`${conv}%`,"Rate",T.indigo],[cpl===0?"Free":`₹${cpl}`,"CPL",T.amber]].map(([v,l,c]) => (
                    <div key={l} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:15, fontWeight:800, color:c }}>{v}</div>
                      <div style={{ fontSize:9, color:T.t3 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:4, background:T.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${(s.leads/Math.max(...MARKETING_SOURCES.map(x=>x.leads)))*100}%`, height:"100%", background:s.color, borderRadius:3 }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {tab==="roi" && <>
        <Card>
          <Label sub="Revenue vs ad spend">ROI by Channel</Label>
          {MARKETING_SOURCES.filter(s => s.spend>0).map((s,i) => {
            const revenue = s.converted*6000;
            const roi = Math.round(((revenue-s.spend)/s.spend)*100);
            return (
              <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                    <span style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{s.source}</span>
                  </div>
                  <Chip label={roi>0?`+${roi}% ROI`:`${roi}% ROI`} color={roi>300?T.emerald:roi>0?T.amber:T.rose} />
                </div>
                <div style={{ display:"flex", gap:0, background:T.surface, borderRadius:10, overflow:"hidden" }}>
                  {[["Spend",`₹${s.spend.toLocaleString("en-IN")}`,T.rose],["Revenue",`₹${revenue.toLocaleString("en-IN")}`,T.emerald],["Profit",`₹${(revenue-s.spend).toLocaleString("en-IN")}`,T.accent]].map(([l,v,c],idx) => (
                    <div key={l} style={{ flex:1, padding:"9px 4px", textAlign:"center", borderRight:idx<2?`1px solid ${T.border}`:"none" }}>
                      <div style={{ fontSize:13, fontWeight:800, color:c }}>{v}</div>
                      <div style={{ fontSize:9, color:T.t3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <Label>Top Performers</Label>
          {[{ label:"Best CPL", value:"WhatsApp (₹44)", color:"#25D366" },{ label:"Best Conversion", value:"Referral (43%)", color:T.accent },{ label:"Most Leads", value:"Facebook (78)", color:"#1877F2" },{ label:"Best ROI", value:"Referral (Organic)", color:T.emerald }].map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<3?`1px solid ${T.border}`:"none" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.t3, fontWeight:500 }}>{r.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:r.color, marginTop:2 }}>{r.value}</div>
              </div>
            </div>
          ))}
        </Card>
      </>}

      <Sheet open={showNewCampaign} onClose={() => setShowNewCampaign(false)} title="New Campaign">
        <Field label="Campaign Name" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign,name:e.target.value})} placeholder="e.g. Dosa Batter — Koramangala Restaurants" />
        <Dropdown label="Platform" value={newCampaign.platform} onChange={e => setNewCampaign({...newCampaign,platform:e.target.value})} options={["Facebook","Instagram","WhatsApp"]} />
        <Dropdown label="Objective" value={newCampaign.objective} onChange={e => setNewCampaign({...newCampaign,objective:e.target.value})} options={["Lead Generation","Conversions","Messages","Reach","Traffic"]} />
        <Field label="Daily Budget (₹)" value={newCampaign.budget} onChange={e => setNewCampaign({...newCampaign,budget:e.target.value})} type="number" placeholder="500" />
        <div style={{ display:"flex", gap:10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowNewCampaign(false)} />
          <Btn label="Create Campaign" full onClick={() => setShowNewCampaign(false)} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────
function Reports() {
  const [leads] = useSheetSynced("leads","leads",[]);
  const [expenses] = useSheetSynced("expenses","expenses",[]);
  const [samples] = useSheetSynced("samples","samples",[]);
  const [repeatCustomers] = useSheetSynced("repeatCustomers","repeatCustomers",[]);
  const [exporting, setExporting] = useState(false);

  // ── Compute real metrics from data ──
  const totalLeads = leads.length;
  const activeCustomers = leads.filter(l => l.stage === "Active Customer").length;
  const ordersReceived = leads.filter(l => l.stage === "Order Received").length;
  const converted = leads.filter(l => ["Order Received","Active Customer","Repeat Order Follow-up"].includes(l.stage)).length;
  const convRate = totalLeads > 0 ? Math.round((converted/totalLeads)*100) : 0;
  const totalExpenses = expenses.reduce((a,b) => a+(Number(b.amount)||0), 0);
  const porterExp = expenses.filter(e=>e.subtype==="Porter").reduce((a,b)=>a+(Number(b.amount)||0),0);
  const marketingExp = expenses.filter(e=>e.type==="Marketing").reduce((a,b)=>a+(Number(b.amount)||0),0);
  const samplesCost = expenses.filter(e=>e.type==="Sample").reduce((a,b)=>a+(Number(b.amount)||0),0);
  const samplesDelivered = samples.filter(s=>s.status==="Delivered").length;
  const samplesConverted = samples.filter(s=>s.converted).length;
  const stageCount = stage => leads.filter(l=>l.stage===stage).length;
  const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

  // ── PDF Generator ──
  const downloadPDF = () => {
    setExporting(true);
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background:#fff; color:#1a1a2e; padding:40px; }
  .header { background:linear-gradient(135deg,#060B16,#0F1C33); color:white; padding:32px; border-radius:16px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; }
  .logo { font-size:28px; font-weight:900; color:#00C9A7; letter-spacing:-1px; }
  .sub { font-size:12px; color:#7B9DC4; margin-top:4px; text-transform:uppercase; letter-spacing:2px; }
  .date { font-size:12px; color:#7B9DC4; text-align:right; }
  .section { margin-bottom:24px; }
  .section-title { font-size:14px; font-weight:700; color:#060B16; background:#f0f6ff; padding:8px 14px; border-radius:8px; border-left:4px solid #00C9A7; margin-bottom:14px; text-transform:uppercase; letter-spacing:1px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
  .kpi { background:#f8faff; border:1px solid #e0eaff; border-radius:12px; padding:16px; text-align:center; }
  .kpi-val { font-size:22px; font-weight:900; color:#00C9A7; }
  .kpi-val.red { color:#F43F5E; }
  .kpi-val.blue { color:#818CF8; }
  .kpi-val.amber { color:#F59E0B; }
  .kpi-label { font-size:10px; color:#666; margin-top:4px; font-weight:600; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#060B16; color:#00C9A7; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
  td { padding:9px 12px; border-bottom:1px solid #f0f0f0; }
  tr:nth-child(even) td { background:#f8faff; }
  .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; }
  .badge-green { background:#d1fae5; color:#065f46; }
  .badge-amber { background:#fef3c7; color:#92400e; }
  .badge-red { background:#fee2e2; color:#991b1b; }
  .footer { margin-top:32px; padding-top:16px; border-top:2px solid #00C9A7; display:flex; justify-content:space-between; color:#999; font-size:10px; }
  .highlight { color:#00C9A7; font-weight:700; }
  .bar-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .bar-label { width:120px; font-size:11px; color:#444; flex-shrink:0; }
  .bar-bg { flex:1; height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:4px; }
  .bar-val { width:60px; font-size:11px; font-weight:700; text-align:right; color:#060B16; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">⚡ Sridhi Ventures</div>
    <div class="sub">Business Operating System — Monthly Report</div>
  </div>
  <div class="date">
    <div style="font-size:20px;font-weight:900;color:#00C9A7">${today}</div>
    <div style="margin-top:4px">Bengaluru · Food Distribution</div>
  </div>
</div>

<div class="section">
  <div class="section-title">📊 Key Metrics</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-val">${totalLeads}</div><div class="kpi-label">Total Leads</div></div>
    <div class="kpi"><div class="kpi-val blue">${activeCustomers}</div><div class="kpi-label">Active Customers</div></div>
    <div class="kpi"><div class="kpi-val">${convRate}%</div><div class="kpi-label">Conversion Rate</div></div>
    <div class="kpi"><div class="kpi-val amber">${samplesDelivered}</div><div class="kpi-label">Samples Delivered</div></div>
    <div class="kpi"><div class="kpi-val">${samplesConverted}</div><div class="kpi-label">Samples Converted</div></div>
    <div class="kpi"><div class="kpi-val red">₹${totalExpenses.toLocaleString("en-IN")}</div><div class="kpi-label">Total Expenses</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">🔄 Pipeline Breakdown</div>
  <table>
    <tr><th>Stage</th><th>Count</th><th>Status</th></tr>
    ${["New Lead","Contacted","Interested","Sample Requested","Sample Delivered","Positive Feedback","Negotiation","Order Received","Active Customer","Lost Customer"].map(s => {
      const count = stageCount(s);
      const badge = s==="Active Customer"||s==="Order Received" ? "badge-green" : s==="Lost Customer" ? "badge-red" : "badge-amber";
      return `<tr><td>${s}</td><td><strong>${count}</strong></td><td><span class="badge ${badge}">${count > 0 ? "Active" : "Empty"}</span></td></tr>`;
    }).join("")}
  </table>
</div>

<div class="section">
  <div class="section-title">💸 Expense Breakdown</div>
  <table>
    <tr><th>Category</th><th>Amount</th><th>Type</th></tr>
    ${expenses.slice(0,15).map(e => `<tr><td>${e.category||""}</td><td><strong>₹${Number(e.amount||0).toLocaleString("en-IN")}</strong></td><td>${e.type||""}</td></tr>`).join("")}
    ${expenses.length === 0 ? "<tr><td colspan='3' style='text-align:center;color:#999'>No expenses recorded</td></tr>" : ""}
    <tr style="background:#f0f6ff"><td><strong>TOTAL</strong></td><td><strong class="highlight">₹${totalExpenses.toLocaleString("en-IN")}</strong></td><td></td></tr>
  </table>
  <div style="margin-top:16px">
    <div class="bar-row"><div class="bar-label">Marketing</div><div class="bar-bg"><div class="bar-fill" style="width:${totalExpenses?Math.round(marketingExp/totalExpenses*100):0}%;background:#818CF8"></div></div><div class="bar-val">₹${marketingExp.toLocaleString("en-IN")}</div></div>
    <div class="bar-row"><div class="bar-label">Porter Delivery</div><div class="bar-bg"><div class="bar-fill" style="width:${totalExpenses?Math.round(porterExp/totalExpenses*100):0}%;background:#F59E0B"></div></div><div class="bar-val">₹${porterExp.toLocaleString("en-IN")}</div></div>
    <div class="bar-row"><div class="bar-label">Samples</div><div class="bar-bg"><div class="bar-fill" style="width:${totalExpenses?Math.round(samplesCost/totalExpenses*100):0}%;background:#00C9A7"></div></div><div class="bar-val">₹${samplesCost.toLocaleString("en-IN")}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">👥 Recent Leads</div>
  <table>
    <tr><th>Name</th><th>Area</th><th>Stage</th><th>Telecaller</th></tr>
    ${leads.slice(0,10).map(l => `<tr><td><strong>${l.name||""}</strong></td><td>${l.area||""}</td><td>${l.stage||""}</td><td>${l.telecaller||""}</td></tr>`).join("")}
    ${leads.length === 0 ? "<tr><td colspan='4' style='text-align:center;color:#999'>No leads recorded</td></tr>" : ""}
  </table>
</div>

<div class="footer">
  <div>Generated by <strong>Sridhi Ventures BOS v3.0</strong></div>
  <div>Confidential · Internal Use Only</div>
  <div>${today}</div>
</div>

</body>
</html>`;

    const blob = new Blob([html], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => { w.print(); };
    }
    setTimeout(() => { URL.revokeObjectURL(url); setExporting(false); }, 3000);
  };

  // ── CSV Export ──
  const downloadCSV = () => {
    setExporting(true);
    const rows = [
      ["Name","Contact","Business","Area","Stage","Source","Telecaller","Last Contact","Priority"],
      ...leads.map(l => [l.name,l.contact,l.business,l.area,l.stage,l.source,l.telecaller,l.lastContact,l.priority])
    ];
    const csv = rows.map(r => r.map(c => `"${c||""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sridhi-leads-" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Card accent={T.emerald}>
        <Label sub="Live data from Google Sheets">Business Summary</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:8 }}>
          {[
            ["Leads", totalLeads, T.amber],
            ["Customers", activeCustomers, T.emerald],
            ["Conv %", convRate+"%", T.accent],
            ["Samples", samplesDelivered, T.sky],
            ["Converted", samplesConverted, T.indigo],
            ["Expenses", "₹"+totalExpenses.toLocaleString("en-IN"), T.rose],
          ].map(([l,v,c]) => (
            <div key={l} style={{ textAlign:"center", background:T.surface, borderRadius:12, padding:"12px 4px" }}>
              <div style={{ fontSize:18, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:T.t3, marginTop:3, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Pipeline Status</Label>
        {["New Lead","Contacted","Interested","Sample Requested","Order Received","Active Customer","Lost Customer"].map(s => {
          const count = stageCount(s);
          const color = s==="Active Customer"||s==="Order Received" ? T.emerald : s==="Lost Customer" ? T.rose : T.sky;
          return (
            <div key={s} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12, color:T.t2 }}>{s}</span>
              <span style={{ fontSize:13, fontWeight:800, color }}>{count}</span>
            </div>
          );
        })}
      </Card>

      <Card>
        <Label>Expense Summary</Label>
        {[["Marketing", marketingExp, T.indigo],["Porter Delivery", porterExp, T.amber],["Samples", samplesCost, T.accent],["Total", totalExpenses, T.rose]].map(([l,v,c]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:12, color:T.t2, fontWeight: l==="Total"?700:400 }}>{l}</span>
            <span style={{ fontSize:13, fontWeight:800, color:c }}>₹{v.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </Card>

      <Card>
        <Label sub="Downloads real data">Export Report</Label>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={downloadPDF} disabled={exporting}
            style={{ background:"linear-gradient(135deg,#00C9A7,#10B981)", border:"none", borderRadius:14,
              color:"#060B16", padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:FONT,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {exporting ? "⏳ Generating..." : "📑 Download PDF Report"}
          </button>
          <button onClick={downloadCSV} disabled={exporting}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
              color:T.t1, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            📄 Download Leads CSV
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────
function AIAssistant() {
  const [leads] = useSheetSynced("leads","leads",[]);
  const [samples] = useSheetSynced("samples","samples",[]);
  const [expenses] = useSheetSynced("expenses","expenses",[]);
  const [repeatCustomers] = useSheetSynced("repeatCustomers","repeatCustomers",[]);
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hi! I'm your Sridhi Ventures AI. I can analyze your sales data, write call scripts, identify follow-up priorities, and give business insights. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const activeCustomers = leads.filter(l=>l.stage==="Active Customer").length;
  const callbackLeads = leads.filter(l=>l.stage==="Callback Requested");
  const sampleReqLeads = leads.filter(l=>l.stage==="Sample Requested");
  const negotiationLeads = leads.filter(l=>l.stage==="Negotiation");
  const pendingSamples = samples.filter(s=>s.status==="Pending");
  const dueToday = repeatCustomers.filter(c=>c.status==="Due Today");
  const totalExpenses = expenses.reduce((a,b)=>a+(Number(b.amount)||0),0);
  const converted2 = leads.filter(l=>["Order Received","Active Customer","Repeat Order Follow-up"].includes(l.stage)).length;
  const convRate2 = leads.length>0?Math.round(converted2/leads.length*100):0;
  const todayStr2 = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const CONTEXT = "You are an AI business assistant for Sridhi Ventures, a fresh dosa and idli batter distributor in Bengaluru, India. Answer questions using the LIVE data below. Be specific, use actual names." +
    "\n\nTODAY: " + todayStr2 +
    "\nTotal Leads: " + leads.length + " | Active Customers: " + activeCustomers + " | Conversion: " + convRate2 + "%" +
    "\nTotal Expenses: Rs." + totalExpenses.toLocaleString("en-IN") +
    "\n\nPENDING SAMPLES (" + pendingSamples.length + "):" +
    (pendingSamples.length ? "\n" + pendingSamples.map(s=>s.customer+" - "+s.qty+"KG "+s.type+(s.scheduledDate?" on "+s.scheduledDate:"")).join("\n") : " None") +
    "\n\nCALLBACK REQUESTED (" + callbackLeads.length + "):" +
    (callbackLeads.length ? "\n" + callbackLeads.slice(0,8).map(l=>l.name+" ("+l.contact+") - "+l.area).join("\n") : " None") +
    "\n\nSAMPLE REQUESTED (" + sampleReqLeads.length + "):" +
    (sampleReqLeads.length ? "\n" + sampleReqLeads.slice(0,8).map(l=>l.name+" - "+l.area).join("\n") : " None") +
    "\n\nNEGOTIATION (" + negotiationLeads.length + "):" +
    (negotiationLeads.length ? "\n" + negotiationLeads.slice(0,5).map(l=>l.name+" - "+l.remarks?.slice(-1)[0]||"").join("\n") : " None") +
    "\n\nDUE TODAY REPEAT ORDERS (" + dueToday.length + "):" +
    (dueToday.length ? "\n" + dueToday.map(c=>c.name+" - "+c.qty+"KG "+c.product).join("\n") : " None") +
    "\n\nALL LEADS (recent 15):\n" + leads.slice(0,15).map(l=>l.name+" | "+l.stage+" | "+l.telecaller+" | "+l.contact).join("\n") +
    "\n\nINSTRUCTIONS: Answer in English. Be specific and actionable. For who to call today - prioritize Callback Requested, then Sample Requested, then Negotiation. Keep answers concise.";

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content:input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE ?? "";
      const groqKey = import.meta.env.VITE_GROQ_API_KEY ?? "";
      let text = "";
      // Try backend first, fallback to direct Groq
      try {
        const r = await fetch(API_BASE + "/api/ai", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ system:CONTEXT, messages:[...messages,userMsg].map(m=>({role:m.role,content:m.content})) }),
        });
        if (r.ok) {
          const d = await r.json();
          text = d.content?.map(b=>b.text||"").join("") || d.reply || "";
        }
      } catch(e) {}
      // Fallback: direct Groq
      if (!text && groqKey) {
        const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method:"POST",
          headers:{ "Content-Type":"application/json", "Authorization":"Bearer " + groqKey },
          body:JSON.stringify({ model:"llama-3.3-70b-versatile", max_tokens:1000, messages:[{ role:"system", content:CONTEXT }, ...[...messages,userMsg].map(m=>({role:m.role,content:m.content}))] }),
        });
        const d2 = await r2.json();
        text = d2.choices?.[0]?.message?.content || "";
      }
      if (!text) text = "AI is not configured. Add ANTHROPIC_API_KEY or VITE_GROQ_API_KEY in Vercel dashboard.";
      setMessages(prev => [...prev, { role:"assistant", content:text }]);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Please check your network and try again." }]);
    }
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  };

  const QUICK = ["Who should I call first today?","Write a script for a new restaurant lead","Which channel has best ROI?","How do I close Morning Star Bakery?","Tips to improve conversion rate"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, height:"calc(100vh - 180px)" }}>
      <div style={{
        background:`linear-gradient(135deg, ${T.accentSub}, rgba(129,140,248,0.1))`,
        border:`1px solid ${T.accentGlow}`, borderRadius:16, padding:"14px 16px", marginBottom:12,
      }}>
        <div style={{ fontSize:14, fontWeight:800, color:T.accent, letterSpacing:"-0.02em" }}>AI Business Assistant</div>
        <div style={{ fontSize:11, color:T.t2, marginTop:2, fontWeight:500 }}>Powered by Claude · Knows your live business data</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, paddingBottom:12 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{
              maxWidth:"86%", padding:"12px 15px",
              borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
              background:m.role==="user" ? T.accent : T.card,
              color:m.role==="user" ? "#060B16" : T.t1,
              border:m.role==="assistant"?`1px solid ${T.border}`:"none",
              fontSize:13, lineHeight:1.6, fontWeight:m.role==="user"?600:400,
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"18px 18px 18px 4px", padding:"12px 16px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.accent, opacity:0.5, animation:"pulse 1.2s ease-in-out infinite", animationDelay:`${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length<=1 && (
        <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:10 }}>
          {QUICK.map((q,i) => (
            <button key={i} onClick={() => setInput(q)} style={{
              background:T.card, border:`1px solid ${T.border}`, borderRadius:20,
              color:T.t2, padding:"7px 13px", fontSize:11, fontWeight:600,
              cursor:"pointer", whiteSpace:"nowrap", fontFamily:FONT,
            }}>{q}</button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your business…"
          style={{ ...inputStyle, flex:1 }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{
            background: input.trim()&&!loading ? T.accent : T.border,
            color: input.trim()&&!loading ? "#060B16" : T.t2,
            border:"none", borderRadius:12, width:42, height:42, flexShrink:0,
            fontWeight:800, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>→</button>
      </div>
    </div>
  );
}


// ─── WHATSAPP TEMPLATES ──────────────────────────────────────────────────────
const PIPELINE_STAGE_LIST = [
  "All Stages","New Lead","Contacted","Interested","Callback Requested",
  "Sample Requested","Assigned to Field Sales","Sample Delivered",
  "Feedback Pending","Positive Feedback","Negotiation","Order Received",
  "Repeat Order Follow-up","Active Customer","Lost Customer","Invalid Number",
];

const DEFAULT_TEMPLATES = [
  { id:1, name:"Introduction", stage:"New Lead", message:"Hi {customer_name}, I\'m calling from Sridhi Ventures, Bengaluru. We supply fresh dosa & idli batter to restaurants. Would you be interested in a free 3 KG trial? 🙏" },
  { id:2, name:"Sample Follow-up", stage:"Sample Requested", message:"Hello {customer_name} ji, your {product} sample is ready! Our executive {executive} will deliver it to {address} today. Please confirm your availability 🙏" },
  { id:3, name:"Feedback Request", stage:"Sample Delivered", message:"Namaste {customer_name} ji! Hope you enjoyed our {product} sample. Did it meet your quality expectations? We can offer {qty} KG/week at great prices 😊" },
  { id:4, name:"Order Confirmation", stage:"Order Received", message:"Thank you {customer_name} ji! 🎉 Your order of {qty} KG {product} is confirmed. We will deliver fresh tomorrow morning. Sridhi Ventures!" },
  { id:5, name:"Reorder Reminder", stage:"Repeat Order Follow-up", message:"Hello {customer_name} ji, Sridhi Ventures here! Your regular {product} order is due. Shall we arrange {qty} KG delivery? Reply YES to confirm 🙏" },
];

const WA_VARIABLES = ["{customer_name}","{product}","{qty}","{address}","{executive}","{contact}","{area}","{stage}"];

function fillTemplate(msg, lead) {
  if (!lead) return msg;
  return msg
    .replace(/{customer_name}/g, lead.name || "")
    .replace(/{product}/g, lead.type || "Dosa Batter")
    .replace(/{qty}/g, "10")
    .replace(/{address}/g, lead.address || lead.area || "")
    .replace(/{executive}/g, lead.telecaller || "")
    .replace(/{contact}/g, lead.contact || "")
    .replace(/{area}/g, lead.area || "")
    .replace(/{stage}/g, lead.stage || "");
}

function sendWhatsApp(template, lead) {
  const msg = fillTemplate(template.message, lead);
  const phone = (lead.contact || "").replace(/[^0-9]/g,"");
  const number = phone.startsWith("91") ? phone : "91" + phone;
  window.open("https://wa.me/" + number + "?text=" + encodeURIComponent(msg), "_blank");
}

function loadWATemplates() {
  try { const s = localStorage.getItem("wa_templates"); return s ? JSON.parse(s) : DEFAULT_TEMPLATES; } catch { return DEFAULT_TEMPLATES; }
}
function saveWATemplates(t) {
  try { localStorage.setItem("wa_templates", JSON.stringify(t)); } catch {}
}

// ── Edit Form subcomponent ──
function WAEditForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name:"", stage:"New Lead", message:"" });
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onCancel}
          style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, color:T.t2, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:FONT }}>← Back</button>
        <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>{initial ? "Edit Template" : "New Template"}</div>
      </div>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>TEMPLATE NAME</div>
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})}
            placeholder="e.g. Sample Follow-up"
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
        </div>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>PIPELINE STAGE</div>
          <select value={form.stage} onChange={e => setForm({...form, stage:e.target.value})}
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
            {PIPELINE_STAGE_LIST.filter(s => s !== "All Stages").map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>MESSAGE</div>
          <textarea value={form.message} onChange={e => setForm({...form, message:e.target.value})}
            rows={6} placeholder="Type your WhatsApp message..."
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical" }} />
        </div>
        <div>
          <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:6 }}>INSERT VARIABLE</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {WA_VARIABLES.map(v => (
              <button key={v} onClick={() => setForm({...form, message: form.message + v})}
                style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8,
                  color:T.accent, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {form.message && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:10 }}>
            <div style={{ fontSize:10, color:T.accent, fontWeight:700, marginBottom:4 }}>PREVIEW</div>
            <div style={{ fontSize:12, color:T.t2, lineHeight:1.6 }}>{form.message}</div>
          </div>
        )}
      </div>
      <button onClick={() => onSave(form)} disabled={!form.name || !form.message}
        style={{ background: form.name && form.message ? T.accent : T.border, border:"none", borderRadius:14,
          color: form.name && form.message ? "#060B16" : T.t3, padding:"14px", fontSize:14, fontWeight:800,
          cursor: form.name && form.message ? "pointer" : "default", fontFamily:FONT }}>
        Save Template
      </button>
    </div>
  );
}

// ── Send View subcomponent ──
function WASendView({ template, leads, onBack }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = leads.filter(l =>
    (template.stage === "All Stages" || l.stage === template.stage) &&
    (search === "" || (l.name||"").toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onBack}
          style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, color:T.t2, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:FONT }}>← Back</button>
        <div style={{ fontSize:14, fontWeight:700, color:T.t1 }}>Send: {template.name}</div>
      </div>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:14 }}>
        <div style={{ fontSize:11, color:T.accent, fontWeight:700, marginBottom:8 }}>MESSAGE PREVIEW</div>
        <div style={{ fontSize:12, color:T.t2, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
          {selectedLead ? fillTemplate(template.message, selectedLead) : template.message}
        </div>
      </div>
      <div style={{ fontSize:11, color:T.t3, fontWeight:700 }}>SELECT LEAD TO SEND</div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lead name..."
        style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto" }}>
        {filtered.map(lead => (
          <div key={lead.id} onClick={() => setSelectedLead(lead)}
            style={{ background: selectedLead?.id === lead.id ? T.accentSub : T.card,
              border:`1px solid ${selectedLead?.id === lead.id ? T.accent : T.border}`,
              borderRadius:12, padding:"10px 14px", cursor:"pointer" }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{lead.name}</div>
            <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{lead.stage} · {lead.contact}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign:"center", color:T.t3, fontSize:12, padding:20 }}>No leads found</div>}
      </div>
      {selectedLead && (
        <button onClick={() => sendWhatsApp(template, selectedLead)}
          style={{ background:"#25D366", border:"none", borderRadius:14, color:"white",
            padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:FONT,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          📲 Open WhatsApp & Send
        </button>
      )}
    </div>
  );
}

function WhatsAppTemplates() {
  const [templates, setTemplates] = useState(loadWATemplates);
  const [leads] = useSheetSynced("leads","leads", []);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [sending, setSending] = useState(null);
  const [filterStage, setFilterStage] = useState("All Stages");
  const [search, setSearch] = useState("");

  function updateTemplates(t) { setTemplates(t); saveWATemplates(t); }

  function handleSave(form) {
    if (form.id) {
      updateTemplates(templates.map(x => x.id === form.id ? form : x));
    } else {
      updateTemplates([...templates, { ...form, id: Date.now() }]);
    }
    setView("list"); setEditing(null);
  }

  function deleteTemplate(id) { updateTemplates(templates.filter(t => t.id !== id)); }

  if (view === "edit") return <WAEditForm initial={editing} onSave={handleSave} onCancel={() => { setView("list"); setEditing(null); }} />;
  if (view === "send" && sending) return <WASendView template={sending} leads={leads} onBack={() => { setView("list"); setSending(null); }} />;

  const filtered = templates.filter(t =>
    (filterStage === "All Stages" || t.stage === filterStage) &&
    (search === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:T.t1 }}>WA Templates</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>{templates.length} templates · tap to send</div>
        </div>
        <button onClick={() => { setEditing(null); setView("edit"); }}
          style={{ background:T.accent, border:"none", borderRadius:12, color:"#060B16", padding:"8px 16px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
          + New
        </button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
        style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
        {["All Stages","New Lead","Sample Requested","Order Received","Active Customer"].map(s => (
          <button key={s} onClick={() => setFilterStage(s)}
            style={{ background: filterStage===s ? T.accent : T.card, border:`1px solid ${filterStage===s ? T.accent : T.border}`,
              borderRadius:20, color: filterStage===s ? "#060B16" : T.t2, padding:"5px 12px", fontSize:11,
              fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontFamily:FONT }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(t => (
          <div key={t.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:T.t1 }}>{t.name}</div>
                <div style={{ fontSize:11, color:T.accent, fontWeight:600, marginTop:2 }}>{t.stage}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => { setEditing(t); setView("edit"); }}
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, color:T.t2, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:FONT }}>Edit</button>
                <button onClick={() => deleteTemplate(t.id)}
                  style={{ background:"rgba(244,63,94,0.1)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:8, color:T.rose, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:FONT }}>Del</button>
              </div>
            </div>
            <div style={{ fontSize:12, color:T.t3, lineHeight:1.5, marginBottom:10, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{t.message}</div>
            <button onClick={() => { setSending(t); setView("send"); }}
              style={{ background:"#25D366", border:"none", borderRadius:10, color:"white", padding:"8px 16px",
                fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONT, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              📲 Send to Lead
            </button>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign:"center", color:T.t3, fontSize:13, padding:40 }}>No templates found</div>}
      </div>
    </div>
  );
}


// ─── NAV ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Home",     icon:"dashboard" },
  { id:"leads",     label:"CRM",      icon:"crm"       },
  { id:"pipeline",  label:"Pipeline", icon:"pipeline"  },
  { id:"fieldsync", label:"Field",    icon:"field"     },
  { id:"more",      label:"More",     icon:"more"      },
];
const MORE_MENU = [
  { id:"samples",   label:"Samples",       icon:"🧪" },
  { id:"repeat",    label:"Repeat Orders", icon:"🔁" },
  { id:"expenses",  label:"Expenses",      icon:"💸" },
  { id:"marketing", label:"Marketing",     icon:"📢" },
  { id:"reports",   label:"Reports",       icon:"📈" },
  { id:"today",     label:"Today Tasks",    icon:"📅"  },
  { id:"prospects",  label:"Find Prospects", icon:"🗺️"  },
  { id:"hrleads",   label:"HR Leads",       icon:"📋"  },
  { id:"whatsapp",  label:"WA Templates",  icon:"💬"  },
  { id:"ai",        label:"AI Assistant",  icon:"✦"  },
];

// SVG icons for nav
function NavIcon({ id, active }) {
  const col = active ? T.accent : T.t3;
  const icons = {
    dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    crm:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    pipeline:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    field:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
    more:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };
  return icons[id] || null;
}

// ─── ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [role, setRole] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const contentRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setShowInstall(false);
    setInstallPrompt(null);
  };

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [activeTab]);

  const tabLabel = { dashboard:"Dashboard", leads:"Leads CRM", pipeline:"Pipeline", fieldsync:"Field Sync", samples:"Samples", repeat:"Repeat Orders", expenses:"Expenses", marketing:"Marketing", reports:"Reports", ai:"AI Assistant", whatsapp:"WA Templates", hrleads:"HR Leads", today:"Today Tasks", prospects:"Find Prospects" };

  // ── INSTALL BANNER ──
  const InstallBanner = () => showInstall ? (
    <div style={{
      position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
      width:"calc(100% - 32px)", maxWidth:448, zIndex:999,
      background:"linear-gradient(135deg, #0F1C33, #132038)",
      border:`1px solid ${T.accentGlow}`, borderRadius:18,
      padding:"14px 16px", display:"flex", alignItems:"center", gap:12,
      boxShadow:`0 8px 32px rgba(0,201,167,0.2)`,
    }}>
      <div style={{ width:42, height:42, borderRadius:12, background:T.accentSub,
        border:`1px solid ${T.accentGlow}`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:22, flexShrink:0 }}>⚡</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:800, color:T.t1 }}>Install Sridhi BOS</div>
        <div style={{ fontSize:11, color:T.t3, marginTop:2 }}>Add to home screen for quick access</div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => setShowInstall(false)}
          style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8,
            color:T.t3, padding:"6px 10px", fontSize:11, cursor:"pointer", fontFamily:FONT }}>Later</button>
        <button onClick={handleInstall}
          style={{ background:T.accent, border:"none", borderRadius:8,
            color:"#060B16", padding:"6px 12px", fontSize:11, fontWeight:800,
            cursor:"pointer", fontFamily:FONT }}>Install</button>
      </div>
    </div>
  ) : null;

  // ── LOGIN ──
  if (!role) {
    return (
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:FONT }}>
        <div style={{ position:"fixed", top:"10%", left:"50%", transform:"translateX(-50%)", width:360, height:360, borderRadius:"50%", background:`radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:44 }}>
          <div style={{
            width:56, height:56, borderRadius:16, background:T.accentSub,
            border:`1px solid ${T.accentGlow}`, display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", fontSize:26,
          }}>⚡</div>
          <div style={{ fontSize:28, fontWeight:900, color:T.t1, letterSpacing:"-0.04em" }}>Sridhi Ventures</div>
          <div style={{ fontSize:11, color:T.accent, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:6 }}>Business Operating System</div>
          <div style={{ fontSize:11, color:T.t3, marginTop:6, fontWeight:500 }}>Bengaluru · Food Distribution</div>
        </div>
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { label:"Admin",      desc:"Full access — all modules & reports",    color:T.accent,  icon:"🛡️" },
            { label:"Telecaller", desc:"Leads, CRM, pipeline & follow-ups",      color:T.indigo,  icon:"📞" },
            { label:"Field Sales",desc:"Tasks, deliveries & order collection",   color:T.emerald, icon:"🚗" },
            { label:"Management", desc:"Reports, analytics & dashboards",        color:T.amber,   icon:"📊" },
          ].map(r => (
            <button key={r.label} onClick={() => setRole(r.label)}
              style={{
                background:T.card, border:`1px solid ${T.border}`, borderRadius:18,
                padding:"15px 18px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:14, textAlign:"left", fontFamily:FONT,
                transition:"border-color 0.15s",
              }}>
              <div style={{
                width:44, height:44, borderRadius:12, background:r.color+"18",
                border:`1px solid ${r.color}30`, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:20, flexShrink:0,
              }}>{r.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:800, color:T.t1, letterSpacing:"-0.01em" }}>{r.label}</div>
                <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{r.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
        {installPrompt && (
          <button onClick={handleInstall}
            style={{ position:"relative", zIndex:1, marginTop:16, background:"#25D366", border:"none",
              borderRadius:14, color:"white", padding:"12px 28px", fontSize:14, fontWeight:800,
              cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", gap:8 }}>
            📲 Install App on This Device
          </button>
        )}
        <div style={{ position:"relative", zIndex:1, marginTop:16, fontSize:11, color:T.t4, fontWeight:500 }}>Sridhi Ventures BOS v3.0</div>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "leads":     return <Leads />;
      case "pipeline":  return <Pipeline />;
      case "fieldsync": return <FieldSync />;
      case "samples":   return <Samples />;
      case "repeat":    return <RepeatOrders />;
      case "expenses":  return <Expenses />;
      case "marketing": return <Marketing />;
      case "reports":   return <Reports />;
      case "today":     return <TodayTasks />;
      case "prospects":  return <ProspectFinder />;
      case "hrleads":   return <HRLeads />;
      case "whatsapp":  return <WhatsAppTemplates />;
      case "ai":        return <AIAssistant />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.t1, fontFamily:FONT, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        select option { background: #0C1526; }
        @keyframes pulse { 0%,100% { opacity:0.25; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.1); } }
        input::placeholder { color: #3A5578; }
        textarea::placeholder { color: #3A5578; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #0C1526 inset; -webkit-text-fill-color: #F0F6FF; }
      `}</style>

      {/* Header */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:80, backdropFilter:"blur(12px)" }}>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:T.t1, letterSpacing:"-0.03em" }}>Sridhi BOS</div>
          <div style={{ fontSize:10, color:T.t3, marginTop:1, fontWeight:500, letterSpacing:"0.02em", textTransform:"uppercase" }}>{tabLabel[activeTab]}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {installPrompt && (
            <button onClick={handleInstall}
              style={{ background:"#25D366", border:"none", borderRadius:8, color:"white",
                padding:"4px 10px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:FONT }}>
              📲 Install
            </button>
          )}
          <div style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:T.accent }}>{role}</div>
          <button onClick={() => setRole(null)} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, color:T.t3, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:FONT, fontWeight:600 }}>Exit</button>
        </div>
      </div>

      {/* Accent bar */}
      <div style={{ height:2, flexShrink:0, background:`linear-gradient(90deg, ${T.sky}, ${T.indigo}, ${T.accent}, ${T.emerald})` }} />

      {/* Content */}
      <div ref={contentRef} style={{ flex:1, overflowY:"auto", padding: activeTab==="ai" ? "16px 16px 0" : "16px 16px 90px" }}>
        {renderModule()}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:T.surface, borderTop:`1px solid ${T.border}`, display:"flex", padding:"10px 0 20px", zIndex:80 }}>
        {NAV.map(n => {
          const isActive = n.id==="more" ? MORE_MENU.some(m => m.id===activeTab) : activeTab===n.id;
          return (
            <button key={n.id}
              onClick={() => { if (n.id==="more") setShowMore(true); else { setActiveTab(n.id); setShowMore(false); } }}
              style={{ flex:1, background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", padding:"4px 0", position:"relative" }}>
              {isActive && (
                <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", width:20, height:2, borderRadius:1, background:T.accent, boxShadow:`0 0 8px ${T.accent}` }} />
              )}
              <NavIcon id={n.id} active={isActive} />
              <span style={{ fontSize:10, fontWeight: isActive ? 700 : 500, color: isActive ? T.accent : T.t3, letterSpacing:"0.01em" }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      <InstallBanner />

      {/* More menu */}
      <Sheet open={showMore} onClose={() => setShowMore(false)} title="All Modules">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {MORE_MENU.map(m => (
            <button key={m.id} onClick={() => { setActiveTab(m.id); setShowMore(false); }}
              style={{
                background: activeTab===m.id ? T.accentSub : T.surface,
                border:`1px solid ${activeTab===m.id ? T.accentGlow : T.border}`,
                borderRadius:16, padding:"16px 14px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:10, fontFamily:FONT,
              }}>
              <span style={{ fontSize:20 }}>{m.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color: activeTab===m.id ? T.accent : T.t1, letterSpacing:"-0.01em" }}>{m.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
