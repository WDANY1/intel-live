import { useState } from "react";

// Simulated prediction market data (Polymarket-style)
// In production, this would fetch from Polymarket/Kalshi APIs
const MARKETS = [
  {
    category: "CONFLICT",
    color: "#FF3B30",
    markets: [
      { q: "US strikes Iran before April 2026?", yes: 32, vol: "$4.2M", change: +5.2, trend: "up" },
      { q: "Israel ground operation in Lebanon 2026?", yes: 18, vol: "$2.8M", change: -2.1, trend: "down" },
      { q: "Iran-Israel ceasefire by June 2026?", yes: 22, vol: "$3.1M", change: +1.4, trend: "up" },
      { q: "Major Houthi attack on US vessel 2026?", yes: 41, vol: "$1.9M", change: +8.3, trend: "up" },
      { q: "Iran tests nuclear weapon in 2026?", yes: 6, vol: "$5.7M", change: +0.8, trend: "up" },
    ],
  },
  {
    category: "GEOPOLITICS",
    color: "#A78BFA",
    markets: [
      { q: "Strait of Hormuz blockade in 2026?", yes: 14, vol: "$3.4M", change: +3.1, trend: "up" },
      { q: "UN Security Council Iran resolution?", yes: 28, vol: "$1.2M", change: -1.5, trend: "down" },
      { q: "NATO Article 5 invoked in 2026?", yes: 4, vol: "$2.1M", change: 0, trend: "flat" },
      { q: "New Iran nuclear deal by 2027?", yes: 12, vol: "$1.8M", change: -3.2, trend: "down" },
    ],
  },
  {
    category: "ECONOMIC",
    color: "#FFD60A",
    markets: [
      { q: "Oil price above $100/barrel in 2026?", yes: 38, vol: "$6.2M", change: +4.5, trend: "up" },
      { q: "US recession in 2026?", yes: 29, vol: "$8.4M", change: +1.2, trend: "up" },
      { q: "Iran sanctions expanded in Q2 2026?", yes: 55, vol: "$2.3M", change: +2.8, trend: "up" },
      { q: "Global shipping disruption >30 days?", yes: 44, vol: "$1.5M", change: +6.1, trend: "up" },
    ],
  },
];

const MOVERS = [
  { q: "Major Houthi attack on US vessel", change: +8.3, yes: 41, color: "#FF3B30" },
  { q: "Global shipping disruption >30 days", change: +6.1, yes: 44, color: "#FFB020" },
  { q: "US strikes Iran before April", change: +5.2, yes: 32, color: "#FF3B30" },
  { q: "Oil price above $100/barrel", change: +4.5, yes: 38, color: "#FFD60A" },
  { q: "New Iran nuclear deal by 2027", change: -3.2, yes: 12, color: "#30D158" },
];

export default function PredictionMarkets() {
  const [expandedCat, setExpandedCat] = useState("CONFLICT");

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top Movers */}
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "12px 14px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 10 }}>
          🔥 TOP MOVERS (24H)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MOVERS.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < MOVERS.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: "0.78rem", color: "var(--text-secondary)", flex: 1 }}>{m.q}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.yes}¢</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700,
                  color: m.change > 0 ? "#FF3B30" : m.change < 0 ? "#30D158" : "var(--text-muted)",
                }}>
                  {m.change > 0 ? "▲" : m.change < 0 ? "▼" : "─"} {Math.abs(m.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Categories */}
      {MARKETS.map((cat) => (
        <div key={cat.category} style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <button
            onClick={() => setExpandedCat(expandedCat === cat.category ? null : cat.category)}
            style={{
              width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: expandedCat === cat.category ? `${cat.color}08` : "transparent",
              borderBottom: expandedCat === cat.category ? "1px solid var(--border)" : "none",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1.5, color: cat.color }}>{cat.category}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>({cat.markets.length})</span>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)", transform: expandedCat === cat.category ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>

          {expandedCat === cat.category && (
            <div style={{ padding: "8px 12px" }}>
              {cat.markets.map((m, i) => {
                const yesColor = m.yes >= 50 ? "#FF3B30" : m.yes >= 30 ? "#FFB020" : "#30D158";
                return (
                  <div key={i} style={{
                    padding: "10px 0", borderBottom: i < cat.markets.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.4 }}>{m.q}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* YES/NO bar */}
                      <div style={{ flex: 1, height: 20, borderRadius: 4, overflow: "hidden", display: "flex", background: "rgba(48,209,88,0.15)" }}>
                        <div style={{
                          width: `${m.yes}%`, height: "100%", background: `${yesColor}cc`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                          transition: "width 0.5s ease",
                        }}>
                          {m.yes > 15 ? `YES ${m.yes}¢` : ""}
                        </div>
                        <div style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: "#30D158",
                        }}>
                          NO {100 - m.yes}¢
                        </div>
                      </div>
                      {/* Change */}
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, width: 55, textAlign: "right",
                        color: m.change > 0 ? "#FF3B30" : m.change < 0 ? "#30D158" : "var(--text-muted)",
                      }}>
                        {m.change > 0 ? "+" : ""}{m.change}%
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginTop: 4 }}>Vol: {m.vol}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)", textAlign: "center", padding: "4px 0" }}>
        Data inspired by Polymarket · Updated every 5 min
      </div>
    </div>
  );
}
