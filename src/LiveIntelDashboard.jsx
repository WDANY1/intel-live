import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AGENTS, OSINT_SOURCES, NEWS_CHANNELS, LIVE_WEBCAMS, WEBCAM_REGIONS, REFRESH_INTERVAL, MAX_LOG_ENTRIES, SEVERITY, AI_MODELS, AGENT_MODEL_MAP } from "./config";
import { AgentManager, verifyIntel } from "./api";
import ConflictMap from "./components/ConflictMap";
import EventTimeline from "./components/EventTimeline";
import MaritimePanel from "./components/MaritimePanel";
import AiChat from "./components/AiChat";
import PredictionMarkets from "./components/PredictionMarkets";
import InstabilityIndex from "./components/InstabilityIndex";
import NuclearMonitor from "./components/NuclearMonitor";

// ════════════════════════════════════════════════════════
// UTILITY COMPONENTS — Ops-Center Style
// ════════════════════════════════════════════════════════

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
    level >= 5 ? { color: "#FF3B30", label: "CRITICAL" } :
    level >= 4 ? { color: "#FFB020", label: "HIGH" } :
    level >= 3 ? { color: "#FFD60A", label: "MEDIUM" } :
    { color: "#30D158", label: "LOW" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem",
      fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: 1,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function SectionHeader({ icon, title, subtitle, color = "var(--accent)", action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: "1rem" }}>{icon}</span>}
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color, letterSpacing: 1.5 }}>{title}</span>
        {subtitle && <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}

// ── SVG Risk Gauge ──
function RiskGauge({ value = 0, max = 10, label = "", color = "#00E5FF", size = 100 }) {
  const pct = Math.min(value / max, 1);
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const startAngle = Math.PI;
  const endAngle = 0;
  const arcLength = Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const valAngle = startAngle - pct * arcLength;
  const xv = cx + r * Math.cos(valAngle);
  const yv = cy - r * Math.sin(valAngle);
  const large = pct > 0.5 ? 1 : 0;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" />
        {pct > 0 && <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${xv} ${yv}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="800" fontFamily="var(--mono)">{value}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={size * 0.09} fontFamily="var(--mono)">/{max}</text>
      </svg>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 1.5, color: "var(--text-muted)", marginTop: -4 }}>{label}</div>
    </div>
  );
}

