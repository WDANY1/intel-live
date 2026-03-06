import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AGENTS, OSINT_SOURCES, NEWS_CHANNELS, LIVE_WEBCAMS, WEBCAM_REGIONS, REFRESH_INTERVAL, MAX_LOG_ENTRIES, SEVERITY, AI_MODELS, AGENT_MODEL_MAP } from "./config";
import { AgentManager, verifyIntel } from "./api";
import ConflictMap from "./components/ConflictMap";
import WebcamViewer from "./components/WebcamViewer";
import EventTimeline from "./components/EventTimeline";
import MaritimePanel from "./components/MaritimePanel";

// ════════════════════════════════════════════════════════════
// UTILITY COMPONENTS — Palantir/Bloomberg Style
// ════════════════════════════════════════════════════════════

function PulsingDot({ color = "#FF3B30", size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, opacity: 0.4, animation: "pulseRing 2s ease-in-out infinite" }} />
    </span>
  );
}

function SeverityBadge({ level }) {
  const cfg =
    level >= 5 ? { color: "#FF3B30", label: "CRITIC" } :
    level >= 4 ? { color: "#FFB020", label: "RIDICAT" } :
    level >= 3 ? { color: "#FFD60A", label: "MEDIU" } :
    { color: "#30D158", label: "SCĂZUT" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 6px", borderRadius: 3, fontSize: "0.5rem",
      fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: 1,
      background: `${cfg.color}15`, border: `1px solid ${cfg.color}33`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function AgentStatusDot({ status, color }) {
  if (status === "running") return <span style={{ width: 7, height: 7, borderRadius: "50%", border: `2px solid ${color}`, borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />;
  if (status === "done") return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}66` }} />;
  if (status === "error") return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF3B30", display: "inline-block" }} />;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "inline-block" }} />;
}

// ── SVG Risk Gauge ──
function RiskGauge({ value, max = 10, label, size = 100 }) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 0.8 ? "#FF3B30" : pct >= 0.6 ? "#FFB020" : pct >= 0.4 ? "#FFD60A" : "#30D158";
  const r = 36;
  const cx = 50, cy = 44;
  const circumHalf = Math.PI * r;
  const dashLen = circumHalf * pct;
  const dashGap = circumHalf - dashLen;

  return (
    <div style={{ textAlign: "center", width: size }}>
      <svg viewBox="0 0 100 58" width="100%">
        {/* Background arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dashLen} ${dashGap}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}66)`, transition: "stroke-dasharray 1s ease" }} />
        {/* Value text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="var(--mono)">
          {value}
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="var(--mono)">
          /{max}
        </text>
      </svg>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginTop: -4 }}>
        {label}
      </div>
    </div>
  );
}

// ── Severity Progress Bar ──
function SeverityBar({ level, max = 5 }) {
  const pct = (level / max) * 100;
  const color = level >= 5 ? "#FF3B30" : level >= 4 ? "#FFB020" : level >= 3 ? "#FFD60A" : "#30D158";
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 1, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ── Signal Card (Intelligence Grade) ──
function SignalCard({ item, agentDef, onVerify, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(null);
  const color = agentDef?.color || "#00E5FF";
  const sevColor = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : item.severity >= 3 ? "#FFD60A" : "#30D158";

  const handleVerify = async (e) => {
    e.stopPropagation();
    if (verifying || verification) return;
    setVerifying(true);
    const result = await onVerify?.(item);
    setVerification(result);
    setVerifying(false);
  };

  // Source reliability (simulated based on verification and source)
  const reliability = item.verified ? "A" : item.source?.includes("Reuters") || item.source?.includes("AP") ? "B" : "C";
  const relColor = reliability === "A" ? "#30D158" : reliability === "B" ? "#00E5FF" : "#FFB020";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        background: isNew ? "rgba(255,59,48,0.04)" : "#121821",
        border: `1px solid ${isNew ? "rgba(255,59,48,0.15)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 6, overflow: "hidden",
        cursor: "pointer", transition: "all 0.2s",
        animation: isNew ? "slideInLeft 0.5s cubic-bezier(0.16,1,0.3,1)" : "fadeIn 0.3s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isNew ? "rgba(255,59,48,0.15)" : "rgba(255,255,255,0.05)"; }}
    >
      {/* Severity indicator bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${sevColor}, ${sevColor}44)` }} />

      <div style={{ padding: "8px 10px" }}>
        {/* Top row: agent + severity + reliability */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: "0.6rem", flexShrink: 0 }}>{agentDef?.icon || "📌"}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color, fontWeight: 700, letterSpacing: 1 }}>{agentDef?.name}</span>
            {isNew && (
              <span style={{
                fontFamily: "var(--mono)", fontSize: "0.38rem", color: "#FF3B30",
                padding: "0 4px", background: "rgba(255,59,48,0.15)", borderRadius: 2,
                fontWeight: 700, animation: "pulse 1s ease infinite",
              }}>NEW</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: "0.4rem", fontWeight: 700, letterSpacing: 1,
              padding: "1px 4px", borderRadius: 2,
              background: `${relColor}15`, color: relColor, border: `1px solid ${relColor}33`,
            }}>REL:{reliability}</span>
            <SeverityBadge level={item.severity || 3} />
          </div>
        </div>

        {/* Headline */}
        <h4 style={{
          margin: "0 0 3px", fontSize: "0.68rem", fontWeight: 600, color: "#E5E7EB", lineHeight: 1.35,
          fontFamily: "var(--sans)",
          display: expanded ? "block" : "-webkit-box", WebkitLineClamp: expanded ? "unset" : 2,
          WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden",
        }}>
          {item.headline}
        </h4>

        {/* Severity progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0" }}>
          <SeverityBar level={item.severity || 3} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: sevColor, fontWeight: 700, flexShrink: 0 }}>
            S{item.severity || 3}
          </span>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div style={{ animation: "fadeInUp 0.3s ease" }}>
            <p style={{ margin: "4px 0 6px", fontSize: "0.62rem", color: "rgba(229,231,235,0.5)", lineHeight: 1.5, fontFamily: "var(--sans)" }}>
              {item.summary}
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={handleVerify} style={{
                padding: "3px 8px", borderRadius: 4, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
                color: "#00E5FF", fontFamily: "var(--mono)", fontSize: "0.48rem", fontWeight: 700, letterSpacing: 1, cursor: "pointer",
              }}>
                {verifying ? "..." : verification ? "✓ VERIFIED" : "VERIFY"}
              </button>
              {verification && (
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: verification.verified ? "#30D158" : "#FFB020" }}>
                  {verification.confidence}% — {verification.crossVerification?.consensus || ""}
                </span>
              )}
              {item.aiModelName && (
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", color: "rgba(255,255,255,0.2)", padding: "1px 5px", background: "rgba(255,255,255,0.03)", borderRadius: 3 }}>
                  {item.aiModelName}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer: location + source + time */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(229,231,235,0.25)" }}>
            {item.location ? `📍${item.location} · ` : ""}{item.source}
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", color: "rgba(229,231,235,0.18)" }}>{item.time}</span>
        </div>
      </div>
    </div>
  );
}

