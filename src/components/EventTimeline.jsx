import { useState, useMemo } from "react";

function SeverityDot({ level }) {
  const color = level >= 5 ? "#ff1744" : level >= 4 ? "#ff6d00" : level >= 3 ? "#ffab00" : "#69f0ae";
  return (
    <span style={{
      width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
      background: color, boxShadow: level >= 4 ? `0 0 8px ${color}66` : "none",
      animation: level >= 5 ? "pulse 1.5s ease infinite" : "none",
    }} />
  );
}

export default function EventTimeline({ intel = {}, analysis }) {
  const [filter, setFilter] = useState("all"); // all | critical | verified

  const events = useMemo(() => {
    const items = Object.entries(intel).flatMap(([agentId, agentItems]) =>
      (agentItems || []).map((item) => ({ ...item, _agentId: agentId }))
    );
    let filtered = items;
    if (filter === "critical") filtered = items.filter((i) => i.severity >= 4);
    if (filter === "verified") filtered = items.filter((i) => i.verified);
    return filtered.sort((a, b) => (b.severity || 0) - (a.severity || 0));
  }, [intel, filter]);

  // Group by severity level
  const criticalCount = events.filter((e) => e.severity >= 5).length;
  const highCount = events.filter((e) => e.severity >= 4 && e.severity < 5).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", background: "rgba(255,171,0,0.05)",
        border: "1px solid rgba(255,171,0,0.15)", borderRadius: "var(--radius)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1rem" }}>📋</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "#ffab00", fontWeight: 700, letterSpacing: 1 }}>
            CRONOLOGIE EVENIMENTE
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>
            {events.length} evenimente
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "all", label: "TOATE" },
            { id: "critical", label: `CRITICE (${criticalCount + highCount})` },
            { id: "verified", label: "VERIFICATE" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "4px 10px", borderRadius: 4,
                fontFamily: "var(--mono)", fontSize: "0.5rem",
                background: filter === f.id ? "rgba(255,171,0,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${filter === f.id ? "rgba(255,171,0,0.3)" : "var(--border)"}`,
                color: filter === f.id ? "#ffab00" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Timeline */}
      {analysis?.timeline_last_24h?.length > 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
          padding: "14px 18px",
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "#4fc3f7", marginBottom: 10 }}>
            SUMAR AI — ULTIMELE 24H
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.timeline_last_24h.map((event, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
                {/* Timeline line */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: i === 0 ? "#ff1744" : i < 2 ? "#ff9100" : "#4fc3f7",
                    boxShadow: i === 0 ? "0 0 10px #ff174466" : "none",
                    animation: i === 0 ? "pulse 2s ease infinite" : "none",
                  }} />
                  {i < analysis.timeline_last_24h.length - 1 && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 20,
                      background: "linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.slice(0, 30).map((event, i) => {
          const sevColor = event.severity >= 5 ? "#ff1744" : event.severity >= 4 ? "#ff6d00" : event.severity >= 3 ? "#ffab00" : "#69f0ae";
          return (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "10px 14px", borderRadius: "var(--radius-sm)",
              background: event.severity >= 4 ? `${sevColor}06` : "var(--bg-card)",
              border: `1px solid ${event.severity >= 4 ? `${sevColor}22` : "var(--border)"}`,
              borderLeft: `3px solid ${sevColor}`,
              animation: `fadeInUp 0.3s ease ${Math.min(i * 0.02, 0.3)}s both`,
            }}>
              <SeverityDot level={event.severity || 3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700,
                    color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {event.headline}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {event.verified && <span style={{ fontSize: "0.5rem", color: "#69f0ae" }}>✓</span>}
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, fontWeight: 600,
                      padding: "1px 6px", borderRadius: 6,
                      background: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}44`,
                    }}>
                      S{event.severity}
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {event.summary}
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>{event.source}</span>
                  {event.location && <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>📍 {event.location}</span>}
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-dim)" }}>{event.time}</span>
                  {event.aiModelName && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-dim)", padding: "0px 4px", borderRadius: 3, background: "rgba(255,255,255,0.03)" }}>
                      {event.aiModelName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            Se încarcă evenimentele...
          </div>
        </div>
      )}
    </div>
  );
}
