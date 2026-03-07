import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AGENTS,
  LIVE_WEBCAMS,
  WEBCAM_REGIONS,
  REFRESH_INTERVAL,
  AI_MODELS,
} from "./config";
import { AgentManager, verifyIntel, fetchBreakingNews } from "./api";
import Globe3D from "./components/Globe3D";

// ════════════════════════════════════════════════════════════════
// INTEL LIVE v7 — SpaceX + Google Antigravity Design
// Full-screen 3D globe, floating glass panels, zero-gravity feel
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
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.color,
        boxShadow: `0 0 ${size}px ${c.color}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function SeverityBadge({ level }) {
  const c = SEV_CFG[level] || SEV_CFG[3];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: "0.6rem",
        fontFamily: "var(--mono)",
        fontWeight: 700,
        letterSpacing: 1.5,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.color}25`,
      }}
    >
      <SeverityDot level={level} size={4} />
      {c.label}
    </span>
  );
}

// ── Top Navigation Bar (SpaceX-style minimal) ──
function TopBar({ status, cycle, totalItems, modelsActive, onRefresh }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background:
          "linear-gradient(180deg, rgba(6,10,15,0.95) 0%, rgba(6,10,15,0.7) 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: status === "running" ? "#30D158" : "#FF3B30",
            boxShadow:
              status === "running"
                ? "0 0 12px #30D158"
                : "0 0 12px #FF3B30",
            animation: status === "running" ? "pulse 2s ease infinite" : "none",
          }}
        />
        <span
          style={{
            fontFamily: "var(--display)",
            fontSize: "0.95rem",
            fontWeight: 700,
            letterSpacing: 4,
            color: "#fff",
          }}
        >
          INTEL LIVE
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "0.55rem",
            color: "var(--text-dim)",
            letterSpacing: 2,
          }}
        >
          v7.0
        </span>
      </div>

      {/* Center: Stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontFamily: "var(--mono)",
          fontSize: "0.65rem",
          color: "var(--text-secondary)",
          letterSpacing: 1,
        }}
      >
        <span>
          <span style={{ color: "var(--accent)" }}>{totalItems}</span> SIGNALS
        </span>
        <span>
          <span style={{ color: "var(--accent)" }}>{modelsActive}</span> AI
          MODELS
        </span>
        <span>
          CYCLE <span style={{ color: "var(--accent)" }}>#{cycle}</span>
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          {time.toLocaleTimeString("en-GB", { hour12: false })} UTC
          {time.getTimezoneOffset() === 0 ? "" : time.getTimezoneOffset() / -60}
        </span>
      </div>

      {/* Right: Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onRefresh}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "0.65rem",
            letterSpacing: 2,
            color: "var(--accent)",
            padding: "4px 14px",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 4,
            transition: "all 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
          }}
        >
          REFRESH
        </button>
      </div>
    </div>
  );
}

// ── Breaking News Ticker (bottom) ──
function BreakingTicker({ items = [] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        zIndex: 1000,
        background:
          "linear-gradient(0deg, rgba(6,10,15,0.95) 0%, rgba(6,10,15,0.7) 100%)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,59,48,0.15)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0 12px",
          fontFamily: "var(--mono)",
          fontSize: "0.6rem",
          fontWeight: 700,
          color: "#FF3B30",
          letterSpacing: 2,
          flexShrink: 0,
          animation: "alertFlash 2s ease infinite",
        }}
      >
        BREAKING
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            display: "flex",
            animation: `tickerScroll ${items.length * 8}s linear infinite`,
            whiteSpace: "nowrap",
          }}
        >
          {doubled.map((item, i) => (
            <span
              key={i}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                color: "var(--text-primary)",
                marginRight: 48,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <SeverityDot level={item.severity || 3} size={4} />
              {item.text}
              <span
                style={{
                  color: "var(--text-dim)",
                  fontSize: "0.6rem",
                }}
              >
                {item.time}
              </span>
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
  const agent = AGENTS.find((a) => a.id === item.agentId);

  return (
    <div
      onClick={() => onClick?.(item)}
      style={{
        padding: "10px 14px",
        cursor: "pointer",
        borderLeft: `2px solid ${sev.color}`,
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        background: isSelected ? "rgba(0,229,255,0.06)" : "transparent",
        transition: "all 0.15s ease",
        animation: "fadeInUp 0.3s ease",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {agent && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              fontWeight: 700,
              color: agent.color,
              letterSpacing: 1,
            }}
          >
            {agent.icon} {agent.name}
          </span>
        )}
        <SeverityBadge level={item.severity} />
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--mono)",
            fontSize: "0.55rem",
            color: "var(--text-dim)",
          }}
        >
          {item.time}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--sans)",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.35,
          marginBottom: 3,
        }}
      >
        {item.headline}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {item.source && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              color: "var(--text-muted)",
            }}
          >
            {item.source}
          </span>
        )}
        {item.location && (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              color: "var(--accent)",
              opacity: 0.6,
            }}
          >
            {item.location}
          </span>
        )}
        {item.aiModelName && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--mono)",
              fontSize: "0.5rem",
              color: "var(--text-dim)",
            }}
          >
            {item.aiModelName}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Event Detail Overlay ──
function EventDetail({ item, onClose, onVerify, verification }) {
  if (!item) return null;
  const sev = SEV_CFG[item.severity] || SEV_CFG[3];
  const agent = AGENTS.find((a) => a.id === item.agentId);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(6,10,15,0.95)",
        backdropFilter: "blur(16px)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.2s ease",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${sev.color}20`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <SeverityBadge level={item.severity} />
            {agent && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.6rem",
                  color: agent.color,
                }}
              >
                {agent.icon} {agent.fullName}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
            }}
          >
            {item.headline}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "1rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {item.summary}
        </p>

        {/* Meta grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { label: "SOURCE", value: item.source },
            { label: "TIME", value: item.time },
            { label: "LOCATION", value: item.location },
            { label: "AI MODEL", value: item.aiModelName },
          ].map(
            (m) =>
              m.value && (
                <div
                  key={m.label}
                  style={{
                    padding: "8px 10px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.5rem",
                      color: "var(--text-dim)",
                      letterSpacing: 2,
                      marginBottom: 2,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "0.72rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              )
          )}
        </div>

        {/* Verify button */}
        {!verification && (
          <button
            onClick={() => onVerify?.(item)}
            style={{
              width: "100%",
              padding: "10px",
              fontFamily: "var(--mono)",
              fontSize: "0.7rem",
              letterSpacing: 2,
              color: "var(--accent)",
              border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: 6,
              background: "rgba(0,229,255,0.04)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,229,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,229,255,0.04)";
            }}
          >
            CROSS-VERIFY WITH {AI_MODELS.length} AI MODELS
          </button>
        )}

        {/* Verification results */}
        {verification && (
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: `1px solid ${verification.verified ? "#30D15830" : "#FF3B3030"}`,
              background: verification.verified
                ? "rgba(48,209,88,0.04)"
                : "rgba(255,59,48,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: verification.verified ? "#30D158" : "#FF3B30",
                }}
              >
                {verification.crossVerification?.consensus || "VERIFICAT"}
              </span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.6rem",
                  color: "var(--text-muted)",
                }}
              >
                Confidence: {verification.confidence}%
              </span>
            </div>
            {verification.corroborating_sources?.length > 0 && (
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.6rem",
                  color: "var(--text-secondary)",
                }}
              >
                Sources: {verification.corroborating_sources.join(", ")}
              </div>
            )}
            {verification.crossVerification && (
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--mono)",
                  fontSize: "0.55rem",
                  color: "var(--text-dim)",
                }}
              >
                {verification.crossVerification.modelsConfirmed}/
                {verification.crossVerification.modelsResponded} models
                confirmed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Webcam Panel (opens in new tab - embeds are blocked) ──