// ── Alert Ticker ──
function AlertTicker({ items }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      background: "rgba(255,59,48,0.04)", borderBottom: "1px solid rgba(255,59,48,0.08)",
      overflow: "hidden", whiteSpace: "nowrap", height: 26, display: "flex", alignItems: "center", flexShrink: 0,
    }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 0, animation: `tickerScroll ${items.length * 7}s linear infinite` }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingRight: 40, flexShrink: 0 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: (item.severity || 3) >= 4 ? "#FF3B30" : "#FFB020", flexShrink: 0 }} />
            <span style={{ fontSize: "0.58rem", fontFamily: "var(--mono)", color: "rgba(229,231,235,0.55)", letterSpacing: 0.3 }}>{item.text || item.headline}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Economic Impact Widget ──
function EconomicWidget({ analysis }) {
  const indicators = [
    { label: "BRENT CRUDE", value: analysis?.oil_price || "~$80", change: analysis?.oil_change || "+2.3%", color: "#FFB020", up: true },
    { label: "GOLD", value: analysis?.gold_price || "~$2,650", change: "+0.8%", color: "#FFD60A", up: true },
    { label: "SHIPPING IDX", value: "BDI 1,420", change: "-3.1%", color: "#FF3B30", up: false },
    { label: "VIX FEAR", value: "18.5", change: "+1.2", color: "#FFB020", up: true },
  ];

  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 6 }}>
        📊 ECONOMIC IMPACT
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {indicators.map((ind) => (
          <div key={ind.label} style={{ padding: "5px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", letterSpacing: 1, color: "rgba(229,231,235,0.3)" }}>{ind.label}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", fontWeight: 700, color: "#E5E7EB" }}>{ind.value}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", fontWeight: 600, color: ind.up ? "#30D158" : "#FF3B30" }}>
                {ind.up ? "▲" : "▼"} {ind.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      {analysis?.oil_impact && (
        <div style={{ marginTop: 6, padding: "4px 6px", borderLeft: "2px solid rgba(255,176,32,0.3)", borderRadius: "0 3px 3px 0" }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(229,231,235,0.4)", margin: 0, lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {analysis.oil_impact}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Satellite Imagery Widget ──
function SatelliteWidget() {
  const sources = [
    { name: "Sentinel Hub", url: "https://apps.sentinel-hub.com/eo-browser/", desc: "ESA Earth Observation", color: "#00E5FF" },
    { name: "NASA FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/map/", desc: "Fire & Thermal Anomalies", color: "#FF3B30" },
    { name: "NASA Worldview", url: "https://worldview.earthdata.nasa.gov/", desc: "Real-time satellite imagery", color: "#A78BFA" },
    { name: "Google Earth", url: "https://earth.google.com/web/", desc: "High-res imagery", color: "#30D158" },
  ];

  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 6 }}>
        🛰️ SATELLITE IMAGERY
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sources.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 8px", borderRadius: 4,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              textDecoration: "none", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${s.color}33`; e.currentTarget.style.background = `${s.color}08`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          >
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 600, color: s.color }}>{s.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", color: "rgba(229,231,235,0.25)" }}>{s.desc}</div>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(229,231,235,0.2)" }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Maritime Mini Widget ──
function MaritimeMini() {
  const chokepoints = [
    { name: "HORMUZ", risk: "CRITICAL", color: "#FF3B30", flow: "20.5M bbl/d" },
    { name: "BAB EL-M", risk: "HIGH", color: "#FFB020", flow: "6.2M bbl/d" },
    { name: "SUEZ", risk: "MEDIUM", color: "#FFD60A", flow: "12% trade" },
    { name: "MALACCA", risk: "LOW", color: "#30D158", flow: "25% trade" },
  ];

  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 6 }}>
        🚢 MARITIME CHOKEPOINTS
      </div>
      {chokepoints.map((c) => (
        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, boxShadow: c.risk === "CRITICAL" ? `0 0 6px ${c.color}` : "none", animation: c.risk === "CRITICAL" ? "pulse 1.5s ease infinite" : "none", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", fontWeight: 700, color: c.color, width: 65 }}>{c.name}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(229,231,235,0.25)", flex: 1 }}>{c.flow}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", letterSpacing: 1, color: c.color, background: `${c.color}10`, padding: "1px 4px", borderRadius: 2 }}>{c.risk}</span>
        </div>
      ))}
    </div>
  );
}

