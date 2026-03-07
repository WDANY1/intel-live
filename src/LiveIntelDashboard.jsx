import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AGENTS, OSINT_SOURCES, NEWS_CHANNELS, LIVE_WEBCAMS, WEBCAM_REGIONS, REFRESH_INTERVAL, MAX_LOG_ENTRIES, SEVERITY, AI_MODELS, AGENT_MODEL_MAP } from "./config";
import { AgentManager, verifyIntel } from "./api";
import ConflictMap from "./components/ConflictMap";
import AiChat from "./components/AiChat";
import PredictionMarkets from "./components/PredictionMarkets";
import InstabilityIndex from "./components/InstabilityIndex";
import NuclearMonitor from "./components/NuclearMonitor";

// ════════════════════════════════════════════════════════
// PALANTIR-STYLE UTILITY COMPONENTS
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
      padding: "2px 8px", borderRadius: 4, fontSize: "0.65rem",
      fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: 1,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── Floating Glass Panel ──
function GlassPanel({ children, style, title, icon, onClose, collapsible, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div style={{
      background: "rgba(8,12,18,0.88)", backdropFilter: "blur(20px) saturate(1.3)",
      border: "1px solid rgba(0,229,255,0.08)", borderRadius: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      ...style,
    }}>
      {title && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderBottom: "1px solid rgba(0,229,255,0.06)",
          background: "rgba(0,229,255,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {icon && <span style={{ fontSize: "0.85rem" }}>{icon}</span>}
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 2, color: "var(--accent)" }}>{title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {collapsible && (
              <button onClick={() => setCollapsed(!collapsed)} style={{
                fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", cursor: "pointer",
                transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s",
              }}>▼</button>
            )}
            {onClose && <button onClick={onClose} style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>}
          </div>
        </div>
      )}
      {!collapsed && <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</div>}
    </div>
  );
}

// ── Signal Card (compact) ──
function SignalCard({ item, onClick, selected }) {
  const sevColor = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : item.severity >= 3 ? "#FFD60A" : "#30D158";
  const agent = AGENTS.find((a) => a.id === item.agentId);
  return (
    <div onClick={() => onClick?.(item)} style={{
      padding: "10px 12px", cursor: "pointer", transition: "all 0.15s",
      borderLeft: `3px solid ${sevColor}`, borderBottom: "1px solid rgba(255,255,255,0.04)",
      background: selected ? "rgba(0,229,255,0.06)" : "transparent",
    }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {agent && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, color: agent.color }}>{agent.icon}</span>}
        <SeverityBadge level={item.severity} />
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{item.time}</span>
      </div>
      <div style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35, marginBottom: 3 }}>
        {item.headline}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {item.location && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--accent)" }}>📍 {item.location}</span>}
        {item.source && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{item.source}</span>}
      </div>
    </div>
  );
}

