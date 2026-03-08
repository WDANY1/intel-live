import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AGENTS,
  LIVE_WEBCAMS,
  WEBCAM_REGIONS,
  REFRESH_INTERVAL,
  AI_MODELS,
} from "./config";
import { AgentManager, verifyIntel } from "./api";
import Globe3D from "./components/Globe3D";

// ════════════════════════════════════════════════════════════════
// INTEL LIVE v8 — SpaceX + Antigravity Design
// Full-screen 3D globe, floating glass panels, embedded everything
// No landing page, instant RSS load, AI agents in background
// ════════════════════════════════════════════════════════════════

// ── Severity helpers ──
const SEV_CFG = {
  5: { color: "#FF3B30", label: "CRITICAL", bg: "rgba(255,59,48,0.12)" },
  4: { color: "#FFB020", label: "HIGH", bg: "rgba(255,176,32,0.12)" },
  3: { color: "#FFD60A", label: "MEDIUM", bg: "rgba(255,214,10,0.12)" },
  2: { color: "#30D158", label: "LOW", bg: "rgba(48,209,88,0.12)" },
  1: { color: "#30D158", label: "LOW", bg: "rgba(48,209,88,0.12)" },
};

function SeverityDot({ level, size = 6 }) {
  const c = SEV_CFG[level] || SEV_CFG[3];
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: c.color,
      boxShadow: `0 0 ${size}px ${c.color}`, display: "inline-block", flexShrink: 0,
    }} />
  );
}

function SeverityBadge({ level }) {
  const c = SEV_CFG[level] || SEV_CFG[3];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 6px", borderRadius: 3, fontSize: "0.6rem",
      fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: 1.5,
      background: c.bg, color: c.color, border: `1px solid ${c.color}25`,
    }}>
      <SeverityDot level={level} size={4} />
      {c.label}
    </span>
  );
}