// ── Signal Card ──
function SignalCard({ item, onVerify }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : item.severity >= 3 ? "#FFD60A" : "#30D158";
  const agent = AGENTS.find((a) => a.id === item.agentId);
  const reliability = item.verified ? "A" : item.severity >= 4 ? "B" : "C";
  const relColor = reliability === "A" ? "#30D158" : reliability === "B" ? "#FFB020" : "#FF3B30";

  return (
    <div
      className="intel-card"
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "var(--bg-card)", borderRadius: "var(--radius)",
        cursor: "pointer", overflow: "hidden",
        animation: "cardReveal 0.4s ease both",
      }}
    >
      {/* Severity top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${sevColor}, ${sevColor}44)` }} />

      <div style={{ padding: "12px 14px" }}>
        {/* Top row: agent + severity + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {agent && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: agent.color, padding: "1px 6px", background: `${agent.color}12`, borderRadius: 3 }}>
              {agent.icon} {agent.name}
            </span>
          )}
          <SeverityBadge level={item.severity} />
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>{item.time}</span>
        </div>

        {/* Headline */}
        <div style={{ fontFamily: "var(--sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
          {item.headline}
        </div>

        {/* Summary */}
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
          {item.summary}
        </p>

        {/* Bottom row: source + reliability */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {item.source && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
              📰 {item.source}
            </span>
          )}
          {item.location && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--accent)" }}>
              📍 {item.location}
            </span>
          )}
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: relColor, fontWeight: 700, padding: "1px 5px", background: `${relColor}12`, borderRadius: 3 }}>
            REL {reliability}
          </span>
          {item.aiModelName && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{item.aiModelName}</span>
          )}
        </div>

        {/* Expanded verification section */}
        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            {item.verification ? (
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <div style={{ color: item.verification.verified ? "#30D158" : "#FF3B30", fontWeight: 700, marginBottom: 4 }}>
                  {item.verification.crossVerification?.consensus || (item.verification.verified ? "VERIFICAT" : "NEVERIFICAT")}
                  {" "}— Confidence: {item.verification.confidence}%
                </div>
                {item.verification.corroborating_sources?.length > 0 && (
                  <div>Sources: {item.verification.corroborating_sources.join(", ")}</div>
                )}
                {item.verification.notes && <div style={{ marginTop: 4, color: "var(--text-muted)" }}>{item.verification.notes}</div>}
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onVerify?.(item); }}
                style={{
                  padding: "6px 14px", borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)", border: "1px solid rgba(0,229,255,0.25)",
                  color: "var(--accent)", fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔍 VERIFY ACROSS 3 AI MODELS
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Economic Widget ──
function EconomicWidget({ analysis }) {
  const data = [
    { label: "BRENT CRUDE", value: "$82.4", change: "+3.2%", color: "#FF3B30", up: true },
    { label: "GOLD", value: "$2,345", change: "+1.8%", color: "#FFD60A", up: true },
    { label: "SHIPPING IDX", value: "2,840", change: "-5.1%", color: "#FF3B30", up: false },
    { label: "VIX FEAR", value: "24.8", change: "+12%", color: "#FF3B30", up: true },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12 }}>
      {data.map((d) => (
        <div key={d.label} style={{ padding: "10px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>{d.label}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{d.value}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: d.color }}>
            {d.up ? "▲" : "▼"} {d.change}
          </div>
        </div>
      ))}
      {analysis?.oil_impact && (
        <div style={{ gridColumn: "1 / -1", fontFamily: "var(--sans)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 10px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          📊 {analysis.oil_impact}
        </div>
      )}
    </div>
  );
}

// ── Satellite Widget ──
function SatelliteWidget() {
  const satellites = [
    { name: "Sentinel Hub", desc: "ESA satellite imagery", url: "https://apps.sentinel-hub.com/eo-browser/", color: "#30D158" },
    { name: "NASA FIRMS", desc: "Active fire data", url: "https://firms.modaps.eosdis.nasa.gov/map/", color: "#FF3B30" },
    { name: "NASA Worldview", desc: "Global satellite imagery", url: "https://worldview.earthdata.nasa.gov/", color: "#00E5FF" },
    { name: "Google Earth", desc: "High-res imagery", url: "https://earth.google.com/web/", color: "#FFB020" },
  ];
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {satellites.map((s) => (
        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
          textDecoration: "none", transition: "all 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color + "44"; e.currentTarget.style.background = "var(--bg-card-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
        >
          <span style={{ fontSize: "1.2rem" }}>🛰️</span>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: s.color }}>{s.name}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.desc}</div>
          </div>
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>↗</span>
        </a>
      ))}
    </div>
  );
}