// ── Event Detail Panel ──
function EventDetail({ item, onClose, onVerify }) {
  if (!item) return null;
  const sevColor = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : item.severity >= 3 ? "#FFD60A" : "#30D158";
  const agent = AGENTS.find((a) => a.id === item.agentId);

  // Generate search URLs for the event
  const searchQuery = encodeURIComponent(item.headline);
  const xSearchUrl = `https://x.com/search?q=${searchQuery}&f=live`;
  const googleNewsUrl = `https://news.google.com/search?q=${searchQuery}&hl=en`;
  const reutersUrl = `https://www.reuters.com/search/news?query=${searchQuery}`;

  return (
    <GlassPanel title="EVENT DETAIL" icon="📋" onClose={onClose} style={{ maxHeight: "100%" }}>
      <div style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Severity bar */}
        <div style={{ height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${sevColor}, ${sevColor}33)` }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {agent && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: agent.color, padding: "2px 8px", background: `${agent.color}12`, borderRadius: 4 }}>
              {agent.icon} {agent.fullName || agent.name}
            </span>
          )}
          <SeverityBadge level={item.severity} />
        </div>

        {/* Headline */}
        <h3 style={{ fontFamily: "var(--sans)", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35, margin: 0 }}>
          {item.headline}
        </h3>

        {/* Summary */}
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {item.summary}
        </p>

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.location && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--accent)", padding: "3px 8px", background: "rgba(0,229,255,0.08)", borderRadius: 4 }}>
              📍 {item.location}
            </span>
          )}
          {item.source && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)", padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              📰 {item.source}
            </span>
          )}
          {item.time && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              🕐 {item.time}
            </span>
          )}
        </div>

        {/* Source links — REAL links to find the story */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 2, color: "var(--text-dim)", marginBottom: 8 }}>VIEW SOURCES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href={xSearchUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
              textDecoration: "none", transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <span style={{ fontSize: "1.1rem" }}>𝕏</span>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>X / Twitter Live</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Real-time OSINT posts & videos</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem" }}>↗</span>
            </a>
            <a href={googleNewsUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
              textDecoration: "none", transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <span style={{ fontSize: "1.1rem" }}>📰</span>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>Google News</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>All news agencies coverage</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem" }}>↗</span>
            </a>
            <a href={reutersUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
              textDecoration: "none", transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              <span style={{ fontSize: "1.1rem" }}>⚡</span>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>Reuters</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>Wire service reports</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem" }}>↗</span>
            </a>
          </div>
        </div>

        {/* Verification */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          {item.verification ? (
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <div style={{ color: item.verification.verified ? "#30D158" : "#FF3B30", fontWeight: 700, marginBottom: 4 }}>
                {item.verification.crossVerification?.consensus || (item.verification.verified ? "VERIFIED" : "UNVERIFIED")}
                {" "}— Confidence: {item.verification.confidence}%
              </div>
              {item.verification.corroborating_sources?.length > 0 && (
                <div>Sources: {item.verification.corroborating_sources.join(", ")}</div>
              )}
            </div>
          ) : (
            <button onClick={() => onVerify?.(item)} style={{
              width: "100%", padding: "8px 14px", borderRadius: 6,
              background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
              color: "var(--accent)", fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600,
              cursor: "pointer",
            }}>
              🔍 CROSS-VERIFY (3 AI MODELS)
            </button>
          )}
        </div>

        {item.aiModelName && (
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)", textAlign: "center" }}>Generated by {item.aiModelName}</div>
        )}
      </div>
    </GlassPanel>
  );
}

// ── Real RSS News Feed ──
function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/rss?feeds=aljazeera,bbc_me,times_israel,iran_intl,france24,guardian_world,war_zone&limit=40");
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
    } catch (err) {
      console.error("RSS fetch error:", err);
    }
    setLoading(false);
  };

  const filters = [
    { id: "all", label: "ALL" },
    { id: "bbc", label: "BBC" },
    { id: "aljazeera", label: "AJ" },
    { id: "times_israel", label: "TOI" },
    { id: "iran", label: "IRAN" },
    { id: "war", label: "DEF" },
  ];

  const filtered = filter === "all" ? articles : articles.filter(a => a.source?.toLowerCase().includes(filter));

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  const sourceColors = {
    aljazeera: "#D4A843", bbc_world: "#BB1919", bbc_me: "#BB1919",
    times_israel: "#1a73e8", iran_intl: "#e53935", france24: "#0055A4",
    guardian_world: "#052962", war_zone: "#FF6B35", dw_world: "#004B93",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "3px 8px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.6rem",
            fontWeight: filter === f.id ? 700 : 500, letterSpacing: 0.5, cursor: "pointer",
            background: filter === f.id ? "rgba(0,229,255,0.1)" : "transparent",
            color: filter === f.id ? "var(--accent)" : "var(--text-dim)",
            border: `1px solid ${filter === f.id ? "rgba(0,229,255,0.2)" : "transparent"}`,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Articles */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--accent)" }}>Loading feeds...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>No articles found</div>
        ) : (
          filtered.map((article, i) => {
            const srcColor = sourceColors[article.source] || "var(--text-muted)";
            return (
              <a key={i} href={article.link} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", gap: 10, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                textDecoration: "none", transition: "background 0.15s", cursor: "pointer",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Thumbnail */}
                {article.image && (
                  <div style={{ width: 80, height: 56, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)" }}>
                    <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { e.target.parentElement.style.display = "none"; }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {article.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, color: srcColor }}>{article.source?.replace(/_/g, " ").toUpperCase()}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{formatTime(article.pubDate)}</span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Webcam Panel (using SkylineWebcams & direct links) ──
function WebcamPanel() {
  const [activeRegion, setActiveRegion] = useState("all");
  const [activeEmbed, setActiveEmbed] = useState(null);

  const regions = [
    { id: "all", label: "ALL" },
    { id: "israel", label: "🇮🇱 ISR" },
    { id: "iran", label: "🇮🇷 IRN" },
    { id: "gulf", label: "🏜️ GULF" },
    { id: "levant", label: "🌍 LEV" },
  ];

  const filtered = activeRegion === "all" ? LIVE_WEBCAMS : LIVE_WEBCAMS.filter(w => w.region === activeRegion);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Active embed */}
      {activeEmbed && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000" }}>
            <iframe
              src={activeEmbed.url}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={activeEmbed.name}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "rgba(0,0,0,0.5)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)" }}>
              <PulsingDot color="#FF3B30" size={5} /> {activeEmbed.name}
            </span>
            <button onClick={() => setActiveEmbed(null)} style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      {/* Region filter */}
      <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        {regions.map(r => (
          <button key={r.id} onClick={() => setActiveRegion(r.id)} style={{
            padding: "3px 8px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.6rem",
            fontWeight: activeRegion === r.id ? 700 : 500, cursor: "pointer",
            background: activeRegion === r.id ? "rgba(0,229,255,0.1)" : "transparent",
            color: activeRegion === r.id ? "var(--accent)" : "var(--text-dim)",
            border: `1px solid ${activeRegion === r.id ? "rgba(0,229,255,0.2)" : "transparent"}`,
          }}>{r.label}</button>
        ))}
      </div>

      {/* Webcam list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {filtered.map((city) => (
          <div key={`${city.city}-${city.country}`} style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{city.flag}</span> {city.city}, {city.country}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {city.cameras.map((cam) => {
                const hasEmbed = !!cam.embed;
                return (
                  <div key={cam.name} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    background: "rgba(255,255,255,0.02)", borderRadius: 5, border: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                    onClick={() => {
                      if (hasEmbed) setActiveEmbed({ url: cam.embed, name: `${city.flag} ${cam.name}` });
                      else window.open(cam.url, "_blank");
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)"; e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  >
                    <PulsingDot color={hasEmbed ? "#FF3B30" : "#FFB020"} size={5} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)" }}>{cam.name}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{cam.source} · {hasEmbed ? "EMBED" : "LINK"}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: hasEmbed ? "var(--accent)" : "var(--text-dim)" }}>{hasEmbed ? "▶" : "↗"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alert Ticker ──
function AlertTicker({ items = [] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", background: "rgba(255,59,48,0.03)", borderBottom: "1px solid rgba(255,59,48,0.08)", height: 32, display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", flexShrink: 0 }}>
        <PulsingDot color="#FF3B30" size={6} />
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: "#FF3B30", letterSpacing: 2, flexShrink: 0 }}>ALERT</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", whiteSpace: "nowrap", animation: `tickerScroll ${Math.max(doubled.length * 5, 25)}s linear infinite` }}>
          {doubled.map((item, i) => {
            const c = item.severity >= 5 ? "#FF3B30" : item.severity >= 4 ? "#FFB020" : "#FFD60A";
            return (
              <span key={i} style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", marginRight: 36 }}>
                <span style={{ color: c, fontWeight: 700, marginRight: 5 }}>●</span>
                {item.text}
                {item.time && <span style={{ color: "var(--text-dim)", marginLeft: 5, fontSize: "0.65rem" }}>{item.time}</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── API Key Modal ──
function ApiKeyModal({ onSave, onClose }) {
  const [key, setKey] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "rgba(8,12,18,0.95)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 12, padding: 32, maxWidth: 460, width: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>API KEY</div>
        <p style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
          OpenRouter API key activates AI agents. Free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>openrouter.ai/keys</a>
        </p>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-or-v1-..."
          onKeyDown={(e) => { if (e.key === "Enter" && key.trim()) onSave(key.trim()); }}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)", fontFamily: "var(--mono)", fontSize: "0.85rem", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { if (key.trim()) onSave(key.trim()); }} style={{ flex: 1, padding: "10px 0", borderRadius: 6, background: "var(--accent)", color: "#0B0F14", fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700 }}>ACTIVATE</button>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)", fontFamily: "var(--mono)", fontSize: "0.85rem" }}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN DASHBOARD — Palantir-Style Full-Screen Map Layout
// ════════════════════════════════════════════════════════

export default function LiveIntelDashboard() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("intel_api_key") || "");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatus, setAgentStatus] = useState({});
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activePanel, setActivePanel] = useState("signals"); // signals, news, cams, chat, markets, cii, nuclear, analysis
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const managerRef = useRef(null);

  const allItems = useMemo(() => {
    return Object.values(intel).flat().sort((a, b) => (b.severity || 0) - (a.severity || 0));
  }, [intel]);

  const criticalCount = useMemo(() => allItems.filter((i) => i.severity >= 4).length, [allItems]);

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

  const handleSaveKey = (key) => { localStorage.setItem("intel_api_key", key); setApiKey(key); setShowKeyModal(false); };
  const handleVerify = async (item) => {
    if (!apiKey) return;
    const result = await verifyIntel(apiKey, item);
    if (result) {
      setIntel((prev) => {
        const updated = { ...prev };
        for (const k in updated) {
          updated[k] = updated[k].map((i) => i.headline === item.headline ? { ...i, verification: result } : i);
        }
        return updated;
      });
    }
  };

  const handleRefresh = () => managerRef.current?.manualRefresh();

  // Panel navigation
  const panels = [
    { id: "signals", icon: "📡", label: "SIGNALS", count: allItems.length },
    { id: "news", icon: "📰", label: "NEWS" },
    { id: "cams", icon: "📹", label: "CAMS" },
    { id: "chat", icon: "💬", label: "AI" },
    { id: "analysis", icon: "🧠", label: "THREAT" },
    { id: "markets", icon: "📈", label: "MARKETS" },
    { id: "cii", icon: "🌍", label: "CII" },
    { id: "nuclear", icon: "☢️", label: "NUCLEAR" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#060A0F" }}>

      {/* ════ TOP BAR ════ */}
      <header style={{
        height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "rgba(8,12,18,0.95)", borderBottom: "1px solid rgba(0,229,255,0.06)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            fontFamily: "var(--mono)", fontSize: "1rem", color: "var(--text-muted)", cursor: "pointer", padding: "2px 6px",
          }}>☰</button>
          <PulsingDot color={running ? "#30D158" : "#FF3B30"} size={8} />
          <span style={{ fontFamily: "var(--display)", fontSize: "1.1rem", fontWeight: 800, letterSpacing: 1 }}>
            <span style={{ color: "var(--accent)" }}>INTEL</span><span style={{ color: "var(--text-primary)" }}>LIVE</span>
          </span>
          {/* Agent dots */}
          <div style={{ display: "flex", gap: 3, marginLeft: 8 }}>
            {AGENTS.map((agent) => {
              const st = agentStatus[agent.id];
              const color = st?.status === "done" ? "#30D158" : st?.status === "running" ? "#FFB020" : st?.status === "error" ? "#FF3B30" : "rgba(255,255,255,0.1)";
              return <div key={agent.id} title={`${agent.name}: ${st?.status || "idle"}`} style={{ width: 6, height: 6, borderRadius: "50%", background: color, transition: "background 0.3s" }} />;
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {criticalCount > 0 && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: "#FF3B30", padding: "2px 8px", background: "rgba(255,59,48,0.08)", borderRadius: 4, animation: "alertFlash 2s ease infinite" }}>
              ⚠ {criticalCount}
            </span>
          )}
          {lastUpdate && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>
              {lastUpdate.toLocaleTimeString("ro-RO")}
            </span>
          )}
          <button onClick={handleRefresh} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--accent)", padding: "3px 8px", background: "rgba(0,229,255,0.06)", borderRadius: 4, border: "1px solid rgba(0,229,255,0.12)", cursor: "pointer" }}>↻</button>
          <button onClick={() => setShowKeyModal(true)} style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)", padding: "3px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>🔑</button>
        </div>
      </header>

      {/* ════ ALERT TICKER ════ */}
      <AlertTicker items={breaking} />

      {/* ════ MAIN CONTENT: MAP + SIDEBAR ════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ─── SIDEBAR: Panel Navigation + Content ─── */}
        {sidebarOpen && (
          <div style={{
            width: 420, flexShrink: 0, display: "flex", background: "rgba(8,12,18,0.92)",
            borderRight: "1px solid rgba(0,229,255,0.06)", backdropFilter: "blur(12px)",
            zIndex: 10,
          }}>
            {/* Icon nav */}
            <div style={{
              width: 48, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2,
              padding: "6px 0", borderRight: "1px solid rgba(255,255,255,0.04)",
              background: "rgba(0,0,0,0.3)", alignItems: "center",
            }}>
              {panels.map((p) => (
                <button key={p.id} onClick={() => setActivePanel(p.id)} title={p.label} style={{
                  width: 36, height: 36, borderRadius: 8, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
                  background: activePanel === p.id ? "rgba(0,229,255,0.1)" : "transparent",
                  border: activePanel === p.id ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: "0.9rem" }}>{p.icon}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 0.5, color: activePanel === p.id ? "var(--accent)" : "var(--text-dim)" }}>{p.label}</span>
                  {p.count > 0 && activePanel !== p.id && (
                    <span style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />
                  )}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: 2, color: "var(--accent)" }}>
                  {panels.find(p => p.id === activePanel)?.icon} {panels.find(p => p.id === activePanel)?.label}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

                {/* SIGNALS */}
                {activePanel === "signals" && (
                  allItems.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                      {!apiKey ? (
                        <>
                          <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔑</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>API Key Required</div>
                          <p style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14 }}>Connect OpenRouter API key to activate agents.</p>
                          <button onClick={() => setShowKeyModal(true)} style={{ padding: "8px 20px", borderRadius: 6, background: "var(--accent)", color: "#0B0F14", fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700 }}>CONFIGURE</button>
                        </>
                      ) : (
                        <>
                          <div style={{ width: 20, height: 20, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                          <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--accent)" }}>SCANNING...</div>
                        </>
                      )}
                    </div>
                  ) : (
                    allItems.map((item, i) => (
                      <SignalCard key={`${item.headline}-${i}`} item={item} onClick={setSelectedEvent} selected={selectedEvent?.headline === item.headline} />
                    ))
                  )
                )}

                {/* NEWS (real RSS) */}
                {activePanel === "news" && <NewsFeed />}

                {/* WEBCAMS */}
                {activePanel === "cams" && <WebcamPanel />}

                {/* AI CHAT */}
                {activePanel === "chat" && <AiChat apiKey={apiKey} allItems={allItems} analysis={analysis} />}

                {/* ANALYSIS */}
                {activePanel === "analysis" && (
                  <div style={{ padding: 12 }}>
                    {analysis ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "2.2rem", fontWeight: 800, color: analysis.threat_level >= 7 ? "#FF3B30" : analysis.threat_level >= 5 ? "#FFB020" : "#FFD60A" }}>
                            {analysis.threat_level}
                          </span>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.9rem", fontWeight: 700, color: analysis.threat_level >= 7 ? "#FF3B30" : "#FFB020" }}>{analysis.threat_label}</div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                              Escalation: <span style={{ color: "#FFB020", fontWeight: 700 }}>{analysis.escalation_probability}%</span>
                              {" "}· Nuclear: <span style={{ color: "#FF3B30", fontWeight: 700 }}>{analysis.nuclear_risk}%</span>
                            </div>
                          </div>
                        </div>
                        {analysis.situation_summary && (
                          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--accent)", marginBottom: 6 }}>SUMMARY</div>
                            <p style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{analysis.situation_summary}</p>
                          </div>
                        )}
                        {analysis.key_risks?.length > 0 && (
                          <div style={{ padding: "10px 12px", background: "rgba(255,59,48,0.03)", borderRadius: 6, border: "1px solid rgba(255,59,48,0.08)" }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "#FF3B30", marginBottom: 6 }}>KEY RISKS</div>
                            {analysis.key_risks.map((r, i) => (
                              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                <span style={{ color: "#FF3B30", fontWeight: 700, flexShrink: 0 }}>•</span> {r}
                              </div>
                            ))}
                          </div>
                        )}
                        {analysis.breaking_alerts?.length > 0 && (
                          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--accent)", marginBottom: 6 }}>BREAKING</div>
                            {analysis.breaking_alerts.map((a, i) => (
                              <div key={i} style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4, lineHeight: 1.4 }}>⚡ {a}</div>
                            ))}
                          </div>
                        )}
                        {[
                          { key: "next_hours_prediction", label: "NEXT HOURS" },
                          { key: "next_days_prediction", label: "NEXT DAYS" },
                          { key: "diplomatic_status", label: "DIPLOMATIC" },
                          { key: "proxy_status", label: "PROXY FORCES" },
                        ].map(({ key, label }) => analysis[key] && (
                          <div key={key} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-dim)", marginBottom: 4 }}>{label}</div>
                            <p style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{analysis[key]}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: 30, fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>Waiting for first cycle...</div>
                    )}
                  </div>
                )}

                {/* MARKETS */}
                {activePanel === "markets" && <PredictionMarkets />}

                {/* CII */}
                {activePanel === "cii" && <InstabilityIndex />}

                {/* NUCLEAR */}
                {activePanel === "nuclear" && <NuclearMonitor />}
              </div>
            </div>
          </div>
        )}

        {/* ─── MAP (fills remaining space) ─── */}
        <div style={{ flex: 1, position: "relative" }}>
          <ConflictMap intelItems={allItems} analysis={analysis} />

          {/* Event detail overlay (right side of map) */}
          {selectedEvent && (
            <div style={{ position: "absolute", top: 10, right: 10, bottom: 10, width: 380, zIndex: 1000 }}>
              <EventDetail item={selectedEvent} onClose={() => setSelectedEvent(null)} onVerify={handleVerify} />
            </div>
          )}

          {/* Threat overlay (bottom-left of map) */}
          {analysis && !selectedEvent && (
            <div style={{
              position: "absolute", bottom: 14, left: 14, zIndex: 1000,
              background: "rgba(8,12,18,0.92)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(0,229,255,0.08)", borderRadius: 8,
              padding: "10px 14px", minWidth: 140,
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "var(--text-dim)", marginBottom: 3 }}>THREAT</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "1.6rem", fontWeight: 800, color: analysis.threat_level >= 8 ? "#FF3B30" : analysis.threat_level >= 6 ? "#FFB020" : "#FFD60A" }}>
                  {analysis.threat_level}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>/10</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ BOTTOM BAR ════ */}
      <div style={{
        height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "rgba(8,12,18,0.95)", borderTop: "1px solid rgba(0,229,255,0.04)",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>
          {allItems.length} signals · {AI_MODELS.length} models · {OSINT_SOURCES.length} sources
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "rgba(0,229,255,0.4)" }}>INTEL LIVE v5.0 · PALANTIR</span>
      </div>

      {showKeyModal && <ApiKeyModal onSave={handleSaveKey} onClose={() => setShowKeyModal(false)} />}
    </div>
  );
}