// ── OSINT Sources Widget ──
function SourcesWidget() {
  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 6 }}>
        🔗 OSINT · {OSINT_SOURCES.length} ACCOUNTS · {NEWS_CHANNELS.length} NEWS
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxHeight: 200, overflowY: "auto" }}>
        {OSINT_SOURCES.filter((s) => s.tier === 1).map((src) => (
          <a key={src.handle} href={`https://x.com/${src.handle}`} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "#00E5FF", padding: "2px 5px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 3, textDecoration: "none" }}
            title={src.focus}>
            @{src.handle}
          </a>
        ))}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", color: "rgba(229,231,235,0.18)", marginTop: 4 }}>
        +{OSINT_SOURCES.filter((s) => s.tier === 2).length} Tier 2 accounts
      </div>
    </div>
  );
}

// ── System Log ──
function SystemLog({ logs }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);
  if (!logs.length) return null;
  const typeColors = { system: "#00E5FF", success: "#30D158", error: "#FF3B30", alert: "#FFB020", info: "rgba(255,255,255,0.25)" };
  return (
    <div style={{ padding: "6px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.2)", marginBottom: 4 }}>💻 SYSTEM LOG</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 120, overflowY: "auto" }}>
        {logs.slice(-20).map((log, i) => (
          <div key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: typeColors[log.type] || "rgba(255,255,255,0.2)" }}>
            <span style={{ color: "rgba(229,231,235,0.12)" }}>[{log.time}]</span> {log.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Analysis Panel ──
function AnalysisWidget({ analysis }) {
  if (!analysis) return <div style={{ padding: "12px", fontFamily: "var(--mono)", fontSize: "0.52rem", color: "rgba(229,231,235,0.2)", textAlign: "center" }}>Analiză strategică în curs...</div>;
  const color = analysis.threat_level >= 8 ? "#FF3B30" : analysis.threat_level >= 6 ? "#FFB020" : analysis.threat_level >= 4 ? "#FFD60A" : "#30D158";

  return (
    <div style={{ padding: "8px 10px" }}>
      {analysis.situation_summary && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 4 }}>SUMAR EXECUTIV</div>
          <p style={{ fontFamily: "var(--sans)", fontSize: "0.58rem", color: "rgba(229,231,235,0.5)", margin: 0, lineHeight: 1.5 }}>{analysis.situation_summary}</p>
        </div>
      )}
      {[
        { key: "next_hours_prediction", icon: "⏳", label: "6-12H", c: "#FFB020" },
        { key: "next_days_prediction", icon: "📅", label: "3-7D", c: "#00E5FF" },
        { key: "proxy_status", icon: "🎯", label: "PROXY", c: "#FFB020" },
        { key: "diplomatic_status", icon: "🏛️", label: "DIPLO", c: "#A78BFA" },
      ].filter(({ key }) => analysis[key]).map(({ key, icon, label, c }) => (
        <div key={key} style={{ padding: "4px 6px", marginBottom: 4, borderLeft: `2px solid ${c}33`, borderRadius: "0 3px 3px 0" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", letterSpacing: 1, color: c }}>{icon} {label}</div>
          <p style={{ fontFamily: "var(--sans)", fontSize: "0.52rem", color: "rgba(229,231,235,0.4)", margin: "2px 0 0", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{analysis[key]}</p>
        </div>
      ))}
      {analysis.key_risks?.length > 0 && (
        <div style={{ padding: "4px 6px", background: "rgba(255,59,48,0.04)", borderRadius: 4, border: "1px solid rgba(255,59,48,0.08)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", letterSpacing: 1, color: "#FF3B30", marginBottom: 3 }}>⚠ KEY RISKS</div>
          {analysis.key_risks.slice(0, 3).map((r, i) => (
            <div key={i} style={{ fontFamily: "var(--sans)", fontSize: "0.5rem", color: "rgba(229,231,235,0.4)", marginBottom: 2, paddingLeft: 6, borderLeft: "1px solid rgba(255,59,48,0.15)" }}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Webcam Strip ──
const WEBCAM_STRIP = [
  { id: "jNZM_H6q1rY", name: "Jerusalem", flag: "🇮🇱" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv", flag: "🇮🇱" },
  { id: "4K_-EhKjYjs", name: "Dubai", flag: "🇦🇪" },
  { id: "9eN4Jbxvbyg", name: "Mecca", flag: "🇸🇦" },
  { id: "KJGASBMieBo", name: "Beirut", flag: "🇱🇧" },
  { id: "wDkHBAdYXD0", name: "Istanbul", flag: "🇹🇷" },
  { id: "C6GKe0skDDE", name: "Doha", flag: "🇶🇦" },
  { id: "uEMKGCKBKdQ", name: "Haifa", flag: "🇮🇱" },
];

const NEWS_STREAMS = [
  { name: "Al Jazeera", url: "https://www.youtube.com/@AlJazeeraEnglish/live", color: "#00E5FF" },
  { name: "France 24", url: "https://www.youtube.com/@FRANCE24English/live", color: "#A78BFA" },
  { name: "Sky News", url: "https://www.youtube.com/@SkyNews/live", color: "#FFB020" },
];

function WebcamBottomStrip({ onOpenCams }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%", overflowX: "auto", padding: "0 6px" }}>
      {WEBCAM_STRIP.map((cam) => (
        <a key={cam.id} href={`https://www.youtube.com/watch?v=${cam.id}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 5px", borderRadius: 4, textDecoration: "none", flexShrink: 0, transition: "background 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ position: "relative", width: 56, height: 32, borderRadius: 3, overflow: "hidden", background: "#121821", border: "1px solid rgba(255,255,255,0.06)" }}>
            <img src={`https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`} alt={cam.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.style.display = "none"; }} />
            <div style={{ position: "absolute", bottom: 1, left: 2, display: "flex", alignItems: "center", gap: 2, background: "rgba(0,0,0,0.7)", padding: "1px 3px", borderRadius: 2 }}>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#FF3B30", animation: "pulse 1.5s ease infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.32rem", color: "#FF3B30" }}>LIVE</span>
            </div>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: "rgba(229,231,235,0.3)", marginTop: 1 }}>{cam.name}</span>
        </a>
      ))}
      <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.06)", margin: "0 4px", flexShrink: 0 }} />
      {NEWS_STREAMS.map((s) => (
        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 6px", textDecoration: "none", flexShrink: 0, borderRadius: 4, transition: "background 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ width: 48, height: 32, borderRadius: 3, background: `${s.color}10`, border: `1px solid ${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: s.color, fontWeight: 700 }}>{s.name.split(" ")[0]}</span>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.35rem", color: "rgba(229,231,235,0.2)", marginTop: 1 }}>24/7 ↗</span>
        </a>
      ))}
      <button onClick={onOpenCams} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3px 8px", borderRadius: 4, cursor: "pointer", flexShrink: 0, marginLeft: 4, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "0.8rem" }}>📹</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.35rem", color: "rgba(229,231,235,0.25)" }}>ALL</span>
      </button>
    </div>
  );
}

// ── API Key Modal ──
function ApiKeyModal({ onSubmit }) {
  const [key, setKey] = useState("");
  const [testStatus, setTestStatus] = useState(null);
  const sanitizeKey = (k) => k.replace(/[^\x20-\x7E]/g, "").trim();

  const testConnection = async () => {
    setTestStatus("testing");
    try {
      const healthRes = await fetch("/api/claude");
      const health = await healthRes.json();
      if (!healthRes.ok) { setTestStatus({ ok: false, message: `Error: ${JSON.stringify(health)}` }); return; }
      const apiRes = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": sanitizeKey(key) || "test" },
        body: JSON.stringify({ prompt: "Say OK" }),
      });
      const apiData = await apiRes.json();
      if (apiRes.ok && apiData.text) setTestStatus({ ok: true, message: `Connection OK! (${health.hasApiKey ? "ENV key" : "browser key"})` });
      else setTestStatus({ ok: false, message: `API error ${apiRes.status}: ${apiData.error || "Unknown"}` });
    } catch (err) { setTestStatus({ ok: false, message: `Error: ${err.message}` }); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 30%, rgba(0,229,255,0.05) 0%, #0B0F14 70%)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,229,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.015) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      <div style={{ position: "relative", background: "rgba(18,24,33,0.95)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 10, padding: "36px 32px", maxWidth: 440, width: "90%", animation: "fadeInUp 0.5s ease", backdropFilter: "blur(20px)", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <PulsingDot color="#FF3B30" size={10} />
          <span style={{ fontFamily: "var(--display)", fontSize: "1.3rem", fontWeight: 800, letterSpacing: 2, color: "#00E5FF" }}>INTEL</span>
          <span style={{ fontFamily: "var(--display)", fontSize: "1.3rem", fontWeight: 800, letterSpacing: 2, color: "#E5E7EB" }}>LIVE</span>
        </div>
        <p style={{ color: "rgba(229,231,235,0.4)", fontSize: "0.68rem", fontFamily: "var(--sans)", marginBottom: 20 }}>
          Command Center — Real-time Intelligence Platform
        </p>

        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 2, color: "rgba(229,231,235,0.25)", marginBottom: 6 }}>
          OPENROUTER API KEY
        </label>
        <input type="password" value={key}
          onChange={(e) => setKey(e.target.value.replace(/[^\x20-\x7E]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && sanitizeKey(key) && onSubmit(sanitizeKey(key))}
          placeholder="sk-or-..."
          style={{ width: "100%", padding: "11px 14px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,229,255,0.15)", color: "#fff", fontFamily: "var(--mono)", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.15)")}
          autoFocus
        />
        <p style={{ color: "rgba(229,231,235,0.18)", fontSize: "0.5rem", marginTop: 5, fontFamily: "var(--mono)" }}>
          openrouter.ai/settings/keys — free models included
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={testConnection} disabled={testStatus === "testing"} style={{ padding: "10px 16px", borderRadius: 6, background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF", fontFamily: "var(--mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
            {testStatus === "testing" ? "TESTING..." : "TEST"}
          </button>
          <button onClick={() => sanitizeKey(key) && onSubmit(sanitizeKey(key))} disabled={!key.trim()} style={{
            flex: 1, padding: "10px 0", borderRadius: 6,
            background: key.trim() ? "#00E5FF" : "rgba(255,255,255,0.04)",
            color: key.trim() ? "#0B0F14" : "rgba(255,255,255,0.2)",
            fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 2, cursor: key.trim() ? "pointer" : "not-allowed",
          }}>
            ACTIVATE
          </button>
        </div>
        {testStatus && testStatus !== "testing" && (
          <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 5, background: testStatus.ok ? "rgba(48,209,88,0.08)" : "rgba(255,59,48,0.08)", border: `1px solid ${testStatus.ok ? "rgba(48,209,88,0.2)" : "rgba(255,59,48,0.2)"}` }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: testStatus.ok ? "#30D158" : "#FF3B30" }}>
              {testStatus.ok ? "✓ " : "✗ "}{testStatus.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD — Palantir Gotham / Bloomberg Terminal Style
// ════════════════════════════════════════════════════════════

export default function LiveIntelDashboard() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("intel_api_key") || "");
  const [isActive, setIsActive] = useState(false);
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState(Object.fromEntries(AGENTS.map((a) => [a.id, { status: "idle", count: 0, message: "" }])));
  const [logs, setLogs] = useState([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [rightTab, setRightTab] = useState("signals");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("severity");
  const [totalCycles, setTotalCycles] = useState(0);
  const [previousIntel, setPreviousIntel] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mapLayer, setMapLayer] = useState("all");

  const managerRef = useRef(null);

  const allItems = useMemo(() => {
    const items = Object.entries(intel).flatMap(([agentId, agentItems]) => (agentItems || []).map((item) => ({ ...item, _agentId: agentId })));
    const filtered = activeFilter === "ALL" ? items : items.filter((i) => i._agentId === activeFilter);
    const searched = searchQuery ? filtered.filter((i) => (i.headline + " " + i.summary + " " + (i.source || "")).toLowerCase().includes(searchQuery.toLowerCase())) : filtered;
    if (sortBy === "severity") searched.sort((a, b) => (b.severity || 0) - (a.severity || 0));
    else searched.sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0));
    return searched;
  }, [intel, activeFilter, searchQuery, sortBy]);

  const totalItems = useMemo(() => Object.values(intel).flat().length, [intel]);
  const criticalItems = useMemo(() => Object.values(intel).flat().filter((i) => i.severity >= 4).length, [intel]);

  const previousKeys = useMemo(() => {
    const set = new Set();
    Object.values(previousIntel).flat().forEach((i) => { if (i?.headline) set.add(i.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40)); });
    return set;
  }, [previousIntel]);

  const isNewItem = useCallback((item) => {
    if (!previousKeys.size) return false;
    return !previousKeys.has(item.headline?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40));
  }, [previousKeys]);

  const handleApiKey = useCallback((key) => {
    localStorage.setItem("intel_api_key", key);
    setApiKey(key);
    setIsActive(true);
  }, []);

  const handleVerify = useCallback(async (item) => {
    if (!apiKey) return null;
    try { return await verifyIntel(apiKey, item); } catch { return null; }
  }, [apiKey]);

  useEffect(() => {
    if (!isActive || !apiKey) return;
    const manager = new AgentManager(apiKey,
      (data) => {
        setPreviousIntel((prev) => ({ ...prev, ...intel }));
        setIntel(data.intel);
        if (data.analysis) setAnalysis(data.analysis);
        if (data.breaking?.length) setBreaking((prev) => [...data.breaking, ...prev].slice(0, 30));
        setLastUpdate(new Date());
        setCountdown(REFRESH_INTERVAL);
        setTotalCycles(data.cycle);
        if (soundEnabled) {
          const hasCritical = Object.values(data.intel).flat().some((i) => i.severity >= 5);
          if (hasCritical) { try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGhdYQ==").play().catch(() => {}); } catch {} }
        }
      },
      (progress) => { setAgentStatuses((prev) => ({ ...prev, [progress.agentId]: { status: progress.status, count: progress.count || prev[progress.agentId]?.count || 0, message: progress.message } })); },
      (log) => { setLogs((prev) => [...prev.slice(-(MAX_LOG_ENTRIES - 1)), log]); }
    );
    managerRef.current = manager;
    manager.start(REFRESH_INTERVAL);
    return () => manager.stop();
  }, [isActive, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); managerRef.current?.manualRefresh(); }
      if (e.key === "s" || e.key === "S") setSoundEnabled((p) => !p);
      if (e.key === "Escape") { setSearchQuery(""); setActiveFilter("ALL"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!isActive) return <ApiKeyModal onSubmit={handleApiKey} />;

  const isLoading = Object.values(agentStatuses).some((s) => s.status === "running");

  const rightTabs = [
    { id: "signals", label: "SIGNALS", icon: "📡" },
    { id: "analysis", label: "ANALYSIS", icon: "🧠" },
    { id: "maritime", label: "NAVAL", icon: "🚢" },
    { id: "economic", label: "ECON", icon: "📊" },
    { id: "satellite", label: "SAT", icon: "🛰️" },
    { id: "webcams", label: "CAMS", icon: "📹" },
    { id: "sources", label: "OSINT", icon: "🔗" },
    { id: "logs", label: "SYS", icon: "💻" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0B0F14" }}>

      {/* ═══ HEADER ═══ */}
      <header style={{
        height: 46, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 12px", display: "flex", alignItems: "center",
        background: "rgba(18,24,33,0.95)", backdropFilter: "blur(20px)", zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 14, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 12, flexShrink: 0 }}>
          <PulsingDot color={isLoading ? "#FFB020" : "#FF3B30"} size={8} />
          <span style={{ fontFamily: "var(--display)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: 2, color: "#00E5FF" }}>INTEL</span>
          <span style={{ fontFamily: "var(--display)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: 2, color: "#E5E7EB" }}>LIVE</span>
        </div>

        {/* Agents */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 14, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 12, flexShrink: 0 }}>
          {AGENTS.map((agent) => {
            const st = agentStatuses[agent.id] || {};
            return (
              <div key={agent.id} title={`${agent.fullName} — ${st.count || 0}`}
                style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 5px", borderRadius: 3, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => { setActiveFilter(agent.id); setRightTab("signals"); }}>
                <AgentStatusDot status={st.status} color={agent.color} />
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: st.status === "running" ? agent.color : "rgba(229,231,235,0.35)", fontWeight: 600 }}>
                  {agent.icon}
                </span>
              </div>
            );
          })}
        </div>

        {/* Threat level mini */}
        {analysis && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 14, borderRight: "1px solid rgba(255,255,255,0.06)", marginRight: 12 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 1, color: "rgba(229,231,235,0.25)" }}>THREAT</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", fontWeight: 800, color: analysis.threat_level >= 7 ? "#FF3B30" : "#FFB020" }}>
              {analysis.threat_level}
              <span style={{ fontSize: "0.48rem", color: "rgba(229,231,235,0.25)" }}>/10</span>
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
          {criticalItems > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, animation: "glowPulse 2s ease infinite" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF3B30", animation: "pulse 1s ease infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "#FF3B30", fontWeight: 700 }}>{criticalItems} CRITICAL</span>
            </div>
          )}
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(229,231,235,0.25)" }}>{totalItems} signals</span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "right", marginRight: 4 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.35rem", letterSpacing: 1, color: "rgba(229,231,235,0.18)" }}>NEXT CYCLE</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 700, color: countdown < 15 ? "#FF3B30" : "#30D158" }}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </div>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} title="Sound (S)" style={{ fontSize: "0.7rem", opacity: soundEnabled ? 1 : 0.3 }}>
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button onClick={() => managerRef.current?.manualRefresh()} disabled={isLoading} style={{
            padding: "5px 12px", borderRadius: 5,
            background: isLoading ? "rgba(255,255,255,0.02)" : "rgba(0,229,255,0.08)",
            border: `1px solid ${isLoading ? "rgba(255,255,255,0.06)" : "rgba(0,229,255,0.2)"}`,
            color: isLoading ? "rgba(229,231,235,0.3)" : "#00E5FF",
            fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: 1, cursor: isLoading ? "wait" : "pointer",
          }}>
            {isLoading ? "SCANNING..." : "⟳ REFRESH"}
          </button>
          {lastUpdate && <span style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", color: "rgba(229,231,235,0.18)" }}>{lastUpdate.toLocaleTimeString("ro-RO")}</span>}
        </div>
      </header>

      {/* ═══ TICKER ═══ */}
      <AlertTicker items={breaking} />

      {/* ═══ MAIN GRID ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── MAP PANEL (63%) ── */}
        <div style={{ flex: "0 0 63%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ConflictMap intelItems={allItems} analysis={analysis} externalLayer={mapLayer} />
        </div>

        {/* ── RIGHT PANEL (37%) ── */}
        <div style={{ flex: "0 0 37%", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#0E1319" }}>

          {/* Right panel tabs */}
          <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(18,24,33,0.8)" }}>
            {rightTabs.map((tab) => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                flex: 1, padding: "8px 2px",
                fontFamily: "var(--mono)", fontSize: "0.42rem", fontWeight: 600, letterSpacing: 0.5,
                background: rightTab === tab.id ? "rgba(0,229,255,0.04)" : "transparent",
                color: rightTab === tab.id ? "#00E5FF" : "rgba(229,231,235,0.25)",
                borderBottom: rightTab === tab.id ? "2px solid #00E5FF" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <span style={{ display: "block", fontSize: "0.65rem", marginBottom: 1 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── SIGNALS TAB ── */}
          {rightTab === "signals" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Controls */}
              <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", gap: 4, alignItems: "center" }}>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search signals..."
                  style={{ flex: 1, padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontFamily: "var(--mono)", fontSize: "0.58rem", outline: "none", minWidth: 60 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.3)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.06)")} />
                <button onClick={() => setSortBy(sortBy === "severity" ? "time" : "severity")} style={{
                  padding: "3px 6px", borderRadius: 3, fontFamily: "var(--mono)", fontSize: "0.42rem",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(229,231,235,0.35)", cursor: "pointer",
                }}>{sortBy === "severity" ? "↓SEV" : "↓TIME"}</button>
              </div>
              {/* Agent pills */}
              <div style={{ padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, display: "flex", gap: 3, overflowX: "auto" }}>
                <button onClick={() => setActiveFilter("ALL")} style={{
                  padding: "2px 6px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: "0.42rem",
                  background: activeFilter === "ALL" ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${activeFilter === "ALL" ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.05)"}`,
                  color: activeFilter === "ALL" ? "#00E5FF" : "rgba(229,231,235,0.3)", cursor: "pointer", flexShrink: 0,
                }}>ALL {totalItems}</button>
                {AGENTS.map((a) => {
                  const c = (intel[a.id] || []).length;
                  if (!c) return null;
                  return (
                    <button key={a.id} onClick={() => setActiveFilter(a.id)} style={{
                      padding: "2px 6px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: "0.42rem",
                      background: activeFilter === a.id ? `${a.color}15` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${activeFilter === a.id ? `${a.color}44` : "rgba(255,255,255,0.05)"}`,
                      color: activeFilter === a.id ? a.color : "rgba(229,231,235,0.3)", cursor: "pointer", flexShrink: 0,
                    }}>{a.icon} {c}</button>
                  );
                })}
              </div>
              {/* Signal feed */}
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                {allItems.length > 0 ? allItems.map((item, i) => (
                  <SignalCard key={`${item.headline}-${i}`} item={item} agentDef={AGENTS.find((a) => a.id === item._agentId)} onVerify={handleVerify} isNew={isNewItem(item)} />
                )) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "1.4rem", animation: "pulse 1.5s ease infinite", marginBottom: 10 }}>📡</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "rgba(229,231,235,0.2)", letterSpacing: 2 }}>
                      {isLoading ? "SCANNING INTELLIGENCE SOURCES..." : "AWAITING DATA..."}
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                      {AGENTS.filter((a) => agentStatuses[a.id]?.status === "running").map((a) => (
                        <span key={a.id} style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: a.color, animation: "pulse 1.5s ease infinite" }}>{a.icon} {a.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Risk gauges + Analysis mini */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, background: "#121821" }}>
                {analysis && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "6px 10px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <RiskGauge value={analysis.threat_level || 0} max={10} label="THREAT" size={85} />
                    {analysis.escalation_probability != null && <RiskGauge value={Math.round(analysis.escalation_probability / 10)} max={10} label="ESCALATION" size={85} />}
                    {analysis.nuclear_risk != null && <RiskGauge value={Math.round(analysis.nuclear_risk / 10)} max={10} label="NUCLEAR" size={85} />}
                  </div>
                )}
                <div style={{ maxHeight: 150, overflowY: "auto" }}>
                  <AnalysisWidget analysis={analysis} />
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYSIS TAB ── */}
          {rightTab === "analysis" && (
            <div style={{ flex: 1, overflowY: "auto", background: "#121821" }}>
              {analysis && (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <RiskGauge value={analysis.threat_level || 0} max={10} label="THREAT LEVEL" size={110} />
                  {analysis.escalation_probability != null && <RiskGauge value={Math.round(analysis.escalation_probability / 10)} max={10} label="ESCALATION" size={110} />}
                  {analysis.nuclear_risk != null && <RiskGauge value={Math.round(analysis.nuclear_risk / 10)} max={10} label="NUCLEAR RISK" size={110} />}
                </div>
              )}
              <AnalysisWidget analysis={analysis} />
            </div>
          )}

          {/* ── MARITIME TAB ── */}
          {rightTab === "maritime" && <div style={{ flex: 1, overflowY: "auto" }}><MaritimePanel /></div>}

          {/* ── ECONOMIC TAB ── */}
          {rightTab === "economic" && <div style={{ flex: 1, overflowY: "auto", background: "#121821" }}><EconomicWidget analysis={analysis} /></div>}

          {/* ── SATELLITE TAB ── */}
          {rightTab === "satellite" && <div style={{ flex: 1, overflowY: "auto", background: "#121821" }}><SatelliteWidget /></div>}

          {/* ── WEBCAMS TAB ── */}
          {rightTab === "webcams" && <div style={{ flex: 1, overflowY: "auto" }}><WebcamViewer /></div>}

          {/* ── SOURCES TAB ── */}
          {rightTab === "sources" && <div style={{ flex: 1, overflowY: "auto", background: "#121821" }}><SourcesWidget /></div>}

          {/* ── LOGS TAB ── */}
          {rightTab === "logs" && <div style={{ flex: 1, overflowY: "auto", background: "#121821" }}><SystemLog logs={logs} /></div>}
        </div>
      </div>

      {/* ═══ BOTTOM STRIP ═══ */}
      <div style={{
        height: 68, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", overflow: "hidden", background: "rgba(18,24,33,0.95)",
      }}>
        {/* Maritime mini */}
        <div style={{ flex: "0 0 auto", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 10px", gap: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", letterSpacing: 2, color: "rgba(229,231,235,0.2)" }}>MARITIME</span>
          {[
            { n: "HORMUZ", c: "#FF3B30" }, { n: "BAB-M", c: "#FFB020" }, { n: "SUEZ", c: "#FFD60A" }, { n: "MALACCA", c: "#30D158" },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.c, boxShadow: s.c === "#FF3B30" ? `0 0 4px ${s.c}` : "none" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", fontWeight: 700, color: s.c }}>{s.n}</span>
            </div>
          ))}
        </div>

        {/* Webcam strip */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <WebcamBottomStrip onOpenCams={() => setRightTab("webcams")} />
        </div>

        {/* Stats */}
        <div style={{ flex: "0 0 auto", borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "6px 12px", display: "flex", gap: 10, alignItems: "center" }}>
          {[
            { label: "SIGNALS", value: totalItems, color: "#00E5FF" },
            { label: "CRITICAL", value: criticalItems, color: "#FF3B30" },
            { label: "CYCLES", value: totalCycles, color: "#30D158" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.35rem", letterSpacing: 1, color: "rgba(229,231,235,0.2)" }}>{s.label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: "rgba(229,231,235,0.12)" }}>
            {isLoading ? <span style={{ color: "#FFB020" }}>● SCAN</span> : <span style={{ color: "#30D158" }}>● LIVE</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