// ── Maritime Mini ──
function MaritimeMini() {
  const chokepoints = [
    { name: "Strait of Hormuz", status: "ELEVATED", color: "#FFB020", traffic: "High" },
    { name: "Bab el-Mandeb", status: "CRITICAL", color: "#FF3B30", traffic: "Disrupted" },
    { name: "Suez Canal", status: "MONITORED", color: "#FFD60A", traffic: "Reduced" },
    { name: "Strait of Malacca", status: "NORMAL", color: "#30D158", traffic: "Normal" },
  ];
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      {chokepoints.map((cp) => (
        <div key={cp.name} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.9rem" }}>🚢</span>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>{cp.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Traffic: {cp.traffic}</div>
            </div>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: cp.color, padding: "2px 8px", background: `${cp.color}12`, borderRadius: 4 }}>
            {cp.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── OSINT Sources Widget ──
function SourcesWidget() {
  const tier1 = OSINT_SOURCES.filter((s) => s.tier === 1).slice(0, 12);
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 10 }}>TIER 1 OSINT ACCOUNTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {tier1.map((s) => (
          <a key={s.handle} href={`https://x.com/${s.handle}`} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", flexDirection: "column", gap: 2,
            padding: "8px 10px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
            textDecoration: "none", transition: "all 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)" }}>@{s.handle}</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.3 }}>{s.focus}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── YouTube Webcam Embed ──
function WebcamEmbed({ cam, compact }) {
  const [playing, setPlaying] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`;
  const h = compact ? 120 : 180;

  return (
    <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
      {!playing ? (
        <div style={{ position: "relative", height: h, cursor: "pointer" }} onClick={() => setPlaying(true)}>
          <img src={thumbUrl} alt={cam.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.8 }} onError={(e) => { e.target.style.display = "none"; }} />
          {/* LIVE badge */}
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,59,48,0.4)" }}>
            <PulsingDot color="#FF3B30" size={6} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "#FF3B30", fontWeight: 700 }}>LIVE</span>
          </div>
          {/* Flag */}
          <div style={{ position: "absolute", top: 8, right: 8, fontSize: "1.2rem" }}>{cam.flag}</div>
          {/* Play button overlay */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,59,48,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(255,59,48,0.4)" }}>
              <span style={{ fontSize: "1.2rem", marginLeft: 3, color: "#fff" }}>▶</span>
            </div>
          </div>
          {/* Info bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>{cam.name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>{cam.city}, {cam.country}</div>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${cam.id}?autoplay=1&mute=1&controls=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={cam.name}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-panel)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulsingDot color="#FF3B30" size={5} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)" }}>{cam.flag} {cam.name}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <a href={cam.liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none" }}>↗ YouTube</a>
              <button onClick={() => setPlaying(false)} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── News Stream Embed ──
function NewsEmbed({ stream }) {
  const [playing, setPlaying] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${stream.embedId}/mqdefault.jpg`;

  return (
    <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: `1px solid ${stream.color}22`, background: "#000" }}>
      {!playing ? (
        <div style={{ position: "relative", height: 120, cursor: "pointer" }} onClick={() => setPlaying(true)}>
          <img src={thumbUrl} alt={stream.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.7 }} onError={(e) => { e.target.style.display = "none"; }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${stream.color}22, rgba(0,0,0,0.7))` }} />
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, background: "rgba(0,0,0,0.8)", border: `1px solid ${stream.color}55` }}>
            <PulsingDot color={stream.color} size={5} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: stream.color, fontWeight: 700 }}>24/7</span>
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${stream.color}cc`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "1rem", marginLeft: 2, color: "#fff" }}>▶</span>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>{stream.short}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>{stream.description}</div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${stream.embedId}?autoplay=1&mute=0&controls=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={stream.name}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-panel)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, color: stream.color }}>{stream.icon} {stream.short}</span>
            <button onClick={() => setPlaying(false)} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alert Ticker ──
