import { useState } from "react";

// Country Instability Index (CII) — World Monitor inspired
const COUNTRIES = [
  {
    name: "Iran", flag: "🇮🇷", score: 82, trend: "up", change: +5,
    factors: { conflict: 85, economic: 78, political: 80, social: 75, military: 92 },
    assessment: "Active military confrontation with Israel/US. Nuclear program tensions at peak. Economic pressure from expanded sanctions.",
    threats: ["Nuclear escalation", "Proxy retaliation", "Strait of Hormuz closure"],
  },
  {
    name: "Israel", flag: "🇮🇱", score: 76, trend: "up", change: +3,
    factors: { conflict: 90, economic: 55, political: 72, social: 68, military: 88 },
    assessment: "Multi-front security operations. Iron Dome under sustained pressure. Political divisions on military strategy.",
    threats: ["Multi-front war", "Hezbollah escalation", "Civilian casualties"],
  },
  {
    name: "Yemen", flag: "🇾🇪", score: 88, trend: "up", change: +7,
    factors: { conflict: 95, economic: 90, political: 85, social: 88, military: 78 },
    assessment: "Houthi forces conducting anti-shipping operations in Red Sea and Gulf of Aden. Humanitarian crisis deepening.",
    threats: ["Red Sea shipping disruption", "Humanitarian catastrophe", "Regional spillover"],
  },
  {
    name: "Lebanon", flag: "🇱🇧", score: 71, trend: "up", change: +4,
    factors: { conflict: 75, economic: 82, political: 78, social: 65, military: 55 },
    assessment: "Hezbollah cross-border activity increasing. Economic collapse continues. Political vacuum persists.",
    threats: ["Israeli invasion", "State collapse", "Refugee crisis"],
  },
  {
    name: "Syria", flag: "🇸🇾", score: 68, trend: "flat", change: 0,
    factors: { conflict: 72, economic: 78, political: 75, social: 62, military: 58 },
    assessment: "Iranian military assets targeted by Israeli strikes. Fractured governance. Reconstruction stalled.",
    threats: ["Israeli strikes", "ISIS resurgence", "Proxy conflicts"],
  },
  {
    name: "Iraq", flag: "🇮🇶", score: 58, trend: "up", change: +2,
    factors: { conflict: 62, economic: 55, political: 65, social: 52, military: 50 },
    assessment: "Pro-Iran PMF militias active. US base attacks increasing. Oil exports vulnerable to regional disruption.",
    threats: ["Militia attacks", "US-Iran proxy escalation", "Oil disruption"],
  },
  {
    name: "Saudi Arabia", flag: "🇸🇦", score: 35, trend: "flat", change: -1,
    factors: { conflict: 25, economic: 30, political: 28, social: 40, military: 30 },
    assessment: "Maintaining diplomatic balancing act. Oil production strategy under pressure. Vision 2030 proceeding.",
    threats: ["Oil market volatility", "Regional contagion", "Houthi threats"],
  },
  {
    name: "UAE", flag: "🇦🇪", score: 22, trend: "flat", change: 0,
    factors: { conflict: 15, economic: 20, political: 15, social: 18, military: 20 },
    assessment: "Stable but exposed to regional disruption. Al Dhafra airbase operational. Diplomatic engagement active.",
    threats: ["Regional spillover", "Shipping disruption", "Terror threats"],
  },
];

function ScoreBar({ value, color, label, small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {label && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)", width: 55, flexShrink: 0 }}>{label}</span>}
      <div style={{ flex: 1, height: small ? 4 : 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${value}%`, height: "100%", background: color,
          borderRadius: 3, transition: "width 0.6s ease",
          boxShadow: value >= 70 ? `0 0 8px ${color}44` : "none",
        }} />
      </div>
      <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color, width: 28, textAlign: "right", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 80) return "#FF3B30";
  if (score >= 60) return "#FFB020";
  if (score >= 40) return "#FFD60A";
  return "#30D158";
}

function getScoreLabel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "GUARDED";
  return "LOW";
}

export default function InstabilityIndex() {
  const [expanded, setExpanded] = useState(null);

  const sorted = [...COUNTRIES].sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header summary */}
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "12px 14px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 8 }}>
          REGIONAL INSTABILITY INDEX
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {sorted.slice(0, 4).map((c) => {
            const color = getScoreColor(c.score);
            return (
              <div key={c.name} style={{
                flex: "1 1 100px", padding: "8px 10px", background: `${color}08`,
                borderRadius: "var(--radius-sm)", border: `1px solid ${color}22`, textAlign: "center",
              }}>
                <div style={{ fontSize: "1.3rem", marginBottom: 2 }}>{c.flag}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "1.2rem", fontWeight: 800, color }}>{c.score}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 1, color: "var(--text-dim)" }}>{c.name}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, marginTop: 2,
                  color: c.change > 0 ? "#FF3B30" : c.change < 0 ? "#30D158" : "var(--text-muted)",
                }}>
                  {c.change > 0 ? "▲" : c.change < 0 ? "▼" : "─"} {Math.abs(c.change)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Country list */}
      {sorted.map((country) => {
        const color = getScoreColor(country.score);
        const label = getScoreLabel(country.score);
        const isExpanded = expanded === country.name;

        return (
          <div key={country.name} style={{
            background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
            overflow: "hidden", cursor: "pointer", transition: "all 0.15s",
          }}
            onClick={() => setExpanded(isExpanded ? null : country.name)}
          >
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.3rem" }}>{country.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{country.name}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1,
                    padding: "1px 6px", borderRadius: 3, background: `${color}15`, color, border: `1px solid ${color}30`,
                  }}>{label}</span>
                </div>
                {/* Score bar */}
                <div style={{ marginTop: 4 }}>
                  <ScoreBar value={country.score} color={color} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "1.4rem", fontWeight: 800, color }}>{country.score}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700,
                  color: country.change > 0 ? "#FF3B30" : country.change < 0 ? "#30D158" : "var(--text-muted)",
                }}>
                  {country.change > 0 ? "▲" : country.change < 0 ? "▼" : "─"} {Math.abs(country.change)} (7d)
                </div>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)", marginTop: 0, paddingTop: 12, animation: "fadeIn 0.2s ease" }}>
                {/* Factor breakdown */}
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 8 }}>FACTOR BREAKDOWN</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {Object.entries(country.factors).map(([key, val]) => (
                    <ScoreBar key={key} value={val} color={getScoreColor(val)} label={key.toUpperCase()} small />
                  ))}
                </div>

                {/* Assessment */}
                <div style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                  {country.assessment}
                </div>

                {/* Threats */}
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1.5, color: "#FF3B30", marginBottom: 6 }}>KEY THREATS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {country.threats.map((t) => (
                    <span key={t} style={{
                      fontFamily: "var(--mono)", fontSize: "0.7rem", padding: "3px 8px",
                      background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.15)",
                      borderRadius: 4, color: "var(--text-secondary)",
                    }}>⚠ {t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
