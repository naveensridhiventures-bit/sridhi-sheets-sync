import { useState, useEffect, useRef } from "react";
import { useSheets, SYNC_ENABLED } from "./useSheets.js";

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────
const T = {
  bg:       "#0A0E1A",
  surface:  "#0F1524",
  card:     "#131B2E",
  cardHigh: "#1A2438",
  glass:    "rgba(19,27,46,0.85)",

  border:   "#212D47",
  borderHi: "#2E3D5C",

  accent:    "#1FE0B8",
  accentSub: "rgba(31,224,184,0.12)",
  accentGlow:"rgba(31,224,184,0.38)",

  emerald:  "#22D98A",
  amber:    "#FBBF24",
  rose:     "#FB7185",
  indigo:   "#818CF8",
  sky:      "#38BDF8",
  orange:   "#FB923C",

  t1: "#F1F5F9",
  t2: "#94A3B8",
  t3: "#64748B",
  t4: "#3B4A6B",
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

// ── Follow-up timing helpers ──────────────────────────────────────────────
function daysSince(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}
function formatLastContact(ts, fallback) {
  if (!ts) return fallback || "Not contacted";
  const days = daysSince(ts);
  if (days === 0) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    return hrs + "h ago";
  }
  if (days === 1) return "Yesterday";
  return days + " days ago";
}
const FOLLOWUP_OVERDUE_DAYS = 3;
const TERMINAL_STAGES = ["Lost Customer", "Invalid Number"];
function isFollowUpOverdue(lead) {
  if (!lead || TERMINAL_STAGES.includes(lead.stage)) return false;
  const ts = lead.lastContactAt || lead.createdAt;
  if (!ts) return true; // never logged a contact at all
  return daysSince(ts) > FOLLOWUP_OVERDUE_DAYS;
}
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
    error:   { label: "Retrying save…", color: T.rose   },
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
function leadTypeIcon(type) {
  const map = {
    Restaurant: "🍽️", Mess: "🍲", Hotel: "🏨", Bakery: "🥐",
    "Cloud Kitchen": "👨‍🍳", Distributor: "📦", Retailer: "🏪",
  };
  return map[type] || "🏢";
}

