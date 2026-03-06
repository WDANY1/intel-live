import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AGENTS, OSINT_SOURCES, NEWS_CHANNELS, LIVE_WEBCAMS, WEBCAM_REGIONS, REFRESH_INTERVAL, MAX_LOG_ENTRIES, SEVERITY, AI_MODELS, AGENT_MODEL_MAP } from "./config";
import { AgentManager, verifyIntel } from "./api";
import ConflictMap from "./components/ConflictMap";
import WebcamViewer from "./components/WebcamViewer";
import EventTimeline from "./components/EventTimeline";
import MaritimePanel from "./components/MaritimePanel";

// ════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ════════════════════════════════════════════════════════════

function PulsingDot({ color = "#ef4444", size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, opacity: 0.4, animation: "pulseRing 2s ease-in-out infinite" }} />
    </span>
  );
}

function SeverityBadge({ level }) {
  const cfg =
    level >= 5 ? { color: "#ef4444", label: "CRITIC" } :
    level >= 4 ? { color: "#f97316", label: "RIDICAT" } :
    level >= 3 ? { color: "#eab308", label: "MEDIU" } :
    { color: "#22c55e", label: "SCĂZUT" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 6px", borderRadius: 3, fontSize: "0.55rem",
      fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: 1,
      background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function AgentStatusDot({ status, color }) {
  if (status === "running") return <span style={{ width: 7, height: 7, borderRadius: "50%", border: `2px solid ${color}`, borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />;
  if (status === "done") return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}88` }} />;
  if (status === "error") return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "inline-block" }} />;
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
      if (!healthRes.ok) { setTestStatus({ ok: false, message: `Eroare: ${JSON.stringify(health)}` }); return; }
      const apiRes = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": sanitizeKey(key) || "test" },
        body: JSON.stringify({ prompt: "Say OK" }),
      });
      const apiData = await apiRes.json();
      if (apiRes.ok && apiData.text) setTestStatus({ ok: true, message: `Conexiune OK! (${health.hasApiKey ? "ENV var setat" : "key din browser"})` });
      else setTestStatus({ ok: false, message: `API error ${apiRes.status}: ${apiData.error || "Unknown"}` });
    } catch (err) { setTestStatus({ ok: false, message: `Eroare: ${err.message}` }); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.08) 0%, #070b0f 70%)" }}>
      {/* Grid overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "relative", background: "rgba(10,14,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "44px 40px", maxWidth: 500, width: "90%", animation: "fadeInUp 0.4s ease", backdropFilter: "blur(20px)", boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <PulsingDot color="#ef4444" size={10} />
          <h2 style={{ fontFamily: "var(--mono)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: 4, color: "#ef4444" }}>
            INTEL LIVE
          </h2>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)", padding: "2px 6px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3 }}>v2.0</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: 4, fontFamily: "var(--mono)" }}>
          Centru de comandă — monitorizare conflicte în timp real
        </p>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.62rem", marginBottom: 20, fontFamily: "var(--mono)", lineHeight: 1.8 }}>
          {AI_MODELS.length} modele AI · 7 agenți OSINT · {OSINT_SOURCES.length} surse · hartă interactivă · analiză cross-verificată
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { icon: "🗺️", label: "HARTĂ CONFLICT" },
            { icon: "📡", label: "7 AGENȚI AI" },
            { icon: "🚢", label: "MONITOR MARITIM" },
            { icon: "📹", label: "CAMERE LIVE" },
            { icon: "🔍", label: "CROSS-VERIFICARE" },
            { icon: "⚡", label: "TIMP REAL" },
          ].map((f) => (
            <div key={f.label} style={{ padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: "1rem", marginBottom: 2 }}>{f.icon}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>{f.label}</div>
            </div>
          ))}
        </div>

        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
          OPENROUTER API KEY
        </label>
        <input
          type="password" value={key}
          onChange={(e) => setKey(e.target.value.replace(/[^\x20-\x7E]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && sanitizeKey(key) && onSubmit(sanitizeKey(key))}
          placeholder="sk-or-..."
          style={{ width: "100%", padding: "11px 14px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "var(--mono)", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(239,68,68,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          autoFocus
        />
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.55rem", marginTop: 5, fontFamily: "var(--mono)" }}>
          openrouter.ai/settings/keys — gratuit
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={testConnection} disabled={testStatus === "testing"} style={{
            padding: "10px 16px", borderRadius: 6, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
            color: "#06b6d4", fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1, cursor: "pointer",
          }}>
            {testStatus === "testing" ? "TESTARE..." : "TESTEAZĂ"}
          </button>
          <button onClick={() => sanitizeKey(key) && onSubmit(sanitizeKey(key))} disabled={!key.trim()} style={{
            flex: 1, padding: "10px 0", borderRadius: 6,
            background: key.trim() ? "#ef4444" : "rgba(255,255,255,0.05)",
            color: key.trim() ? "#fff" : "rgba(255,255,255,0.25)",
            fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: 2, cursor: key.trim() ? "pointer" : "not-allowed",
          }}>
            ACTIVEAZĂ SISTEMUL
          </button>
        </div>

        {testStatus && testStatus !== "testing" && (
          <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 5, background: testStatus.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${testStatus.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.58rem", color: testStatus.ok ? "#22c55e" : "#ef4444" }}>
              {testStatus.ok ? "✓ " : "✗ "}{testStatus.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compact Intel Card (for feed panel) ──
function CompactIntelCard({ item, agentDef, onVerify, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(null);
  const color = agentDef?.color || "#888";
  const severityColor = item.severity >= 5 ? "#ef4444" : item.severity >= 4 ? "#f97316" : item.severity >= 3 ? "#eab308" : "#22c55e";

  const handleVerify = async (e) => {
    e.stopPropagation();
    if (verifying || verification) return;
    setVerifying(true);
    const result = await onVerify?.(item);
    setVerification(result);
    setVerifying(false);
  };

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: isNew ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
        borderLeft: `2px solid ${severityColor}`,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "8px 10px",
        cursor: "pointer",
        transition: "background 0.15s",
        animation: isNew ? "slideInLeft 0.4s ease" : "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: "0.65rem", flexShrink: 0 }}>{agentDef?.icon || "📌"}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color, fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>{agentDef?.name || item.category}</span>
          {isNew && <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "#ef4444", fontWeight: 700, animation: "pulse 1s ease infinite" }}>●NOU</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {item.verified && <span style={{ color: "#22c55e", fontSize: "0.55rem" }}>✓</span>}
          <SeverityBadge level={item.severity || 3} />
        </div>
      </div>
      <h4 style={{ margin: "0 0 3px", fontSize: "0.72rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.35, display: expanded ? "block" : "-webkit-box", WebkitLineClamp: expanded ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden" }}>
        {item.headline}
      </h4>
      {expanded && (
        <>
          <p style={{ margin: "4px 0 6px", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            {item.summary}
          </p>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={handleVerify} style={{
              padding: "2px 8px", borderRadius: 3, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
              color: "#06b6d4", fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 1, cursor: "pointer",
            }}>
              {verifying ? "..." : verification ? "✓ VERIFICAT" : "VERIFICĂ"}
            </button>
            {verification && (
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: verification.verified ? "#22c55e" : "#f97316" }}>
                {verification.confidence}% — {verification.crossVerification?.consensus || ""}
              </span>
            )}
          </div>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.25)" }}>
          {item.location ? `📍${item.location} · ` : ""}{item.source}
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.2)" }}>{item.time}</span>
      </div>
    </div>
  );
}

// ── Live Ticker ──
function LiveTicker({ items }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{ background: "rgba(239,68,68,0.05)", borderBottom: "1px solid rgba(239,68,68,0.1)", overflow: "hidden", whiteSpace: "nowrap", height: 26, display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 0, animation: `tickerScroll ${items.length * 7}s linear infinite` }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingRight: 40, flexShrink: 0 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: (item.severity || 3) >= 4 ? "#ef4444" : "#f97316", flexShrink: 0 }} />
            <span style={{ fontSize: "0.6rem", fontFamily: "var(--mono)", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>{item.text || item.headline}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Maritime Summary Bar ──
const MARITIME_STATUS = [
  { name: "Strâmtoarea Hormuz", short: "HORMUZ", risk: "critical", color: "#ef4444", bbl: "20.5M bbl/zi", threat: "Mine · Dronă" },
  { name: "Bab el-Mandeb", short: "BAB EL-M", risk: "high", color: "#f97316", bbl: "6.2M bbl/zi", threat: "Houthi activi" },
  { name: "Canalul Suez", short: "SUEZ", risk: "medium", color: "#eab308", bbl: "12% comerț", threat: "Devieri trafic" },
  { name: "Strâmtoarea Malacca", short: "MALACCA", risk: "low", color: "#22c55e", bbl: "25% maritim", threat: "Piraterie" },
];

function MaritimeBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%", padding: "0 10px", overflowX: "auto" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginRight: 10, flexShrink: 0 }}>MARITIM</span>
      {MARITIME_STATUS.map((s) => (
        <div key={s.short} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRight: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: s.risk === "critical" ? `0 0 6px ${s.color}` : "none", animation: s.risk === "critical" ? "pulse 1.5s ease infinite" : "none" }} />
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, color: s.color }}>{s.short}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.3)" }}>{s.threat}</div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.25)" }}>{s.bbl}</div>
        </div>
      ))}
    </div>
  );
}

// ── Webcam Thumbnail Strip ──
const WEBCAM_STRIP = [
  { id: "jNZM_H6q1rY", name: "Western Wall", city: "Jerusalem", flag: "🇮🇱", channelUrl: "https://www.youtube.com/watch?v=jNZM_H6q1rY" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv Beach", city: "Tel Aviv", flag: "🇮🇱", channelUrl: "https://www.youtube.com/watch?v=LMM0FN5jJaE" },
  { id: "4K_-EhKjYjs", name: "Dubai Skyline", city: "Dubai", flag: "🇦🇪", channelUrl: "https://www.youtube.com/watch?v=4K_-EhKjYjs" },
  { id: "9eN4Jbxvbyg", name: "Mecca Live", city: "Mecca", flag: "🇸🇦", channelUrl: "https://www.youtube.com/watch?v=9eN4Jbxvbyg" },
  { id: "KJGASBMieBo", name: "Beirut View", city: "Beirut", flag: "🇱🇧", channelUrl: "https://www.youtube.com/watch?v=KJGASBMieBo" },
  { id: "wDkHBAdYXD0", name: "Bosphorus", city: "Istanbul", flag: "🇹🇷", channelUrl: "https://www.youtube.com/watch?v=wDkHBAdYXD0" },
  { id: "C6GKe0skDDE", name: "Doha Bay", city: "Doha", flag: "🇶🇦", channelUrl: "https://www.youtube.com/watch?v=C6GKe0skDDE" },
  { id: "uEMKGCKBKdQ", name: "Haifa Port", city: "Haifa", flag: "🇮🇱", channelUrl: "https://www.youtube.com/watch?v=uEMKGCKBKdQ" },
];

// Additional live news channel streams
const NEWS_STREAMS = [
  { name: "Al Jazeera", flag: "📺", url: "https://www.youtube.com/@AlJazeeraEnglish/live", color: "#06b6d4" },
  { name: "France 24", flag: "📺", url: "https://www.youtube.com/@FRANCE24English/live", color: "#3b82f6" },
  { name: "DW News", flag: "📺", url: "https://www.youtube.com/@dwnews/live", color: "#8b5cf6" },
  { name: "Sky News", flag: "📺", url: "https://www.youtube.com/@SkyNews/live", color: "#f97316" },
  { name: "BBC World", flag: "📺", url: "https://www.youtube.com/@BBCNews/live", color: "#ef4444" },
];

function WebcamStrip({ onOpenCams }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%", overflowX: "auto", padding: "0 4px" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 2, color: "rgba(255,255,255,0.25)", padding: "0 8px", flexShrink: 0 }}>CAMERE</span>
      {WEBCAM_STRIP.map((cam) => (
        <a
          key={cam.id}
          href={cam.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", padding: "4px 5px", borderRadius: 5, transition: "background 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title={`${cam.flag} ${cam.name} — ${cam.city}`}
        >
          <div style={{ position: "relative", width: 64, height: 36, borderRadius: 3, overflow: "hidden", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img
              src={`https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`}
              alt={cam.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
              <span style={{ fontSize: "1rem" }}>{cam.flag}</span>
            </div>
            <div style={{ position: "absolute", bottom: 2, left: 2, display: "flex", alignItems: "center", gap: 2, background: "rgba(0,0,0,0.7)", padding: "1px 3px", borderRadius: 2 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s ease infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: "#ef4444" }}>LIVE</span>
            </div>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.4)", marginTop: 2, letterSpacing: 0.3 }}>{cam.city}</span>
        </a>
      ))}
      <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.06)", margin: "0 4px", flexShrink: 0 }} />
      {NEWS_STREAMS.map((s) => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", padding: "4px 6px", borderRadius: 5, transition: "background 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ width: 56, height: 36, borderRadius: 3, background: `${s.color}15`, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", color: s.color, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{s.name}</span>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>LIVE ↗</span>
        </a>
      ))}
      <button
        onClick={onOpenCams}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 8px", borderRadius: 5, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", flexShrink: 0, marginLeft: 4 }}
      >
        <span style={{ fontSize: "0.9rem" }}>📹</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.3)", marginTop: 1 }}>TOATE</span>
      </button>
    </div>
  );
}

// ── Analysis Summary ──
function AnalysisSummaryPanel({ analysis }) {
  if (!analysis) return (
    <div style={{ padding: "8px 10px", fontFamily: "var(--mono)", fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
      Analiză strategică în curs...
    </div>
  );
  const color = analysis.threat_level >= 8 ? "#ef4444" : analysis.threat_level >= 6 ? "#f97316" : analysis.threat_level >= 4 ? "#eab308" : "#22c55e";
  return (
    <div style={{ padding: "8px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)" }}>ANALIZĂ STRATEGICĂ</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.9rem", fontWeight: 800, color }}>{analysis.threat_level}/10</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", fontWeight: 700, color }}>{analysis.threat_label}</span>
        </div>
      </div>
      {/* Threat bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(analysis.threat_level / 10) * 100}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, transition: "width 1s" }} />
      </div>
      {analysis.situation_summary && (
        <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 6px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {analysis.situation_summary}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {analysis.escalation_probability != null && (
          <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 4, padding: "4px 6px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>ESCALADARE</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700, color: analysis.escalation_probability > 60 ? "#ef4444" : "#f97316" }}>{analysis.escalation_probability}%</div>
          </div>
        )}
        {analysis.nuclear_risk != null && (
          <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 4, padding: "4px 6px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>NUCLEAR</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700, color: "#ef4444" }}>{analysis.nuclear_risk}%</div>
          </div>
        )}
      </div>
      {analysis.next_hours_prediction && (
        <div style={{ marginTop: 6, padding: "4px 6px", background: "rgba(249,115,22,0.06)", borderLeft: "2px solid rgba(249,115,22,0.3)", borderRadius: "0 4px 4px 0" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 1, color: "#f97316", marginBottom: 2 }}>PREDICȚIE 6-12 ORE</div>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{analysis.next_hours_prediction}</p>
        </div>
      )}
    </div>
  );
}

// ── Full Analysis Panel ──
function FullAnalysisPanel({ analysis }) {
  if (!analysis) return <div style={{ padding: 20, fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>Analiză în curs...</div>;
  const color = analysis.threat_level >= 8 ? "#ef4444" : analysis.threat_level >= 6 ? "#f97316" : analysis.threat_level >= 4 ? "#eab308" : "#22c55e";
  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)" }}>NIVEL AMENINȚARE</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "1.1rem", fontWeight: 800, color }}>{analysis.threat_level}/10</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, color }}>{analysis.threat_label}</span>
          </div>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(analysis.threat_level / 10) * 100}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
        </div>
      </div>
      {analysis.situation_summary && (
        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>SUMAR EXECUTIV</div>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>{analysis.situation_summary}</p>
        </div>
      )}
      {(analysis.escalation_probability != null || analysis.nuclear_risk != null) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {analysis.escalation_probability != null && (
            <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>ESCALADARE</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.95rem", fontWeight: 800, color: analysis.escalation_probability > 60 ? "#ef4444" : "#f97316" }}>{analysis.escalation_probability}%</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: "100%", width: `${analysis.escalation_probability}%`, background: analysis.escalation_probability > 60 ? "#ef4444" : "#f97316", borderRadius: 2 }} />
              </div>
            </div>
          )}
          {analysis.nuclear_risk != null && (
            <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 3 }}>RISC NUCLEAR</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.95rem", fontWeight: 800, color: "#ef4444" }}>{analysis.nuclear_risk}%</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: "100%", width: `${analysis.nuclear_risk}%`, background: "#ef4444", borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>
      )}
      {[
        { key: "next_hours_prediction", icon: "⏳", label: "PREDICȚIE 6-12 ORE", color: "#f97316" },
        { key: "next_days_prediction", icon: "📅", label: "PERSPECTIVĂ 3-7 ZILE", color: "#06b6d4" },
        { key: "oil_impact", icon: "🛢️", label: "IMPACT PETROL", color: "#eab308" },
        { key: "proxy_status", icon: "🎯", label: "FORȚE PROXY", color: "#f97316" },
        { key: "diplomatic_status", icon: "🏛️", label: "DIPLOMATIC", color: "#8b5cf6" },
      ].filter(({ key }) => analysis[key]).map(({ key, icon, label, color: c }) => (
        <div key={key} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: `2px solid ${c}44` }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: c, marginBottom: 3 }}>{icon} {label}</div>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>{analysis[key]}</p>
        </div>
      ))}
      {analysis.key_risks?.length > 0 && (
        <div style={{ padding: "7px 10px", background: "rgba(239,68,68,0.04)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.1)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "#ef4444", marginBottom: 4 }}>⚠ RISCURI CHEIE</div>
          {analysis.key_risks.map((r, i) => (
            <div key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", marginBottom: 2, paddingLeft: 8, borderLeft: "1px solid rgba(239,68,68,0.2)" }}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sources Panel ──
function SourcesPanel() {
  const tiers = [
    { label: "TIER 1 — Surse Primare", sources: OSINT_SOURCES.filter((s) => s.tier === 1), color: "#eab308" },
    { label: "TIER 2 — Rețea Extinsă", sources: OSINT_SOURCES.filter((s) => s.tier === 2), color: "rgba(255,255,255,0.3)" },
  ];
  return (
    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
      {tiers.map((tier) => (
        <div key={tier.label}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 2, color: tier.color, marginBottom: 6 }}>{tier.label} ({tier.sources.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {tier.sources.map((src) => (
              <a key={src.handle} href={`https://x.com/${src.handle}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "#06b6d4", padding: "2px 6px", background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 3, textDecoration: "none" }} title={src.focus}>
                @{src.handle}
              </a>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>NEWS CHANNELS ({NEWS_CHANNELS.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {NEWS_CHANNELS.map((n) => (
            <span key={n.name} style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.45)", padding: "2px 6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3 }}>{n.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── System Log ──
function SystemLog({ logs }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);
  if (!logs.length) return null;
  const typeColors = { system: "#06b6d4", success: "#22c55e", error: "#ef4444", alert: "#f97316", info: "rgba(255,255,255,0.3)" };
  return (
    <div style={{ padding: "6px 10px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 2, color: "rgba(255,255,255,0.2)", marginBottom: 4 }}>JURNAL SISTEM</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {logs.slice(-15).map((log, i) => (
          <div key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", color: typeColors[log.type] || "rgba(255,255,255,0.2)" }}>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>[{log.time}]</span> {log.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD
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
  const [rightTab, setRightTab] = useState("feed"); // feed | analysis | maritime | webcams | sources | logs
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("severity");
  const [totalCycles, setTotalCycles] = useState(0);
  const [previousIntel, setPreviousIntel] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mapLayer, setMapLayer] = useState("all");

  const managerRef = useRef(null);
  const countdownRef = useRef(null);

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
    const manager = new AgentManager(
      apiKey,
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
      (progress) => {
        setAgentStatuses((prev) => ({ ...prev, [progress.agentId]: { status: progress.status, count: progress.count || prev[progress.agentId]?.count || 0, message: progress.message } }));
      },
      (log) => { setLogs((prev) => [...prev.slice(-(MAX_LOG_ENTRIES - 1)), log]); }
    );
    managerRef.current = manager;
    manager.start(REFRESH_INTERVAL);
    return () => manager.stop();
  }, [isActive, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive) return;
    countdownRef.current = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(countdownRef.current);
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

  const rightPanelTabs = [
    { id: "feed", label: "FLUX", icon: "📡" },
    { id: "analysis", label: "ANALIZĂ", icon: "🧠" },
    { id: "maritime", label: "MARITIM", icon: "🚢" },
    { id: "webcams", label: "CAMERE", icon: "📹" },
    { id: "sources", label: "SURSE", icon: "🔗" },
    { id: "logs", label: "LOGS", icon: "💻" },
  ];

  const MAP_LAYERS = [
    { id: "all", label: "TOATE" },
    { id: "nuclear", label: "☢ NUCLEAR" },
    { id: "military", label: "🎯 MILITAR" },
    { id: "naval", label: "⚓ NAVAL" },
    { id: "base_us", label: "🇺🇸 US BAZE" },
    { id: "proxy", label: "🎯 PROXY" },
    { id: "chokepoint", label: "🚢 MARITIM" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#070b0f" }}>

      {/* ══ HEADER ══ */}
      <header style={{
        height: 48, flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 12px",
        display: "flex", alignItems: "center", gap: 0,
        background: "rgba(5,8,14,0.95)", backdropFilter: "blur(20px)",
        position: "relative", zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 14, borderRight: "1px solid rgba(255,255,255,0.07)", marginRight: 12, flexShrink: 0 }}>
          <PulsingDot color={isLoading ? "#f97316" : "#ef4444"} size={8} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 800, letterSpacing: 3, color: "#ef4444" }}>INTEL</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.85)" }}>LIVE</span>
        </div>

        {/* Agents row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 14, borderRight: "1px solid rgba(255,255,255,0.07)", marginRight: 12, flexShrink: 0 }}>
          {AGENTS.map((agent) => {
            const status = agentStatuses[agent.id] || {};
            return (
              <div key={agent.id} title={`${agent.fullName} — ${status.count || 0} rapoarte`}
                style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "2px 5px", borderRadius: 3, transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => { setActiveFilter(agent.id); setRightTab("feed"); }}
              >
                <AgentStatusDot status={status.status} color={agent.color} />
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: status.status === "running" ? agent.color : "rgba(255,255,255,0.4)", fontWeight: status.status === "running" ? 700 : 400, letterSpacing: 0.5 }}>
                  {agent.icon} {agent.name}
                </span>
                {status.count > 0 && <span style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: agent.color, opacity: 0.7 }}>({status.count})</span>}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: "auto" }}>
          {criticalItems > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", color: "#ef4444", fontWeight: 700 }}>{criticalItems} CRITICE</span>
            </div>
          )}
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)" }}>{totalItems} rapoarte</span>
          {analysis && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: analysis.threat_level >= 7 ? "#ef4444" : "#f97316" }}>
              THREAT {analysis.threat_level}/10
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "right", marginRight: 4 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.4rem", letterSpacing: 1, color: "rgba(255,255,255,0.2)" }}>REFRESH</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700, color: countdown < 15 ? "#ef4444" : "#22c55e" }}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </div>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} title="Sound (S)" style={{ fontSize: "0.75rem", opacity: soundEnabled ? 1 : 0.3, padding: "2px" }}>
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button onClick={() => managerRef.current?.manualRefresh()} disabled={isLoading} style={{
            padding: "5px 12px", borderRadius: 5,
            background: isLoading ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isLoading ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.25)"}`,
            color: isLoading ? "rgba(255,255,255,0.3)" : "#ef4444",
            fontFamily: "var(--mono)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: 1, cursor: isLoading ? "wait" : "pointer",
          }}>
            {isLoading ? "SCANARE..." : "⟳ REFRESH"}
          </button>
          {lastUpdate && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.2)" }}>
              {lastUpdate.toLocaleTimeString("ro-RO")}
            </span>
          )}
        </div>
      </header>

      {/* ══ TICKER ══ */}
      <LiveTicker items={breaking} />

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── MAP PANEL (left, ~63%) ── */}
        <div style={{ flex: "0 0 63%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

          {/* Map layer controls */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px",
            background: "rgba(5,8,14,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0, overflowX: "auto",
          }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginRight: 4, flexShrink: 0 }}>LAYER</span>
            {MAP_LAYERS.map((l) => (
              <button key={l.id} onClick={() => setMapLayer(l.id)} style={{
                padding: "3px 8px", borderRadius: 3, fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 0.5,
                background: mapLayer === l.id ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${mapLayer === l.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: mapLayer === l.id ? "#ef4444" : "rgba(255,255,255,0.35)",
                cursor: "pointer", flexShrink: 0,
              }}>{l.label}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.2)" }}>
                {allItems.length} eventi pe hartă
              </span>
            </div>
          </div>

          {/* Map */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ConflictMap intelItems={allItems} analysis={analysis} externalLayer={mapLayer} />
          </div>
        </div>

        {/* ── RIGHT PANEL (37%) ── */}
        <div style={{ flex: "0 0 37%", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>

          {/* Right panel tabs */}
          <div style={{
            display: "flex", flexShrink: 0,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(5,8,14,0.9)",
          }}>
            {rightPanelTabs.map((tab) => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                flex: 1, padding: "9px 4px",
                fontFamily: "var(--mono)", fontSize: "0.48rem", fontWeight: 600, letterSpacing: 0.5,
                background: rightTab === tab.id ? "rgba(255,255,255,0.04)" : "transparent",
                color: rightTab === tab.id ? "#e2e8f0" : "rgba(255,255,255,0.3)",
                borderBottom: rightTab === tab.id ? "2px solid #ef4444" : "2px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <span style={{ display: "block", fontSize: "0.7rem", marginBottom: 1 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── FEED TAB ── */}
          {rightTab === "feed" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Feed controls */}
              <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Caută..."
                  style={{ flex: "1 1 120px", padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#fff", fontFamily: "var(--mono)", fontSize: "0.62rem", outline: "none", minWidth: 80 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(239,68,68,0.3)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                />
                <button onClick={() => setSortBy(sortBy === "severity" ? "time" : "severity")} style={{
                  padding: "3px 7px", borderRadius: 3, fontFamily: "var(--mono)", fontSize: "0.48rem",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", cursor: "pointer",
                }}>
                  {sortBy === "severity" ? "↓ SEV" : "↓ TIMP"}
                </button>
                <button onClick={() => { setActiveFilter("ALL"); setSearchQuery(""); }} style={{
                  padding: "3px 7px", borderRadius: 3, fontFamily: "var(--mono)", fontSize: "0.48rem",
                  background: activeFilter === "ALL" && !searchQuery ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${activeFilter === "ALL" && !searchQuery ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
                  color: activeFilter === "ALL" && !searchQuery ? "#ef4444" : "rgba(255,255,255,0.4)", cursor: "pointer",
                }}>TOATE ({totalItems})</button>
              </div>
              {/* Agent filter pills */}
              <div style={{ padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", gap: 3, flexWrap: "wrap" }}>
                {AGENTS.map((agent) => {
                  const count = (intel[agent.id] || []).length;
                  if (!count) return null;
                  return (
                    <button key={agent.id} onClick={() => setActiveFilter(agent.id)} style={{
                      padding: "2px 7px", borderRadius: 10, fontFamily: "var(--mono)", fontSize: "0.45rem",
                      background: activeFilter === agent.id ? `${agent.color}18` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${activeFilter === agent.id ? `${agent.color}44` : "rgba(255,255,255,0.06)"}`,
                      color: activeFilter === agent.id ? agent.color : "rgba(255,255,255,0.3)", cursor: "pointer",
                    }}>{agent.icon} {agent.name} {count}</button>
                  );
                })}
              </div>
              {/* Feed items */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {allItems.length > 0 ? (
                  allItems.map((item, i) => (
                    <CompactIntelCard key={`${item.headline}-${i}`} item={item} agentDef={AGENTS.find((a) => a.id === item._agentId)} onVerify={handleVerify} isNew={isNewItem(item)} />
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: "1.5rem", animation: "pulse 1.5s ease infinite", marginBottom: 10 }}>📡</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
                      {isLoading ? "SCANARE SURSE..." : "AȘTEPTARE DATE..."}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                      {AGENTS.filter((a) => agentStatuses[a.id]?.status === "running").map((a) => (
                        <span key={a.id} style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: a.color, animation: "pulse 1.5s ease infinite" }}>{a.icon} {a.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Analysis mini */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, maxHeight: 200, overflowY: "auto" }}>
                <AnalysisSummaryPanel analysis={analysis} />
              </div>
            </div>
          )}

          {/* ── ANALYSIS TAB ── */}
          {rightTab === "analysis" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <FullAnalysisPanel analysis={analysis} />
            </div>
          )}

          {/* ── MARITIME TAB ── */}
          {rightTab === "maritime" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <MaritimePanel />
            </div>
          )}

          {/* ── WEBCAMS TAB ── */}
          {rightTab === "webcams" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <WebcamViewer />
            </div>
          )}

          {/* ── SOURCES TAB ── */}
          {rightTab === "sources" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <SourcesPanel />
            </div>
          )}

          {/* ── LOGS TAB ── */}
          {rightTab === "logs" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <SystemLog logs={logs} />
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM STRIP ══ */}
      <div style={{
        height: 72, flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", overflow: "hidden",
        background: "rgba(5,8,14,0.95)",
      }}>
        {/* Maritime */}
        <div style={{ flex: "0 0 auto", borderRight: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <MaritimeBar />
        </div>
        {/* Webcam strip */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <WebcamStrip onOpenCams={() => setRightTab("webcams")} />
        </div>
        {/* Stats */}
        <div style={{ flex: "0 0 auto", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "RAPOARTE", value: totalItems, color: "#06b6d4" },
              { label: "CRITICE", value: criticalItems, color: "#ef4444" },
              { label: "CICLURI", value: totalCycles, color: "#22c55e" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 1, color: "rgba(255,255,255,0.25)" }}>{s.label}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.15)", textAlign: "center" }}>
            {isLoading ? <span style={{ color: "#f97316" }}>● SCANARE</span> : <span style={{ color: "#22c55e" }}>● ACTIV</span>}
            {" "}· R=Refresh · S=Sunet
          </div>
        </div>
      </div>
    </div>
  );
}
