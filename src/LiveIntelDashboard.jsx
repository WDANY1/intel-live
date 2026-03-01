import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AGENTS, OSINT_SOURCES, NEWS_CHANNELS, LIVE_WEBCAMS, WEBCAM_REGIONS, REFRESH_INTERVAL, MAX_LOG_ENTRIES, SEVERITY } from "./config";
import { AgentManager, verifyIntel } from "./api";

// ════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

function PulsingDot({ color = "#ff3b3b", size = 8 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, marginRight: 6, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, opacity: 0.4, animation: "pulseRing 2s ease-in-out infinite" }} />
    </span>
  );
}

function SeverityBadge({ level }) {
  const cfg =
    level >= 5 ? { bg: "#ff174422", border: "#ff174455", color: "#ff1744", label: "CRITIC" } :
    level >= 4 ? { bg: "#ff6d0022", border: "#ff6d0055", color: "#ff6d00", label: "RIDICAT" } :
    level >= 3 ? { bg: "#ffab0022", border: "#ffab0055", color: "#ffab00", label: "MEDIU" } :
    { bg: "#69f0ae22", border: "#69f0ae55", color: "#69f0ae", label: "SCĂZUT" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 10, fontSize: "0.6rem",
      fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: 1,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, boxShadow: level >= 4 ? `0 0 6px ${cfg.color}` : "none" }} />
      {cfg.label}
    </span>
  );
}

function AgentStatusDot({ status, color }) {
  if (status === "running") return <span style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${color}`, borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />;
  if (status === "done") return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 8px ${color}55` }} />;
  if (status === "error") return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff1744", display: "inline-block" }} />;
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />;
}