function WebcamPanel() {
  const [region, setRegion] = useState("all");
  const filtered = useMemo(() => {
    if (region === "all") return LIVE_WEBCAMS;
    return LIVE_WEBCAMS.filter((w) => w.region === region);
  }, [region]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Region filters */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          flexWrap: "wrap",
        }}
      >
        {WEBCAM_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.id)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              letterSpacing: 1,
              padding: "3px 8px",
              borderRadius: 3,
              color: region === r.id ? "#fff" : "var(--text-muted)",
              background:
                region === r.id
                  ? "rgba(0,229,255,0.15)"
                  : "rgba(255,255,255,0.02)",
              border: `1px solid ${region === r.id ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.04)"}`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {r.flag} {r.label}
          </button>
        ))}
      </div>

      {/* Webcam list */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {filtered.map((loc, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <div
              style={{
                padding: "6px 12px",
                fontFamily: "var(--mono)",
                fontSize: "0.6rem",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{loc.flag}</span>
              {loc.city}, {loc.country}
            </div>
            {loc.cameras.map((cam, j) => (
              <a
                key={j}
                href={cam.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px 6px 28px",
                  textDecoration: "none",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--mono)",
                  fontSize: "0.65rem",
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#30D158",
                    boxShadow: "0 0 6px #30D158",
                    flexShrink: 0,
                    animation: "pulse 3s ease infinite",
                  }}
                />
                <span style={{ flex: 1 }}>{cam.name}</span>
                <span
                  style={{
                    fontSize: "0.5rem",
                    color: "var(--text-dim)",
                  }}
                >
                  {cam.source}
                </span>
                <span style={{ fontSize: "0.6rem", opacity: 0.3 }}>&#8599;</span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Radar / Tracking Links Panel ──
function RadarPanel() {
  const links = [
    {
      name: "FlightRadar24",
      url: "https://www.flightradar24.com/32.08,48.5/6",
      desc: "Live aircraft tracking",
      icon: "&#9992;",
    },
    {
      name: "ADS-B Exchange",
      url: "https://globe.adsbexchange.com/?lat=32&lon=48&zoom=6",
      desc: "Unfiltered military flights",
      icon: "&#128752;",
    },
    {
      name: "MarineTraffic",
      url: "https://www.marinetraffic.com/en/ais/home/centerx:52/centery:26/zoom:6",
      desc: "Vessel tracking — Persian Gulf",
      icon: "&#9875;",
    },
    {
      name: "VesselFinder",
      url: "https://www.vesselfinder.com/?rlat=26.5&rlon=52&zoom=7",
      desc: "Ship positions & routes",
      icon: "&#128674;",
    },
    {
      name: "NASA FIRMS",
      url: "https://firms.modaps.eosdis.nasa.gov/map/#t:adv;d:24hrs;l:noaa21-viirs-c2,noaa20-viirs-c2,modis-c6.1,viirs-snpp-nrt-c2;@48,32,6",
      desc: "Fire & thermal anomalies",
      icon: "&#128293;",
    },
    {
      name: "Sentinel Hub",
      url: "https://apps.sentinel-hub.com/eo-browser/?zoom=7&lat=32&lng=48",
      desc: "Satellite imagery",
      icon: "&#128752;",
    },
    {
      name: "Liveuamap",
      url: "https://liveuamap.com/en/2026/7-march-middle-east",
      desc: "Live conflict map",
      icon: "&#127758;",
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            textDecoration: "none",
            color: "var(--text-secondary)",
            borderBottom: "1px solid rgba(255,255,255,0.02)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.04)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <span
            style={{ fontSize: "1rem" }}
            dangerouslySetInnerHTML={{ __html: link.icon }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                fontWeight: 600,
              }}
            >
              {link.name}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.55rem",
                color: "var(--text-dim)",
              }}
            >
              {link.desc}
            </div>
          </div>
          <span style={{ fontSize: "0.6rem", opacity: 0.3 }}>&#8599;</span>
        </a>
      ))}
    </div>
  );
}

// ── Agent Status Bar ──
function AgentStatusBar({ agentStatuses }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 12px",
        flexWrap: "wrap",
      }}
    >
      {AGENTS.map((agent) => {
        const st = agentStatuses[agent.id];
        const isRunning = st?.status === "running";
        const isDone = st?.status === "done";
        const isError = st?.status === "error";
        return (
          <div
            key={agent.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 3,
              background: isRunning
                ? "rgba(0,229,255,0.06)"
                : isDone
                  ? "rgba(48,209,88,0.06)"
                  : isError
                    ? "rgba(255,59,48,0.06)"
                    : "rgba(255,255,255,0.02)",
              border: `1px solid ${isRunning ? "rgba(0,229,255,0.15)" : isDone ? "rgba(48,209,88,0.1)" : isError ? "rgba(255,59,48,0.1)" : "rgba(255,255,255,0.03)"}`,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: isRunning
                  ? "var(--accent)"
                  : isDone
                    ? "#30D158"
                    : isError
                      ? "#FF3B30"
                      : "var(--text-dim)",
                animation: isRunning ? "pulse 1s ease infinite" : "none",
              }}
            />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.55rem",
                fontWeight: 600,
                color: isRunning
                  ? "var(--accent)"
                  : isDone
                    ? "#30D158"
                    : isError
                      ? "#FF3B30"
                      : "var(--text-dim)",
                letterSpacing: 1,
              }}
            >
              {agent.name}
            </span>
            {isDone && st.count != null && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.5rem",
                  color: "var(--text-dim)",
                }}
              >
                {st.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Analysis Summary Panel ──
function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  return (
    <div style={{ padding: "12px 14px" }}>
      {/* Threat level */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--display)",
            fontSize: "1.3rem",
            fontWeight: 800,
            color:
              analysis.threat_level >= 7
                ? "#FF3B30"
                : analysis.threat_level >= 4
                  ? "#FFB020"
                  : "#30D158",
            border: `2px solid ${analysis.threat_level >= 7 ? "#FF3B3040" : analysis.threat_level >= 4 ? "#FFB02040" : "#30D15840"}`,
            background:
              analysis.threat_level >= 7
                ? "rgba(255,59,48,0.08)"
                : analysis.threat_level >= 4
                  ? "rgba(255,176,32,0.08)"
                  : "rgba(48,209,88,0.08)",
          }}
        >
          {analysis.threat_level}
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: 2,
              color:
                analysis.threat_level >= 7
                  ? "#FF3B30"
                  : analysis.threat_level >= 4
                    ? "#FFB020"
                    : "#30D158",
            }}
          >
            {analysis.threat_label}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              color: "var(--text-dim)",
            }}
          >
            Escalation: {analysis.escalation_probability}% | Nuclear:{" "}
            {analysis.nuclear_risk}%
          </div>
        </div>
      </div>

      {/* Summary */}
      <p
        style={{
          fontFamily: "var(--sans)",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: 12,
        }}
      >
        {analysis.situation_summary}
      </p>

      {/* Breaking alerts */}
      {analysis.breaking_alerts?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {analysis.breaking_alerts.map((alert, i) => (
            <div
              key={i}
              style={{
                padding: "6px 10px",
                marginBottom: 4,
                borderRadius: 4,
                background: "rgba(255,59,48,0.04)",
                borderLeft: "2px solid #FF3B30",
                fontFamily: "var(--mono)",
                fontSize: "0.65rem",
                color: "var(--text-primary)",
              }}
            >
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Key risks */}
      {analysis.key_risks?.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              color: "var(--text-dim)",
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            KEY RISKS
          </div>
          {analysis.key_risks.map((risk, i) => (
            <div
              key={i}
              style={{
                padding: "4px 0",
                fontFamily: "var(--sans)",
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                display: "flex",
                gap: 6,
              }}
            >
              <span style={{ color: "#FFB020", flexShrink: 0 }}>&#9679;</span>
              {risk}
            </div>
          ))}
        </div>
      )}

      {/* Prediction */}
      {analysis.next_hours_prediction && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.55rem",
              color: "var(--text-dim)",
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            PREDICTION
          </div>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            {analysis.next_hours_prediction}
          </p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function LiveIntelDashboard() {
  // ── State ──
  const [intel, setIntel] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [breaking, setBreaking] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [cycle, setCycle] = useState(0);
  const [modelsUsed, setModelsUsed] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [verifications, setVerifications] = useState({});
  const [leftTab, setLeftTab] = useState("signals"); // signals | analysis
  const [rightTab, setRightTab] = useState("webcams"); // webcams | radar
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const managerRef = useRef(null);

  // ── All intel items flattened and sorted ──
  const allItems = useMemo(() => {
    return Object.values(intel)
      .flat()
      .sort((a, b) => (b.severity || 0) - (a.severity || 0));
  }, [intel]);

  const totalItems = allItems.length;

  // ── Start agent manager on mount ──
  useEffect(() => {
    const manager = new AgentManager(
      "server-side",
      (data) => {
        setIntel(data.intel || {});
        setAnalysis(data.analysis);
        setBreaking(data.breaking || []);
        setCycle(data.cycle || 0);
        setModelsUsed(data.modelsUsed || []);
      },
      (progress) => {
        setAgentStatuses((prev) => ({
          ...prev,
          [progress.agentId]: progress,
        }));
      },
      () => {} // log callback - silent
    );
    managerRef.current = manager;
    manager.start(REFRESH_INTERVAL);
    return () => manager.stop();
  }, []);

  // ── Verify handler ──
  const handleVerify = useCallback(
    async (item) => {
      const key = `${item.agentId}-${item.headline}`;
      setVerifications((prev) => ({ ...prev, [key]: { loading: true } }));
      try {
        const result = await verifyIntel("server-side", item);
        setVerifications((prev) => ({ ...prev, [key]: result }));
      } catch {
        setVerifications((prev) => ({
          ...prev,
          [key]: { error: true },
        }));
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    managerRef.current?.manualRefresh();
  }, []);

  const selectedKey = selectedEvent
    ? `${selectedEvent.agentId}-${selectedEvent.headline}`
    : null;

  const isScanning = Object.values(agentStatuses).some(
    (s) => s.status === "running"
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "#060A0F",
      }}
    >
      {/* ── Top Bar ── */}
      <TopBar
        status={isScanning ? "running" : "idle"}
        cycle={cycle}
        totalItems={totalItems}
        modelsActive={modelsUsed.length || AI_MODELS.length}
        onRefresh={handleRefresh}
      />

      {/* ── 3D Globe (full background) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >
        <Globe3D
          intelItems={allItems}
          onSelectEvent={(item) => setSelectedEvent(item)}
          selectedEvent={selectedEvent}
        />
      </div>

      {/* ── Left Panel: Intel Feed ── */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          bottom: 32,
          width: leftOpen ? 460 : 40,
          zIndex: 100,
          display: "flex",
          transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          style={{
            position: "absolute",
            top: 8,
            right: leftOpen ? -20 : 4,
            width: 20,
            height: 40,
            zIndex: 10,
            background: "rgba(6,10,15,0.9)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: leftOpen ? "0 4px 4px 0" : 4,
            color: "var(--text-dim)",
            fontFamily: "var(--mono)",
            fontSize: "0.7rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {leftOpen ? "\u25C0" : "\u25B6"}
        </button>

        {leftOpen && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, rgba(6,10,15,0.92) 0%, rgba(6,10,15,0.85) 80%, rgba(6,10,15,0.0) 100%)",
              backdropFilter: "blur(16px)",
              borderRight: "1px solid rgba(255,255,255,0.03)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInLeft 0.3s ease",
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {[
                { id: "signals", label: "SIGNALS", count: totalItems },
                { id: "analysis", label: "ANALYSIS" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    fontFamily: "var(--mono)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: 2,
                    color:
                      leftTab === tab.id
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    borderBottom:
                      leftTab === tab.id
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: "0.55rem",
                        color:
                          leftTab === tab.id
                            ? "var(--accent)"
                            : "var(--text-dim)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Agent status bar */}
            <AgentStatusBar agentStatuses={agentStatuses} />

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {leftTab === "signals" && (
                <div
                  style={{
                    height: "100%",
                    overflow: "auto",
                    position: "relative",
                  }}
                >
                  {allItems.length === 0 && (
                    <div
                      style={{
                        padding: 32,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          border: "2px solid var(--accent)",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                          margin: "0 auto 12px",
                        }}
                      />
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "0.7rem",
                          color: "var(--text-dim)",
                          letterSpacing: 2,
                        }}
                      >
                        SCANNING SOURCES...
                      </div>
                    </div>
                  )}
                  {allItems.map((item, i) => (
                    <SignalCard
                      key={`${item.agentId}-${i}`}
                      item={item}
                      onClick={setSelectedEvent}
                      isSelected={
                        selectedEvent?.headline === item.headline &&
                        selectedEvent?.agentId === item.agentId
                      }
                    />
                  ))}

                  {/* Event detail overlay */}
                  {selectedEvent && (
                    <EventDetail
                      item={selectedEvent}
                      onClose={() => setSelectedEvent(null)}
                      onVerify={handleVerify}
                      verification={
                        selectedKey ? verifications[selectedKey] : null
                      }
                    />
                  )}
                </div>
              )}

              {leftTab === "analysis" && (
                <div style={{ height: "100%", overflow: "auto" }}>
                  {analysis ? (
                    <AnalysisPanel analysis={analysis} />
                  ) : (
                    <div
                      style={{
                        padding: 32,
                        textAlign: "center",
                        fontFamily: "var(--mono)",
                        fontSize: "0.7rem",
                        color: "var(--text-dim)",
                        letterSpacing: 2,
                      }}
                    >
                      {totalItems > 0
                        ? "ANALYZING..."
                        : "WAITING FOR DATA..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Webcams + Radar ── */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 0,
          bottom: 32,
          width: rightOpen ? 320 : 40,
          zIndex: 100,
          display: "flex",
          transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setRightOpen(!rightOpen)}
          style={{
            position: "absolute",
            top: 8,
            left: rightOpen ? -20 : 4,
            width: 20,
            height: 40,
            zIndex: 10,
            background: "rgba(6,10,15,0.9)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: rightOpen ? "4px 0 0 4px" : 4,
            color: "var(--text-dim)",
            fontFamily: "var(--mono)",
            fontSize: "0.7rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {rightOpen ? "\u25B6" : "\u25C0"}
        </button>

        {rightOpen && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(270deg, rgba(6,10,15,0.92) 0%, rgba(6,10,15,0.85) 80%, rgba(6,10,15,0.0) 100%)",
              backdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(255,255,255,0.03)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.3s ease",
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {[
                { id: "webcams", label: "WEBCAMS" },
                { id: "radar", label: "RADAR" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    fontFamily: "var(--mono)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: 2,
                    color:
                      rightTab === tab.id
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    borderBottom:
                      rightTab === tab.id
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {rightTab === "webcams" && <WebcamPanel />}
              {rightTab === "radar" && <RadarPanel />}
            </div>
          </div>
        )}
      </div>

      {/* ── Breaking News Ticker ── */}
      <BreakingTicker items={breaking} />
    </div>
  );
}