// ─── DESIGN PRIMITIVES ────────────────────────────────────────────────────
function Card({ children, style = {}, accent, noPad, id }) {
  return (
    <div id={id} style={{
      background: T.card,
      border: `1px solid ${accent ? accent + "30" : T.border}`,
      borderRadius: 20,
      padding: noPad ? 0 : "18px 18px",
      boxShadow: accent ? `0 0 32px ${accent}12` : "0 1px 3px rgba(15,23,42,0.08)",
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

// ─── STAT CARD (gradient tinted, icon circle + big number) ───────────────
function MobileStatCard({ icon, title, value, sub, color }) {
  return (
    <div style={{
      flex:"1 1 190px", minWidth:170, borderRadius:16, padding:16,
      background:`radial-gradient(130% 130% at 12% 15%, ${color}3D 0%, ${color}14 32%, ${T.card} 62%)`,
      border:`1px solid ${color}40`, position:"relative", overflow:"hidden",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{
          width:36, height:36, borderRadius:11, flexShrink:0,
          background:`linear-gradient(135deg, ${color}F2 0%, ${color}B8 100%)`, boxShadow:`0 4px 12px ${color}4D`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
        }}>{icon}</div>
        <div style={{ fontSize:12, fontWeight:700, color:T.t1 }}>{title}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color:T.t1, letterSpacing:"-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.t3, marginTop:3, fontWeight:500 }}>{sub}</div>}
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
  const [leads] = useSheetSynced("leads","leads",[]);
  const [samples] = useSheetSynced("samples","samples",[]);
  const [expenses] = useSheetSynced("expenses","expenses",[]);
  const [repeatCustomers] = useSheetSynced("repeatCustomers","repeatCustomers",[]);

  // ── Live KPI calculations ──
  const activeLeads = (leads||[]).filter(l => l && l.name && l.stage);
  const activeCustomers = activeLeads.filter(l => l.stage === "Active Customer").length;
  const ordersReceived = activeLeads.filter(l => ["Order Received","Active Customer","Repeat Order Follow-up"].includes(l.stage));
  const converted = ordersReceived.length;
  const convRate = activeLeads.length > 0 ? Math.round((converted/activeLeads.length)*100) : 0;

  // Sales KG - from samples delivered + pipeline kgQty
  const samplesDeliveredKg = (samples||[]).filter(s => s.status==="Delivered").reduce((a,b) => a+(Number(b.qty)||0), 0);
  // Sum KG from all order-stage leads (kgQty field entered during delivery)
  const orderKg = activeLeads
    .filter(l => ["Order Received","Active Customer","Repeat Order Follow-up"].includes(l.stage))
    .reduce((a,l) => {
      // Try kgQty field first, then parse from remarks
      const fromField = Number(l.kgQty) || 0;
      if (fromField > 0) return a + fromField;
      // Try to extract KG from last remark e.g. "10 KG ORDER"
      const lastRemark = (l.remarks||[]).slice(-1)[0] || "";
      const match = lastRemark.match(/(\d+)\s*(?:kg|KG|Kg)/);
      return a + (match ? Number(match[1]) : 0);
    }, 0);
  const totalKg = samplesDeliveredKg + orderKg;

  // Revenue - KG * price (₹120/kg default)
  const pricePerKg = 120;
  const totalRevenue = totalKg * pricePerKg;

  // Expenses from expense tab
  const totalExpenses = (expenses||[]).reduce((a,b) => a+(Number(b.amount)||0), 0);
  const deliveryExp = (expenses||[]).filter(e => e.type==="Delivery" || e.subtype==="Porter").reduce((a,b) => a+(Number(b.amount)||0), 0);
  const marketingExp = (expenses||[]).filter(e => e.type==="Marketing").reduce((a,b) => a+(Number(b.amount)||0), 0);
  const sampleExp = (samples||[]).reduce((a,b) => a+(Number(b.deliveryCost)||0)+(Number(b.productionCost)||0), 0);
  const estProfit = totalRevenue - totalExpenses - sampleExp;

  // Samples
  const samplesSentKg = (samples||[]).reduce((a,b) => a+(Number(b.qty)||0), 0);

  // Pipeline stage counts
  const stageCounts = {};
  activeLeads.forEach(l => { stageCounts[l.stage] = (stageCounts[l.stage]||0) + 1; });
  const liveStages = PIPELINE_STAGES.map(s => ({ ...s, count: stageCounts[s.id]||0 }));

  // Due today repeat orders
  const dueToday = (repeatCustomers||[]).filter(c => c.status === "Due Today");

  // Expense segments for donut
  const expSegs = [
    { label:"Marketing", value:marketingExp, color:T.indigo },
    { label:"Delivery",  value:deliveryExp,  color:T.amber  },
    { label:"Samples",   value:sampleExp,    color:T.accent },
    { label:"Staff",     value:Math.max(0, totalExpenses - marketingExp - deliveryExp), color:T.sky },
  ];
  const totalExp = expSegs.reduce((a,b) => a+b.value, 0);

  const thisMonth = new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      <BatterGrinderHero theme={T} kgToday={totalKg} compact />

      {/* KPIs */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Sales this month" value={totalKg}   unit="KG" change={0} color={T.accent}  icon="📦" />
        <KPI label="Revenue"          value={totalRevenue}  unit="₹" change={0} color={T.emerald} icon="💰" />
        <KPI label="Active customers" value={activeCustomers} change={0} color={T.indigo} icon="🏪" />
        <KPI label="Total Leads"      value={activeLeads.length} change={0} color={T.amber} icon="📋" />
        <KPI label="Orders"           value={ordersReceived.length} change={0} color={T.emerald} icon="📦" />
        <KPI label="Conversion"       value={convRate+"%"} change={0} color={T.accent} icon="🎯" />
        <KPI label="Samples sent"     value={samplesSentKg} unit="KG" change={0} color={T.orange} icon="🧪" />
        <KPI label="Total Expenses"   value={totalExpenses} unit="₹" change={0} color={T.rose} icon="💸" />
        <KPI label="Est. profit"      value={estProfit} unit="₹" change={0} color={T.emerald} icon="📈" />
      </div>

      {/* Pipeline live */}
      <Card>
        <Label sub={`${activeLeads.length} total leads across all stages`}>Telecalling Pipeline</Label>
        <PipelineStrip stages={liveStages} />
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
          {liveStages.filter(s => s.count > 0).map(s => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:7,height:7,borderRadius:2,background:s.color }} />
              <span style={{ fontSize:10, color:T.t3 }}>{s.id} {s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Orders summary */}
      <Card accent={T.emerald}>
        <Label sub={thisMonth}>Orders & Revenue</Label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:8 }}>
          {[
            ["Orders", ordersReceived.length, T.emerald],
            ["KG Sold", totalKg > 0 ? totalKg : "—", T.accent],
            ["Revenue", totalRevenue > 0 ? "₹"+(totalRevenue/1000).toFixed(1)+"K" : "—", T.emerald],
            ["Samples", (samples||[]).length, T.orange],
            ["Expenses", "₹"+(totalExpenses/1000).toFixed(1)+"K", T.rose],
            ["Profit", estProfit > 0 ? "₹"+(estProfit/1000).toFixed(1)+"K" : "—", T.sky],
          ].map(([l,v,c]) => (
            <div key={l} style={{ textAlign:"center", background:T.surface, borderRadius:12, padding:"10px 4px" }}>
              <div style={{ fontSize:16, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:T.t3, marginTop:2, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
        {ordersReceived.length > 0 && (
          <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:10 }}>
            <div style={{ fontSize:10, color:T.t3, fontWeight:700, marginBottom:6 }}>RECENT ORDERS</div>
            {ordersReceived.slice(0,5).map((l,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:12, color:T.t1, fontWeight:600 }}>{l.name}</span>
                <span style={{ fontSize:11, color:T.accent, fontWeight:700 }}>
                  {l.kgQty ? l.kgQty+"KG" : l.remarks?.slice(-1)[0]?.match(/(\d+)\s*(?:kg|KG)/)?.[0] || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Repeat order alerts */}
      <Card accent={T.amber}>
        <Label sub="Customers due for re-order today">Re-order Alerts</Label>
        {dueToday.length === 0 && <div style={{ fontSize:12, color:T.t3, padding:"8px 0" }}>No re-orders due today</div>}
        {dueToday.map(c => (
          <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
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
        <Label sub={thisMonth}>Expense Breakdown</Label>
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


// ─── CALL LOG DIALOG ──────────────────────────────────────────────────────
// Structured call-outcome capture: did they answer? If yes, confirm/update
// their details + a note. If no, pick a reason. Both paths stamp a real
// timestamp so "last followup" and overdue reminders are accurate.
const CALL_NOT_ANSWERED_REASONS = ["No Answer", "Wrong Number", "Switched Off", "Number Busy", "Call Back Later"];

function CallLogDialog({ lead, onClose, onSubmit }) {
  const [step, setStep] = useState("ask"); // ask | answered | notAnswered
  const [name, setName] = useState(lead.name || "");
  const [business, setBusiness] = useState(lead.business || "");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(null);

  const submitAnswered = () => onSubmit({ outcome: "Answered", name: name.trim() || lead.name, business: business.trim() || lead.business, note: note.trim() });
  const submitNotAnswered = () => { if (reason) onSubmit({ outcome: reason, name: lead.name, business: lead.business, note: "" }); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(6,11,22,0.92)", zIndex:210, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:T.card, borderRadius:"20px 20px 0 0", padding:20, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", paddingBottom:36 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.t1 }}>📞 Log Call — {lead.name}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.t3, fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        {step === "ask" && (
          <>
            <div style={{ fontSize:13, color:T.t2, marginBottom:16 }}>Did the customer answer the call?</div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn label="✅ Answered" color={T.emerald} full onClick={() => setStep("answered")} />
              <Btn label="❌ Not Answered" color={T.rose} full onClick={() => setStep("notAnswered")} />
            </div>
          </>
        )}

        {step === "answered" && (
          <>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>CUSTOMER NAME</div>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>BUSINESS NAME</div>
              <input value={business} onChange={e => setBusiness(e.target.value)}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:5 }}>CALL NOTES</div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="What did they say?"
                style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:12, color:T.t1, fontSize:13, resize:"none", outline:"none", boxSizing:"border-box", height:72, fontFamily:FONT }} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn label="← Back" color={T.t2} ghost full onClick={() => setStep("ask")} />
              <Btn label="✓ Save" full color={T.accent} onClick={submitAnswered} />
            </div>
          </>
        )}

        {step === "notAnswered" && (
          <>
            <div style={{ fontSize:11, color:T.t3, fontWeight:700, marginBottom:10 }}>WHY NOT ANSWERED?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              {CALL_NOT_ANSWERED_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  style={{
                    padding:"10px 12px", borderRadius:10, textAlign:"left", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:FONT,
                    border:`1px solid ${reason===r ? T.accent : T.border}`,
                    background: reason===r ? T.accentSub : T.surface,
                    color: reason===r ? T.accent : T.t1,
                  }}>{r}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn label="← Back" color={T.t2} ghost full onClick={() => setStep("ask")} />
              <Btn label="✓ Save" full color={T.accent} onClick={submitNotAnswered} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Leads() {
  const [leads, setLeads, leadsSyncStatus] = useSheetSynced("leads", "leads", INITIAL_LEADS);
  const [expenses, setExpenses] = useSheetSynced("expenses", "expenses", INITIAL_EXPENSES);
  const [repeatCustomers, setRepeatCustomers] = useSheetSynced("repeatCustomers", "repeatCustomers", []);
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
  const [newLeadToast, setNewLeadToast] = useState(null);
  const [callLogFor, setCallLogFor] = useState(null);
  const seenLeadIds = useRef(null);

  // ── Pop in a small toast whenever a lead appears that we haven't seen before ──
  useEffect(() => {
    const ids = leads.map(l => l.contact || l.id).filter(Boolean);
    let isFirstEver = false;
    if (seenLeadIds.current === null) {
      // First mount — load baseline from localStorage (persists across tab switches/remounts).
      // Only treat as "nothing to compare" if there's truly no stored baseline yet.
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem("bos_seen_lead_ids") || "null"); } catch {}
      if (stored && Array.isArray(stored)) {
        seenLeadIds.current = new Set(stored);
      } else {
        seenLeadIds.current = new Set(ids);
        isFirstEver = true;
      }
    }
    if (isFirstEver) {
      try { localStorage.setItem("bos_seen_lead_ids", JSON.stringify(ids)); } catch {}
      return;
    }
    const fresh = leads.find(l => (l.contact || l.id) && !seenLeadIds.current.has(l.contact || l.id));
    if (fresh) {
      setNewLeadToast(fresh);
      const t = setTimeout(() => setNewLeadToast(null), 6000);
      ids.forEach(id => seenLeadIds.current.add(id));
      try { localStorage.setItem("bos_seen_lead_ids", JSON.stringify([...seenLeadIds.current])); } catch {}
      return () => clearTimeout(t);
    } else {
      ids.forEach(id => seenLeadIds.current.add(id));
      try { localStorage.setItem("bos_seen_lead_ids", JSON.stringify([...seenLeadIds.current])); } catch {}
    }
  }, [leads]);

  const overdueCount = leads.filter(isFollowUpOverdue).length;

  const filtered = leads.filter(l =>
    l && l.name && l.stage &&
    (filterStage==="All" ? true : filterStage==="Needs Follow-up" ? isFollowUpOverdue(l) : l.stage===filterStage) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
     (l.area||"").toLowerCase().includes(search.toLowerCase()) ||
     (l.contact||"").includes(search))
  );

  const addRemark = (id, role) => {
    if (!remark.trim()) return;
    const now = new Date();
    const stamp = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) + " " + now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const remarkWithStamp = "[" + stamp + " · " + (role||"Team") + "] " + remark.trim();
    setLeads(leads.map(l => ((l.contact && l.contact===id) || l.id===id) ? { ...l, remarks:[...(l.remarks||[]),remarkWithStamp], lastContact:"Today", lastContactAt:Date.now() } : l));
    setRemark("");
  };

  // ── Structured call outcome logging ──
  const logCall = (lead, result) => {
    const now = new Date();
    const stamp = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) + " " + now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const remarkText = "[" + result.outcome + "]" + (result.note ? " " + result.note : "");
    const remarkWithStamp = "[" + stamp + " · " + (lead.telecaller||"Team") + "] " + remarkText;
    setLeads(leads.map(l => l.id===lead.id ? {
      ...l,
      name: result.name || l.name,
      business: result.business || l.business,
      remarks: [...(l.remarks||[]), remarkWithStamp],
      lastContact: "Today",
      lastContactAt: Date.now(),
      callOutcome: result.outcome,
      stage: result.outcome === "Call Back Later" ? "Callback Requested" : l.stage,
    } : l));
    setCallLogFor(null);
  };

  const updateStage = (key, stage) => {
    const lead = leads.find(l => (l.contact && l.contact===key) || l.id===key);
    if ((stage === "Sample Requested" || stage === "Order Received") && lead) {
      setDeliveryDialog({ lead, targetStage: stage });
      setPorterAmt("");
      setKgQty("");
    } else {
      setLeads(leads.map(l => {
        const match = (l.contact && l.contact===key) || l.id===key;
        return match ? { ...l, stage, lastContact:"Today", lastContactAt:Date.now() } : l;
      }));
    }
  };

  const confirmDelivery = (method) => {
    if (!deliveryDialog) return;
    const { lead, targetStage } = deliveryDialog;
    const isOrder = targetStage === "Order Received";
    const newOrderCount = (lead.orderCount || 0) + (isOrder ? 1 : 0);
    // More than 3 orders → auto-promote to a repeat customer instead of staying in the one-off pipeline.
    const promoteToRepeat = isOrder && newOrderCount > 3;
    const finalStage = promoteToRepeat ? "Active Customer" : targetStage;
    // Update lead stage — also actually save the KG entered here (previously only used in the WhatsApp message text)
    setLeads(leads.map(l => l.id===lead.id ? {
      ...l,
      stage: finalStage,
      lastContact: "Today",
      lastContactAt: Date.now(),
      orderCount: newOrderCount,
      kgQty: kgQty ? Number(kgQty) : l.kgQty,
    } : l));
    // Log expense if Porter
    if (method === "porter" && porterAmt) {
      const newExp = {
        id: expenses.length + Date.now(),
        category: "Porter Delivery — " + lead.name,
        amount: parseInt(porterAmt) || 0,
        date: todayISO(),
        type: "Delivery",
        subtype: "Porter"
      };
      setExpenses([newExp, ...expenses]);
    }
    if (promoteToRepeat) {
      const alreadyRepeat = (repeatCustomers||[]).some(c => c.contact === lead.contact);
      if (!alreadyRepeat) {
        const todayStr = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
        setRepeatCustomers([{
          id: Date.now(),
          name: lead.name,
          area: lead.area || "",
          contact: lead.contact,
          product: "Dosa Batter",
          qty: parseInt(kgQty) || 0,
          frequency: "Weekly",
          status: "Upcoming",
          lastOrder: todayStr,
          nextDue: todayStr,
          revenue: 0,
        }, ...(repeatCustomers||[])]);
      }
    }
    setGroupMsg({ lead, targetStage: finalStage, method, kgQty });
    setDeliveryDialog(null);
    setPorterAmt("");
    setKgQty("");
  };
  const addLead = () => {
    if (!newLead.name || !newLead.contact) return;
    setLeads([{ ...newLead, id:leads.length+1, stage:"New Lead", lastContact:"Today", lastContactAt:Date.now(), createdAt:Date.now(), orderCount:0, priority:"Medium", remarks:[] }, ...leads]);
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

  // ── Overlays (render on top of whatever view is active) ──
  const renderDeliveryOverlay = () => {
    if (!deliveryDialog) return null;
    const { lead, targetStage } = deliveryDialog;
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(6,11,22,0.92)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ background:T.card, borderRadius:"20px 20px 0 0", padding:20, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", paddingBottom:36 }}>
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
            <div style={{ background:T.surface, border:`1px solid ${T.borderHi}`, borderRadius:14, padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ fontSize:24 }}>🛵</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:T.t1 }}>Porter</div>
                  <div style={{ fontSize:11, color:T.t3 }}>3rd party delivery — cost logged as expense</div>
                </div>
              </div>
              <input type="number" value={porterAmt} onChange={e => setPorterAmt(e.target.value)}
                placeholder="Enter Porter cost (₹)"
                style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
                  color:T.t1, padding:"10px 12px", fontSize:14, fontFamily:FONT,
                  outline:"none", width:"100%", boxSizing:"border-box", marginBottom:10 }} />
              <button onClick={() => confirmDelivery("porter")} disabled={!porterAmt}
                style={{ background: porterAmt ? T.amber : T.border, border:"none", borderRadius:12,
                  color: porterAmt ? "#060B16" : T.t3, padding:"12px", fontSize:13, fontWeight:800,
                  cursor: porterAmt ? "pointer" : "default", fontFamily:FONT, width:"100%" }}>
                🛵 Confirm Porter — ₹{porterAmt || "0"} (logged to expenses)
              </button>
            </div>
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
  };

  if (groupMsg) {
    return <GroupMsgDialog groupMsg={groupMsg} buildGroupMsg={buildGroupMsg} onClose={() => setGroupMsg(null)} />;
  }

  if (selected) {
    const lead = leads.find(l => (l.contact && l.contact===selected) || l.id===selected);
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
              setLeads(leads.map(l => ((l.contact && l.contact===(lead.contact||lead.id)) || l.id===lead.id) ? { ...l, ...editForm } : l));
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
            {[["Contact",lead.contact],["Address",lead.address||lead.area],["Source",lead.source],["Telecaller",lead.telecaller],["Last contact",formatLastContact(lead.lastContactAt, lead.lastContact)]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11, color:T.t3, width:100, flexShrink:0, fontWeight:600 }}>{k}</span>
                <span style={{ fontSize:12, fontWeight:600, color: k==="Last contact" && isFollowUpOverdue(lead) ? T.rose : T.t1 }}>{k==="Last contact" && isFollowUpOverdue(lead) ? "⏰ " : ""}{v}</span>
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
          <div style={{ marginTop:8 }}>
            <Btn label="📝 Log Call Outcome" color={T.indigo} full onClick={() => setCallLogFor(lead)} />
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
              <button key={s.id} onClick={() => updateStage(lead.contact || lead.id, s.id)}
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
        {callLogFor && <CallLogDialog lead={callLogFor} onClose={() => setCallLogFor(null)} onSubmit={(result) => logCall(callLogFor, result)} />}
        {renderDeliveryOverlay()}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {newLeadToast && (
        <div onClick={() => { setSelected(newLeadToast.contact || newLeadToast.id); setNewLeadToast(null); }}
          style={{
            position:"fixed", top:14, left:"50%", transform:"translateX(-50%)",
            width:"calc(100% - 32px)", maxWidth:420, zIndex:999, cursor:"pointer",
            background:T.card, border:`1px solid ${T.emerald}55`, borderRadius:16,
            boxShadow:"0 10px 30px rgba(15,23,42,0.18)", padding:"12px 14px",
            display:"flex", alignItems:"center", gap:12,
          }}>
          <div style={{ width:38, height:38, borderRadius:10, background:T.emerald+"1c", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>🎉</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:800, color:T.t1 }}>New lead: {newLeadToast.name}</div>
            <div style={{ fontSize:11, color:T.t3, marginTop:1 }}>{newLeadToast.area || newLeadToast.source || "Tap to view and call"}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); const p=(newLeadToast.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
            style={{ background:T.emerald, border:"none", borderRadius:10, color:"#060B16", width:34, height:34, fontSize:15, cursor:"pointer", flexShrink:0 }}>📞</button>
        </div>
      )}
      {overdueCount > 0 && (
        <div onClick={() => setFilterStage("Needs Follow-up")}
          style={{
            background:T.rose+"14", border:`1px solid ${T.rose}44`, borderRadius:14,
            padding:"10px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer",
          }}>
          <div style={{ fontSize:18 }}>⏰</div>
          <div style={{ fontSize:12, fontWeight:700, color:T.rose }}>
            {overdueCount} lead{overdueCount!==1?"s":""} need{overdueCount===1?"s":""} follow-up — no contact in over {FOLLOWUP_OVERDUE_DAYS} days
          </div>
        </div>
      )}
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
        {["All","Needs Follow-up","New Lead","Interested","Sample Requested","Positive Feedback","Negotiation","Order Received","Active Customer","Lost Customer"].map(s => {
          const active = filterStage===s;
          const col = s==="All" ? T.accent : s==="Needs Follow-up" ? T.rose : getStageColor(s);
          return (
            <button key={s} onClick={() => setFilterStage(s)}
              style={{
                padding:"5px 12px", borderRadius:8, whiteSpace:"nowrap",
                border:`1px solid ${active ? col : T.border}`,
                background: active ? col+"1A" : "transparent",
                color: active ? col : T.t2,
                fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT,
              }}>{s==="All" ? `All (${leads.length})` : s==="Needs Follow-up" ? `⏰ Follow-up (${overdueCount})` : s}</button>
          );
        })}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:T.t3, fontWeight:500 }}>{filtered.length} lead{filtered.length!==1?"s":""}</span>
        <SyncBadge status={leadsSyncStatus} />
      </div>

      {filtered.map(lead => {
        const overdue = isFollowUpOverdue(lead);
        const stageColor = getStageColor(lead.stage);
        return (
        <div key={lead.contact || lead.id} onClick={() => setSelected(lead.contact || lead.id)}
          style={{
            background:T.card, border:`1px solid ${overdue ? T.rose+"55" : T.border}`,
            borderRadius:16, padding:16, cursor:"pointer",
            borderLeft:`4px solid ${stageColor}`,
            transition:"background 0.15s",
          }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:11, gap:10 }}>
            <div style={{ display:"flex", gap:11, alignItems:"flex-start", minWidth:0 }}>
              <div style={{
                width:42, height:42, borderRadius:12, flexShrink:0,
                background:stageColor+"1F", border:`1px solid ${stageColor}40`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
              }}>{leadTypeIcon(lead.type)}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:700, color:T.t1 }}>{lead.name}</div>
                <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{lead.type} · {lead.area}</div>
                <div style={{ marginTop:7 }}><Chip label={lead.stage} color={stageColor} /></div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
              <Chip label={lead.priority} color={getPriorityColor(lead.priority)} />
              <span style={{ fontSize:10.5, color:T.t3, fontWeight:600, whiteSpace:"nowrap" }}>{lead.contact}</span>
              <span style={{ fontSize:10.5, color: overdue ? T.rose : T.t3, fontWeight: overdue ? 700 : 500, whiteSpace:"nowrap" }}>{overdue ? "⏰ " : ""}{formatLastContact(lead.lastContactAt, lead.lastContact)}</span>
            </div>
          </div>
          {lead.remarks?.length>0 && (
            <div style={{ marginBottom:11, fontSize:11, color:T.t2, background:T.surface, borderRadius:8, padding:"7px 10px", lineHeight:1.5 }}>
              {lead.remarks[lead.remarks.length-1]}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { const p=(lead.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
              style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background:T.emerald+"14", border:`1px solid ${T.emerald}33`, borderRadius:10,
                color:T.emerald, padding:"10px 0", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONT,
              }}>📞 Call</button>
            <button onClick={() => setCallLogFor(lead)}
              style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background:T.indigo+"14", border:`1px solid ${T.indigo}33`, borderRadius:10,
                color:T.indigo, padding:"10px 0", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FONT,
              }}>📝 Log Call</button>
            <select value={lead.stage} onChange={e => updateStage(lead.contact || lead.id, e.target.value)}
              style={{
                flex:1.4, background:stageColor+"14", border:`1px solid ${stageColor}33`, borderRadius:10,
                color:stageColor, padding:"10px 6px", fontSize:12, fontWeight:700, cursor:"pointer",
                fontFamily:FONT, appearance:"none", textAlign:"center",
              }}>
              {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </div>
        </div>
        );
      })}

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

      {renderDeliveryOverlay()}
      {callLogFor && <CallLogDialog lead={callLogFor} onClose={() => setCallLogFor(null)} onSubmit={(result) => logCall(callLogFor, result)} />}
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────
function Pipeline() {
  const [allLeads, setAllLeads] = useSheetSynced("leads", "leads", INITIAL_LEADS);
  const [expanded, setExpanded] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [remark, setRemark] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Filter out blank rows from Google Sheet
  const leads = (allLeads || []).filter(l => l && l.name && l.stage);

  // Build live stage counts from real leads
  const stageCounts = {};
  leads.forEach(l => { stageCounts[l.stage] = (stageCounts[l.stage]||0) + 1; });
  const stages = PIPELINE_STAGES.map(s => ({ ...s, count: stageCounts[s.id]||0 }));
  const total = leads.length;
  const [exporting, setExporting] = useState(false);

  // ── Excel export (styled HTML table, opens natively in Excel) ──
  const downloadPipelineExcel = () => {
    setExporting(true);
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const rowsHtml = PIPELINE_STAGES.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage.id);
      if (stageLeads.length === 0) return "";
      return stageLeads.map((l,i) => `
        <tr>
          ${i===0 ? `<td rowspan="${stageLeads.length}" style="background:${stage.color};color:#fff;font-weight:bold;text-align:center;vertical-align:middle;">${stage.id}</td>` : ""}
          <td>${l.name||""}</td>
          <td>${l.business||""}</td>
          <td>${l.contact||""}</td>
          <td>${l.area||""}</td>
          <td>${l.type||""}</td>
          <td>${l.telecaller||""}</td>
          <td style="font-weight:bold;color:${l.priority==="High"?"#F43F5E":l.priority==="Medium"?"#F59E0B":"#7B9DC4"}">${l.priority||"Medium"}</td>
          <td>${l.lastContact||""}</td>
          <td>${l.source||""}</td>
          <td>${(l.remarks&&l.remarks.length) ? l.remarks[l.remarks.length-1].replace(/^\[.+?\]\s*/,"") : ""}</td>
        </tr>`).join("");
    }).join("");

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Pipeline</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse:collapse; font-family:Calibri,Arial,sans-serif; font-size:11pt; }
  th { background:#060B16; color:#00C9A7; padding:10px 12px; text-align:left; border:1px solid #060B16; text-transform:uppercase; font-size:9pt; }
  td { padding:8px 12px; border:1px solid #d9e2f0; }
  tr:nth-child(even) td { background:#f4f8ff; }
  .title { font-size:20pt; font-weight:bold; color:#00C9A7; }
  .subtitle { font-size:10pt; color:#7B9DC4; }
</style>
</head>
<body>
<table>
  <tr><td colspan="10" class="title">⚡ Sridhi Ventures — Telecalling Pipeline</td></tr>
  <tr><td colspan="10" class="subtitle">Exported ${today} · ${total} total leads across all stages</td></tr>
  <tr><td colspan="10">&nbsp;</td></tr>
  <tr>
    <th>Stage</th><th>Name</th><th>Business</th><th>Contact</th><th>Area</th><th>Type</th>
    <th>Telecaller</th><th>Priority</th><th>Last Contact</th><th>Source</th><th>Latest Remark</th>
  </tr>
  ${rowsHtml || `<tr><td colspan="10" style="text-align:center;color:#999">No leads in pipeline</td></tr>`}
</table>
</body>
</html>`;

    const blob = new Blob(["\uFEFF"+html], { type:"application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sridhi-pipeline-" + new Date().toISOString().slice(0,10) + ".xls";
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); setExporting(false); }, 1000);
  };

  // ── PDF export (styled printable report, grouped by stage) ──
  const downloadPipelinePDF = () => {
    setExporting(true);
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const stageSections = PIPELINE_STAGES.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage.id);
      if (stageLeads.length === 0) return "";
      return `
      <div class="stage-section">
        <div class="stage-header" style="border-left-color:${stage.color}">
          <span class="stage-dot" style="background:${stage.color}"></span>
          <span class="stage-name">${stage.id}</span>
          <span class="stage-count" style="background:${stage.color}22;color:${stage.color}">${stageLeads.length}</span>
        </div>
        <table>
          <tr><th>Name</th><th>Business</th><th>Contact</th><th>Area</th><th>Telecaller</th><th>Priority</th><th>Last Contact</th></tr>
          ${stageLeads.map(l => `<tr>
            <td><strong>${l.name||""}</strong></td>
            <td>${l.business||""}</td>
            <td>${l.contact||""}</td>
            <td>${l.area||""}</td>
            <td>${l.telecaller||""}</td>
            <td><span class="badge" style="background:${getPriorityColor(l.priority||"Medium")}22;color:${getPriorityColor(l.priority||"Medium")}">${l.priority||"Medium"}</span></td>
            <td>${l.lastContact||""}</td>
          </tr>`).join("")}
        </table>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background:#fff; color:#1a1a2e; padding:40px; }
  .header { background:linear-gradient(135deg,#060B16,#0F1C33); color:white; padding:32px; border-radius:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; }
  .logo { font-size:28px; font-weight:900; color:#00C9A7; letter-spacing:-1px; }
  .sub { font-size:12px; color:#7B9DC4; margin-top:4px; text-transform:uppercase; letter-spacing:2px; }
  .date { font-size:12px; color:#7B9DC4; text-align:right; }
  .overview { display:flex; gap:12px; margin-bottom:28px; }
  .kpi { flex:1; background:#f8faff; border:1px solid #e0eaff; border-radius:12px; padding:16px; text-align:center; }
  .kpi-val { font-size:24px; font-weight:900; color:#00C9A7; }
  .kpi-label { font-size:10px; color:#666; margin-top:4px; font-weight:600; text-transform:uppercase; }
  .stage-section { margin-bottom:20px; page-break-inside:avoid; }
  .stage-header { display:flex; align-items:center; gap:10px; padding:10px 14px; background:#f8faff; border-left:4px solid; border-radius:6px; margin-bottom:10px; }
  .stage-dot { width:9px; height:9px; border-radius:50%; }
  .stage-name { font-size:13px; font-weight:800; color:#060B16; flex:1; text-transform:uppercase; letter-spacing:0.5px; }
  .stage-count { font-size:12px; font-weight:800; padding:2px 10px; border-radius:20px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#060B16; color:#00C9A7; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
  td { padding:7px 10px; border-bottom:1px solid #f0f0f0; }
  tr:nth-child(even) td { background:#fafcff; }
  .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:9px; font-weight:700; }
  .footer { margin-top:32px; padding-top:16px; border-top:2px solid #00C9A7; display:flex; justify-content:space-between; color:#999; font-size:10px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">⚡ Sridhi Ventures</div>
    <div class="sub">Telecalling Pipeline Report</div>
  </div>
  <div class="date">
    <div style="font-size:20px;font-weight:900;color:#00C9A7">${today}</div>
    <div style="margin-top:4px">Bengaluru · Food Distribution</div>
  </div>
</div>
<div class="overview">
  <div class="kpi"><div class="kpi-val">${total}</div><div class="kpi-label">Total Leads</div></div>
  <div class="kpi"><div class="kpi-val">${stages.filter(s=>s.count>0).length}</div><div class="kpi-label">Active Stages</div></div>
  <div class="kpi"><div class="kpi-val">${stageCounts["Active Customer"]||0}</div><div class="kpi-label">Active Customers</div></div>
</div>
${stageSections || `<div style="text-align:center;color:#999;padding:40px">No leads in pipeline</div>`}
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
    if (w) { w.onload = () => { w.print(); }; }
    setTimeout(() => { URL.revokeObjectURL(url); setExporting(false); }, 3000);
  };


  const updateStageP = (id, stage) => setAllLeads(allLeads.map(l => l.id===id ? {...l, stage, lastContact:"Today"} : l));
  const addRemarkP = (id) => {
    if (!remark.trim()) return;
    const now = new Date();
    const stamp = now.toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) + " " + now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
    const r = "["+stamp+"] "+remark.trim();
    setAllLeads(allLeads.map(l => l.id===id ? {...l, remarks:[...(l.remarks||[]),r], lastContact:"Today"} : l));
    setRemark("");
  };

  if (selectedLead) {
    const lead = allLeads.find(l => l.id === selectedLead.id) || selectedLead;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12, paddingBottom:80 }}>
        <button onClick={() => { setSelectedLead(null); setShowEdit(false); }}
          style={{ background:"none", border:"none", color:T.accent, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT, textAlign:"left", padding:"4px 0" }}>
          ← Back to pipeline
        </button>

        {showEdit ? (
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <Label>Edit Lead</Label>
              <button onClick={() => setShowEdit(false)} style={{ background:"none", border:"none", color:T.t3, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {[["Name","name","text"],["Business","business","text"],["Contact","contact","tel"],["Area","area","text"],["Address","address","text"]].map(([label,key,type]) => (
              <div key={key} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:4 }}>{label.toUpperCase()}</div>
                <input type={type} value={editForm[key]||""} onChange={e => setEditForm({...editForm,[key]:e.target.value})}
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, color:T.t3, fontWeight:600, marginBottom:4 }}>TELECALLER</div>
              <select value={editForm.telecaller||""} onChange={e => setEditForm({...editForm,telecaller:e.target.value})}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"9px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box" }}>
                {["Thulasi","Ramya"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={() => { setAllLeads(allLeads.map(l => l.id===lead.id ? {...l,...editForm} : l)); setShowEdit(false); }}
              style={{ background:T.accent, border:"none", borderRadius:12, color:"#060B16", padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT, width:"100%" }}>
              ✓ Save Changes
            </button>
          </Card>
        ) : (
          <Card accent={getStageColor(lead.stage)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:T.t1 }}>{lead.name}</div>
                <div style={{ fontSize:12, color:T.t2 }}>{lead.business}</div>
                <div style={{ fontSize:11, color:T.t3 }}>{lead.type} · {lead.area}</div>
              </div>
              <button onClick={() => { setEditForm({...lead}); setShowEdit(true); }}
                style={{ background:T.accentSub, border:`1px solid ${T.accentGlow}`, borderRadius:8, color:T.accent, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                ✏️ Edit
              </button>
            </div>
            <Chip label={lead.stage} color={getStageColor(lead.stage)} />
            <div style={{ marginTop:12 }}>
              {[["Contact",lead.contact],["Area",lead.area],["Address",lead.address],["Source",lead.source],["Telecaller",lead.telecaller],["Last contact",lead.lastContact]].map(([k,v]) => v ? (
                <div key={k} style={{ display:"flex", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:11, color:T.t3, width:100, flexShrink:0, fontWeight:600 }}>{k}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{v}</span>
                </div>
              ) : null)}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={() => { const p=(lead.contact||"").replace(/[^0-9]/g,""); if(p) window.location.href="tel:+91"+p; }}
                style={{ flex:1, background:T.emerald+"22", border:`1px solid ${T.emerald}44`, borderRadius:10, color:T.emerald, padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>📞 Call</button>
              <button onClick={() => { const p=(lead.contact||"").replace(/[^0-9]/g,""); window.open("https://wa.me/91"+p,"_blank"); }}
                style={{ flex:1, background:"#25D36622", border:"1px solid #25D36644", borderRadius:10, color:"#25D366", padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>💬 WhatsApp</button>
            </div>
          </Card>
        )}

        <Card>
          <Label>Update Stage</Label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:8 }}>
            {PIPELINE_STAGES.map(s => (
              <button key={s.id} onClick={() => { updateStageP(lead.id, s.id); setSelectedLead({...lead, stage:s.id}); }}
                style={{ background: lead.stage===s.id ? s.color+"22" : T.surface,
                  border:`1px solid ${lead.stage===s.id ? s.color : T.border}`,
                  borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:600,
                  color: lead.stage===s.id ? s.color : T.t2, cursor:"pointer", fontFamily:FONT }}>
                {s.id}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <Label sub={`${(lead.remarks||[]).length} entries`}>Remarks</Label>
          {(lead.remarks||[]).length === 0 && <div style={{ fontSize:12, color:T.t3, padding:"8px 0" }}>No remarks yet.</div>}
          {(lead.remarks||[]).slice().reverse().map((r,i) => {
            const match = r.match(/^\[(.+?)\] (.+)$/);
            return (
              <div key={i} style={{ background:T.surface, borderRadius:10, padding:"10px 12px", marginBottom:8, borderLeft:`3px solid ${T.accent}` }}>
                {match && <div style={{ fontSize:10, color:T.accent, fontWeight:700, marginBottom:3 }}>🕐 {match[1]}</div>}
                <div style={{ fontSize:12, color:T.t1 }}>{match ? match[2] : r}</div>
              </div>
            );
          })}
          <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
            placeholder="Add a remark..."
            style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.t1, padding:"10px 12px", fontSize:13, fontFamily:FONT, outline:"none", width:"100%", boxSizing:"border-box", resize:"none", marginTop:8 }} />
          <div style={{ marginTop:8 }}>
            <button onClick={() => addRemarkP(lead.id)}
              style={{ background:T.accent, border:"none", borderRadius:12, color:"#060B16", padding:"11px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT, width:"100%" }}>
              Save Remark
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Card accent={T.accent}>
        <Label sub={`${total} total leads across all stages`}>Pipeline Overview</Label>
        <PipelineStrip stages={stages} />
      </Card>
      <Card>
        <Label sub="Downloads real pipeline data">Export Pipeline</Label>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <button onClick={downloadPipelineExcel} disabled={exporting}
            style={{ flex:1, background:"linear-gradient(135deg,#10B981,#00C9A7)", border:"none", borderRadius:14,
              color:"#060B16", padding:"13px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {exporting ? "⏳ Preparing..." : "📊 Excel"}
          </button>
          <button onClick={downloadPipelinePDF} disabled={exporting}
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
              color:T.t1, padding:"13px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:FONT,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {exporting ? "⏳ Preparing..." : "📑 PDF"}
          </button>
        </div>
      </Card>
      {stages.map(stage => {
        const pct = total > 0 ? ((stage.count/total)*100).toFixed(1) : "0.0";
        const isOpen = expanded===stage.id;
        const stageLeads = leads.filter(l => l.stage===stage.id);
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
            {isOpen && stageLeads.length > 0 && (
              <div style={{ padding:"8px 16px 14px" }}>
                {stageLeads.map(l => (
                  <div key={l.id} onClick={() => setSelectedLead(l)}
                    style={{
                      background:T.surface, borderRadius:10, padding:"10px 12px", marginTop:8,
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      cursor:"pointer", border:`1px solid transparent`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor=T.accentGlow}
                    onMouseLeave={e => e.currentTarget.style.borderColor="transparent"}
                  >
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{l.name}</div>
                      <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>{l.area} · {l.telecaller}</div>
                      {l.contact && (
                        <div style={{ fontSize:11, color:T.accent, marginTop:2, fontWeight:600 }}>📞 {l.contact}</div>
                      )}
                      {l.remarks && l.remarks.length > 0 && (
                        <div style={{ fontSize:10, color:T.t3, marginTop:3, fontStyle:"italic" }}>
                          💬 {typeof l.remarks[l.remarks.length-1] === "string" ? l.remarks[l.remarks.length-1].slice(0,50)+"..." : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                      <Chip label={l.priority||"Medium"} color={getPriorityColor(l.priority||"Medium")} />
                      <span style={{ fontSize:10, color:T.t3 }}>{l.lastContact||""}</span>
                      <span style={{ fontSize:10, color:T.accent }}>Tap to open →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isOpen && stageLeads.length === 0 && (
              <div style={{ padding:"12px 16px", fontSize:12, color:T.t3, fontStyle:"italic" }}>
                No leads in this stage
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
  const [repeatCustomers, setRepeatCustomers, repeatSyncStatus] = useSheetSynced("repeatCustomers", "repeatCustomers", REPEAT_CUSTOMERS);
  const [showAdd, setShowAdd] = useState(false);
  const [newCust, setNewCust] = useState({ name:"", area:"", contact:"", product:"Ghee", qty:"", frequency:"Weekly", status:"Upcoming", lastOrder:"", nextDue:"", revenue:"" });
  const statusColor = { "Due Today":T.rose, Tomorrow:T.amber, Upcoming:T.emerald };
  const grouped = {
    "Due Today": repeatCustomers.filter(c => c.status==="Due Today"),
    "Tomorrow":  repeatCustomers.filter(c => c.status==="Tomorrow"),
    "Upcoming":  repeatCustomers.filter(c => c.status==="Upcoming"),
  };
  const activeCount = repeatCustomers.length;
  const monthlyRevenue = repeatCustomers.reduce((a,c) => a + ((parseInt(c.revenue)||0)/12), 0);
  const avgQty = activeCount ? Math.round(repeatCustomers.reduce((a,c) => a + (parseInt(c.qty)||0), 0) / activeCount) : 0;

  const addCustomer = () => {
    if (!newCust.name || !newCust.contact) return;
    const today = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
    setRepeatCustomers([{ ...newCust, id: Date.now(), qty: parseInt(newCust.qty)||0, revenue: parseInt(newCust.revenue)||0, lastOrder: newCust.lastOrder || today, nextDue: newCust.nextDue || today }, ...repeatCustomers]);
    setShowAdd(false);
    setNewCust({ name:"", area:"", contact:"", product:"Ghee", qty:"", frequency:"Weekly", status:"Upcoming", lastOrder:"", nextDue:"", revenue:"" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        <KPI label="Active customers" value={activeCount}      color={T.accent}  icon="🏪" />
        <KPI label="Monthly revenue"  value={Math.round(monthlyRevenue)} unit="₹" color={T.emerald} icon="💰" />
        <KPI label="Due today"        value={grouped["Due Today"].length} color={T.rose} icon="⚠️" />
        <KPI label="Avg order"        value={avgQty ? `${avgQty} KG` : "—"}  color={T.amber}   icon="📦" />
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SyncBadge status={repeatSyncStatus} />
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        background:T.indigo+"18", border:`1px solid ${T.indigo}33`,
        borderRadius:14, color:T.indigo, padding:13,
        fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT,
      }}>+ Add Repeat Customer</button>

      {activeCount===0 && (
        <Card>
          <div style={{ textAlign:"center", padding:"28px 12px" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🔁</div>
            <div style={{ fontSize:14, fontWeight:800, color:T.t1, marginBottom:6 }}>No repeat customers yet</div>
            <div style={{ fontSize:12, color:T.t3, lineHeight:1.5, maxWidth:280, margin:"0 auto" }}>
              Once a lead converts into a recurring customer, add them here to track their order cycle, revenue and due dates.
            </div>
          </div>
        </Card>
      )}

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

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Repeat Customer">
        <Field label="Customer Name *" value={newCust.name} onChange={e => setNewCust({...newCust,name:e.target.value})} />
        <Field label="Contact *" value={newCust.contact} onChange={e => setNewCust({...newCust,contact:e.target.value})} type="tel" />
        <Field label="Area" value={newCust.area} onChange={e => setNewCust({...newCust,area:e.target.value})} />
        <Dropdown label="Product" value={newCust.product} onChange={e => setNewCust({...newCust,product:e.target.value})} options={["Ghee","Honey","Millets","Oil","Spices","Other"]} />
        <Field label="Qty per order (KG)" value={newCust.qty} onChange={e => setNewCust({...newCust,qty:e.target.value})} type="number" />
        <Dropdown label="Order Frequency" value={newCust.frequency} onChange={e => setNewCust({...newCust,frequency:e.target.value})} options={["Weekly","Fortnightly","Monthly"]} />
        <Dropdown label="Status" value={newCust.status} onChange={e => setNewCust({...newCust,status:e.target.value})} options={["Due Today","Tomorrow","Upcoming"]} />
        <Field label="Annual Revenue (₹)" value={newCust.revenue} onChange={e => setNewCust({...newCust,revenue:e.target.value})} type="number" placeholder="e.g. 24000" />
        <div style={{ display:"flex", gap:10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => setShowAdd(false)} />
          <Btn label="Add Customer" full onClick={addCustomer} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── DAILY ORDERS (telecaller: new vs regular conversions, kg-wise) ───────
const RATE_PER_KG = 35;
const PRODUCTS = [
  { name: "Idli Dosa Batter", rate: 35 },
  { name: "Vada Batter", rate: 100 },
];
const rateForProduct = (name) => (PRODUCTS.find(p => p.name === name) || PRODUCTS[0]).rate;
const ORDER_TYPES = ["New Order", "Regular Order"];
const CANCEL_REASONS = ["Delivery Issue", "Quality Issue", "Other"];
const NEW_CUSTOMER_OPTION = "+ Add New Customer";
const INITIAL_DAILY_ORDERS = [];

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function formatDateReadable(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function emptyOrderForm(date) {
  return {
    date: date || todayISO(), customer: "", area: "", orderType: "New Order",
    items: PRODUCTS.map(p => ({ product: p.name, kgs: "" })),
    telecaller: "",
  };
}
// Returns the line items for an order, whether it's a new-style multi-product
// order (o.items) or an old-style single-product order (o.product/o.kgs).
function orderLineItems(o) {
  if (Array.isArray(o.items) && o.items.length) return o.items;
  return [{ product: o.product || PRODUCTS[0].name, kgs: parseFloat(o.kgs) || 0, rate: o.rate ?? rateForProduct(o.product), amount: o.amount || 0 }];
}

// ── CSV report export helpers ──────────────────────────────────────────────
function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvRow(cells) { return cells.map(csvEscape).join(","); }
function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DailyOrders({ embedded = false } = {}) {
  const [orders, setOrders, ordersSyncStatus] = useSheetSynced("dailyOrders", "dailyOrders", INITIAL_DAILY_ORDERS);
  const [leads] = useSheetSynced("leads", "leads", []);
  const [repeatCustomers] = useSheetSynced("repeatCustomers", "repeatCustomers", []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyOrderForm());
  const [customerPick, setCustomerPick] = useState(NEW_CUSTOMER_OPTION);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState({ reason: CANCEL_REASONS[0], remarks: "" });
  const [filterDate, setFilterDate] = useState(todayISO());
  const [reportFrom, setReportFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); });
  const [reportTo, setReportTo] = useState(todayISO());
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportPreset, setReportPreset] = useState("last30");

  const applyPreset = (preset) => {
    setReportPreset(preset);
    const t = todayISO();
    if (preset === "today") { setReportFrom(t); setReportTo(t); return; }
    if (preset === "week") {
      const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      setReportFrom(d.toISOString().slice(0, 10)); setReportTo(t); return;
    }
    if (preset === "month") {
      const d = new Date();
      setReportFrom(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`); setReportTo(t); return;
    }
    if (preset === "last30") {
      const d = new Date(); d.setDate(d.getDate() - 29);
      setReportFrom(d.toISOString().slice(0, 10)); setReportTo(t); return;
    }
  };

  // Combined, deduped list of known customers pulled from Leads, RepeatCustomers
  // and every customer name already logged in Daily Orders — so telecallers can
  // pick an existing customer instead of retyping their name/area every time.
  const knownCustomers = (() => {
    const map = new Map();
    (leads || []).forEach(l => { const n = (l.name || "").trim(); if (n) map.set(n.toLowerCase(), { name: n, area: l.area || "" }); });
    (repeatCustomers || []).forEach(c => { const n = (c.name || "").trim(); if (n) map.set(n.toLowerCase(), { name: n, area: c.area || "" }); });
    orders.forEach(o => { const n = (o.customer || "").trim(); if (n) { const existing = map.get(n.toLowerCase()); map.set(n.toLowerCase(), { name: n, area: o.area || existing?.area || "" }); } });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();
  const customerOptions = [NEW_CUSTOMER_OPTION, ...knownCustomers.map(c => c.name)];
  const pickCustomer = (value) => {
    setCustomerPick(value);
    if (value === NEW_CUSTOMER_OPTION) { setForm(f => ({ ...f, customer: "", area: "" })); return; }
    const match = knownCustomers.find(c => c.name === value);
    setForm(f => ({ ...f, customer: value, area: match ? match.area : f.area }));
  };

  const today = todayISO();
  const active = orders.filter(o => o.status !== "Cancelled");
  const todays = active.filter(o => o.date === today);
  const todaysNew = todays.filter(o => o.orderType === "New Order");
  const todaysRegular = todays.filter(o => o.orderType === "Regular Order");
  const todaysKgs = todays.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);
  const todaysRevenue = todays.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);

  // ── Income overview: today / this week / this month / all-time ─────────
  const startOfWeekISO = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  })();
  const startOfMonthISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const weekOrders = active.filter(o => o.date >= startOfWeekISO && o.date <= today);
  const monthOrders = active.filter(o => o.date >= startOfMonthISO && o.date <= today);
  const weekRevenue = weekOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const monthRevenue = monthOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const allTimeRevenue = active.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const allTimeKgs = active.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);

  const dateOrders = orders
    .filter(o => o.date === filterDate)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const dateActiveOrders = dateOrders.filter(o => o.status !== "Cancelled");
  const dateTotals = {
    newCount: dateActiveOrders.filter(o => o.orderType === "New Order").length,
    regularCount: dateActiveOrders.filter(o => o.orderType === "Regular Order").length,
    kgs: dateActiveOrders.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0),
    revenue: dateActiveOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0),
  };
  const dateTotalsByProduct = PRODUCTS.map(p => {
    let kgs = 0, revenue = 0;
    dateActiveOrders.forEach(o => orderLineItems(o).forEach(i => { if (i.product === p.name) { kgs += i.kgs; revenue += i.amount; } }));
    return { name: p.name, kgs, revenue };
  }).filter(p => p.kgs > 0);

  // Date-wise summary: new vs regular conversions, kgs and revenue per day
  const byDate = {};
  active.forEach(o => {
    if (!byDate[o.date]) byDate[o.date] = { newCount: 0, regularCount: 0, kgs: 0, revenue: 0 };
    const b = byDate[o.date];
    if (o.orderType === "New Order") b.newCount += 1; else b.regularCount += 1;
    b.kgs += parseFloat(o.kgs) || 0;
    b.revenue += parseFloat(o.amount) || 0;
  });
  const summaryRows = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 21);

  const cancelledOrders = orders.filter(o => o.status === "Cancelled")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const cancelReasonCounts = CANCEL_REASONS.map(r => ({
    reason: r, count: cancelledOrders.filter(o => o.cancelReason === r).length,
  }));

  const openAdd = () => { setEditingId(null); setForm(emptyOrderForm(filterDate)); setCustomerPick(NEW_CUSTOMER_OPTION); setShowForm(true); };
  const openEdit = (o) => {
    setEditingId(o.id);
    const existing = orderLineItems(o);
    setForm({
      date: o.date, customer: o.customer, area: o.area || "", orderType: o.orderType,
      items: PRODUCTS.map(p => {
        const match = existing.find(i => i.product === p.name);
        return { product: p.name, kgs: match ? String(match.kgs) : "" };
      }),
      telecaller: o.telecaller || "",
    });
    setCustomerPick(knownCustomers.some(c => c.name === o.customer) ? o.customer : NEW_CUSTOMER_OPTION);
    setShowForm(true);
  };

  const saveOrder = () => {
    const items = form.items
      .map(i => ({ product: i.product, kgs: parseFloat(i.kgs) || 0, rate: rateForProduct(i.product) }))
      .filter(i => i.kgs > 0)
      .map(i => ({ ...i, amount: Math.round(i.kgs * i.rate) }));
    if (!form.customer.trim() || !items.length || !form.date) return;
    const kgs = items.reduce((a, i) => a + i.kgs, 0);
    const amount = items.reduce((a, i) => a + i.amount, 0);
    const product = items.map(i => i.product).join(" + ");
    const { items: _formItems, ...formRest } = form;
    if (editingId) {
      setOrders(orders.map(o => o.id === editingId ? { ...o, ...formRest, items, kgs, amount, product } : o));
    } else {
      setOrders([{
        id: Date.now(), ...formRest, items, kgs, amount, product,
        status: "Active", cancelReason: "", cancelRemarks: "",
        createdAt: Date.now(),
      }, ...orders]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyOrderForm(filterDate));
  };

  const openCancel = (o) => { setCancelTarget(o); setCancelForm({ reason: CANCEL_REASONS[0], remarks: "" }); };
  const confirmCancel = () => {
    if (!cancelTarget) return;
    setOrders(orders.map(o => o.id === cancelTarget.id
      ? { ...o, status: "Cancelled", cancelReason: cancelForm.reason, cancelRemarks: cancelForm.remarks }
      : o));
    setCancelTarget(null);
  };
  const reactivate = (o) => setOrders(orders.map(x => x.id === o.id ? { ...x, status: "Active", cancelReason: "", cancelRemarks: "" } : x));
  const deleteOrder = (o) => {
    if (!window.confirm(`Delete this order permanently?\n\n${o.customer} — ${o.kgs} KG — ₹${o.amount}\n\nThis can't be undone. Use this only if the entry was a mistake.`)) return;
    setOrders(orders.filter(x => x.id !== o.id));
  };

  const presetLabel = () => ({
    today: "Daily", week: "Weekly", month: "Monthly", last30: "Last-30-Days", custom: "Custom-Range",
  }[reportPreset] || "Custom-Range");

  const getReportData = () => {
    const rangeOrders = orders
      .filter(o => o.date >= reportFrom && o.date <= reportTo)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
    const rangeActive = rangeOrders.filter(o => o.status !== "Cancelled");
    const rangeCancelled = rangeOrders.filter(o => o.status === "Cancelled");

    const rangeByDate = {};
    rangeActive.forEach(o => {
      if (!rangeByDate[o.date]) rangeByDate[o.date] = { newCount: 0, regularCount: 0, kgs: 0, revenue: 0 };
      const b = rangeByDate[o.date];
      if (o.orderType === "New Order") b.newCount += 1; else b.regularCount += 1;
      b.kgs += parseFloat(o.kgs) || 0;
      b.revenue += parseFloat(o.amount) || 0;
    });

    const rangeByProduct = PRODUCTS.map(p => {
      let kgs = 0, revenue = 0, orderCount = 0;
      rangeActive.forEach(o => orderLineItems(o).forEach(i => {
        if (i.product === p.name && (parseFloat(i.kgs) || 0) > 0) { kgs += parseFloat(i.kgs) || 0; revenue += parseFloat(i.amount) || 0; orderCount += 1; }
      }));
      return { name: p.name, rate: p.rate, kgs, revenue, orderCount };
    });

    return {
      rangeOrders, rangeActive, rangeCancelled, rangeByDate, rangeByProduct,
      totalNew: rangeActive.filter(o => o.orderType === "New Order").length,
      totalRegular: rangeActive.filter(o => o.orderType === "Regular Order").length,
      totalKg: rangeActive.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0),
      totalRevenue: rangeActive.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0),
    };
  };

  const downloadCSVReport = () => {
    const { rangeOrders, rangeActive, rangeCancelled, rangeByDate, rangeByProduct, totalNew, totalRegular, totalKg, totalRevenue } = getReportData();
    const lines = [];
    lines.push(csvRow(["Sridhi Ventures BOS — Daily Orders Report"]));
    lines.push(csvRow([`Range: ${formatDateReadable(reportFrom)} to ${formatDateReadable(reportTo)}`]));
    lines.push(csvRow([`Generated: ${new Date().toLocaleString("en-IN")}`]));
    lines.push("");

    lines.push(csvRow(["ORDER LOG"]));
    lines.push(csvRow(["Date", "Customer", "Area", "Order Type", "Product Breakdown", "Total KG", "Amount (Rs)", "Telecaller", "Status", "Cancel Reason", "Cancel Remarks"]));
    rangeOrders.forEach(o => {
      const breakdown = orderLineItems(o).map(i => `${i.product}: ${i.kgs}KG @ Rs${i.rate}`).join(" | ");
      lines.push(csvRow([formatDateReadable(o.date), o.customer, o.area || "", o.orderType, breakdown, o.kgs, o.amount, o.telecaller || "", o.status, o.cancelReason || "", o.cancelRemarks || ""]));
    });
    lines.push("");

    lines.push(csvRow(["PRODUCT SUMMARY (active orders only)"]));
    lines.push(csvRow(["Product", "Rate (Rs/KG)", "Orders", "Total KG", "Revenue (Rs)"]));
    rangeByProduct.forEach(p => {
      lines.push(csvRow([p.name, p.rate, p.orderCount, Math.round(p.kgs), Math.round(p.revenue)]));
    });
    lines.push("");

    lines.push(csvRow(["DAILY SUMMARY (active orders only)"]));
    lines.push(csvRow(["Date", "New Orders", "Regular Orders", "Total KG", "Revenue (Rs)"]));
    Object.entries(rangeByDate).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, s]) => {
      lines.push(csvRow([formatDateReadable(date), s.newCount, s.regularCount, Math.round(s.kgs), Math.round(s.revenue)]));
    });
    lines.push(csvRow(["TOTAL", totalNew, totalRegular, Math.round(totalKg), Math.round(totalRevenue)]));
    lines.push("");

    lines.push(csvRow(["CANCELLED / STOPPED CUSTOMERS"]));
    lines.push(csvRow(["Date", "Customer", "Area", "KG", "Cancel Reason", "Remarks"]));
    rangeCancelled.forEach(o => {
      lines.push(csvRow([formatDateReadable(o.date), o.customer, o.area || "", o.kgs, o.cancelReason || "", o.cancelRemarks || ""]));
    });
    lines.push("");
    lines.push(csvRow(["Cancellation reason breakdown"]));
    CANCEL_REASONS.forEach(r => {
      lines.push(csvRow([r, rangeCancelled.filter(o => o.cancelReason === r).length]));
    });

    downloadCSV(`Sridhi-Daily-Orders-${presetLabel()}-Report_${reportFrom}_to_${reportTo}.csv`, lines.join("\n"));
  };

  const downloadPDFReport = async () => {
    if (generatingPDF) return;
    setGeneratingPDF(true);
    try {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const { rangeOrders, rangeCancelled, rangeByDate, rangeByProduct, totalNew, totalRegular, totalKg, totalRevenue } = getReportData();

    const NAVY = [10, 14, 26];
    const TEAL = [14, 168, 144];
    const TEAL_TINT = [232, 250, 246];
    const INDIGO = [79, 70, 229];
    const AMBER = [180, 110, 5];
    const ROSE = [190, 24, 72];
    const ROSE_TINT = [253, 240, 244];
    const INK = [26, 32, 46];
    const SUBTLE = [110, 118, 138];
    const GRID = [228, 231, 238];

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    const header = () => {
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, pageW, 92, "F");
      doc.setFillColor(...TEAL);
      doc.rect(0, 90, pageW, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("Sridhi Ventures", margin, 38);
      doc.setFontSize(10.5);
      doc.setTextColor(...TEAL.map(c => Math.min(255, c + 40)));
      doc.text(`${presetLabel().toUpperCase().replace(/-/g, " ")} ORDERS REPORT — NEW & REGULAR CONVERSIONS`, margin, 56);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(190, 198, 216);
      doc.text(`Period: ${formatDateReadable(reportFrom)}  –  ${formatDateReadable(reportTo)}`, margin, 74);
      doc.text(`Generated ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, pageW - margin, 74, { align: "right" });
    };

    const footer = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...GRID);
        doc.setLineWidth(0.6);
        doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...SUBTLE);
        doc.text("Sridhi Ventures · Business Operating System", margin, pageH - 20);
        doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
      }
    };

    header();
    let y = 118;

    // ── KPI summary cards ────────────────────────────────────────────────
    const kpis = [
      { label: "New Conversions", value: String(totalNew), color: TEAL },
      { label: "Regular Conversions", value: String(totalRegular), color: INDIGO },
      { label: "Total KG Sold", value: Math.round(totalKg).toLocaleString("en-IN"), color: AMBER },
      { label: "Total Revenue", value: `Rs ${Math.round(totalRevenue).toLocaleString("en-IN")}`, color: [16, 150, 110] },
    ];
    const gap = 12;
    const cardW = (pageW - margin * 2 - gap * 3) / 4;
    const cardH = 62;
    kpis.forEach((k, i) => {
      const x = margin + i * (cardW + gap);
      doc.setFillColor(248, 249, 251);
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.7);
      doc.roundedRect(x, y, cardW, cardH, 7, 7, "FD");
      doc.setFillColor(...k.color);
      doc.roundedRect(x, y, 4, cardH, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...SUBTLE);
      doc.text(k.label.toUpperCase(), x + 14, y + 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...INK);
      doc.text(k.value, x + 14, y + 45);
    });
    y += cardH + 30;

    // ── Today's Snapshot banner — only shown on the Daily report ──────────
    if (reportPreset === "today") {
      const bannerH = 46;
      doc.setFillColor(...TEAL_TINT);
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(1);
      doc.roundedRect(margin, y, pageW - margin * 2, bannerH, 8, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...TEAL);
      doc.text(`TODAY'S SNAPSHOT — ${formatDateReadable(today)}`, margin + 16, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...SUBTLE);
      doc.text("Total quantity moved and revenue booked today", margin + 16, y + 32);

      const snapW = 150;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...INK);
      doc.text(`${Math.round(todaysKgs).toLocaleString("en-IN")} KG`, pageW - margin - snapW - 100, y + 28, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...SUBTLE);
      doc.text("TODAY'S KG", pageW - margin - snapW - 100, y + 39, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(16, 150, 110);
      doc.text(`Rs ${Math.round(todaysRevenue).toLocaleString("en-IN")}`, pageW - margin - 16, y + 28, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...SUBTLE);
      doc.text("TODAY'S AMOUNT", pageW - margin - 16, y + 39, { align: "right" });

      y += bannerH + 22;
    }

    const sectionTitle = (text, color = NAVY) => {
      doc.setFillColor(...color);
      doc.roundedRect(margin, y - 12, 4, 14, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...INK);
      doc.text(text, margin + 12, y);
      y += 12;
    };

    // ── Product summary — KG & revenue broken out per product ─────────────
    if (y > pageH - 160) { doc.addPage(); header(); y = 118; }
    sectionTitle("Product Summary", TEAL);
    const productColors = [AMBER, INDIGO, ROSE, [16, 150, 110], [56, 189, 248]];
    const pGap = 12;
    const pCardW = (pageW - margin * 2 - pGap * (rangeByProduct.length - 1)) / Math.max(rangeByProduct.length, 1);
    const pCardH = 68;
    rangeByProduct.forEach((p, i) => {
      const x = margin + i * (pCardW + pGap);
      const color = productColors[i % productColors.length];
      doc.setFillColor(248, 249, 251);
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.7);
      doc.roundedRect(x, y, pCardW, pCardH, 7, 7, "FD");
      doc.setFillColor(...color);
      doc.roundedRect(x, y, pCardW, 4, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(p.name, x + 14, y + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...SUBTLE);
      doc.text(`Rs ${p.rate}/KG · ${p.orderCount} order${p.orderCount === 1 ? "" : "s"}`, x + 14, y + 33);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13.5);
      doc.setTextColor(...color);
      doc.text(`${Math.round(p.kgs).toLocaleString("en-IN")} KG`, x + 14, y + 51);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      doc.text(`Rs ${Math.round(p.revenue).toLocaleString("en-IN")}`, x + pCardW - 14, y + 51, { align: "right" });
    });
    y += pCardH + 30;

    // ── Daily summary table ──────────────────────────────────────────────
    sectionTitle("Daily Summary — New vs Regular");
    const summaryBody = Object.entries(rangeByDate).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, s]) => [formatDateReadable(date), String(s.newCount), String(s.regularCount), Math.round(s.kgs).toLocaleString("en-IN"), `Rs ${Math.round(s.revenue).toLocaleString("en-IN")}`]);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 50 },
      head: [["Date", "New", "Regular", "Total KG", "Revenue"]],
      body: summaryBody.length ? summaryBody : [["—", "—", "—", "—", "—"]],
      foot: [["TOTAL", String(totalNew), String(totalRegular), Math.round(totalKg).toLocaleString("en-IN"), `Rs ${Math.round(totalRevenue).toLocaleString("en-IN")}`]],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6, lineColor: GRID, lineWidth: 0.6, textColor: INK },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 9 },
      footStyles: { fillColor: TEAL_TINT, textColor: INK, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 30;

    // ── Order log table ──────────────────────────────────────────────────
    if (y > pageH - 160) { doc.addPage(); header(); y = 118; }
    sectionTitle("Order Log", TEAL);
    const orderBody = rangeOrders.map(o => [
      formatDateReadable(o.date), o.customer, o.area || "—", o.orderType.replace(" Order", ""),
      orderLineItems(o).map(i => `${i.product}: ${i.kgs}KG`).join(", "), String(o.kgs), `Rs ${(o.amount || 0).toLocaleString("en-IN")}`, o.telecaller || "—", o.status,
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 50 },
      head: [["Date", "Customer", "Area", "Type", "Product", "KG", "Amount", "Telecaller", "Status"]],
      body: orderBody.length ? orderBody : [["—", "No orders in this range", "—", "—", "—", "—", "—", "—", "—"]],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5.5, lineColor: GRID, lineWidth: 0.6, textColor: INK },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      columnStyles: { 5: { halign: "right" }, 6: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          data.cell.styles.textColor = data.cell.raw === "New" ? TEAL : INDIGO;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 8) {
          data.cell.styles.textColor = data.cell.raw === "Cancelled" ? ROSE : [16, 150, 110];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = doc.lastAutoTable.finalY + 30;

    // ── Cancelled customers ──────────────────────────────────────────────
    if (rangeCancelled.length) {
      if (y > pageH - 160) { doc.addPage(); header(); y = 118; }
      sectionTitle("Cancelled / Stopped Customers", ROSE);
      const cancelBody = rangeCancelled.map(o => [formatDateReadable(o.date), o.customer, o.area || "—", String(o.kgs), o.cancelReason || "Other", o.cancelRemarks || "—"]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin, bottom: 50 },
        head: [["Date", "Customer", "Area", "KG", "Reason", "Remarks"]],
        body: cancelBody,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5.5, lineColor: GRID, lineWidth: 0.6, textColor: INK },
        headStyles: { fillColor: ROSE, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: ROSE_TINT },
      });
      y = doc.lastAutoTable.finalY + 18;

      if (y > pageH - 90) { doc.addPage(); header(); y = 118; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text("Reason breakdown:", margin, y);
      let bx = margin + 88;
      CANCEL_REASONS.forEach(r => {
        const count = rangeCancelled.filter(o => o.cancelReason === r).length;
        const label = `${r}: ${count}`;
        doc.setFillColor(...ROSE_TINT);
        const w = doc.getTextWidth(label) + 16;
        doc.roundedRect(bx, y - 11, w, 16, 8, 8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...ROSE);
        doc.text(label, bx + 8, y);
        bx += w + 8;
      });
    }

    footer();
    doc.save(`Sridhi-Daily-Orders-${presetLabel()}-Report_${reportFrom}_to_${reportTo}.pdf`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!embedded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <MobileStatCard icon="🆕" title="Today's Orders" value={todaysNew.length} sub="New Orders" color={T.accent} />
          <MobileStatCard icon="🔁" title="Regular Orders" value={todaysRegular.length} sub="Today · Regular" color={T.sky} />
          <MobileStatCard icon="⚖️" title="Total KGs" value={`${Math.round(todaysKgs).toLocaleString("en-IN")} KG`} sub="Today" color={T.indigo} />
          <MobileStatCard icon="💰" title="Today Revenue" value={`₹${Math.round(todaysRevenue).toLocaleString("en-IN")}`} sub="Today" color={T.amber} />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SyncBadge status={ordersSyncStatus} />
      </div>

      {!embedded && (
        <Card accent={T.emerald}>
          <Label sub="Auto-calculated from every active order — cancelled orders are excluded">Income Overview</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <MobileStatCard icon="📆" title="Today" value={`₹${Math.round(todaysRevenue).toLocaleString("en-IN")}`} color={T.emerald} />
            <MobileStatCard icon="📈" title="This Week" value={`₹${Math.round(weekRevenue).toLocaleString("en-IN")}`} color={T.sky} />
            <MobileStatCard icon="🗓️" title="This Month" value={`₹${Math.round(monthRevenue).toLocaleString("en-IN")}`} color={T.indigo} />
            <MobileStatCard icon="🏆" title="All-Time" value={`₹${Math.round(allTimeRevenue).toLocaleString("en-IN")}`} color={T.accent} />
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: T.t3 }}>
            {allTimeKgs.toLocaleString("en-IN", { maximumFractionDigits: 0 })} KG sold overall · avg ₹{allTimeKgs > 0 ? Math.round(allTimeRevenue / allTimeKgs) : RATE_PER_KG}/KG
          </div>
        </Card>
      )}

      <button onClick={openAdd} style={{
        background: T.accentSub, border: `1px solid ${T.accentGlow}`,
        borderRadius: 14, color: T.accent, padding: 13,
        fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT,
      }}>+ Log Order (₹{RATE_PER_KG}/KG)</button>

      <Card>
        <Label sub="A branded, print-ready report — KPI summary, daily breakdown, order log and cancellations">Download Report</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 14 }}>
          {[
            { id: "today", label: "📆 Daily" },
            { id: "week",  label: "📈 Weekly" },
            { id: "month", label: "🗓️ Monthly" },
            { id: "last30", label: "Last 30 Days" },
          ].map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)} style={{
              background: reportPreset === p.id ? T.accent : "transparent",
              color: reportPreset === p.id ? "#060B16" : T.t2,
              border: `1px solid ${reportPreset === p.id ? T.accent : T.border}`,
              borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: FONT, transition: "background 0.12s, color 0.12s",
            }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "1 1 130px" }}>
            <div style={{ fontSize: 11, color: T.t2, marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>From</div>
            <input type="date" value={reportFrom} onChange={e => { setReportFrom(e.target.value); setReportPreset("custom"); }} style={inputStyle} />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <div style={{ fontSize: 11, color: T.t2, marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>To</div>
            <input type="date" value={reportTo} onChange={e => { setReportTo(e.target.value); setReportPreset("custom"); }} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn label={generatingPDF ? "Generating…" : "📄 Download PDF Report"} full onClick={downloadPDFReport} />
          <Btn label="Raw CSV" color={T.t2} ghost onClick={downloadCSVReport} />
        </div>
      </Card>

      <Card id="orders-by-date-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <Label sub="Pick any date to view, edit or backfill that day's orders">Orders by Date</Label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        </div>

        {dateOrders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", marginBottom: 14, borderRadius: 12, background: T.cardHigh, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.3 }}>
              TOTAL FOR {formatDateReadable(filterDate).toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Chip label={`${dateTotals.newCount} New`} color={T.accent} />
              <Chip label={`${dateTotals.regularCount} Regular`} color={T.indigo} />
              <Chip label={`${dateTotals.kgs.toLocaleString("en-IN", { maximumFractionDigits: 1 })} KG`} color={T.amber} />
              <Chip label={`₹${Math.round(dateTotals.revenue).toLocaleString("en-IN")}`} color={T.emerald} />
            </div>
            {dateTotalsByProduct.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: T.t3, marginTop: 2 }}>
                {dateTotalsByProduct.map(p => (
                  <span key={p.name}>{p.name}: {p.kgs.toLocaleString("en-IN", { maximumFractionDigits: 1 })} KG · ₹{Math.round(p.revenue).toLocaleString("en-IN")}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {dateOrders.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 12px", color: T.t3, fontSize: 12 }}>
            No orders logged for {formatDateReadable(filterDate)} yet.
          </div>
        )}

        {dateOrders.map(o => {
          const cancelled = o.status === "Cancelled";
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.border}`, opacity: cancelled ? 0.6 : 1 }}>
              <div style={{
                width:38, height:38, borderRadius:11, flexShrink:0, marginTop:1,
                background: (o.orderType === "New Order" ? T.accent : T.indigo)+"22",
                border:`1px solid ${(o.orderType === "New Order" ? T.accent : T.indigo)}44`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:800, color: o.orderType === "New Order" ? T.accent : T.indigo,
              }}>{(o.customer || "?").trim().charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.t1 }}>{o.customer}</div>
                    <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>
                      {[o.area, o.telecaller].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:T.t3, fontWeight:600, whiteSpace:"nowrap" }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) : ""}
                    </span>
                    <span style={{ color:T.t4, fontSize:14 }}>›</span>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Chip label={o.orderType} color={o.orderType === "New Order" ? T.accent : T.indigo} />
                  {orderLineItems(o).map((i, idx) => (
                    <Chip key={idx} label={`${i.product}: ${i.kgs} KG`} color={T.sky} />
                  ))}
                  <Chip label={`₹${(o.amount || 0).toLocaleString("en-IN")}`} color={T.emerald} />
                  {cancelled && <Chip label={`Cancelled · ${o.cancelReason || "—"}`} color={T.rose} />}
                </div>
                {cancelled && o.cancelRemarks && (
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>Note: {o.cancelRemarks}</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Btn label="Edit" color={T.sky} ghost small onClick={() => openEdit(o)} />
                  {!cancelled
                    ? <Btn label="Customer Stopped / Cancel" color={T.rose} ghost small onClick={() => openCancel(o)} />
                    : <Btn label="Reactivate" color={T.emerald} ghost small onClick={() => reactivate(o)} />}
                  <Btn label="🗑️ Delete" color={T.rose} ghost small onClick={() => deleteOrder(o)} />
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {!embedded && (
        <Card id="daily-summary-section">
          <Label sub="New vs regular conversions, total KGs and revenue, day by day">Daily Summary</Label>
          {summaryRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "16px", color: T.t3, fontSize: 12 }}>No orders logged yet.</div>
          )}
          {summaryRows.map(([date, s]) => (
            <div key={date} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, minWidth: 100 }}>{formatDateReadable(date)}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <Chip label={`${s.newCount} NEW`} color={T.accent} small />
                <Chip label={`${s.regularCount} REGULAR`} color={T.sky} small />
                <Chip label={`${Math.round(s.kgs)} KG`} color={T.amber} small />
                <Chip label={`₹${Math.round(s.revenue).toLocaleString("en-IN")}`} color={T.emerald} small />
                <span style={{ color:T.t4, fontSize:14, marginLeft:4 }}>›</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {cancelledOrders.length > 0 && (
        <Card>
          <Label sub="Customers who stopped buying — grouped by reason">Cancelled / Stopped Customers</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {cancelReasonCounts.map(c => (
              <Chip key={c.reason} label={`${c.reason}: ${c.count}`} color={c.reason === "Delivery Issue" ? T.orange : c.reason === "Quality Issue" ? T.rose : T.t2} />
            ))}
          </div>
          {cancelledOrders.slice(0, 20).map(o => (
            <div key={o.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{o.customer}</div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{formatDateReadable(o.date)} · {o.area || "—"}</div>
                </div>
                <Chip label={o.cancelReason || "Other"} color={T.rose} small />
              </div>
              {o.cancelRemarks && <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{o.cancelRemarks}</div>}
            </div>
          ))}
        </Card>
      )}

      <Sheet open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "Edit Order" : "Log Order"}>
        <Field label="Order Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <Dropdown label="Customer *" value={customerPick} onChange={e => pickCustomer(e.target.value)} options={customerOptions} />
        {customerPick === NEW_CUSTOMER_OPTION ? (
          <>
            <Field label="New Customer Name *" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Ganesh Stores" />
            <Field label="Area" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="e.g. Ambattur" />
          </>
        ) : (
          <div style={{ fontSize: 11, color: T.t3, marginTop: -8, marginBottom: 14 }}>Area: {form.area || "—"}</div>
        )}
        <Dropdown label="Order Type" value={form.orderType} onChange={e => setForm({ ...form, orderType: e.target.value })} options={ORDER_TYPES} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: 0.3, marginBottom: 8 }}>PRODUCTS · enter KG for each you're logging</div>
        {form.items.map((item, idx) => (
          <Field
            key={item.product}
            label={`${item.product} (₹${rateForProduct(item.product)}/KG)`}
            type="number"
            value={item.kgs}
            onChange={e => {
              const items = form.items.map((it, i) => i === idx ? { ...it, kgs: e.target.value } : it);
              setForm({ ...form, items });
            }}
            placeholder="e.g. 10"
          />
        ))}
        <Field label="Telecaller" value={form.telecaller} onChange={e => setForm({ ...form, telecaller: e.target.value })} placeholder="Your name" />
        <div style={{ fontSize: 12, color: T.t2, marginBottom: 14 }}>
          {form.items.filter(i => parseFloat(i.kgs) > 0).map(i => (
            <div key={i.product} style={{ color: T.t3 }}>{i.product}: {i.kgs} KG × ₹{rateForProduct(i.product)} = ₹{Math.round((parseFloat(i.kgs) || 0) * rateForProduct(i.product)).toLocaleString("en-IN")}</div>
          ))}
          <div style={{ marginTop: 4 }}>
            Total Amount: <span style={{ color: T.emerald, fontWeight: 700 }}>
              ₹{form.items.reduce((a, i) => a + Math.round((parseFloat(i.kgs) || 0) * rateForProduct(i.product)), 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn label="Cancel" color={T.t2} ghost full onClick={() => { setShowForm(false); setEditingId(null); }} />
          <Btn label={editingId ? "Save Changes" : "Log Order"} full onClick={saveOrder} />
        </div>
      </Sheet>

      <Sheet open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Customer Stopped Buying">
        {cancelTarget && (
          <div style={{ fontSize: 12, color: T.t2, marginBottom: 14 }}>
            {cancelTarget.customer} · {formatDateReadable(cancelTarget.date)} · {cancelTarget.kgs} KG
          </div>
        )}
        <Dropdown label="Reason for cancellation" value={cancelForm.reason} onChange={e => setCancelForm({ ...cancelForm, reason: e.target.value })} options={CANCEL_REASONS} />
        <Field label="Remarks (optional)" value={cancelForm.remarks} onChange={e => setCancelForm({ ...cancelForm, remarks: e.target.value })} placeholder="Any extra detail" />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn label="Back" color={T.t2} ghost full onClick={() => setCancelTarget(null)} />
          <Btn label="Confirm Cancel" color={T.rose} full onClick={confirmCancel} />
        </div>
      </Sheet>
    </div>
  );
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────
function Expenses() {
  const [expenses, setExpenses, expensesSyncStatus] = useSheetSynced("expenses", "expenses", INITIAL_EXPENSES);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [newExp, setNewExp] = useState({ category:"", amount:"", type:"Marketing", subtype:"Facebook", date: todayISO() });

  const typeColor = { Marketing:T.indigo, Delivery:T.amber, Sample:T.accent, Employee:T.sky };
  const filtered = expenses.filter(e => filterType==="All" || e.type===filterType);
  const totals = Object.fromEntries(["Marketing","Delivery","Sample","Employee"].map(t => [t, expenses.filter(e => e.type===t).reduce((a,b) => a+b.amount,0)]));
  const grand = Object.values(totals).reduce((a,b) => a+b, 0);

  const addExpense = () => {
    if (!newExp.category || !newExp.amount) return;
    setExpenses([{ ...newExp, id:expenses.length+1, amount:parseInt(newExp.amount), date: newExp.date || todayISO() }, ...expenses]);
    setShowAdd(false);
    setNewExp({ category:"", amount:"", type:"Marketing", subtype:"Facebook", date: todayISO() });
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
              <div style={{ fontSize:11, color:T.t3, marginTop:2, fontWeight:500 }}>{/^\d{4}-\d{2}-\d{2}$/.test(e.date || "") ? formatDateReadable(e.date) : (e.date || "—")}</div>
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
        <Field label="Date" type="date" value={newExp.date} onChange={e => setNewExp({...newExp,date:e.target.value})} />
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
  const [leadsPreset, setLeadsPreset] = useState("all");

  // ── Leads date-range filter for export (Today / This Week / This Month / All Time) ──
  const leadsRangeStart = (() => {
    const now = new Date();
    if (leadsPreset === "today") { const d = new Date(now); d.setHours(0,0,0,0); return d.getTime(); }
    if (leadsPreset === "week") {
      const d = new Date(now); const day = d.getDay(); const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff); d.setHours(0,0,0,0); return d.getTime();
    }
    if (leadsPreset === "month") { return new Date(now.getFullYear(), now.getMonth(), 1).getTime(); }
    return null; // "all"
  })();
  const filteredLeads = leadsRangeStart == null ? leads : leads.filter(l => (l.createdAt || 0) >= leadsRangeStart);
  const leadsPresetLabel = { today: "Today's", week: "This Week's", month: "This Month's", all: "All-Time" }[leadsPreset];

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
    <div class="sub">Business Operating System — ${leadsPresetLabel} Leads Report</div>
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
  <div class="section-title">👥 ${leadsPresetLabel} Leads (${filteredLeads.length})</div>
  <table>
    <tr><th>Name</th><th>Area</th><th>Stage</th><th>Telecaller</th></tr>
    ${filteredLeads.slice(0,50).map(l => `<tr><td><strong>${l.name||""}</strong></td><td>${l.area||""}</td><td>${l.stage||""}</td><td>${l.telecaller||""}</td></tr>`).join("")}
    ${filteredLeads.length === 0 ? `<tr><td colspan='4' style='text-align:center;color:#999'>No leads in this period</td></tr>` : ""}
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
      ...filteredLeads.map(l => [l.name,l.contact,l.business,l.area,l.stage,l.source,l.telecaller,l.lastContact,l.priority])
    ];
    const csv = rows.map(r => r.map(c => `"${c||""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sridhi-leads-${leadsPreset}-` + new Date().toISOString().slice(0,10) + ".csv";
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
        <Label sub={`${filteredLeads.length} lead${filteredLeads.length === 1 ? "" : "s"} in this period`}>Download Leads Report</Label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10, marginBottom:14 }}>
          {[
            { id: "today", label: "📆 Today" },
            { id: "week",  label: "📈 This Week" },
            { id: "month", label: "🗓️ This Month" },
            { id: "all",   label: "🏆 All Time" },
          ].map(p => (
            <button key={p.id} onClick={() => setLeadsPreset(p.id)} style={{
              background: leadsPreset === p.id ? T.accent : "transparent",
              color: leadsPreset === p.id ? "#060B16" : T.t2,
              border: `1px solid ${leadsPreset === p.id ? T.accent : T.border}`,
              borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: FONT, transition: "background 0.12s, color 0.12s",
            }}>{p.label}</button>
          ))}
        </div>
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
  { id:"dailyorders", label:"Daily Orders", icon:"📦" },
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

// ══════════════════════════════════════════════════════════════════════════
// ─── DESKTOP EXPERIENCE (≥1024px) ──────────────────────────────────────────
// Dark "control room" theme — sidebar + topbar shell used only on wide
// screens. The mobile app above is completely untouched.
// ══════════════════════════════════════════════════════════════════════════

const DT = {
  bg:        "#0A0F1D",
  sidebar:   "#0B1120",
  surface:   "#111A2E",
  card:      "#121C33",
  cardHi:    "#182544",
  border:    "#1E2B47",
  borderHi:  "#2A3B60",

  t1: "#F1F5F9",
  t2: "#94A3B8",
  t3: "#5F7290",

  accent:     "#14C9A6",
  accentSoft: "rgba(20,201,166,0.14)",
  accentGlow: "rgba(20,201,166,0.35)",

  emerald: "#22C580",
  amber:   "#F5A524",
  rose:    "#F76E7E",
  indigo:  "#4C5FE0",
  sky:     "#3AAEE0",
  orange:  "#F0904A",
  purple:  "#9B6BF2",
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isDesktop;
}

const ROLE_PROFILE = {
  "Admin":       { name: "Naveen S", sub: "Admin" },
  "Telecaller":  { name: "Priya R",  sub: "Telecaller" },
  "Field Sales": { name: "Ramesh K", sub: "Field Sales" },
  "Management":  { name: "Kumar S",  sub: "Management" },
};

// ── Icon set for the desktop shell ──────────────────────────────────────
function DIcon({ id, size = 18, color = "currentColor", strokeWidth = 1.8 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (id) {
    case "dashboard": return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case "crm": return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "pipeline": return <svg {...p}><path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/></svg>;
    case "orders": return <svg {...p}><path d="M6 8V6a3 3 0 0 1 6 0v2"/><rect x="3" y="8" width="12" height="13" rx="2"/><path d="M14 8h4l3 4v9h-4"/><circle cx="7" cy="21" r="1.4"/><circle cx="17" cy="21" r="1.4"/></svg>;
    case "dispatch": return <svg {...p}><rect x="1" y="6" width="14" height="11" rx="1.5"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19.5" r="1.6"/><circle cx="17.5" cy="19.5" r="1.6"/></svg>;
    case "samples": return <svg {...p}><path d="M10 2v6.2L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.2V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/></svg>;
    case "phone": return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.1z"/></svg>;
    case "followups": return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>;
    case "expenses": return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M17 12h.01"/><path d="M3 10h18"/></svg>;
    case "reports": return <svg {...p}><path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/></svg>;
    case "ai": return <svg {...p}><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.2.7.7 1.2 1.5 1.4H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case "bell": return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "chevron": return <svg {...p}><polyline points="15 6 9 12 15 18"/></svg>;
    case "plus": return <svg {...p}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case "call": return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.1z"/></svg>;
    case "chat": return <svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.5a8.3 8.3 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5z"/></svg>;
    case "pin": return <svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case "up": return <svg {...p} strokeWidth="2.5"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>;
    case "down": return <svg {...p} strokeWidth="2.5"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
    case "user": return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>;
    case "cart": return <svg {...p}><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H6"/></svg>;
    case "wallet2": return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M17 12h.01"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/></svg>;
    case "marketing": return <svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>;
    case "compass": return <svg {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
    case "clipboard": return <svg {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h1"/></svg>;
    default: return null;
  }
}

// ── Sidebar nav definition ───────────────────────────────────────────────
const DESKTOP_NAV = [
  { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
  { id: "leads",     label: "CRM",          icon: "crm" },
  { id: "pipeline",  label: "Pipeline",     icon: "pipeline" },
  { id: "repeat",    label: "Orders",       icon: "orders" },
  { id: "dailyorders", label: "Daily Orders", icon: "cart" },
  { id: "fieldsync", label: "Dispatch",     icon: "dispatch" },
  { id: "samples",   label: "Samples",      icon: "samples" },
  { id: "today",     label: "Telecalling",  icon: "phone" },
  { id: "prospects", label: "Find Prospects", icon: "compass", tag: "New" },
  { id: "hrleads",   label: "HR Leads",     icon: "clipboard" },
  { id: "whatsapp",  label: "Follow-ups",   icon: "followups" },
  { id: "marketing", label: "Marketing",    icon: "marketing" },
  { id: "expenses",  label: "Expenses",     icon: "expenses" },
  { id: "reports",   label: "Reports",      icon: "reports" },
  { id: "ai",        label: "AI Assistant", icon: "ai", tag: "New" },
  { id: "settings",  label: "Settings",     icon: "settings" },
];

function DesktopSidebar({ activeTab, setActiveTab, collapsed, setCollapsed, leadsCount }) {
  const w = collapsed ? 76 : 232;
  return (
    <div style={{
      width: w, flexShrink: 0, background: DT.sidebar, borderRight: `1px solid ${DT.border}`,
      display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0,
      transition: "width 0.18s ease", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "22px 0" : "22px 20px", justifyContent: collapsed ? "center" : "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `linear-gradient(135deg, ${DT.accent}, ${DT.sky})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚡</div>
        {!collapsed && <span style={{ fontSize: 15, fontWeight: 800, color: DT.t1, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Sridhi BOS</span>}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {DESKTOP_NAV.map(n => {
          const isActive = activeTab === n.id;
          return (
            <button key={n.id} onClick={() => setActiveTab(n.id)} title={collapsed ? n.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 10, border: "none", cursor: "pointer", fontFamily: FONT,
                background: isActive ? DT.accentSoft : "transparent",
                color: isActive ? DT.accent : DT.t2,
                fontSize: 13, fontWeight: isActive ? 700 : 500, transition: "background 0.12s, color 0.12s",
              }}>
              <DIcon id={n.icon} size={18} color={isActive ? DT.accent : DT.t2} />
              {!collapsed && <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{n.label}</span>}
              {!collapsed && n.id === "leads" && leadsCount > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: isActive ? DT.accent : DT.t3, background: isActive ? "rgba(20,201,166,0.18)" : DT.cardHi, borderRadius: 20, padding: "2px 7px" }}>{leadsCount}</span>
              )}
              {!collapsed && n.tag && (
                <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.accent, background: DT.accentSoft, borderRadius: 20, padding: "2px 6px", letterSpacing: "0.02em" }}>{n.tag}</span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}

function DesktopTopbar({ role, setRole, search, setSearch, collapsed, setCollapsed, notifCount, setActiveTab }) {
  const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const [leads] = useSheetSynced("leads", "leads", []);
  const [repeatCustomers] = useSheetSynced("repeatCustomers", "repeatCustomers", []);
  const [orders] = useSheetSynced("dailyOrders", "dailyOrders", []);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  const q = search.trim().toLowerCase();
  const matches = (val) => (val || "").toString().toLowerCase().includes(q);

  const leadResults = q ? (leads || []).filter(l => matches(l.name) || matches(l.area) || matches(l.contact)).slice(0, 5) : [];
  const repeatResults = q ? (repeatCustomers || []).filter(c => matches(c.name) || matches(c.area) || matches(c.contact)).slice(0, 5) : [];
  const orderResults = q ? (orders || []).filter(o => matches(o.customer) || matches(o.area)).slice(0, 5) : [];
  const totalResults = leadResults.length + repeatResults.length + orderResults.length;

  function goTo(tab) {
    setActiveTab(tab);
    setOpen(false);
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40, background: `${DT.bg}F2`, backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${DT.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 16,
    }}>
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ width: 30, height: 30, borderRadius: "50%", background: DT.card, border: `1px solid ${DT.borderHi}`, color: DT.t2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <DIcon id="chevron" size={14} color={DT.t2} strokeWidth={2.4} style={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
      </button>

      <div ref={boxRef} style={{ position: "relative", width: 320 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><DIcon id="search" size={15} color={DT.t3} /></span>
        <input value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { if (search.trim()) setOpen(true); }}
          placeholder="Search leads, customers, tasks..."
          style={{ width: "100%", background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 12.5, color: DT.t1, fontFamily: FONT, outline: "none" }} />

        {open && q && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, width: 380, maxHeight: 420, overflowY: "auto",
            background: DT.card, border: `1px solid ${DT.borderHi}`, borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.35)", zIndex: 60,
          }}>
            {totalResults === 0 ? (
              <div style={{ padding: "18px 16px", fontSize: 12.5, color: DT.t3, textAlign: "center" }}>No matches for "{search}"</div>
            ) : (
              <>
                {leadResults.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 800, color: DT.t3, letterSpacing: "0.05em", textTransform: "uppercase" }}>Leads</div>
                    {leadResults.map((l, i) => (
                      <div key={"l" + i} onClick={() => goTo("leads")}
                        style={{ padding: "8px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.cardHi} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                          <div style={{ fontSize: 11, color: DT.t3 }}>{l.area || "—"}{l.stage ? " · " + l.stage : ""}</div>
                        </div>
                        <DIcon id="chevron" size={12} color={DT.t3} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
                {repeatResults.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 800, color: DT.t3, letterSpacing: "0.05em", textTransform: "uppercase" }}>Repeat Customers</div>
                    {repeatResults.map((c, i) => (
                      <div key={"c" + i} onClick={() => goTo("repeat")}
                        style={{ padding: "8px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.cardHi} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: DT.t3 }}>{c.area || "—"}</div>
                        </div>
                        <DIcon id="chevron" size={12} color={DT.t3} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
                {orderResults.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 800, color: DT.t3, letterSpacing: "0.05em", textTransform: "uppercase" }}>Daily Orders</div>
                    {orderResults.map((o, i) => (
                      <div key={"o" + i} onClick={() => goTo("dailyorders")}
                        style={{ padding: "8px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.cardHi} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customer}</div>
                          <div style={{ fontSize: 11, color: DT.t3 }}>{o.area || "—"}{o.date ? " · " + o.date : ""}</div>
                        </div>
                        <DIcon id="chevron" size={12} color={DT.t3} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 10, padding: "6px 12px", fontSize: 12, color: DT.t2, whiteSpace: "nowrap" }}>
        <DIcon id="calendar" size={13} color={DT.t3} />Today, {todayStr}
      </div>

      <div style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: DT.card, border: `1px solid ${DT.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <DIcon id="bell" size={16} color={DT.t2} />
        {notifCount > 0 && (
          <span style={{ position: "absolute", top: -3, right: -3, background: DT.rose, color: "#fff", fontSize: 9.5, fontWeight: 800, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${DT.bg}` }}>{notifCount}</span>
        )}
      </div>

      <button onClick={() => setRole(null)} title={`Switch role (currently ${role})`}
        style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${DT.indigo}, ${DT.purple})`, border: "none", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {(role || "?").slice(0, 1)}
      </button>
    </div>
  );
}

// ── Mini sparkline used inside stat cards ────────────────────────────────
function MiniSparkline({ data, color, width = 96, height = 34 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  const gid = "spark-" + color.replace("#", "");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function seededWave(seed, n, base, spread) {
  const out = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    out.push(Math.max(2, Math.round(base + Math.sin(i / 1.7 + seed) * spread * 0.5 + (r - 0.5) * spread * 0.5)));
  }
  return out;
}

function StatCard({ icon, iconBg, label, value, unit, change, color }) {
  const up = change >= 0;
  const spark = seededWave(label.length + value.toString().length, 8, 10, 8);
  return (
    <div style={{
      flex: 1,
      minWidth: 175,
      background: `radial-gradient(130% 130% at 12% 15%, ${color}3D 0%, ${color}14 32%, ${DT.card} 62%)`,
      border: `1px solid ${color}40`,
      borderRadius: 16,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${color}F2 0%, ${color}B8 100%)`, boxShadow: `0 4px 12px ${color}4D`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 12.5, color: DT.t3, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: DT.t1, letterSpacing: "-0.02em" }}>
        {value}{unit && <span style={{ fontSize: 13, color: DT.t3, fontWeight: 600 }}> {unit}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: up ? DT.emerald : DT.rose }}>
          <DIcon id={up ? "up" : "down"} size={11} color={up ? DT.emerald : DT.rose} strokeWidth={3} />
          {Math.abs(change)}% <span style={{ color: DT.t3, fontWeight: 500 }}>vs Yesterday</span>
        </div>
        <MiniSparkline data={spark} color={color} />
      </div>
    </div>
  );
}

// ── Batter Grinder Hero — animated illustration of the traditional wet ───
// grinder churning out fresh idli/dosa/vada batter. Purely decorative +
// a live "KG ground today" readout, used to open both the mobile and
// desktop dashboards with something warmer than another stat card.
function BatterGrinderHero({ theme = DT, kgToday = 0, compact = false }) {
  const stone   = "#5B6B8C";
  const stoneHi = "#7688AD";
  const batter  = "#F7EFE0";
  const wood    = "#8A5A3A";
  const skin    = theme.accent || "#14C9A6";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: `1px solid ${theme.border}`,
        background: `linear-gradient(120deg, ${theme.surface || theme.card} 0%, ${theme.card} 55%, ${theme.cardHi || theme.cardHigh || theme.card} 100%)`,
        padding: compact ? "16px 18px" : "20px 26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        flexWrap: "wrap",
      }}
    >
      <style>{`
        @keyframes grinderSpin      { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes grinderCrank     { 0%,100% { transform: rotate(-10deg); } 50% { transform: rotate(14deg); } }
        @keyframes grinderShoulder  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes grinderDrip1     { 0% { opacity:0; transform: translateY(0) scale(0.5); } 25% { opacity:1; } 85% { opacity:1; } 100% { opacity:0; transform: translateY(20px) scale(1); } }
        @keyframes grinderDrip2     { 0% { opacity:0; transform: translateY(0) scale(0.4); } 35% { opacity:1; } 90% { opacity:1; } 100% { opacity:0; transform: translateY(18px) scale(0.9); } }
        @keyframes grinderRipple    { 0%,100% { transform: scaleX(1); opacity:0.9; } 50% { transform: scaleX(1.08); opacity:0.5; } }
        @keyframes grinderSteam     { 0% { opacity:0; transform: translateY(0) scale(0.85); } 30% { opacity:0.8; } 100% { opacity:0; transform: translateY(-18px) scale(1.25); } }
        @keyframes grinderDust      { 0%,100% { transform: translateY(0); opacity:0.35; } 50% { transform: translateY(-5px); opacity:0.9; } }
        @keyframes grinderPulseDot  { 0%,100% { opacity:0.35; transform: scale(0.8); } 50% { opacity:1; transform: scale(1.15); } }
      `}</style>

      {/* Text side */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: theme.emerald, display: "inline-block" }}>
            <span style={{ position: "absolute", inset: -4, borderRadius: "50%", background: theme.emerald, animation: "grinderPulseDot 1.6s ease-in-out infinite" }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: theme.emerald, textTransform: "uppercase" }}>Live in the kitchen</span>
        </div>
        <div style={{ fontSize: compact ? 15 : 18, fontWeight: 800, color: theme.t1, letterSpacing: "-0.01em" }}>
          Fresh batter, ground daily
        </div>
        <div style={{ fontSize: compact ? 20 : 26, fontWeight: 800, color: theme.t1 }}>
          {Math.round(kgToday).toLocaleString("en-IN")}
          <span style={{ fontSize: 13, color: theme.t3, fontWeight: 600 }}> KG ground today</span>
        </div>
        <div style={{ fontSize: 11.5, color: theme.t3, fontWeight: 500 }}>Idli · Dosa · Vada — straight off the stone</div>
      </div>

      {/* Animated illustration */}
      <svg viewBox="0 0 300 150" width={compact ? 190 : 250} height={compact ? 95 : 125} style={{ flexShrink: 0 }}>
        {/* dust / flour sparkles */}
        <circle cx="30" cy="34" r="2" fill={batter} opacity="0.6" style={{ animation: "grinderDust 2.4s ease-in-out infinite" }} />
        <circle cx="255" cy="26" r="1.6" fill={batter} opacity="0.5" style={{ animation: "grinderDust 2.8s ease-in-out infinite 0.5s" }} />
        <circle cx="205" cy="18" r="1.8" fill={batter} opacity="0.5" style={{ animation: "grinderDust 2s ease-in-out infinite 0.9s" }} />

        {/* steam curls above the drum */}
        <g stroke={batter} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M120 44 Q126 34 120 26 Q114 18 120 10" style={{ animation: "grinderSteam 3s ease-out infinite" }} />
          <path d="M138 44 Q144 35 138 27 Q132 19 138 11" style={{ animation: "grinderSteam 3s ease-out infinite 1s" }} />
          <path d="M156 44 Q162 34 156 26 Q150 18 156 10" style={{ animation: "grinderSteam 3s ease-out infinite 2s" }} />
        </g>

        {/* stand legs */}
        <path d="M108 128 L100 148 M180 128 L188 148 M120 128 L116 148 M168 128 L172 148" stroke={wood} strokeWidth="4" strokeLinecap="round" />

        {/* drum body */}
        <rect x="102" y="70" width="86" height="58" rx="14" fill={stone} />
        <rect x="102" y="70" width="86" height="20" rx="10" fill={stoneHi} />
        <ellipse cx="145" cy="70" rx="43" ry="10" fill={stoneHi} />

        {/* rotating grinding window */}
        <g transform="translate(145,70)">
          <ellipse cx="0" cy="0" rx="30" ry="7" fill={batter} />
          <g style={{ transformOrigin: "0px 0px", animation: "grinderSpin 2.2s linear infinite" }}>
            <ellipse cx="0" cy="0" rx="30" ry="7" fill="none" stroke={stone} strokeWidth="2" strokeDasharray="10 10" />
          </g>
        </g>

        {/* spout + pouring batter */}
        <path d="M102 108 Q80 110 76 118" stroke={stone} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M78 120 Q76 132 78 144" stroke={batter} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.95" />
        <circle cx="78" cy="128" r="3" fill={batter} style={{ animation: "grinderDrip1 1.4s ease-in infinite" }} />
        <circle cx="79" cy="118" r="2.4" fill={batter} style={{ animation: "grinderDrip2 1.4s ease-in infinite 0.6s" }} />

        {/* bowl catching the batter */}
        <ellipse cx="80" cy="146" rx="24" ry="7" fill={wood} opacity="0.9" />
        <ellipse cx="80" cy="143" rx="19" ry="4.5" fill={batter} style={{ animation: "grinderRipple 2.4s ease-in-out infinite", transformOrigin: "80px 143px" }} />

        {/* person cranking the grinder */}
        <g style={{ animation: "grinderShoulder 1.6s ease-in-out infinite" }}>
          {/* head */}
          <circle cx="222" cy="66" r="11" fill={skin} />
          {/* torso */}
          <path d="M208 128 Q206 92 222 88 Q238 92 238 128 Z" fill={skin} opacity="0.92" />
          {/* upper arm (fixed) */}
          <path d="M212 98 Q198 100 192 104" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* forearm + hand cranking the wheel */}
          <g transform="translate(192,104)" style={{ animation: "grinderCrank 1.1s ease-in-out infinite" }}>
            <path d="M0 0 Q-8 10 -4 20" stroke={skin} strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="-4" cy="21" r="4.5" fill={wood} />
          </g>
        </g>
      </svg>
    </div>
  );
}

// ── Sales trend area chart ───────────────────────────────────────────────
// Built from real Daily Orders records (date + kgs + amount) for the last
// 14 days. No fabricated data: if there isn't enough real history yet, an
// empty state is shown instead of a randomly-generated wave.
function SalesTrendChart({ orders = [] }) {
  const active = (orders || []).filter(o => o.status !== "Cancelled" && o.date);

  // Real rolling 14-day window ending today, so the axis always makes sense
  // even before any orders exist.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  const byDate = {};
  active.forEach(o => {
    if (!byDate[o.date]) byDate[o.date] = { kg: 0, revenue: 0, orders: 0 };
    byDate[o.date].kg += parseFloat(o.kgs) || 0;
    byDate[o.date].revenue += parseFloat(o.amount) || 0;
    byDate[o.date].orders += 1;
  });

  const hasData = days.some(d => byDate[d]);
  const points = days.map(d => byDate[d]?.kg || 0);
  const revenuePoints = days.map(d => byDate[d]?.revenue || 0);
  const labelDates = days.map(d => formatDateReadable(d).replace(/, \d{4}$/, ""));

  const totalSales = points.reduce((a, b) => a + b, 0);
  const totalRevenue = revenuePoints.reduce((a, b) => a + b, 0);
  const bestDay = Math.max(...points, 0);
  const avgDay = days.length ? Math.round(totalSales / days.length) : 0;
  const ordersCount = days.reduce((a, d) => a + (byDate[d]?.orders || 0), 0);

  const W = 640, H = 190, PAD = 8;
  const maxV = Math.max(...points, 1);
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((v, i) => [PAD + i * step, H - PAD - (v / maxV) * (H - PAD * 2)]);
  const linePath = coords.length ? coords.map((c, i) => (i === 0 ? "M" : "L") + c[0] + "," + c[1]).join(" ") : "";
  const areaPath = coords.length ? linePath + ` L${coords[coords.length - 1][0]},${H} L${coords[0][0]},${H} Z` : "";
  const hiIdx = hasData ? points.indexOf(bestDay) : -1;
  const hi = hiIdx >= 0 && bestDay > 0 ? coords[hiIdx] : null;

  // Thin x-axis labels so 14 dates don't overlap — show every other one.
  const shownLabels = labelDates.map((d, i) => (i % 2 === 0 || i === labelDates.length - 1) ? d : "");

  return (
    <div style={{ flex: 1.4, minWidth: 380, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Sales Trend</div>
          <div style={{ fontSize: 11.5, color: DT.t3, marginTop: 2 }}>From Daily Orders — last 14 days</div>
        </div>
        <div style={{ background: DT.cardHi, border: `1px solid ${DT.borderHi}`, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, color: DT.t2, fontWeight: 600 }}>Last 14 Days</div>
      </div>

      <div style={{ position: "relative", marginTop: 14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <defs>
            <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DT.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={DT.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke={DT.border} strokeDasharray="4 5" />)}
          {hasData && areaPath && <path d={areaPath} fill="url(#salesArea)" />}
          {hasData && linePath && <path d={linePath} fill="none" stroke={DT.accent} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
          {!hasData && <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke={DT.borderHi} strokeWidth="2" />}
          {hi && <circle cx={hi[0]} cy={hi[1]} r="4.5" fill={DT.bg} stroke={DT.accent} strokeWidth="2.5" />}
          {hi && <line x1={hi[0]} x2={hi[0]} y1={hi[1]} y2={H} stroke={DT.borderHi} strokeDasharray="3 4" />}
        </svg>
        {hi && (
          <div style={{ position: "absolute", left: `calc(${(hi[0] / W) * 100}% - 46px)`, top: Math.max(hi[1] - 46, 0), background: DT.cardHi, border: `1px solid ${DT.borderHi}`, borderRadius: 8, padding: "6px 10px", fontSize: 10.5, color: DT.t1, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
            <div style={{ fontWeight: 700 }}>{labelDates[hiIdx]}</div>
            <div style={{ color: DT.accent, fontWeight: 700 }}>{bestDay.toLocaleString("en-IN", { maximumFractionDigits: 1 })} KG</div>
          </div>
        )}
        {!hasData && (
          <div style={{ position: "absolute", left: "50%", top: "38%", transform: "translate(-50%, -50%)", color: DT.t3, fontSize: 12.5, textAlign: "center", width: "80%" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📈</div>
            <div>No orders in the last 14 days yet</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>The trend will appear once orders are logged in Daily Orders</div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {shownLabels.map((d, i) => <span key={i} style={{ fontSize: 10.5, color: DT.t3 }}>{d}</span>)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 16, borderTop: `1px solid ${DT.border}`, paddingTop: 14, flexWrap: "wrap" }}>
        {[
          ["Total Sales", totalSales.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " KG"],
          ["Average / Day", avgDay.toLocaleString("en-IN") + " KG"],
          ["Best Day", bestDay.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " KG"],
          ["Orders", ordersCount],
          ["Revenue", "₹" + Math.round(totalRevenue).toLocaleString("en-IN")],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 14, fontWeight: 800, color: DT.t1 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: DT.t3, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline funnel (desktop) ────────────────────────────────────────────
function PipelineFunnelDesktop({ liveStages, totalLeads }) {
  const countFor = (...ids) => ids.reduce((a, id) => a + (liveStages.find(s => s.id === id)?.count || 0), 0);
  const rows = [
    { label: "New Lead",      value: countFor("New Lead"), color: DT.indigo },
    { label: "Contacted",     value: countFor("Contacted"), color: DT.sky },
    { label: "Interested",    value: countFor("Interested"), color: DT.emerald },
    { label: "Sample Sent",   value: countFor("Sample Requested", "Assigned to Field Sales", "Sample Delivered"), color: DT.orange },
    { label: "Order Received",value: countFor("Order Received", "Active Customer", "Repeat Order Follow-up"), color: DT.rose },
  ];
  const denom = Math.max(totalLeads, 1);
  const maxW = 100;

  return (
    <div style={{ flex: 1, minWidth: 280, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Pipeline Overview</div>
        <div style={{ background: DT.cardHi, border: `1px solid ${DT.borderHi}`, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, color: DT.t2, fontWeight: 600 }}>This Month ⌄</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {rows.map((r, i) => {
          const pct = totalLeads > 0 ? (r.value / denom) * 100 : 0;
          const widthPct = 100 - i * 15;
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: `${widthPct}%`, maxWidth: maxW + "%", background: r.color, borderRadius: 8, padding: "10px 0", textAlign: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                {r.value}
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: DT.t2, fontWeight: 600 }}>{r.label}</span>
                <span style={{ color: DT.t3, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${DT.border}` }}>
        <span style={{ fontSize: 12, color: DT.t2, fontWeight: 600 }}>Overall Conversion Rate</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: DT.accent }}>
          {totalLeads > 0 ? ((rows[4].value / denom) * 100).toFixed(1) : "0.0"}%
        </span>
      </div>
    </div>
  );
}

// ── Today's Tasks (desktop) ──────────────────────────────────────────────
function TodayTasksDesktop({ leads, samples, repeatCustomers, setActiveTab }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const times = ["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM", "06:00 PM"];
  const items = [];

  leads.filter(l => l.stage === "Callback Requested").slice(0, 3).forEach(l =>
    items.push({ icon: "followups", color: DT.emerald, title: "Follow up with " + l.name, sub: (l.telecaller || "Team") + " · Manager" }));
  samples.filter(s => s.status === "Pending" && s.scheduledDate === todayStr).slice(0, 2).forEach(s =>
    items.push({ icon: "samples", color: DT.orange, title: "Send sample to " + s.customer, sub: (s.exec || "Team") + " · Owner" }));
  repeatCustomers.filter(c => c.status === "Due Today").slice(0, 2).forEach(c =>
    items.push({ icon: "orders", color: DT.sky, title: "Collect payment from " + c.name, sub: "Manager" }));
  leads.filter(l => l.stage === "Sample Requested").slice(0, 2).forEach(l =>
    items.push({ icon: "phone", color: DT.purple, title: "Call " + l.name, sub: "Follow up" }));

  const list = items.slice(0, 5);

  return (
    <div style={{ flex: 1, minWidth: 260, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Today's Tasks</div>
        <button onClick={() => setActiveTab("today")} style={{ background: "none", border: "none", color: DT.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>View All</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: DT.t3, padding: "16px 0" }}>All clear — no pending tasks today.</div>}
        {list.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < list.length - 1 ? `1px solid ${DT.border}` : "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: it.color + "22", border: `1px solid ${it.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <DIcon id={it.icon} size={14} color={it.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
              <div style={{ fontSize: 11, color: DT.t3, marginTop: 1 }}>{it.sub}</div>
            </div>
            <div style={{ fontSize: 10.5, color: DT.t3, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <DIcon id="calendar" size={11} color={DT.t3} />{times[i] || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Activities (desktop) ──────────────────────────────────────────
function RecentActivitiesDesktop({ leads, samples, repeatCustomers, setActiveTab }) {
  const labels = ["10:30 AM", "09:45 AM", "Yesterday", "Yesterday", new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })];
  const items = [];
  leads.slice(0, 2).forEach(l => items.push({ icon: "user", color: DT.emerald, title: "New lead added - " + l.name, who: l.telecaller || "Team" }));
  samples.slice(0, 1).forEach(s => items.push({ icon: "samples", color: DT.purple, title: "Sample sent to " + s.customer, who: s.exec || "Team" }));
  repeatCustomers.filter(c => c.status === "Paid").slice(0, 1).forEach(c => items.push({ icon: "wallet2", color: DT.accent, title: "Payment received from " + c.name, who: "Rahul" }));
  leads.filter(l => l.stage === "Order Received").slice(0, 1).forEach(l => items.push({ icon: "cart", color: DT.orange, title: "Order placed - " + l.name, who: l.telecaller || "Team" }));
  leads.slice(2, 3).forEach(l => items.push({ icon: "user", color: DT.sky, title: "New lead added - " + l.name, who: l.telecaller || "Team" }));

  const list = items.slice(0, 5);

  return (
    <div style={{ flex: 1, minWidth: 260, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Recent Activities</div>
        <button onClick={() => setActiveTab("leads")} style={{ background: "none", border: "none", color: DT.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>View All</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: DT.t3, padding: "16px 0" }}>No recent activity yet.</div>}
        {list.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < list.length - 1 ? `1px solid ${DT.border}` : "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: it.color + "22", border: `1px solid ${it.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <DIcon id={it.icon} size={14} color={it.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
              <div style={{ fontSize: 11, color: DT.t3, marginTop: 1 }}>{it.who}</div>
            </div>
            <div style={{ fontSize: 10.5, color: DT.t3, flexShrink: 0 }}>{labels[i] || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Leads grid (desktop) ───────────────────────────────────────────
function stageChipColorDesktop(stage) {
  if (stage === "New Lead") return DT.sky;
  if (stage === "Contacted") return DT.orange;
  if (stage === "Interested") return DT.emerald;
  if ((stage || "").includes("Sample")) return DT.purple;
  if ((stage || "").includes("Order") || stage === "Active Customer") return DT.accent;
  return DT.t3;
}

function RecentLeadsDesktop({ leads, setActiveTab }) {
  const list = leads.filter(l => l && l.name).slice(0, 4);
  return (
    <div style={{ flex: "1 1 100%", minWidth: 560, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Recent Leads</div>
        <button onClick={() => setActiveTab("leads")} style={{ background: "none", border: "none", color: DT.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>View All</button>
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: DT.t3, padding: "24px 0", textAlign: "center" }}>No leads yet — add your first lead from the CRM tab.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginTop: 14 }}>
          {list.map((l, i) => {
            const chip = stageChipColorDesktop(l.stage);
            const initials = (l.name || "??").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
            const phone = (l.contact || "").replace(/[^0-9]/g, "");
            return (
              <div key={i} style={{ background: DT.surface, border: `1px solid ${DT.border}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${DT.indigo}, ${DT.sky})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: DT.t3 }}>{l.type || l.business || "Business"}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: chip, background: chip + "22", border: `1px solid ${chip}44`, borderRadius: 20, padding: "3px 8px", height: "fit-content", whiteSpace: "nowrap" }}>{l.stage}</span>
                </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  {l.contact && <div style={{ fontSize: 11.5, color: DT.t2, display: "flex", alignItems: "center", gap: 6 }}><DIcon id="phone" size={11} color={DT.t3} />{l.contact}</div>}
                  {l.area && <div style={{ fontSize: 11.5, color: DT.t2, display: "flex", alignItems: "center", gap: 6 }}><DIcon id="pin" size={11} color={DT.t3} />{l.area}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${DT.border}` }}>
                  <button onClick={() => { if (phone) window.location.href = "tel:+91" + phone; }} style={{ flex: 1, background: DT.emerald + "1c", border: `1px solid ${DT.emerald}40`, borderRadius: 8, padding: "6px 0", cursor: "pointer" }}><DIcon id="call" size={13} color={DT.emerald} /></button>
                  <button onClick={() => { if (phone) window.open("https://wa.me/91" + phone, "_blank"); }} style={{ flex: 1, background: "#25D3661c", border: "1px solid #25D36640", borderRadius: 8, padding: "6px 0", cursor: "pointer" }}><DIcon id="chat" size={13} color="#25D366" /></button>
                  <button onClick={() => { if (l.area) window.open("https://maps.google.com/?q=" + encodeURIComponent(l.area), "_blank"); }} style={{ flex: 1, background: DT.sky + "1c", border: `1px solid ${DT.sky}40`, borderRadius: 8, padding: "6px 0", cursor: "pointer" }}><DIcon id="pin" size={13} color={DT.sky} /></button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: DT.t3 }}>
                  <span>Last Contact <b style={{ color: DT.t2 }}>{l.lastContact || "—"}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Full desktop dashboard home ──────────────────────────────────────────
function DesktopDashboardHome({ setActiveTab }) {
  const [leads] = useSheetSynced("leads", "leads", []);
  const [samples] = useSheetSynced("samples", "samples", []);
  const [repeatCustomers] = useSheetSynced("repeatCustomers", "repeatCustomers", []);
  const [dailyOrders] = useSheetSynced("dailyOrders", "dailyOrders", []);
  const [expenses] = useSheetSynced("expenses", "expenses", []);

  const activeLeads = (leads || []).filter(l => l && l.name && l.stage);
  const activeCustomers = activeLeads.filter(l => l.stage === "Active Customer").length;
  const ordersReceived = activeLeads.filter(l => ["Order Received", "Active Customer", "Repeat Order Follow-up"].includes(l.stage));
  const convRate = activeLeads.length > 0 ? Math.round((ordersReceived.length / activeLeads.length) * 100) : 0;

  const samplesSentKg = (samples || []).reduce((a, b) => a + (Number(b.qty) || 0), 0);

  // ── Revenue & Sales — sourced directly from Daily Orders (matches the Daily Orders page exactly) ──
  const today = todayISO();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const activeOrders = (dailyOrders || []).filter(o => o.status !== "Cancelled");
  const todaysOrders = activeOrders.filter(o => o.date === today);
  const yesterdaysOrders = activeOrders.filter(o => o.date === yesterday);
  const totalRevenue = todaysOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const totalKg = todaysOrders.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);
  const yestRevenue = yesterdaysOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const yestKg = yesterdaysOrders.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);
  const revenueChange = yestRevenue > 0 ? Math.round(((totalRevenue - yestRevenue) / yestRevenue) * 100) : (totalRevenue > 0 ? 100 : 0);
  const kgChange = yestKg > 0 ? Math.round(((totalKg - yestKg) / yestKg) * 100) : (totalKg > 0 ? 100 : 0);

  // ── Expenses — pulled from the Expenses log for today ──────────────────
  const todaysExpenses = (expenses || []).filter(e => e.date === today).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const yesterdaysExpenses = (expenses || []).filter(e => e.date === yesterday).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const netToday = totalRevenue - todaysExpenses;
  const expenseChange = yesterdaysExpenses > 0 ? Math.round(((todaysExpenses - yesterdaysExpenses) / yesterdaysExpenses) * 100) : (todaysExpenses > 0 ? 100 : 0);

  const stageCounts = {};
  activeLeads.forEach(l => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });
  const liveStages = PIPELINE_STAGES.map(s => ({ ...s, count: stageCounts[s.id] || 0 }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BatterGrinderHero theme={DT} kgToday={totalKg} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard icon="💰" iconBg={DT.purple + "26"} label="Today's Revenue" value={"₹" + totalRevenue.toLocaleString("en-IN")} change={revenueChange} color={DT.purple} />
        <StatCard icon="🛍️" iconBg={DT.emerald + "26"} label="Today's Sales" value={totalKg} unit="KG" change={kgChange} color={DT.emerald} />
        <StatCard icon="💸" iconBg={DT.rose + "26"} label="Today's Expenses" value={"₹" + todaysExpenses.toLocaleString("en-IN")} change={expenseChange} color={DT.rose} />
        <StatCard icon="📈" iconBg={(netToday >= 0 ? DT.emerald : DT.rose) + "26"} label="Net Profit (Today)" value={"₹" + netToday.toLocaleString("en-IN")} change={netToday >= 0 ? 1 : -1} color={netToday >= 0 ? DT.emerald : DT.rose} />
        <StatCard icon="🎯" iconBg={DT.sky + "26"} label="Conversion Rate" value={convRate + "%"} change={convRate > 0 ? 8 : 0} color={DT.sky} />
        <StatCard icon="🏪" iconBg={DT.orange + "26"} label="Active Customers" value={activeCustomers} change={activeCustomers > 0 ? 5 : 0} color={DT.orange} />
        <StatCard icon="🧪" iconBg={DT.purple + "26"} label="Samples Sent" value={samplesSentKg} unit="KG" change={samplesSentKg > 0 ? -4 : 0} color={DT.purple} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
        <SalesTrendChart orders={dailyOrders || []} />
        <PipelineFunnelDesktop liveStages={liveStages} totalLeads={activeLeads.length} />
        <TodayTasksDesktop leads={activeLeads} samples={samples || []} repeatCustomers={repeatCustomers || []} setActiveTab={setActiveTab} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
        <RecentLeadsDesktop leads={activeLeads} setActiveTab={setActiveTab} />
        <RecentActivitiesDesktop leads={activeLeads} samples={samples || []} repeatCustomers={repeatCustomers || []} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

// ── Product Overview (desktop) — proportional bar per product, KG-wise ───
function ProductOverviewDesktop({ orders }) {
  const today = todayISO();
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const monthOrders = (orders || []).filter(o => o.status !== "Cancelled" && o.date >= monthStart && o.date <= today);
  const totals = PRODUCTS.map(p => {
    let kgs = 0;
    monthOrders.forEach(o => orderLineItems(o).forEach(i => { if (i.product === p.name) kgs += parseFloat(i.kgs) || 0; }));
    return { name: p.name, kgs };
  });
  const totalKg = totals.reduce((a, t) => a + t.kgs, 0);
  const denom = totalKg || 1;
  const colors = [DT.accent, DT.indigo, DT.orange, DT.rose];

  return (
    <div style={{ flex: 1, minWidth: 280, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Product Overview</div>
        <div style={{ background: DT.cardHi, border: `1px solid ${DT.borderHi}`, borderRadius: 8, padding: "5px 10px", fontSize: 11.5, color: DT.t2, fontWeight: 600 }}>This Month ⌄</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {totals.map((t, i) => {
          const pct = (t.kgs / denom) * 100;
          const widthPct = Math.max(pct, 8);
          return (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: `${widthPct}%`, maxWidth: "70%", background: colors[i % colors.length], borderRadius: 8, padding: "10px 0", textAlign: "center", color: "#fff", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                {Math.round(t.kgs).toLocaleString("en-IN")} KG
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: DT.t2, fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: DT.t3, fontWeight: 700 }}>{totalKg > 0 ? pct.toFixed(1) : "0.0"}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${DT.border}` }}>
        <span style={{ fontSize: 12, color: DT.t2, fontWeight: 600 }}>Total This Month</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: DT.accent }}>{Math.round(totalKg).toLocaleString("en-IN")} KG</span>
      </div>
    </div>
  );
}

// ── Revenue Summary donut (desktop) ───────────────────────────────────────
function RevenueSummaryDesktop({ todaysRevenue, weekRevenue, monthRevenue, allTimeRevenue }) {
  const segs = [
    { label: "Today", value: todaysRevenue, color: DT.accent },
    { label: "This Week", value: Math.max(weekRevenue - todaysRevenue, 0), color: DT.sky },
    { label: "This Month", value: Math.max(monthRevenue - weekRevenue, 0), color: DT.purple },
    { label: "Earlier", value: Math.max(allTimeRevenue - monthRevenue, 0), color: DT.rose },
  ];
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div style={{ flex: 1, minWidth: 280, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Revenue Summary</div>
      <div style={{ fontSize: 11.5, color: DT.t3, marginTop: 2 }}>This Month Overview</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
        <svg width={136} height={136} viewBox="0 0 136 136" style={{ flexShrink: 0 }}>
          <g transform="translate(68,68) rotate(-90)">
            <circle r={R} fill="none" stroke={DT.border} strokeWidth={16} />
            {segs.map((s, i) => {
              const len = (s.value / total) * C;
              const el = <circle key={i} r={R} fill="none" stroke={s.color} strokeWidth={16} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
              offset += len;
              return el;
            })}
          </g>
          <text x="68" y="64" textAnchor="middle" fontSize="9.5" fill={DT.t3} fontFamily={FONT}>Total</text>
          <text x="68" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill={DT.t1} fontFamily={FONT}>₹{Math.round(total).toLocaleString("en-IN")}</text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 140 }}>
          {segs.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: DT.t2, fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />{s.label}
              </span>
              <span style={{ color: DT.t1, fontWeight: 700, whiteSpace: "nowrap" }}>₹{Math.round(s.value).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Today's Orders list (desktop) ─────────────────────────────────────────
function TodaysOrdersDesktop({ orders, setActiveTab }) {
  const today = todayISO();
  const list = (orders || []).filter(o => o.date === today).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);

  return (
    <div style={{ flex: 1, minWidth: 380, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Today's Orders</div>
          <div style={{ fontSize: 11, color: DT.t3, marginTop: 2 }}>All orders placed today</div>
        </div>
        <button onClick={() => document.getElementById("orders-by-date-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ background: "none", border: "none", color: DT.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>View All</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: DT.t3, padding: "20px 0", textAlign: "center" }}>No orders logged today yet.</div>}
        {list.map((o, i) => {
          const cancelled = o.status === "Cancelled";
          const items = orderLineItems(o);
          const col = o.orderType === "New Order" ? DT.accent : DT.sky;
          return (
            <div key={o.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < list.length - 1 ? `1px solid ${DT.border}` : "none", opacity: cancelled ? 0.55 : 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: col + "22", border: `1px solid ${col}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: col, flexShrink: 0 }}>
                {(o.customer || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: DT.t3, marginTop: 1 }}>{o.area || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 220 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: col, background: col + "1c", border: `1px solid ${col}40`, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap" }}>{o.orderType === "New Order" ? "NEW ORDER" : "REGULAR ORDER"}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.sky, background: DT.sky + "1c", border: `1px solid ${DT.sky}40`, borderRadius: 20, padding: "3px 8px", whiteSpace: "nowrap" }}>{items.map(it => `${it.product} - ${it.kgs}KG`).join(", ")}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: DT.emerald, flexShrink: 0, width: 66, textAlign: "right" }}>₹{(o.amount || 0).toLocaleString("en-IN")}</div>
              <div style={{ fontSize: 10.5, color: DT.t3, flexShrink: 0, width: 60, textAlign: "right" }}>{o.createdAt ? new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
              <DIcon id="chevron" size={14} color={DT.t3} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily Summary list (desktop) ──────────────────────────────────────────
function DailySummaryDesktop({ orders, setActiveTab }) {
  const active = (orders || []).filter(o => o.status !== "Cancelled");
  const byDate = {};
  active.forEach(o => {
    if (!byDate[o.date]) byDate[o.date] = { newCount: 0, regularCount: 0, kgs: 0, revenue: 0 };
    const b = byDate[o.date];
    if (o.orderType === "New Order") b.newCount += 1; else b.regularCount += 1;
    b.kgs += parseFloat(o.kgs) || 0;
    b.revenue += parseFloat(o.amount) || 0;
  });
  const rows = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);

  return (
    <div style={{ flex: 1, minWidth: 380, background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Daily Summary</div>
          <div style={{ fontSize: 11, color: DT.t3, marginTop: 2 }}>New vs regular, total KGs and revenue</div>
        </div>
        <button onClick={() => document.getElementById("orders-by-date-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ background: "none", border: "none", color: DT.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>View Full History</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
        {rows.length === 0 && <div style={{ fontSize: 12, color: DT.t3, padding: "20px 0", textAlign: "center" }}>No orders logged yet.</div>}
        {rows.map(([date, s], i) => (
          <div key={date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 0", borderBottom: i < rows.length - 1 ? `1px solid ${DT.border}` : "none" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: DT.t1, minWidth: 96 }}>{formatDateReadable(date)}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.accent, background: DT.accent + "1c", border: `1px solid ${DT.accent}40`, borderRadius: 20, padding: "3px 8px" }}>{s.newCount} NEW</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.sky, background: DT.sky + "1c", border: `1px solid ${DT.sky}40`, borderRadius: 20, padding: "3px 8px" }}>{s.regularCount} REGULAR</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.orange, background: DT.orange + "1c", border: `1px solid ${DT.orange}40`, borderRadius: 20, padding: "3px 8px" }}>{Math.round(s.kgs)} KG</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: DT.emerald, background: DT.emerald + "1c", border: `1px solid ${DT.emerald}40`, borderRadius: 20, padding: "3px 8px" }}>₹{Math.round(s.revenue).toLocaleString("en-IN")}</span>
              <DIcon id="chevron" size={14} color={DT.t3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Full desktop Daily Orders home (dashboard-style overview) ─────────────
function DesktopDailyOrdersHome({ setActiveTab }) {
  const [dailyOrders] = useSheetSynced("dailyOrders", "dailyOrders", []);
  const [leads] = useSheetSynced("leads", "leads", []);

  const today = todayISO();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const active = (dailyOrders || []).filter(o => o.status !== "Cancelled");
  const todaysOrders = active.filter(o => o.date === today);
  const yestOrders = active.filter(o => o.date === yesterday);

  const todaysNew = todaysOrders.filter(o => o.orderType === "New Order").length;
  const todaysRegular = todaysOrders.filter(o => o.orderType === "Regular Order").length;
  const todaysKg = todaysOrders.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);
  const todaysRevenue = todaysOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);

  const yestNew = yestOrders.filter(o => o.orderType === "New Order").length;
  const yestRegular = yestOrders.filter(o => o.orderType === "Regular Order").length;
  const yestKg = yestOrders.reduce((a, o) => a + (parseFloat(o.kgs) || 0), 0);
  const yestRevenue = yestOrders.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);

  const pctChange = (now, prev) => prev > 0 ? Math.round(((now - prev) / prev) * 100) : (now > 0 ? 100 : 0);

  const activeCustomers = (leads || []).filter(l => l && l.stage === "Active Customer").length;

  const startOfWeekISO = (() => { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 6 : day - 1; d.setDate(d.getDate() - diff); return d.toISOString().slice(0, 10); })();
  const startOfMonthISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const weekRevenue = active.filter(o => o.date >= startOfWeekISO && o.date <= today).reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const monthRevenue = active.filter(o => o.date >= startOfMonthISO && o.date <= today).reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);
  const allTimeRevenue = active.reduce((a, o) => a + (parseFloat(o.amount) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard icon="🆕" iconBg={DT.accent + "26"} label="Today's Orders" value={todaysNew} unit="New Orders" change={pctChange(todaysNew, yestNew)} color={DT.accent} />
        <StatCard icon="🔁" iconBg={DT.sky + "26"} label="Regular Orders" value={todaysRegular} unit="Today" change={pctChange(todaysRegular, yestRegular)} color={DT.sky} />
        <StatCard icon="⚖️" iconBg={DT.purple + "26"} label="Total KGs" value={Math.round(todaysKg)} unit="KG Today" change={pctChange(todaysKg, yestKg)} color={DT.purple} />
        <StatCard icon="💰" iconBg={DT.orange + "26"} label="Today Revenue" value={"₹" + Math.round(todaysRevenue).toLocaleString("en-IN")} change={pctChange(todaysRevenue, yestRevenue)} color={DT.orange} />
        <StatCard icon="🏪" iconBg={DT.emerald + "26"} label="Active Customers" value={activeCustomers} unit="Total" change={activeCustomers > 0 ? 5 : 0} color={DT.emerald} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
        <ProductOverviewDesktop orders={dailyOrders || []} />
        <RevenueSummaryDesktop todaysRevenue={todaysRevenue} weekRevenue={weekRevenue} monthRevenue={monthRevenue} allTimeRevenue={allTimeRevenue} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
        <TodaysOrdersDesktop orders={dailyOrders || []} setActiveTab={setActiveTab} />
        <DailySummaryDesktop orders={dailyOrders || []} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div style={{ background: DT.card, border: `1px solid ${DT.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: DT.t1 }}>Settings</div>
      <div style={{ fontSize: 12.5, color: DT.t3, marginTop: 6 }}>Account and workspace settings are coming soon.</div>
    </div>
  );
}

// ── Desktop shell wrapping sidebar + topbar + module content ─────────────
function DesktopShell({ activeTab, setActiveTab, role, setRole, leadsCount, renderModule }) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DT.bg, fontFamily: FONT }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${DT.bg}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${DT.borderHi}; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        input::placeholder { color: ${DT.t3}; }
      `}</style>
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} leadsCount={leadsCount} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <DesktopTopbar role={role} setRole={setRole} search={search} setSearch={setSearch} collapsed={collapsed} setCollapsed={setCollapsed} notifCount={3} setActiveTab={setActiveTab} />
        <div style={{ flex: 1, padding: "24px 28px 60px" }}>
          {activeTab === "dashboard" ? (
            <DesktopDashboardHome setActiveTab={setActiveTab} />
          ) : activeTab === "settings" ? (
            <SettingsPlaceholder />
          ) : activeTab === "dailyorders" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <DesktopDailyOrdersHome setActiveTab={setActiveTab} />
              <div style={{ background: T.bg, borderRadius: 16, overflow: "hidden" }}>
                {renderModule({ embedded: true })}
              </div>
            </div>
          ) : (
            <div style={{ background: T.bg, borderRadius: 16, overflow: "hidden" }}>
              {renderModule()}
            </div>
          )}
        </div>
      </div>
      <button
        style={{ position: "fixed", bottom: 28, right: 28, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${DT.accent}, ${DT.sky})`, border: "none", color: "#04140F", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 10px 26px ${DT.accentGlow}` }}
        onClick={() => setActiveTab("leads")}>
        <DIcon id="plus" size={22} color="#04140F" strokeWidth={2.6} />
      </button>
    </div>
  );
}


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
  const [activeTab, setActiveTabRaw] = useState(() => {
    try { return localStorage.getItem("bos_activeTab") || "dashboard"; } catch { return "dashboard"; }
  });
  const [role, setRoleRaw] = useState(() => {
    try { return localStorage.getItem("bos_role") || null; } catch { return null; }
  });
  const setActiveTab = (tab) => {
    setActiveTabRaw(tab);
    try { localStorage.setItem("bos_activeTab", tab); } catch {}
  };
  const setRole = (r) => {
    setRoleRaw(r);
    try {
      if (r) localStorage.setItem("bos_role", r);
      else { localStorage.removeItem("bos_role"); localStorage.removeItem("bos_activeTab"); setActiveTabRaw("dashboard"); }
    } catch {}
  };
  const [showMore, setShowMore] = useState(false);
  const contentRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const isDesktop = useIsDesktop();
  const [leadsForBadge] = useSheetSynced("leads", "leads", []);

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

  const tabLabel = { dashboard:"Dashboard", leads:"Leads CRM", pipeline:"Pipeline", fieldsync:"Field Sync", samples:"Samples", repeat:"Repeat Orders", dailyorders:"Daily Orders", expenses:"Expenses", marketing:"Marketing", reports:"Reports", ai:"AI Assistant", whatsapp:"WA Templates", hrleads:"HR Leads", today:"Today Tasks", prospects:"Find Prospects" };

  // ── INSTALL BANNER ──
  const InstallBanner = () => showInstall ? (
    <div style={{
      position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
      width:"calc(100% - 32px)", maxWidth:448, zIndex:999,
      background:T.card,
      boxShadow:`0 8px 32px rgba(15,23,42,0.12)`,
      border:`1px solid ${T.accentGlow}`, borderRadius:18,
      padding:"14px 16px", display:"flex", alignItems:"center", gap:12,
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

  const renderModule = (moduleProps = {}) => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "leads":     return <Leads />;
      case "pipeline":  return <Pipeline />;
      case "fieldsync": return <FieldSync />;
      case "samples":   return <Samples />;
      case "repeat":    return <RepeatOrders />;
      case "dailyorders": return <DailyOrders {...moduleProps} />;
      case "expenses":  return <Expenses />;
      case "marketing": return <Marketing />;
      case "reports":   return <Reports />;
      case "today":     return <TodayTasks />;
      case "prospects":  return <ProspectFinder />;
      case "hrleads":   return <HRLeads />;
      case "whatsapp":  return <WhatsAppTemplates />;
      case "ai":        return <AIAssistant />;
      case "settings":  return <SettingsPlaceholder />;
      default:          return <Dashboard />;
    }
  };

  if (isDesktop && role) {
    return (
      <DesktopShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        setRole={setRole}
        leadsCount={(leadsForBadge || []).filter(l => l && l.name).length}
        renderModule={renderModule}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.t1, fontFamily:FONT, display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        select option { background: ${T.card}; color: ${T.t1}; }
        @keyframes pulse { 0%,100% { opacity:0.25; transform:scale(0.8); } 50% { opacity:1; transform:scale(1.1); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: ${T.t3}; }
        textarea::placeholder { color: ${T.t3}; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px ${T.card} inset; -webkit-text-fill-color: ${T.t1}; }

        button { transition: transform 0.12s ease, opacity 0.12s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; }
        button:active { transform: scale(0.96); opacity: 0.9; }
        a, .tappable, [role="button"] { transition: transform 0.12s ease, opacity 0.12s ease; }

        .bos-content-fade { animation: fadeSlideIn 0.28s ease both; }
      `}</style>

      {/* Header */}
      <div style={{ background:T.glass, borderBottom:`1px solid ${T.border}`, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:80, backdropFilter:"blur(14px)", boxShadow:"0 4px 20px rgba(0,0,0,0.25)" }}>
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
      <div style={{ height:2, flexShrink:0, background:`linear-gradient(90deg, ${T.sky}, ${T.indigo}, ${T.accent}, ${T.emerald})`, boxShadow:`0 0 12px ${T.accentGlow}` }} />

      {/* Content */}
      <div ref={contentRef} key={activeTab} className="bos-content-fade" style={{ flex:1, overflowY:"auto", padding: activeTab==="ai" ? "16px 16px 0" : "16px 16px 90px" }}>
        {renderModule()}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:T.glass, backdropFilter:"blur(14px)", borderTop:`1px solid ${T.border}`, display:"flex", padding:"10px 0 20px", zIndex:80, boxShadow:"0 -4px 20px rgba(0,0,0,0.3)" }}>
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
                boxShadow: activeTab===m.id ? `0 0 16px ${T.accentGlow}` : "none",
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