// ── API Key Modal ──
function ApiKeyModal({ onSubmit }) {
  const [key, setKey] = useState("");
  const [testStatus, setTestStatus] = useState(null); // null | "testing" | {ok, message}

  const testConnection = async () => {
    setTestStatus("testing");
    try {
      // 1. Test serverless function health
      const healthRes = await fetch("/api/claude");
      const health = await healthRes.json();

      if (!healthRes.ok) {
        setTestStatus({ ok: false, message: `Serverless function error: ${JSON.stringify(health)}` });
        return;
      }

      // 2. Test actual OpenRouter API call
      const apiRes = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key.trim() || "test" },
        body: JSON.stringify({ prompt: "Say OK" }),
      });
      const apiData = await apiRes.json();

      if (apiRes.ok && apiData.text) {
        setTestStatus({ ok: true, message: `Conexiune OK! OpenRouter activ. (${health.hasApiKey ? "ENV var setat" : "key din browser"})` });
      } else {
        setTestStatus({ ok: false, message: `API error ${apiRes.status}: ${apiData.error || JSON.stringify(apiData).slice(0, 200)}` });
      }
    } catch (err) {
      setTestStatus({ ok: false, message: `Eroare conexiune: ${err.message}` });
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
    }}>
      <div style={{
        background: "#12121a", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "48px 40px", maxWidth: 480, width: "90%",
        animation: "fadeInUp 0.4s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <PulsingDot color="#ff3b3b" size={10} />
          <h2 style={{ fontFamily: "var(--mono)", fontSize: "1.2rem", fontWeight: 800, letterSpacing: 3, background: "linear-gradient(135deg, #ff3b3b, #ff6b35)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            INTEL LIVE
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 6 }}>
          Monitor de informații în timp real — Conflict Iran-Israel-SUA
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 28, lineHeight: 1.6 }}>
          7 agenți AI rulează în paralel, scanând 70+ surse OSINT, conturi X/Twitter și agenții de știri pentru actualizări la minut.
        </p>

        <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 8 }}>
          OPENROUTER API KEY
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && key.trim() && onSubmit(key.trim())}
          placeholder="sk-or-..."
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff", fontFamily: "var(--mono)", fontSize: "0.85rem",
            outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(255,59,59,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          autoFocus
        />
        <p style={{ color: "var(--text-dim)", fontSize: "0.65rem", marginTop: 8, fontFamily: "var(--mono)" }}>
          Ia cheia de pe aistudio.google.com/apikey — gratuit, include Web Search.
        </p>

        {/* Test connection button */}
        <button
          onClick={testConnection}
          disabled={testStatus === "testing"}
          style={{
            width: "100%", marginTop: 16, padding: "10px 0", borderRadius: 8,
            background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.25)",
            color: "#4fc3f7", fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600,
            letterSpacing: 1, cursor: testStatus === "testing" ? "wait" : "pointer",
          }}
        >
          {testStatus === "testing" ? "⟳ TESTARE CONEXIUNE..." : "🔍 TESTEAZĂ CONEXIUNEA"}
        </button>

        {/* Test result */}
        {testStatus && testStatus !== "testing" && (
          <div style={{
            marginTop: 10, padding: "10px 14px", borderRadius: 6,
            background: testStatus.ok ? "rgba(105,240,174,0.08)" : "rgba(255,23,68,0.08)",
            border: `1px solid ${testStatus.ok ? "rgba(105,240,174,0.2)" : "rgba(255,23,68,0.2)"}`,
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700,
              color: testStatus.ok ? "#69f0ae" : "#ff1744", marginBottom: 4,
            }}>
              {testStatus.ok ? "✓ CONEXIUNE REUȘITĂ" : "✗ CONEXIUNE EȘUATĂ"}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
              {testStatus.message}
            </div>
          </div>
        )}

        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim()}
          style={{
            width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 8,
            background: key.trim() ? "linear-gradient(135deg, #ff3b3b, #ff6b35)" : "rgba(255,255,255,0.05)",
            color: key.trim() ? "#fff" : "rgba(255,255,255,0.3)",
            fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700,
            letterSpacing: 2, cursor: key.trim() ? "pointer" : "not-allowed",
            transition: "all 0.3s",
          }}
        >
          ACTIVEAZĂ SISTEMUL
        </button>

        <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {AGENTS.map((a) => (
            <span key={a.id} style={{ fontSize: "0.6rem", fontFamily: "var(--mono)", color: a.color, opacity: 0.6 }}>
              {a.icon} {a.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Live Ticker ──
function LiveTicker({ items }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      background: "rgba(255,27,27,0.08)", borderBottom: "1px solid rgba(255,59,59,0.15)",
      overflow: "hidden", whiteSpace: "nowrap", height: 32, display: "flex", alignItems: "center",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 40,
        animation: `tickerScroll ${items.length * 8}s linear infinite`,
        paddingLeft: 20,
      }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: (item.severity || 3) >= 4 ? "#ff1744" : "#ff9100",
              boxShadow: (item.severity || 3) >= 4 ? "0 0 6px #ff1744" : "none",
              animation: (item.severity || 3) >= 4 ? "pulse 1s ease infinite" : "none",
            }} />
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--mono)", color: "rgba(255,255,255,0.75)", letterSpacing: 0.5 }}>
              {item.text || item.headline}
            </span>
            {item.time && (
              <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                {item.time}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Threat Meter ──
function ThreatMeter({ level = 5, label = "HIGH" }) {
  const pct = (level / 10) * 100;
  const color = level >= 8 ? "#ff1744" : level >= 6 ? "#ff9100" : level >= 4 ? "#ffea00" : "#69f0ae";
  return (
    <div style={{ padding: "16px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-muted)" }}>NIVEL AMENINȚARE</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700, color, letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 12px ${color}44`,
          transition: "width 1s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-dim)" }}>SCĂZUT</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "1.4rem", fontWeight: 800, color }}>{level}/10</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-dim)" }}>CRITIC</span>
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      flex: "1 1 130px", minWidth: 130,
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
      padding: "12px 16px",
    }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: "1.1rem", fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

// ── Intel Card ──
function IntelCard({ item, agentDef, onVerify, isNew }) {
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(null);
  const color = agentDef?.color || "#fff";

  const handleVerify = async () => {
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
        background: isNew ? "rgba(255,59,59,0.04)" : "var(--bg-card)",
        border: `1px solid ${isNew ? "rgba(255,59,59,0.2)" : "var(--border)"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "var(--radius-sm)", padding: "14px 16px",
        cursor: "pointer", transition: "all 0.2s",
        animation: isNew ? "fadeInUp 0.5s ease" : "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? "rgba(255,59,59,0.04)" : "var(--bg-card)"; e.currentTarget.style.borderColor = isNew ? "rgba(255,59,59,0.2)" : "var(--border)"; }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 1.5, color, fontWeight: 600, flexShrink: 0 }}>
          {agentDef?.icon} {agentDef?.name || item.category}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isNew && <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "#ff1744", letterSpacing: 1, fontWeight: 700 }}>NOU</span>}
          {item.verified && <span style={{ fontSize: "0.55rem", color: "#69f0ae" }}>✓</span>}
          <SeverityBadge level={item.severity || 3} />
        </div>
      </div>

      {/* Headline */}
      <h4 style={{
        margin: "0 0 6px 0", fontSize: "0.9rem", fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1.4,
      }}>
        {item.headline}
      </h4>

      {/* Summary */}
      <p style={{
        margin: "0 0 10px 0", fontSize: "0.78rem",
        color: "var(--text-secondary)", lineHeight: 1.6,
        display: expanded ? "block" : "-webkit-box",
        WebkitLineClamp: expanded ? "unset" : 2,
        WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden",
      }}>
        {item.summary}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{item.source}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {item.location && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-dim)" }}>📍 {item.location}</span>
          )}
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{item.time}</span>
        </div>
      </div>

      {/* Expanded: Verify button */}
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleVerify(); }}
            style={{
              padding: "5px 12px", borderRadius: 4,
              background: verifying ? "rgba(255,255,255,0.05)" : "rgba(79,195,247,0.1)",
              border: "1px solid rgba(79,195,247,0.2)",
              color: "#4fc3f7", fontFamily: "var(--mono)", fontSize: "0.6rem",
              letterSpacing: 1, cursor: verifying ? "wait" : "pointer",
            }}
          >
            {verifying ? "⟳ VERIFICARE..." : verification ? "✓ VERIFICAT" : "🔍 VERIFICĂ INFORMAȚIA"}
          </button>
          {verification && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4, fontSize: "0.7rem" }}>
              <span style={{ color: verification.verified ? "#69f0ae" : "#ff9100", fontFamily: "var(--mono)", fontWeight: 600 }}>
                {verification.verified ? "✓ CONFIRMAT" : "⚠ NECONFIRMAT"} — Încredere: {verification.confidence}%
              </span>
              {verification.notes && <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.65rem" }}>{verification.notes}</p>}
              {verification.corroborating_sources?.length > 0 && (
                <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.6rem", fontFamily: "var(--mono)" }}>
                  Surse: {verification.corroborating_sources.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Analysis Panel ──
function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  return (
    <div style={{ display: "grid", gap: 16, animation: "fadeInUp 0.5s ease" }}>
      {/* Top row: Threat + Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <ThreatMeter level={analysis.threat_level} label={analysis.threat_label} />
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 8 }}>
            SUMAR EXECUTIV
          </div>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-primary)", margin: 0 }}>
            {analysis.situation_summary}
          </p>
        </div>
      </div>

      {/* Escalation + Nuclear + Oil row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {analysis.escalation_probability != null && (
          <ProgressCard label="PROBABILITATE ESCALADARE" value={analysis.escalation_probability} color={analysis.escalation_probability > 70 ? "#ff1744" : analysis.escalation_probability > 40 ? "#ff9100" : "#69f0ae"} />
        )}
        {analysis.nuclear_risk != null && (
          <ProgressCard label="RISC NUCLEAR" value={analysis.nuclear_risk} color={analysis.nuclear_risk > 30 ? "#ff1744" : analysis.nuclear_risk > 10 ? "#ff9100" : "#69f0ae"} />
        )}
      </div>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {analysis.next_hours_prediction && (
          <InfoBox icon="⏳" label="PREDICȚIE 6-12 ORE" color="#ff9100" text={analysis.next_hours_prediction} />
        )}
        {analysis.next_days_prediction && (
          <InfoBox icon="📅" label="PERSPECTIVĂ 3-7 ZILE" color="#4fc3f7" text={analysis.next_days_prediction} />
        )}
        {analysis.oil_impact && (
          <InfoBox icon="🛢️" label="IMPACT PETROL / HORMUZ" color="#ffd740" text={analysis.oil_impact} />
        )}
        {analysis.proxy_status && (
          <InfoBox icon="🎯" label="FORȚE PROXY" color="#ff6b35" text={analysis.proxy_status} />
        )}
        {analysis.diplomatic_status && (
          <InfoBox icon="🏛️" label="CANALE DIPLOMATICE" color="#b388ff" text={analysis.diplomatic_status} />
        )}
        {analysis.civilian_impact && (
          <InfoBox icon="🏥" label="IMPACT CIVIL" color="#e040fb" text={analysis.civilian_impact} />
        )}
      </div>

      {/* Key Risks */}
      {analysis.key_risks?.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,23,68,0.15)", borderRadius: "var(--radius)", padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "#ff1744", marginBottom: 10 }}>
            ⚠️ RISCURI CHEIE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
            {analysis.key_risks.map((risk, i) => (
              <div key={i} style={{
                fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5,
                paddingLeft: 12, borderLeft: "2px solid rgba(255,23,68,0.3)",
              }}>
                {risk}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {analysis.timeline_last_24h?.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 10 }}>
            📋 CRONOLOGIE ULTIMELE 24H
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analysis.timeline_last_24h.map((event, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: i === 0 ? "#ff1744" : i < 3 ? "#ff9100" : "var(--text-muted)",
                  boxShadow: i === 0 ? "0 0 8px #ff174466" : "none",
                }} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {analysis.recommendation && (
        <div style={{
          background: "rgba(105,240,174,0.05)", border: "1px solid rgba(105,240,174,0.15)",
          borderRadius: "var(--radius)", padding: "16px 20px",
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "#69f0ae", marginBottom: 8 }}>
            💡 RECOMANDARE
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {analysis.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressCard({ label, value, color }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "1rem", fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 1s" }} />
      </div>
    </div>
  );
}

function InfoBox({ icon, label, color, text }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 18px" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color, marginBottom: 8 }}>
        {icon} {label}
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Webcams Panel ──
function WebcamsPanel() {
  const [regionFilter, setRegionFilter] = useState("all");

  const filtered = regionFilter === "all"
    ? LIVE_WEBCAMS
    : LIVE_WEBCAMS.filter((w) => w.region === regionFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Region Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)", marginRight: 8 }}>
          REGIUNE:
        </span>
        {WEBCAM_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegionFilter(r.id)}
            style={{
              padding: "5px 14px", borderRadius: 16,
              fontFamily: "var(--mono)", fontSize: "0.6rem",
              background: regionFilter === r.id ? `${r.color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${regionFilter === r.id ? `${r.color}44` : "var(--border)"}`,
              color: regionFilter === r.id ? r.color : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {r.flag || ""} {r.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 20, padding: "10px 16px",
        background: "rgba(255,59,59,0.05)", border: "1px solid rgba(255,59,59,0.15)",
        borderRadius: "var(--radius)", alignItems: "center",
      }}>
        <PulsingDot color="#ff3b3b" size={8} />
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
          LIVE CAMERAS
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>
          {LIVE_WEBCAMS.length} locații • {LIVE_WEBCAMS.reduce((a, c) => a + c.cameras.length, 0)} camere
        </span>
      </div>

      {/* Camera Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {filtered.map((location) => (
          <div key={`${location.city}-${location.country}`} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", overflow: "hidden",
          }}>
            {/* Location Header */}
            <div style={{
              padding: "14px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.3rem" }}>{location.flag}</span>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {location.city}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    {location.country}
                  </div>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 12,
                background: "rgba(255,59,59,0.12)", border: "1px solid rgba(255,59,59,0.25)",
              }}>
                <PulsingDot color="#ff3b3b" size={6} />
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
                  LIVE
                </span>
              </div>
            </div>

            {/* Camera List */}
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {location.cameras.map((cam, ci) => (
                <a
                  key={ci}
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                    textDecoration: "none", cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(79,195,247,0.08)";
                    e.currentTarget.style.borderColor = "rgba(79,195,247,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.7rem" }}>📹</span>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "#4fc3f7", fontWeight: 600 }}>
                        {cam.name}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>
                        {cam.source}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── News Sources Panel ──
function NewsSourcesPanel() {
  const typeColors = { wire: "#ff9100", tv: "#4fc3f7", news: "#69f0ae", defense: "#ff3b3b" };
  const typeLabels = { wire: "AGENȚIE", tv: "TV", news: "PRESĂ", defense: "APĂRARE" };
  const groups = [
    { label: "Agenții de presă & Wire Services", items: NEWS_CHANNELS.filter((s) => s.type === "wire") },
    { label: "Canale TV internaționale", items: NEWS_CHANNELS.filter((s) => s.type === "tv") },
    { label: "Presă & Ziare", items: NEWS_CHANNELS.filter((s) => s.type === "news") },
    { label: "Apărare & Military", items: NEWS_CHANNELS.filter((s) => s.type === "defense") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        display: "flex", gap: 16, padding: "12px 16px",
        background: "rgba(79,195,247,0.05)", border: "1px solid rgba(79,195,247,0.15)",
        borderRadius: "var(--radius)", flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "#4fc3f7", fontWeight: 700, letterSpacing: 1 }}>
          {NEWS_CHANNELS.length} CANALE DE ȘTIRI
        </span>
        {Object.entries(typeLabels).map(([type, label]) => (
          <span key={type} style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: typeColors[type] }}>
            {label}: {NEWS_CHANNELS.filter((s) => s.type === type).length}
          </span>
        ))}
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <h3 style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 10 }}>
            {group.label.toUpperCase()} ({group.items.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {group.items.map((src) => (
              <div key={src.name} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.73rem", fontWeight: 600, color: typeColors[src.type] }}>
                    {src.name}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>
                    {src.region.toUpperCase()} • {src.url}
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1,
                  padding: "2px 6px", borderRadius: 3,
                  background: `${typeColors[src.type]}15`,
                  color: typeColors[src.type],
                  border: `1px solid ${typeColors[src.type]}33`,
                }}>
                  {typeLabels[src.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sources Panel (OSINT X/Twitter) ──
function SourcesPanel() {
  const tiers = [
    { label: "TIER 1 — Surse Primare", sources: OSINT_SOURCES.filter((s) => s.tier === 1) },
    { label: "TIER 2 — Rețea Extinsă", sources: OSINT_SOURCES.filter((s) => s.tier === 2) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {tiers.map((tier) => (
        <div key={tier.label}>
          <h3 style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 12 }}>
            {tier.label} ({tier.sources.length})
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {tier.sources.map((src) => (
              <div key={src.handle} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px",
                display: "flex", flexDirection: "column", gap: 3,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600, color: "#4fc3f7" }}>
                    @{src.handle}
                  </span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 1,
                    padding: "1px 6px", borderRadius: 3,
                    background: src.tier === 1 ? "rgba(255,215,64,0.1)" : "rgba(255,255,255,0.04)",
                    color: src.tier === 1 ? "#ffd740" : "var(--text-muted)",
                    border: `1px solid ${src.tier === 1 ? "rgba(255,215,64,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                    T{src.tier}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{src.name}</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{src.focus}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── System Log ──
function SystemLog({ logs }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);

  if (!logs.length) return null;
  const typeColors = { system: "#4fc3f7", success: "#69f0ae", error: "#ff1744", alert: "#ff9100", info: "var(--text-muted)" };
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "12px 16px",
      maxHeight: 160, overflowY: "auto",
    }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 8 }}>
        JURNAL SISTEM
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {logs.slice(-MAX_LOG_ENTRIES).map((log, i) => (
          <div key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: typeColors[log.type] || "var(--text-muted)", opacity: 0.8 }}>
            <span style={{ color: "var(--text-dim)" }}>[{log.time}]</span> {log.message}
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
  // ── State ──
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("intel_api_key") || "");
  const [isActive, setIsActive] = useState(false);
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState(
    Object.fromEntries(AGENTS.map((a) => [a.id, { status: "idle", count: 0, message: "" }]))
  );
  const [logs, setLogs] = useState([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("severity"); // severity | time
  const [totalCycles, setTotalCycles] = useState(0);
  const [previousIntel, setPreviousIntel] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(false);

  const managerRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Computed ──
  const allItems = useMemo(() => {
    const items = Object.entries(intel).flatMap(([agentId, agentItems]) =>
      (agentItems || []).map((item) => ({ ...item, _agentId: agentId }))
    );
    // Filter by category
    const filtered = activeFilter === "ALL" ? items : items.filter((i) => i._agentId === activeFilter);
    // Filter by search
    const searched = searchQuery
      ? filtered.filter((i) =>
          (i.headline + " " + i.summary + " " + (i.source || "")).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : filtered;
    // Sort
    if (sortBy === "severity") searched.sort((a, b) => (b.severity || 0) - (a.severity || 0));
    else searched.sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0));
    return searched;
  }, [intel, activeFilter, searchQuery, sortBy]);

  const totalItems = useMemo(() => Object.values(intel).flat().length, [intel]);
  const criticalItems = useMemo(() => Object.values(intel).flat().filter((i) => i.severity >= 4).length, [intel]);

  // Detect new items
  const previousKeys = useMemo(() => {
    const set = new Set();
    Object.values(previousIntel).flat().forEach((i) => {
      if (i?.headline) set.add(i.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40));
    });
    return set;
  }, [previousIntel]);

  const isNewItem = useCallback((item) => {
    if (!previousKeys.size) return false;
    const key = item.headline?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    return !previousKeys.has(key);
  }, [previousKeys]);

  // ── API Key handler ──
  const handleApiKey = useCallback((key) => {
    localStorage.setItem("intel_api_key", key);
    setApiKey(key);
    setIsActive(true);
  }, []);

  // ── Verify handler ──
  const handleVerify = useCallback(async (item) => {
    if (!apiKey) return null;
    try {
      return await verifyIntel(apiKey, item);
    } catch { return null; }
  }, [apiKey]);

  // ── Start agent manager ──
  useEffect(() => {
    if (!isActive || !apiKey) return;

    const manager = new AgentManager(
      apiKey,
      // onUpdate
      (data) => {
        setPreviousIntel((prev) => ({ ...prev, ...intel }));
        setIntel(data.intel);
        if (data.analysis) setAnalysis(data.analysis);
        if (data.breaking?.length) setBreaking((prev) => {
          const combined = [...data.breaking, ...prev].slice(0, 30);
          return combined;
        });
        setLastUpdate(new Date());
        setCountdown(REFRESH_INTERVAL);
        setTotalCycles(data.cycle);

        // Sound alert for critical items
        if (soundEnabled) {
          const hasCritical = Object.values(data.intel).flat().some((i) => i.severity >= 5);
          if (hasCritical) {
            try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGhdYQ==").play().catch(() => {}); } catch {}
          }
        }
      },
      // onAgentStatus
      (progress) => {
        setAgentStatuses((prev) => ({
          ...prev,
          [progress.agentId]: { status: progress.status, count: progress.count || prev[progress.agentId]?.count || 0, message: progress.message },
        }));
      },
      // onLog
      (log) => {
        setLogs((prev) => [...prev.slice(-(MAX_LOG_ENTRIES - 1)), log]);
      }
    );

    managerRef.current = manager;
    manager.start(REFRESH_INTERVAL);

    return () => manager.stop();
  }, [isActive, apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown timer ──
  useEffect(() => {
    if (!isActive) return;
    countdownRef.current = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(countdownRef.current);
  }, [isActive]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); managerRef.current?.manualRefresh(); }
      if (e.key === "1") setActiveTab("overview");
      if (e.key === "2") setActiveTab("feed");
      if (e.key === "3") setActiveTab("analysis");
      if (e.key === "4") setActiveTab("webcams");
      if (e.key === "5") setActiveTab("sources");
      if (e.key === "s" || e.key === "S") setSoundEnabled((p) => !p);
      if (e.key === "Escape") { setSearchQuery(""); setActiveFilter("ALL"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── If no API key, show modal ──
  if (!isActive) {
    return <ApiKeyModal onSubmit={handleApiKey} />;
  }

  const tabs = [
    { id: "overview", label: "SITUAȚIE", icon: "📋" },
    { id: "feed", label: "FLUX LIVE", icon: "📡" },
    { id: "analysis", label: "ANALIZĂ", icon: "🧠" },
    { id: "webcams", label: "CAMERE LIVE", icon: "📹" },
    { id: "sources", label: "SURSE", icon: "🔗" },
  ];

  const isLoading = Object.values(agentStatuses).some((s) => s.status === "running");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "0 20px", height: 56,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PulsingDot color={isLoading ? "#ff9100" : "#ff3b3b"} size={9} />
          <h1 style={{
            margin: 0, fontSize: "1rem", fontWeight: 800, letterSpacing: 3,
            fontFamily: "var(--mono)",
            background: "linear-gradient(135deg, #ff3b3b, #ff6b35)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            INTEL LIVE
          </h1>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1,
            color: "var(--text-dim)", borderLeft: "1px solid var(--border)", paddingLeft: 14,
          }}>
            IRAN • ISRAEL • SUA
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Sound toggle */}
          <button onClick={() => setSoundEnabled(!soundEnabled)} title="Toggle sound alerts (S)" style={{ fontSize: "0.85rem", opacity: soundEnabled ? 1 : 0.3 }}>
            {soundEnabled ? "🔊" : "🔇"}
          </button>

          {/* Countdown */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 1, color: "var(--text-dim)" }}>REFRESH</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "1rem", fontWeight: 700, color: countdown < 15 ? "#ff3b3b" : "#69f0ae" }}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => managerRef.current?.manualRefresh()}
            disabled={isLoading}
            title="Manual refresh (R)"
            style={{
              padding: "7px 14px", borderRadius: 6,
              background: isLoading ? "rgba(255,255,255,0.03)" : "rgba(255,59,59,0.12)",
              border: `1px solid ${isLoading ? "var(--border)" : "rgba(255,59,59,0.25)"}`,
              color: isLoading ? "var(--text-muted)" : "#ff3b3b",
              fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600,
              letterSpacing: 1, cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "⟳ SCANARE..." : "⟳ REFRESH"}
          </button>
        </div>
      </header>

      {/* ── Breaking News Ticker ── */}
      <LiveTicker items={breaking} />

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* ── Left Sidebar: Agent Status ── */}
        <aside style={{
          width: 200, flexShrink: 0, borderRight: "1px solid var(--border)",
          padding: "16px 12px", display: "flex", flexDirection: "column", gap: 16,
          background: "rgba(0,0,0,0.2)", overflowY: "auto",
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)" }}>
            AGENȚI ACTIVI
          </div>
          {AGENTS.map((agent) => {
            const status = agentStatuses[agent.id] || {};
            return (
              <div key={agent.id}
                onClick={() => { setActiveFilter(agent.id); setActiveTab("feed"); }}
                style={{
                  padding: "10px 12px", borderRadius: "var(--radius-sm)",
                  background: activeFilter === agent.id ? `${agent.color}11` : "transparent",
                  border: `1px solid ${activeFilter === agent.id ? `${agent.color}33` : "transparent"}`,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <AgentStatusDot status={status.status} color={agent.color} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: agent.color }}>
                    {agent.icon} {agent.name}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: 2 }}>
                  {agent.fullName}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>
                  {status.status === "running" ? "Scanare..." : status.count ? `${status.count} rapoarte` : "Așteptare..."}
                </div>
              </div>
            );
          })}

          {/* Quick Stats */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: "auto" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 8 }}>
              STATISTICI
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>Total</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#4fc3f7" }}>{totalItems}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>Critice</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#ff1744" }}>{criticalItems}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>Cicluri</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#69f0ae" }}>{totalCycles}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>Surse</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "#ffd740" }}>{OSINT_SOURCES.length + NEWS_CHANNELS.length}</span>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)", lineHeight: 1.8 }}>
              <span style={{ color: "var(--text-muted)" }}>R</span> Refresh<br />
              <span style={{ color: "var(--text-muted)" }}>1-5</span> Tabs<br />
              <span style={{ color: "var(--text-muted)" }}>S</span> Sunet<br />
              <span style={{ color: "var(--text-muted)" }}>Esc</span> Reset
            </div>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <main style={{ flex: 1, padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats Row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="STATUS" value={isLoading ? "SCANARE" : "ACTIV"} color={isLoading ? "#ff9100" : "#69f0ae"} icon="●" />
            <StatCard label="ULTIMA ACTUALIZARE" value={lastUpdate ? lastUpdate.toLocaleTimeString("ro-RO") : "—"} color="#4fc3f7" />
            <StatCard label="RAPOARTE" value={totalItems.toString()} color="#b388ff" />
            <StatCard label="ALERTE CRITICE" value={criticalItems.toString()} color="#ff1744" />
            {analysis?.escalation_probability != null && (
              <StatCard label="ESCALADARE" value={`${analysis.escalation_probability}%`} color={analysis.escalation_probability > 60 ? "#ff1744" : "#ff9100"} />
            )}
          </div>

          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 18px", borderRadius: "6px 6px 0 0",
                  fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600,
                  letterSpacing: 1,
                  background: activeTab === tab.id ? "rgba(255,255,255,0.06)" : "transparent",
                  color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: activeTab === tab.id ? "2px solid #ff3b3b" : "2px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Overview ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
              {analysis && <AnalysisPanel analysis={analysis} />}
              {!analysis && totalItems === 0 && (
                <>
                  <LoadingScreen />
                  {/* Show errors if any agents failed */}
                  {logs.filter((l) => l.type === "error").length > 0 && (
                    <div style={{
                      margin: "0 auto", maxWidth: 500, padding: "14px 18px",
                      background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.2)",
                      borderRadius: "var(--radius)", textAlign: "left",
                    }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "#ff1744", marginBottom: 8 }}>ERORI DETECTATE</div>
                      {logs.filter((l) => l.type === "error").slice(-5).map((l, i) => (
                        <div key={i} style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "rgba(255,255,255,0.6)", marginBottom: 3, wordBreak: "break-all" }}>
                          {l.message}
                        </div>
                      ))}
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)", marginTop: 8 }}>
                        Verifică: API key valid, credit Anthropic, env var pe Vercel
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Top critical items */}
              {criticalItems > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "#ff1744", marginBottom: 10 }}>
                    🚨 ALERTE CRITICE ({criticalItems})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10 }}>
                    {allItems
                      .filter((i) => i.severity >= 4)
                      .slice(0, 6)
                      .map((item, i) => (
                        <IntelCard
                          key={`critical-${i}`}
                          item={item}
                          agentDef={AGENTS.find((a) => a.id === item._agentId)}
                          onVerify={handleVerify}
                          isNew={isNewItem(item)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Live Feed ── */}
          {activeTab === "feed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
              {/* Filter bar */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Caută informații..."
                  style={{
                    flex: "1 1 200px", maxWidth: 300, padding: "7px 14px", borderRadius: 6,
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                    color: "#fff", fontFamily: "var(--mono)", fontSize: "0.75rem",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(255,59,59,0.3)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <FilterPill active={activeFilter === "ALL"} onClick={() => setActiveFilter("ALL")} color="#fff">
                  TOATE ({totalItems})
                </FilterPill>
                {AGENTS.map((agent) => {
                  const count = (intel[agent.id] || []).length;
                  if (!count) return null;
                  return (
                    <FilterPill key={agent.id} active={activeFilter === agent.id} onClick={() => setActiveFilter(agent.id)} color={agent.color}>
                      {agent.icon} {agent.name} ({count})
                    </FilterPill>
                  );
                })}
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <SortButton active={sortBy === "severity"} onClick={() => setSortBy("severity")}>Severitate</SortButton>
                  <SortButton active={sortBy === "time"} onClick={() => setSortBy("time")}>Timp</SortButton>
                </div>
              </div>

              {/* Intel grid */}
              {allItems.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 10 }}>
                  {allItems.map((item, i) => (
                    <div key={`${item.headline}-${i}`} style={{ animation: `fadeInUp 0.3s ease ${Math.min(i * 0.03, 0.3)}s both` }}>
                      <IntelCard
                        item={item}
                        agentDef={AGENTS.find((a) => a.id === item._agentId)}
                        onVerify={handleVerify}
                        isNew={isNewItem(item)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <LoadingScreen />
              )}
            </div>
          )}

          {/* ── TAB: Analysis ── */}
          {activeTab === "analysis" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {analysis ? (
                <AnalysisPanel analysis={analysis} />
              ) : (
                <LoadingScreen message="Analiză strategică în curs..." />
              )}
            </div>
          )}

          {/* ── TAB: Webcams ── */}
          {activeTab === "webcams" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <WebcamsPanel />
            </div>
          )}

          {/* ── TAB: Sources ── */}
          {activeTab === "sources" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeIn 0.3s ease" }}>
              <NewsSourcesPanel />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <h2 style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 2, color: "#4fc3f7", marginBottom: 16 }}>
                  CONTURI OSINT X/TWITTER ({OSINT_SOURCES.length})
                </h2>
                <SourcesPanel />
              </div>
            </div>
          )}

          {/* System Log */}
          <SystemLog logs={logs} />
        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(0,0,0,0.3)",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: 1 }}>
          INTEL LIVE • OPENROUTER LLAMA 4 MAVERICK • 7 AGENȚI • {OSINT_SOURCES.length} OSINT + {NEWS_CHANNELS.length} CANALE ȘTIRI • {LIVE_WEBCAMS.length} WEBCAMS • REFRESH {Math.floor(REFRESH_INTERVAL/60)}min
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: 1 }}>
          DOAR PENTRU INFORMARE • NU CONSTITUIE CONSILIERE MILITARĂ
        </span>
      </footer>

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px)",
      }} />
    </div>
  );
}

// ── Small helper components ──
function FilterPill({ children, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 16,
        fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 0.5,
        background: active ? `${color}18` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? `${color}44` : "var(--border)"}`,
        color: active ? color : "var(--text-muted)",
        cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SortButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 4,
        fontFamily: "var(--mono)", fontSize: "0.55rem",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        border: "1px solid var(--border)",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function LoadingScreen({ message = "Scanare surse de intelligence..." }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "2rem", marginBottom: 16, animation: "pulse 1.5s ease infinite" }}>📡</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: 2, marginBottom: 8 }}>
        {message}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        {AGENTS.map((a) => (
          <span key={a.id} style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: a.color, opacity: 0.5, animation: "pulse 2s ease infinite", animationDelay: `${AGENTS.indexOf(a) * 0.2}s` }}>
            {a.icon} {a.name}
          </span>
        ))}
      </div>
      <div style={{
        width: 200, height: 3, margin: "20px auto 0",
        background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          width: "40%", height: "100%",
          background: "linear-gradient(90deg, transparent, #ff3b3b, transparent)",
          borderRadius: 2,
          animation: "shimmer 1.5s ease infinite",
          backgroundSize: "200% 100%",
        }} />
      </div>
    </div>
  );
}
