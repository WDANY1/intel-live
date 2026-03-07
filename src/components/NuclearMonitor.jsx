// Nuclear Threat Monitor — Dedicated nuclear tracking panel

const NUCLEAR_SITES = [
  {
    name: "Natanz", country: "Iran", status: "ACTIVE", risk: "critical",
    type: "Uranium Enrichment", enrichment: "60%", centrifuges: "~8,000 IR-6",
    depth: "Underground (8m rock)", iaea: "Limited access",
    notes: "Primary enrichment facility. IAEA reports near-weapons-grade enrichment detected Feb 2026.",
  },
  {
    name: "Fordow", country: "Iran", status: "ACTIVE", risk: "critical",
    type: "Uranium Enrichment", enrichment: "60%+", centrifuges: "~1,000 IR-6",
    depth: "Deep underground (80m mountain)", iaea: "No access since 2024",
    notes: "Buried inside mountain near Qom. Hardened against bunker-busters. Most concerning facility.",
  },
  {
    name: "Isfahan UCF", country: "Iran", status: "ACTIVE", risk: "high",
    type: "Conversion Facility", enrichment: "UF6 production", centrifuges: "N/A",
    depth: "Surface", iaea: "Limited monitoring",
    notes: "Converts yellowcake to UF6 gas for enrichment. Key node in fuel cycle.",
  },
  {
    name: "Bushehr", country: "Iran", status: "OPERATIONAL", risk: "high",
    type: "Nuclear Power Plant", enrichment: "3.67% (fuel)", centrifuges: "N/A",
    depth: "Surface", iaea: "Monitored",
    notes: "Russian-built VVER-1000 reactor. Civilian power but strategic target.",
  },
  {
    name: "Arak IR-40", country: "Iran", status: "MODIFIED", risk: "medium",
    type: "Heavy Water Reactor", enrichment: "N/A", centrifuges: "N/A",
    depth: "Surface", iaea: "Monitored",
    notes: "Redesigned under JCPOA to limit plutonium production. Status unclear post-deal collapse.",
  },
  {
    name: "Dimona", country: "Israel", status: "CLASSIFIED", risk: "high",
    type: "Nuclear Reactor", enrichment: "Classified", centrifuges: "Classified",
    depth: "Underground complex", iaea: "No access (non-NPT)",
    notes: "Negev Nuclear Research Center. Estimated 80-400 warheads. Never officially confirmed.",
  },
];

const BREAKOUT_TIMELINE = {
  current: "~2 weeks",
  enrichment: "87.7% HEU detected (Feb 2026 IAEA report)",
  material: "Sufficient UF6 for 4-6 weapons if enriched to 90%",
  weaponization: "6-12 months estimated",
  delivery: "Shahab-3, Khorramshahr-4 (2000+ km range)",
};

const MISSILE_SYSTEMS = [
  { name: "Shahab-3", range: "2,000 km", payload: "1,000 kg", status: "Deployed", nuclear: "Capable" },
  { name: "Khorramshahr-4", range: "2,000 km", payload: "1,500 kg", status: "Deployed", nuclear: "Likely" },
  { name: "Fattah-2", range: "1,400 km", payload: "Hypersonic", status: "Tested", nuclear: "Unknown" },
  { name: "Sejjil-2", range: "2,500 km", payload: "750 kg", status: "Deployed", nuclear: "Capable" },
];

function RiskBadge({ risk }) {
  const colors = { critical: "#FF3B30", high: "#FFB020", medium: "#FFD60A", low: "#30D158" };
  const c = colors[risk] || "#94a3b8";
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1,
      padding: "2px 6px", borderRadius: 3, background: `${c}15`, color: c, border: `1px solid ${c}30`,
    }}>{risk.toUpperCase()}</span>
  );
}

export default function NuclearMonitor() {
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Breakout assessment */}
      <div style={{
        background: "rgba(255,59,48,0.04)", borderRadius: "var(--radius)", border: "1px solid rgba(255,59,48,0.15)",
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>☢️</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: 1.5, color: "#FF3B30" }}>IRAN NUCLEAR BREAKOUT ASSESSMENT</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "8px 10px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1, color: "var(--text-dim)" }}>BREAKOUT TIME</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "1.3rem", fontWeight: 800, color: "#FF3B30" }}>{BREAKOUT_TIMELINE.current}</div>
          </div>
          <div style={{ padding: "8px 10px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1, color: "var(--text-dim)" }}>WEAPONIZATION</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "1.3rem", fontWeight: 800, color: "#FFB020" }}>6-12 mo</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontFamily: "var(--sans)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {BREAKOUT_TIMELINE.enrichment}. {BREAKOUT_TIMELINE.material}.
        </div>
      </div>

      {/* Nuclear sites */}
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)" }}>NUCLEAR FACILITIES</div>
      {NUCLEAR_SITES.map((site) => (
        <div key={site.name} style={{
          background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.9rem" }}>☢️</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{site.name}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>{site.country}</span>
            <RiskBadge risk={site.risk} />
            <span style={{
              marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700,
              color: site.status === "ACTIVE" ? "#FF3B30" : site.status === "CLASSIFIED" ? "#A78BFA" : "#FFB020",
            }}>{site.status}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
            {[
              { label: "Type", value: site.type },
              { label: "Enrichment", value: site.enrichment },
              { label: "Centrifuges", value: site.centrifuges },
              { label: "IAEA", value: site.iaea },
            ].map(({ label, value }) => (
              <div key={label} style={{ fontFamily: "var(--mono)", fontSize: "0.65rem" }}>
                <span style={{ color: "var(--text-dim)" }}>{label}: </span>
                <span style={{ color: "var(--text-secondary)" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: "var(--sans)", fontSize: "0.73rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{site.notes}</div>
        </div>
      ))}

      {/* Delivery systems */}
      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: 1.5, color: "var(--text-dim)", marginTop: 4 }}>DELIVERY SYSTEMS</div>
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          {["SYSTEM", "RANGE", "PAYLOAD", "STATUS", "NUCLEAR"].map((h) => (
            <span key={h} style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 1, color: "var(--text-dim)", fontWeight: 700 }}>{h}</span>
          ))}
        </div>
        {MISSILE_SYSTEMS.map((m) => (
          <div key={m.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0, padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{m.range}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>{m.payload}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: m.status === "Deployed" ? "#30D158" : "#FFB020" }}>{m.status}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: m.nuclear === "Capable" ? "#FF3B30" : m.nuclear === "Likely" ? "#FFB020" : "var(--text-muted)" }}>{m.nuclear}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