// ── YouTube Webcam feeds (embedded on-site) ──
const WEBCAM_FEEDS = [
  { id: "jNZM_H6q1rY", name: "Western Wall Live", city: "Jerusalem", country: "Israel", flag: "🇮🇱", region: "israel" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv Beach", city: "Tel Aviv", country: "Israel", flag: "🇮🇱", region: "israel" },
  { id: "4K_-EhKjYjs", name: "Dubai Skyline 24/7", city: "Dubai", country: "UAE", flag: "🇦🇪", region: "gulf" },
  { id: "9eN4Jbxvbyg", name: "Mecca - Masjid al-Haram", city: "Mecca", country: "Saudi", flag: "🇸🇦", region: "gulf" },
  { id: "C6GKe0skDDE", name: "Doha West Bay", city: "Doha", country: "Qatar", flag: "🇶🇦", region: "gulf" },
  { id: "KJGASBMieBo", name: "Beirut City", city: "Beirut", country: "Lebanon", flag: "🇱🇧", region: "levant" },
  { id: "wDkHBAdYXD0", name: "Istanbul Bosphorus", city: "Istanbul", country: "Turkey", flag: "🇹🇷", region: "levant" },
];

const NEWS_STREAMS = [
  { id: "nSon3dyDgV0", name: "Al Jazeera", color: "#06b6d4" },
  { id: "l8pmfNyEoAE", name: "France 24", color: "#3b82f6" },
  { id: "9Auq9mYxFEE", name: "Sky News", color: "#f97316" },
  { id: "w_Ma8oQLmSM", name: "BBC World", color: "#ef4444" },
  { id: "7cHsY5Xyv1w", name: "DW News", color: "#8b5cf6" },
  { id: "wgMJMQTQEuY", name: "Euronews", color: "#22c55e" },
];

// ── Floating particle background (Antigravity-style) ──
function FloatingParticles() {
  const particles = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 0.5, duration: 15 + Math.random() * 25,
    delay: Math.random() * 10, opacity: Math.random() * 0.15 + 0.05,
    color: i % 5 === 0 ? "#FF3B30" : i % 3 === 0 ? "#A78BFA" : "#00E5FF",
  })), []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.color, opacity: p.opacity,
          animation: `floatDrift ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

// ── Top Navigation Bar (SpaceX minimal) ──
function TopBar({ status, cycle, totalItems, modelsActive, onRefresh }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 44, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px",
      background: "linear-gradient(180deg, rgba(6,10,15,0.95) 0%, rgba(6,10,15,0.6) 100%)",
      backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: status === "running" ? "#30D158" : "#00E5FF",
          boxShadow: `0 0 10px ${status === "running" ? "#30D158" : "#00E5FF"}`,
          animation: status === "running" ? "pulse 2s ease infinite" : "none",
        }} />
        <span style={{ fontFamily: "var(--display)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: 5, color: "#fff" }}>
          INTEL<span style={{ color: "var(--accent)" }}>LIVE</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: 1 }}>
        <span><span style={{ color: "var(--accent)" }}>{totalItems}</span> SIGNALS</span>
        <span><span style={{ color: "var(--accent)" }}>{modelsActive}</span> AI</span>
        <span>C<span style={{ color: "var(--accent)" }}>#{cycle}</span></span>
        <span style={{ color: "var(--text-dim)" }}>{time.toLocaleTimeString("en-GB", { hour12: false })}</span>
        <button onClick={onRefresh} style={{
          fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--accent)",
          padding: "3px 10px", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 3, cursor: "pointer", transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,229,255,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >REFRESH</button>
      </div>
    </div>
  );
}

// ── Breaking Ticker ──
function BreakingTicker({ items = [] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 28, zIndex: 1000,
      background: "linear-gradient(0deg, rgba(6,10,15,0.95), rgba(6,10,15,0.7))",
      backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,59,48,0.15)",
      display: "flex", alignItems: "center", overflow: "hidden",
    }}>
      <div style={{ padding: "0 10px", fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, color: "#FF3B30", letterSpacing: 2, flexShrink: 0, animation: "alertFlash 2s ease infinite" }}>BREAKING</div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", animation: `tickerScroll ${items.length * 8}s linear infinite`, whiteSpace: "nowrap" }}>
          {doubled.map((item, i) => (
            <span key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-primary)", marginRight: 40, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SeverityDot level={item.severity || 3} size={3} />
              {item.text || item.title}
              {item.time && <span style={{ color: "var(--text-dim)", fontSize: "0.55rem" }}>{item.time}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Signal Card (left panel) ──
function SignalCard({ item, onClick, isSelected }) {
  const sev = SEV_CFG[item.severity] || SEV_CFG[3];
  const agent = AGENTS.find(a => a.id === item.agentId);
  return (
    <div onClick={() => onClick?.(item)} style={{
      padding: "8px 12px", cursor: "pointer", borderLeft: `2px solid ${sev.color}`,
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      background: isSelected ? "rgba(0,229,255,0.06)" : "transparent", transition: "all 0.15s",
    }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        {agent && <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", fontWeight: 700, color: agent.color, letterSpacing: 1 }}>{agent.icon} {agent.name}</span>}
        <SeverityBadge level={item.severity} />
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>{item.time}</span>
      </div>
      <div style={{ fontFamily: "var(--sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 2 }}>{item.headline}</div>
      {item.summary && <div style={{ fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.summary}</div>}
      {item.image && <img src={item.image} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginTop: 4, opacity: 0.8 }} onError={e => { e.target.style.display = "none"; }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
        {item.source && <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>{item.source}</span>}
        {item.location && <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--accent)", opacity: 0.6 }}>{item.location}</span>}
      </div>
    </div>
  );
}

// ── RSS News Card (for instant load) ──
function RSSCard({ article }) {
  const keywords = ["iran", "israel", "military", "strike", "missile", "houthi", "hezbollah", "gulf", "nuclear", "war", "attack", "bomb", "drone", "navy", "army"];
  const text = `${article.title} ${article.description}`.toLowerCase();
  const isConflict = keywords.some(k => text.includes(k));
  const severity = text.includes("strike") || text.includes("attack") || text.includes("bomb") ? 5 :
    text.includes("missile") || text.includes("military") ? 4 :
    text.includes("nuclear") || text.includes("war") ? 4 :
    isConflict ? 3 : 2;
  const sev = SEV_CFG[severity] || SEV_CFG[3];
  const timeAgo = article.pubDate ? getTimeAgo(new Date(article.pubDate)) : "";

  return (
    <div style={{
      padding: "8px 12px", borderLeft: `2px solid ${sev.color}`,
      borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", fontWeight: 700, color: "#06b6d4", letterSpacing: 1 }}>RSS</span>
        <SeverityBadge level={severity} />
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.48rem", color: "var(--text-dim)" }}>{timeAgo}</span>
      </div>
      <div style={{ fontFamily: "var(--sans)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 2 }}>{article.title}</div>
      {article.description && <div style={{ fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{article.description}</div>}
      {article.image && <img src={article.image} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginTop: 4, opacity: 0.8 }} onError={e => { e.target.style.display = "none"; }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "var(--text-muted)" }}>{article.source}</span>
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── Event Detail Overlay ──
function EventDetail({ item, onClose, onVerify, verification }) {
  if (!item) return null;
  const sev = SEV_CFG[item.severity] || SEV_CFG[3];
  const agent = AGENTS.find(a => a.id === item.agentId);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(6,10,15,0.95)", backdropFilter: "blur(16px)", zIndex: 50,
      display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease", overflow: "auto",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${sev.color}20`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <SeverityBadge level={item.severity} />
            {agent && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: agent.color }}>{agent.icon} {agent.fullName}</span>}
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{item.headline}</div>
        </div>
        <button onClick={onClose} style={{ fontFamily: "var(--mono)", fontSize: "1rem", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px" }}>&times;</button>
      </div>
      <div style={{ padding: "12px 14px", flex: 1 }}>
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{item.summary}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {[{ label: "SOURCE", value: item.source }, { label: "TIME", value: item.time }, { label: "LOCATION", value: item.location }, { label: "AI MODEL", value: item.aiModelName }]
            .filter(m => m.value).map(m => (
              <div key={m.label} style={{ padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 5, border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-dim)", letterSpacing: 2, marginBottom: 1 }}>{m.label}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-primary)" }}>{m.value}</div>
              </div>
            ))}
        </div>
        {!verification && (
          <button onClick={() => onVerify?.(item)} style={{
            width: "100%", padding: "8px", fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 2,
            color: "var(--accent)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 5, background: "rgba(0,229,255,0.04)", cursor: "pointer",
          }}>
            CROSS-VERIFY WITH {AI_MODELS.length} AI MODELS
          </button>
        )}
        {verification && (
          <div style={{ padding: 10, borderRadius: 5, border: `1px solid ${verification.verified ? "#30D15830" : "#FF3B3030"}`, background: verification.verified ? "rgba(48,209,88,0.04)" : "rgba(255,59,48,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: verification.verified ? "#30D158" : "#FF3B30" }}>
                {verification.crossVerification?.consensus || "VERIFICAT"}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>Confidence: {verification.confidence}%</span>
            </div>
            {verification.corroborating_sources?.length > 0 && (
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-secondary)" }}>Sources: {verification.corroborating_sources.join(", ")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agent Status Dots (compact) ──
function AgentDots({ agentStatuses }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "5px 10px", flexWrap: "wrap" }}>
      {AGENTS.map(agent => {
        const st = agentStatuses[agent.id];
        const isRunning = st?.status === "running";
        const isDone = st?.status === "done";
        const isError = st?.status === "error";
        return (
          <div key={agent.id} title={`${agent.fullName}: ${st?.message || "pending"}`} style={{
            display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 3,
            background: isRunning ? "rgba(0,229,255,0.06)" : isDone ? "rgba(48,209,88,0.06)" : isError ? "rgba(255,59,48,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${isRunning ? "rgba(0,229,255,0.15)" : isDone ? "rgba(48,209,88,0.1)" : isError ? "rgba(255,59,48,0.1)" : "rgba(255,255,255,0.03)"}`,
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: "50%",
              background: isRunning ? "var(--accent)" : isDone ? "#30D158" : isError ? "#FF3B30" : "var(--text-dim)",
              animation: isRunning ? "pulse 1s ease infinite" : "none",
            }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", fontWeight: 600, letterSpacing: 1, color: isRunning ? "var(--accent)" : isDone ? "#30D158" : isError ? "#FF3B30" : "var(--text-dim)" }}>
              {agent.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Analysis Panel ──
function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  const tColor = analysis.threat_level >= 7 ? "#FF3B30" : analysis.threat_level >= 4 ? "#FFB020" : "#30D158";
  return (
    <div style={{ padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--display)", fontSize: "1.2rem", fontWeight: 800, color: tColor,
          border: `2px solid ${tColor}40`, background: `${tColor}10`,
        }}>{analysis.threat_level}</div>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 2, color: tColor }}>{analysis.threat_label}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>Escalation: {analysis.escalation_probability}% | Nuclear: {analysis.nuclear_risk}%</div>
        </div>
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>{analysis.situation_summary}</p>
      {analysis.breaking_alerts?.map((alert, i) => (
        <div key={i} style={{ padding: "5px 8px", marginBottom: 3, borderRadius: 3, background: "rgba(255,59,48,0.04)", borderLeft: "2px solid #FF3B30", fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-primary)" }}>{alert}</div>
      ))}
      {analysis.key_risks?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)", letterSpacing: 2, marginBottom: 4 }}>KEY RISKS</div>
          {analysis.key_risks.map((risk, i) => (
            <div key={i} style={{ padding: "3px 0", fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-secondary)", display: "flex", gap: 5 }}>
              <span style={{ color: "#FFB020", flexShrink: 0 }}>●</span>{risk}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Embedded Webcam Viewer (inline YouTube iframes) ──
function EmbeddedWebcams() {
  const [region, setRegion] = useState("all");
  const [activeTab, setActiveTab] = useState("cams"); // cams | news
  const [activeCam, setActiveCam] = useState(null);

  const filtered = region === "all" ? WEBCAM_FEEDS : WEBCAM_FEEDS.filter(c => c.region === region);
  const regions = [
    { id: "all", label: "ALL", color: "#e2e8f0" },
    { id: "israel", label: "🇮🇱", color: "#3b82f6" },
    { id: "gulf", label: "🏜️", color: "#eab308" },
    { id: "levant", label: "🌍", color: "#f97316" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[{ id: "cams", label: "LIVE CAMS" }, { id: "news", label: "NEWS 24/7" }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "7px 0", fontFamily: "var(--mono)", fontSize: "0.5rem", fontWeight: 700, letterSpacing: 2,
            color: activeTab === tab.id ? "#ef4444" : "var(--text-muted)",
            borderBottom: activeTab === tab.id ? "2px solid #ef4444" : "2px solid transparent", cursor: "pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Active cam player */}
      {activeCam && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${activeCam.id || activeCam}?autoplay=1&mute=1&controls=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s ease infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "#ef4444", fontWeight: 700 }}>LIVE</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>{activeCam.name || activeCam}</span>
            </div>
            <button onClick={() => setActiveCam(null)} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      {activeTab === "cams" && (
        <>
          {/* Region filters */}
          <div style={{ display: "flex", gap: 3, padding: "5px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {regions.map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)} style={{
                padding: "2px 7px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: "0.45rem",
                background: region === r.id ? `${r.color}15` : "rgba(255,255,255,0.02)",
                border: `1px solid ${region === r.id ? `${r.color}44` : "rgba(255,255,255,0.06)"}`,
                color: region === r.id ? r.color : "var(--text-dim)", cursor: "pointer",
              }}>{r.label}</button>
            ))}
          </div>
          {/* Camera grid */}
          <div style={{ flex: 1, overflow: "auto", padding: "6px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {filtered.map(cam => (
                <div key={cam.id} onClick={() => setActiveCam(cam)} style={{
                  borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s", background: "#0a0e14",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <div style={{ position: "relative", height: 60, background: "#0d1117" }}>
                    <img src={`https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`} alt={cam.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    <div style={{ position: "absolute", top: 3, left: 3, display: "flex", alignItems: "center", gap: 2, padding: "1px 4px", borderRadius: 2, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(239,68,68,0.35)" }}>
                      <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s ease infinite" }} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: "0.35rem", color: "#ef4444", fontWeight: 700 }}>LIVE</span>
                    </div>
                    <div style={{ position: "absolute", top: 3, right: 3, fontSize: "0.6rem" }}>{cam.flag}</div>
                  </div>
                  <div style={{ padding: "3px 5px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", fontWeight: 600, color: "#e2e8f0" }}>{cam.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: "rgba(255,255,255,0.3)" }}>{cam.city}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "news" && (
        <div style={{ flex: 1, overflow: "auto", padding: "6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
            {NEWS_STREAMS.map(stream => (
              <div key={stream.id} onClick={() => setActiveCam({ id: stream.id, name: stream.name })} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                borderRadius: 4, border: `1px solid ${stream.color}22`, background: "#0a0e14",
                cursor: "pointer", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${stream.color}55`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${stream.color}22`; }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: stream.color, animation: "pulse 2s ease infinite" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, color: stream.color }}>{stream.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-dim)", marginLeft: "auto" }}>24/7</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Embedded Radar Panel (inline iframes) ──
function EmbeddedRadar() {
  const [activeRadar, setActiveRadar] = useState(null);
  const radars = [
    { id: "flightradar", name: "FlightRadar24", icon: "✈", color: "#f59e0b", embedUrl: "https://www.flightradar24.com/32.08,48.5/6", desc: "Live aircraft tracking" },
    { id: "adsb", name: "ADS-B Exchange", icon: "🛩", color: "#06b6d4", embedUrl: "https://globe.adsbexchange.com/?lat=32&lon=48&zoom=6", desc: "Unfiltered military flights" },
    { id: "marine", name: "MarineTraffic", icon: "⚓", color: "#3b82f6", embedUrl: "https://www.marinetraffic.com/en/ais/home/centerx:52/centery:26/zoom:6", desc: "Vessel tracking — Persian Gulf" },
    { id: "vessel", name: "VesselFinder", icon: "🚢", color: "#8b5cf6", embedUrl: "https://www.vesselfinder.com/?rlat=26.5&rlon=52&zoom=7", desc: "Ship positions & routes" },
    { id: "firms", name: "NASA FIRMS", icon: "🔥", color: "#ef4444", embedUrl: "https://firms.modaps.eosdis.nasa.gov/map/#t:adv;d:24hrs;@48,32,6", desc: "Fire & thermal anomalies" },
    { id: "liveuamap", name: "Liveuamap", icon: "🌐", color: "#22c55e", embedUrl: "https://liveuamap.com/en/2026/7-march-middle-east", desc: "Live conflict map" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Active radar embed */}
      {activeRadar && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ position: "relative", height: 220, background: "#000" }}>
            <iframe
              src={activeRadar.embedUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={activeRadar.name}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 8px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: activeRadar.color, fontWeight: 700 }}>{activeRadar.icon} {activeRadar.name}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <a href={activeRadar.embedUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-dim)", textDecoration: "none" }}>↗ FULL</a>
              <button onClick={() => setActiveRadar(null)} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Radar list */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {radars.map(radar => (
          <div key={radar.id} onClick={() => setActiveRadar(radar)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: "0.9rem" }}>{radar.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600, color: radar.color }}>{radar.name}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "var(--text-dim)" }}>{radar.desc}</div>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--accent)" }}>▶</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function LiveIntelDashboard() {
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [cycle, setCycle] = useState(0);
  const [modelsUsed, setModelsUsed] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [verifications, setVerifications] = useState({});
  const [leftTab, setLeftTab] = useState("signals");
  const [rightTab, setRightTab] = useState("webcams"); // webcams | radar
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rssArticles, setRssArticles] = useState([]);
  const [rssLoading, setRssLoading] = useState(true);
  const managerRef = useRef(null);

  // ── Fetch RSS immediately on mount for instant content ──
  useEffect(() => {
    fetch("/api/rss?feeds=bbc_me,aljazeera,times_israel,iran_intl,reuters_world,al_monitor,war_zone,breaking_defense&limit=40")
      .then(r => r.json())
      .then(data => {
        setRssArticles(data.articles || []);
        // Use RSS as breaking news initially
        if (data.articles?.length > 0) {
          setBreaking(data.articles.slice(0, 8).map(a => ({ text: a.title, severity: 3, time: a.pubDate ? getTimeAgo(new Date(a.pubDate)) : "" })));
        }
        setRssLoading(false);
      })
      .catch(() => setRssLoading(false));
  }, []);

  const allItems = useMemo(() => Object.values(intel).flat().sort((a, b) => (b.severity || 0) - (a.severity || 0)), [intel]);
  const totalItems = allItems.length + rssArticles.length;

  // ── Start agent manager on mount ──
  useEffect(() => {
    const manager = new AgentManager(
      "server-side",
      (data) => {
        setIntel(data.intel || {});
        setAnalysis(data.analysis);
        if (data.breaking?.length) setBreaking(data.breaking);
        setCycle(data.cycle || 0);
        setModelsUsed(data.modelsUsed || []);
      },
      (progress) => setAgentStatuses(prev => ({ ...prev, [progress.agentId]: progress })),
      () => {}
    );
    managerRef.current = manager;
    manager.start(REFRESH_INTERVAL);
    return () => manager.stop();
  }, []);

  const handleVerify = useCallback(async (item) => {
    const key = `${item.agentId}-${item.headline}`;
    setVerifications(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const result = await verifyIntel("server-side", item);
      setVerifications(prev => ({ ...prev, [key]: result }));
    } catch {
      setVerifications(prev => ({ ...prev, [key]: { error: true } }));
    }
  }, []);

  const handleRefresh = useCallback(() => { managerRef.current?.manualRefresh(); }, []);
  const selectedKey = selectedEvent ? `${selectedEvent.agentId}-${selectedEvent.headline}` : null;
  const isScanning = Object.values(agentStatuses).some(s => s.status === "running");

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "#060A0F" }}>
      <FloatingParticles />

      <TopBar
        status={isScanning ? "running" : "idle"}
        cycle={cycle}
        totalItems={totalItems}
        modelsActive={modelsUsed.length || AI_MODELS.length}
        onRefresh={handleRefresh}
      />

      {/* 3D Globe (full background) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <Globe3D intelItems={allItems} onSelectEvent={setSelectedEvent} selectedEvent={selectedEvent} />
      </div>

      {/* ── Left Panel: Intel Feed ── */}
      <div style={{
        position: "absolute", top: 44, left: 0, bottom: 28,
        width: leftOpen ? 420 : 36, zIndex: 100,
        display: "flex", transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <button onClick={() => setLeftOpen(!leftOpen)} style={{
          position: "absolute", top: 8, right: leftOpen ? -18 : 4,
          width: 18, height: 36, zIndex: 10, background: "rgba(6,10,15,0.9)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: leftOpen ? "0 4px 4px 0" : 4,
          color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: "0.6rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {leftOpen ? "◀" : "▶"}
        </button>

        {leftOpen && (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(90deg, rgba(6,10,15,0.93) 0%, rgba(6,10,15,0.88) 85%, rgba(6,10,15,0.0) 100%)",
            backdropFilter: "blur(16px)", borderRight: "1px solid rgba(255,255,255,0.03)",
            display: "flex", flexDirection: "column", animation: "slideInLeft 0.3s ease",
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { id: "signals", label: "SIGNALS", count: allItems.length },
                { id: "news", label: "NEWS", count: rssArticles.length },
                { id: "analysis", label: "ANALYSIS" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setLeftTab(tab.id)} style={{
                  flex: 1, padding: "8px 0", fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: 2,
                  color: leftTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: leftTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer",
                }}>
                  {tab.label}
                  {tab.count != null && <span style={{ marginLeft: 4, fontSize: "0.5rem", color: leftTab === tab.id ? "var(--accent)" : "var(--text-dim)" }}>{tab.count}</span>}
                </button>
              ))}
            </div>

            <AgentDots agentStatuses={agentStatuses} />

            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              {leftTab === "signals" && (
                <div style={{ height: "100%", overflow: "auto", position: "relative" }}>
                  {allItems.length === 0 && !rssLoading && (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <div style={{ width: 28, height: 28, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: 2 }}>AI AGENTS SCANNING...</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)", marginTop: 4 }}>See NEWS tab for instant RSS feeds</div>
                    </div>
                  )}
                  {allItems.map((item, i) => (
                    <SignalCard key={`${item.agentId}-${i}`} item={item} onClick={setSelectedEvent}
                      isSelected={selectedEvent?.headline === item.headline && selectedEvent?.agentId === item.agentId} />
                  ))}
                  {selectedEvent && (
                    <EventDetail item={selectedEvent} onClose={() => setSelectedEvent(null)}
                      onVerify={handleVerify} verification={selectedKey ? verifications[selectedKey] : null} />
                  )}
                </div>
              )}

              {leftTab === "news" && (
                <div style={{ height: "100%", overflow: "auto" }}>
                  {rssLoading && (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <div style={{ width: 28, height: 28, border: "2px solid #06b6d4", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: 2 }}>LOADING RSS FEEDS...</div>
                    </div>
                  )}
                  {rssArticles.map((article, i) => <RSSCard key={i} article={article} />)}
                </div>
              )}

              {leftTab === "analysis" && (
                <div style={{ height: "100%", overflow: "auto" }}>
                  {analysis ? <AnalysisPanel analysis={analysis} /> : (
                    <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: 2 }}>
                      {allItems.length > 0 ? "ANALYZING..." : "WAITING FOR DATA..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Webcams + Radar ── */}
      <div style={{
        position: "absolute", top: 44, right: 0, bottom: 28,
        width: rightOpen ? 300 : 36, zIndex: 100,
        display: "flex", transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <button onClick={() => setRightOpen(!rightOpen)} style={{
          position: "absolute", top: 8, left: rightOpen ? -18 : 4,
          width: 18, height: 36, zIndex: 10, background: "rgba(6,10,15,0.9)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: rightOpen ? "4px 0 0 4px" : 4,
          color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: "0.6rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {rightOpen ? "▶" : "◀"}
        </button>

        {rightOpen && (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(270deg, rgba(6,10,15,0.93) 0%, rgba(6,10,15,0.88) 85%, rgba(6,10,15,0.0) 100%)",
            backdropFilter: "blur(16px)", borderLeft: "1px solid rgba(255,255,255,0.03)",
            display: "flex", flexDirection: "column", animation: "slideInRight 0.3s ease",
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {[{ id: "webcams", label: "WEBCAMS" }, { id: "radar", label: "RADAR" }].map(tab => (
                <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                  flex: 1, padding: "8px 0", fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, letterSpacing: 2,
                  color: rightTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: rightTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer",
                }}>{tab.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              {rightTab === "webcams" && <EmbeddedWebcams />}
              {rightTab === "radar" && <EmbeddedRadar />}
            </div>
          </div>
        )}
      </div>

      <BreakingTicker items={breaking} />
    </div>
  );
}