function AlertTicker({ items = [] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", background: "rgba(255,59,48,0.04)", borderBottom: "1px solid rgba(255,59,48,0.1)", height: 34, display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px", flexShrink: 0 }}>
        <PulsingDot color="#FF3B30" size={7} />
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#FF3B30", letterSpacing: 1.5, flexShrink: 0 }}>BREAKING</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", whiteSpace: "nowrap", animation: `tickerScroll ${Math.max(doubled.length * 6, 30)}s linear infinite` }}>
          {doubled.map((item, i) => {
            const c = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : "#FFD60A";
            return (
              <span key={i} style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-secondary)", marginRight: 40 }}>
                <span style={{ color: c, fontWeight: 700, marginRight: 6 }}>●</span>
                {item.text}
                {item.time && <span style={{ color: "var(--text-dim)", marginLeft: 6, fontSize: "0.7rem" }}>{item.time}</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Webcam data ──
const WEBCAM_FEEDS = [
  { id: "jNZM_H6q1rY", name: "Western Wall Live", city: "Jerusalem", country: "Israel", flag: "🇮🇱", region: "israel", liveUrl: "https://www.youtube.com/watch?v=jNZM_H6q1rY" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv Beach", city: "Tel Aviv", country: "Israel", flag: "🇮🇱", region: "israel", liveUrl: "https://www.youtube.com/watch?v=LMM0FN5jJaE" },
  { id: "4K_-EhKjYjs", name: "Dubai Skyline 24/7", city: "Dubai", country: "UAE", flag: "🇦🇪", region: "gulf", liveUrl: "https://www.youtube.com/watch?v=4K_-EhKjYjs" },
  { id: "9eN4Jbxvbyg", name: "Mecca - Masjid al-Haram", city: "Mecca", country: "Saudi Arabia", flag: "🇸🇦", region: "gulf", liveUrl: "https://www.youtube.com/watch?v=9eN4Jbxvbyg" },
  { id: "KJGASBMieBo", name: "Beirut City", city: "Beirut", country: "Lebanon", flag: "🇱🇧", region: "levant", liveUrl: "https://www.youtube.com/watch?v=KJGASBMieBo" },
  { id: "wDkHBAdYXD0", name: "Istanbul Bosphorus", city: "Istanbul", country: "Turkey", flag: "🇹🇷", region: "levant", liveUrl: "https://www.youtube.com/watch?v=wDkHBAdYXD0" },
];

const NEWS_LIVE_STREAMS = [
  { name: "Al Jazeera English", short: "Al Jazeera", color: "#06b6d4", icon: "📡", embedId: "nSon3dyDgV0", description: "Middle East & Global News" },
  { name: "France 24 English", short: "France 24", color: "#3b82f6", icon: "📺", embedId: "l8pmfNyEoAE", description: "International News 24/7" },
  { name: "DW News English", short: "DW News", color: "#8b5cf6", icon: "📺", embedId: "7cHsY5Xyv1w", description: "Deutsche Welle International" },
  { name: "Sky News Live", short: "Sky News", color: "#f97316", icon: "📺", embedId: "9Auq9mYxFEE", description: "UK & World Breaking News" },
  { name: "BBC World News", short: "BBC World", color: "#ef4444", icon: "📺", embedId: "w_Ma8oQLmSM", description: "BBC International News" },
  { name: "Euronews", short: "Euronews", color: "#22c55e", icon: "📺", embedId: "wgMJMQTQEuY", description: "European & World News" },
];

// ── API Key Modal ──
function ApiKeyModal({ onSave, onClose }) {
  const [key, setKey] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 32, maxWidth: 480, width: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>🔑 API KEY</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
          Enter your OpenRouter API key to activate AI intelligence agents. Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>openrouter.ai/keys</a>
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-or-v1-..."
          style={{
            width: "100%", padding: "12px 14px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontFamily: "var(--mono)", fontSize: "0.85rem",
            marginBottom: 16,
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { if (key.trim()) onSave(key.trim()); }} style={{
            flex: 1, padding: "10px 0", borderRadius: "var(--radius-sm)",
            background: "var(--accent)", color: "#0B0F14",
            fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700,
          }}>ACTIVATE</button>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: "0.85rem",
          }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════

export default function LiveIntelDashboard() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("intel_api_key") || "");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatus, setAgentStatus] = useState({});
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("signals");
  const [running, setRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const managerRef = useRef(null);

  // All intel items flat
  const allItems = useMemo(() => {
    return Object.values(intel).flat().sort((a, b) => (b.severity || 0) - (a.severity || 0));
  }, [intel]);

  const criticalCount = useMemo(() => allItems.filter((i) => i.severity >= 4).length, [allItems]);

  // Agent manager
  const handleUpdate = useCallback((data) => {
    setIntel(data.intel || {});
    setAnalysis(data.analysis);
    setBreaking(data.breaking || []);
    setLastUpdate(new Date());
  }, []);

  const handleAgentStatus = useCallback((status) => {
    setAgentStatus((prev) => ({ ...prev, [status.agentId]: status }));
  }, []);

  const handleLog = useCallback((log) => {
    setLogs((prev) => [log, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const mgr = new AgentManager(apiKey, handleUpdate, handleAgentStatus, handleLog);
    managerRef.current = mgr;
    mgr.start(REFRESH_INTERVAL);
    setRunning(true);
    return () => { mgr.stop(); setRunning(false); };
  }, [apiKey, handleUpdate, handleAgentStatus, handleLog]);

  const handleSaveKey = (key) => {
    localStorage.setItem("intel_api_key", key);
    setApiKey(key);
    setShowKeyModal(false);
  };

  const handleVerify = async (item) => {
    if (!apiKey) return;
    const result = await verifyIntel(apiKey, item);
    if (result) {
      setIntel((prev) => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = updated[key].map((i) =>
            i.headline === item.headline ? { ...i, verification: result } : i
          );
        }
        return updated;
      });
    }
  };

  const handleRefresh = () => managerRef.current?.manualRefresh();

  // Tab definitions
  const tabs = [
    { id: "signals", label: "SIGNALS", icon: "📡", count: allItems.length },
    { id: "analysis", label: "ANALYSIS", icon: "🧠" },
    { id: "chat", label: "AI CHAT", icon: "💬" },
    { id: "markets", label: "MARKETS", icon: "📈" },
    { id: "cii", label: "CII", icon: "🌍" },
    { id: "nuclear", label: "NUCLEAR", icon: "☢️" },
    { id: "cams", label: "LIVE CAMS", icon: "📹", count: WEBCAM_FEEDS.length },
    { id: "news", label: "NEWS 24/7", icon: "📺", count: NEWS_LIVE_STREAMS.length },
    { id: "naval", label: "NAVAL", icon: "🚢" },
    { id: "econ", label: "ECON", icon: "📊" },
    { id: "sat", label: "SAT", icon: "🛰️" },
    { id: "osint", label: "OSINT", icon: "🔍" },
    { id: "sys", label: "SYSTEM", icon: "⚙️" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>

      {/* ════ HEADER ════ */}
      <header style={{
        height: 50, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PulsingDot color={running ? "#30D158" : "#FF3B30"} size={9} />
          <span style={{ fontFamily: "var(--display)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: 1 }}>
            <span style={{ color: "var(--accent)" }}>INTEL</span>
            <span style={{ color: "var(--text-primary)" }}>LIVE</span>
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)", padding: "2px 8px", background: "var(--bg-card)", borderRadius: 4 }}>
            {running ? "ACTIVE" : "OFFLINE"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {lastUpdate && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Updated: {lastUpdate.toLocaleTimeString("ro-RO")}
            </span>
          )}
          {criticalCount > 0 && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#FF3B30", padding: "2px 8px", background: "rgba(255,59,48,0.1)", borderRadius: 4, animation: "alertFlash 2s ease infinite" }}>
              ⚠ {criticalCount} CRITICAL
            </span>
          )}
          <button onClick={handleRefresh} style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--accent)", padding: "4px 10px", background: "var(--accent-dim)", borderRadius: 4, border: "1px solid rgba(0,229,255,0.2)" }}>
            ↻ REFRESH
          </button>
          <button onClick={() => setShowKeyModal(true)} style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-muted)", padding: "4px 10px", background: "var(--bg-card)", borderRadius: 4, border: "1px solid var(--border)" }}>
            🔑 API
          </button>
        </div>
      </header>

      {/* ════ ALERT TICKER ════ */}
      <AlertTicker items={breaking} />

      {/* ════ MAIN CONTENT ════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ─── LEFT: MAP (65%) ─── */}
        <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>

          {/* Agent status bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
            {AGENTS.map((agent) => {
              const st = agentStatus[agent.id];
              const statusColor = st?.status === "done" ? "#30D158" : st?.status === "running" ? "#FFB020" : st?.status === "error" ? "#FF3B30" : "var(--text-dim)";
              return (
                <div key={agent.id} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                  background: "var(--bg-card)", borderRadius: 4, border: "1px solid var(--border)", flexShrink: 0,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600, color: agent.color }}>{agent.icon} {agent.name}</span>
                  {st?.count != null && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>({st.count})</span>}
                </div>
              );
            })}
          </div>

          {/* Map */}
          <div style={{ flex: 1 }}>
            <ConflictMap intelItems={allItems} analysis={analysis} />
          </div>
        </div>

        {/* ─── RIGHT: PANEL (35%) ─── */}
        <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", background: "var(--bg-panel)", overflow: "hidden" }}>

          {/* Tab bar */}
          <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 10px", fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: 0.5,
                  color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tab.icon} {tab.label}
                {tab.count != null && <span style={{ marginLeft: 3, fontSize: "0.6rem", color: "var(--text-dim)" }}>({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

            {/* ── SIGNALS TAB ── */}
            {activeTab === "signals" && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {allItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    {!apiKey ? (
                      <>
                        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔑</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>API Key Required</div>
                        <p style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
                          Connect your OpenRouter API key to activate the intelligence agents.
                        </p>
                        <button onClick={() => setShowKeyModal(true)} style={{
                          padding: "10px 24px", borderRadius: "var(--radius-sm)",
                          background: "var(--accent)", color: "#0B0F14",
                          fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700,
                        }}>CONFIGURE API KEY</button>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 24, height: 24, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "var(--accent)" }}>SCANNING...</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>AI agents are gathering intelligence</div>
                      </>
                    )}
                  </div>
                ) : (
                  allItems.map((item, i) => (
                    <SignalCard key={`${item.headline}-${i}`} item={item} onVerify={handleVerify} />
                  ))
                )}

                {/* Risk Gauges at bottom */}
                {analysis && (
                  <div style={{ marginTop: 8, padding: 12, background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 10 }}>RISK ASSESSMENT</div>
                    <div style={{ display: "flex", justifyContent: "space-around" }}>
                      <RiskGauge value={analysis.threat_level || 0} max={10} label="THREAT" color={analysis.threat_level >= 7 ? "#FF3B30" : analysis.threat_level >= 5 ? "#FFB020" : "#FFD60A"} size={90} />
                      <RiskGauge value={Math.round((analysis.escalation_probability || 0) / 10)} max={10} label="ESCALATION" color="#FFB020" size={90} />
                      <RiskGauge value={Math.round((analysis.nuclear_risk || 0) / 10)} max={10} label="NUCLEAR" color="#FF3B30" size={90} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYSIS TAB ── */}
            {activeTab === "analysis" && (
              <div style={{ padding: 14 }}>
                {analysis ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Threat level header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "2.5rem", fontWeight: 800, color: analysis.threat_level >= 7 ? "#FF3B30" : analysis.threat_level >= 5 ? "#FFB020" : "#FFD60A" }}>
                          {analysis.threat_level}
                        </span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "1rem", color: "var(--text-dim)" }}>/10</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "1rem", fontWeight: 700, color: analysis.threat_level >= 7 ? "#FF3B30" : "#FFB020" }}>{analysis.threat_label}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          Escalation: <span style={{ color: "#FFB020", fontWeight: 700 }}>{analysis.escalation_probability}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Situation summary */}
                    <div style={{ padding: "12px 14px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--accent)", marginBottom: 8 }}>SITUATION SUMMARY</div>
                      <p style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{analysis.situation_summary}</p>
                    </div>

                    {/* Timeline */}
                    {analysis.timeline_last_24h?.length > 0 && (
                      <div style={{ padding: "12px 14px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--accent)", marginBottom: 8 }}>TIMELINE (24H)</div>
                        {analysis.timeline_last_24h.map((ev, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: 5, flexShrink: 0 }} />
                            <span style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{ev}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Predictions */}
                    {[
                      { key: "next_hours_prediction", label: "NEXT HOURS", icon: "⏳" },
                      { key: "next_days_prediction", label: "NEXT DAYS", icon: "📅" },
                      { key: "diplomatic_status", label: "DIPLOMATIC", icon: "🏛️" },
                      { key: "proxy_status", label: "PROXY FORCES", icon: "🎯" },
                      { key: "civilian_impact", label: "CIVILIAN IMPACT", icon: "👥" },
                    ].map(({ key, label, icon }) => analysis[key] && (
                      <div key={key} style={{ padding: "10px 14px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 6 }}>{icon} {label}</div>
                        <p style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{analysis[key]}</p>
                      </div>
                    ))}

                    {/* Key risks */}
                    {analysis.key_risks?.length > 0 && (
                      <div style={{ padding: "12px 14px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "#FF3B30", marginBottom: 8 }}>⚠ KEY RISKS</div>
                        {analysis.key_risks.map((risk, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                            <span style={{ color: "#FF3B30", fontWeight: 700, fontFamily: "var(--mono)", fontSize: "0.75rem", flexShrink: 0 }}>{i + 1}.</span>
                            <span style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{risk}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis._analysisModel && (
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)", textAlign: "center" }}>Analysis by {analysis._analysisModel}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <span style={{ fontSize: "2rem" }}>🧠</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 10 }}>Analysis will appear after the first intelligence cycle</div>
                  </div>
                )}
              </div>
            )}

            {/* ── AI CHAT TAB ── */}
            {activeTab === "chat" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <AiChat apiKey={apiKey} allItems={allItems} analysis={analysis} />
              </div>
            )}

            {/* ── PREDICTION MARKETS TAB ── */}
            {activeTab === "markets" && (
              <>
                <SectionHeader icon="📈" title="PREDICTION MARKETS" subtitle="Geopolitical forecasts" />
                <PredictionMarkets />
              </>
            )}

            {/* ── COUNTRY INSTABILITY INDEX TAB ── */}
            {activeTab === "cii" && (
              <>
                <SectionHeader icon="🌍" title="INSTABILITY INDEX" subtitle="Country risk scoring" />
                <InstabilityIndex />
              </>
            )}

            {/* ── NUCLEAR MONITOR TAB ── */}
            {activeTab === "nuclear" && (
              <>
                <SectionHeader icon="☢️" title="NUCLEAR MONITOR" subtitle="Threat tracking" />
                <NuclearMonitor />
              </>
            )}

            {/* ── LIVE CAMS TAB ── */}
            {activeTab === "cams" && (
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Click to play live webcams directly in the dashboard. All streams are YouTube Live.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {WEBCAM_FEEDS.map((cam) => (
                    <WebcamEmbed key={cam.id} cam={cam} compact />
                  ))}
                </div>
              </div>
            )}

            {/* ── NEWS 24/7 TAB ── */}
            {activeTab === "news" && (
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  24/7 international news streams. Click to play in dashboard.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NEWS_LIVE_STREAMS.map((stream) => (
                    <NewsEmbed key={stream.short} stream={stream} />
                  ))}
                </div>
              </div>
            )}

            {/* ── NAVAL TAB ── */}
            {activeTab === "naval" && (
              <>
                <SectionHeader icon="🚢" title="MARITIME CHOKEPOINTS" />
                <MaritimeMini />
              </>
            )}

            {/* ── ECON TAB ── */}
            {activeTab === "econ" && (
              <>
                <SectionHeader icon="📊" title="ECONOMIC IMPACT" />
                <EconomicWidget analysis={analysis} />
              </>
            )}

            {/* ── SAT TAB ── */}
            {activeTab === "sat" && (
              <>
                <SectionHeader icon="🛰️" title="SATELLITE IMAGERY" />
                <SatelliteWidget />
              </>
            )}

            {/* ── OSINT TAB ── */}
            {activeTab === "osint" && (
              <>
                <SectionHeader icon="🔍" title="OSINT SOURCES" subtitle={`${OSINT_SOURCES.length} accounts`} />
                <SourcesWidget />
              </>
            )}

            {/* ── SYSTEM TAB ── */}
            {activeTab === "sys" && (
              <div style={{ padding: 12 }}>
                {/* AI Models */}
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 8 }}>AI MODELS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {AI_MODELS.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "1.1rem" }}>{m.icon}</span>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 600, color: m.color }}>{m.name}</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: "0.7rem", color: "var(--text-muted)" }}>{m.provider} · {m.strength}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* System logs */}
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 8 }}>SYSTEM LOG</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {logs.slice(0, 20).map((log, i) => (
                    <div key={i} style={{
                      fontFamily: "var(--mono)", fontSize: "0.7rem", padding: "4px 8px",
                      background: "var(--bg-card)", borderRadius: 3,
                      color: log.type === "error" ? "#FF3B30" : log.type === "success" ? "#30D158" : log.type === "system" ? "var(--accent)" : "var(--text-secondary)",
                    }}>
                      <span style={{ color: "var(--text-dim)", marginRight: 6 }}>{log.time}</span>
                      {log.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════ BOTTOM BAR ════ */}
      <div style={{
        height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "var(--bg-panel)", borderTop: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
            {allItems.length} signals · {AI_MODELS.length} models · {OSINT_SOURCES.length} sources · {NEWS_CHANNELS.length} feeds
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>Refresh: {REFRESH_INTERVAL}s</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--accent)" }}>INTEL LIVE v4.0</span>
        </div>
      </div>

      {showKeyModal && <ApiKeyModal onSave={handleSaveKey} onClose={() => setShowKeyModal(false)} />}
    </div>
  );
}
