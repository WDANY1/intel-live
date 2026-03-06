import { useState } from "react";

const CHOKEPOINTS = [
  {
    name: "Strâmtoarea Hormuz",
    icon: "🚢",
    lat: 26.57, lng: 56.25,
    riskLevel: "CRITIC",
    riskColor: "#ff1744",
    traffic: "~21% petrol mondial",
    dailyBarrels: "20.5M bbl/zi",
    width: "33 km (min 3.2 km navigabil)",
    controlledBy: "Iran (nord) / Oman (sud)",
    threats: ["Mine iraniene", "Dronele IRGC Navy", "Lansatoare de rachete costale", "Fast-attack boats"],
    status: "MONITORIZAT ACTIV",
    description: "Cea mai importantă strâmtoare maritimă din lume. Iran amenință periodic cu închiderea ei.",
  },
  {
    name: "Bab el-Mandeb",
    icon: "⚓",
    lat: 12.58, lng: 43.15,
    riskLevel: "RIDICAT",
    riskColor: "#ff6d00",
    traffic: "~9% petrol mondial + 12% comerț global",
    dailyBarrels: "6.2M bbl/zi",
    width: "26 km",
    controlledBy: "Yemen (est) / Djibouti-Eritrea (vest)",
    threats: ["Rachete anti-navă Houthi", "Drone maritime Houthi", "Mine", "Piraterie"],
    status: "ATACURI ACTIVE",
    description: "Atacuri frecvente Houthi asupra navigației comerciale din 2023. Risc major pentru tankerele petroliere.",
  },
  {
    name: "Canalul Suez",
    icon: "🏗️",
    lat: 30.43, lng: 32.34,
    riskLevel: "MEDIU",
    riskColor: "#ffab00",
    traffic: "~12% comerț global",
    dailyBarrels: "5.5M bbl/zi",
    width: "205m (min)",
    controlledBy: "Egipt (Suez Canal Authority)",
    threats: ["Devierea traficului din cauza atacurilor Houthi", "Riscuri geopolitice regionale"],
    status: "OPERAȚIONAL - TRAFIC REDUS",
    description: "Trafic redus semnificativ din cauza atacurilor Houthi din Bab el-Mandeb. Multe nave aleg ruta Cap Buna Speranță.",
  },
  {
    name: "Strâmtoarea Malacca",
    icon: "🌊",
    lat: 2.50, lng: 101.80,
    riskLevel: "SCĂZUT",
    riskColor: "#69f0ae",
    traffic: "~25% comerț maritim mondial",
    dailyBarrels: "16M bbl/zi",
    width: "65 km",
    controlledBy: "Malaysia / Indonezia / Singapore",
    threats: ["Piraterie", "Tensiuni SCS"],
    status: "NORMAL",
    description: "Cea mai tranzitată strâmtoare din lume. Impact indirect din conflictul Iran-Israel prin prețuri petrol.",
  },
  {
    name: "Canalul Panama",
    icon: "🔒",
    lat: 9.08, lng: -79.68,
    riskLevel: "SCĂZUT",
    riskColor: "#69f0ae",
    traffic: "~6% comerț mondial",
    dailyBarrels: "1M bbl/zi",
    width: "33m (ecluze)",
    controlledBy: "Panama",
    threats: ["Secetă - nivel apă scăzut", "Restricții tranzit"],
    status: "RESTRICȚIONAT",
    description: "Capacitate redusă din cauza secetei. Trafic alternativ creșterind pe alte rute.",
  },
  {
    name: "Strâmtoarea Taiwan",
    icon: "⚡",
    lat: 24.00, lng: 119.50,
    riskLevel: "MEDIU",
    riskColor: "#ffab00",
    traffic: "~88% fabricație semiconductori avansați",
    dailyBarrels: "N/A",
    width: "130 km",
    controlledBy: "Taiwan / China (pretins)",
    threats: ["Exerciții militare chineze", "Tensiuni geopolitice", "Risc blocare"],
    status: "MONITORIZAT",
    description: "Critic pentru lanțul global de semiconductori. Tensiuni în creștere.",
  },
];

const FLEET_POSITIONS = [
  { name: "CVN-72 USS Abraham Lincoln", type: "Carrier Strike Group", region: "Golful Pers", icon: "🛩️", status: "DESFĂȘURAT" },
  { name: "CVN-69 USS Eisenhower", type: "Carrier Strike Group", region: "Marea Mediterană", icon: "🛩️", status: "DESFĂȘURAT" },
  { name: "LHD-7 USS Iwo Jima", type: "Amphibious Ready Group", region: "Marea Roșie", icon: "🚁", status: "PATRULARE" },
  { name: "SSGN Ohio-class", type: "Submarine (Guided Missile)", region: "Nedeclarat - CENTCOM AOR", icon: "🔵", status: "CLASIFICAT" },
  { name: "DDG Arleigh Burke x4", type: "Distrugătoare Aegis", region: "Golful Pers + Marea Roșie", icon: "⚓", status: "ACTIV" },
];

function PulsingDot({ color = "#ff3b3b", size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
    </span>
  );
}

export default function MaritimePanel() {
  const [expandedIdx, setExpandedIdx] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", background: "rgba(0,229,255,0.05)",
        border: "1px solid rgba(0,229,255,0.15)", borderRadius: "var(--radius)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1rem" }}>🚢</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "#00e5ff", fontWeight: 700, letterSpacing: 1 }}>
            MONITOR MARITIM & CHOKEPOINTS
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>
            {CHOKEPOINTS.length} strâmtori • {FLEET_POSITIONS.length} nave US
          </span>
        </div>
      </div>

      {/* Risk Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {CHOKEPOINTS.map((cp) => (
          <div key={cp.name} style={{
            background: "var(--bg-card)", border: `1px solid ${cp.riskColor}22`,
            borderRadius: "var(--radius-sm)", padding: "10px 14px",
            cursor: "pointer", transition: "all 0.2s",
          }}
            onClick={() => setExpandedIdx(expandedIdx === cp.name ? null : cp.name)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: "0.9rem" }}>{cp.icon}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {cp.name.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PulsingDot color={cp.riskColor} size={5} />
              <span style={{
                fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, fontWeight: 600,
                color: cp.riskColor,
              }}>
                {cp.riskLevel}
              </span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-muted)", marginTop: 2 }}>
              {cp.dailyBarrels}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Chokepoint Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHOKEPOINTS.map((cp) => (
          <div key={cp.name} style={{
            background: "var(--bg-card)",
            border: `1px solid ${expandedIdx === cp.name ? `${cp.riskColor}33` : "var(--border)"}`,
            borderLeft: `3px solid ${cp.riskColor}`,
            borderRadius: "var(--radius)", overflow: "hidden",
            cursor: "pointer", transition: "all 0.2s",
          }}
            onClick={() => setExpandedIdx(expandedIdx === cp.name ? null : cp.name)}
          >
            {/* Compact Row */}
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.1rem" }}>{cp.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {cp.name}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>
                    {cp.controlledBy}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: cp.riskColor }}>
                    {cp.dailyBarrels}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-muted)" }}>
                    {cp.traffic}
                  </div>
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 6,
                  background: `${cp.riskColor}18`, color: cp.riskColor, border: `1px solid ${cp.riskColor}44`,
                }}>
                  {cp.riskLevel}
                </span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", transition: "transform 0.2s", transform: expandedIdx === cp.name ? "rotate(180deg)" : "rotate(0)" }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedIdx === cp.name && (
              <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ margin: "0 0 10px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {cp.description}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                      LĂȚIME
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-primary)" }}>
                      {cp.width}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                      STATUS
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: cp.riskColor }}>
                      {cp.status}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", letterSpacing: 1, color: "#ff6d00", marginBottom: 6 }}>
                    AMENINȚĂRI
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {cp.threats.map((t, i) => (
                      <span key={i} style={{
                        fontFamily: "var(--mono)", fontSize: "0.5rem",
                        padding: "2px 8px", borderRadius: 4,
                        background: "rgba(255,109,0,0.08)", border: "1px solid rgba(255,109,0,0.15)",
                        color: "rgba(255,255,255,0.7)",
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* US Fleet Tracker */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid rgba(79,195,247,0.15)",
        borderRadius: "var(--radius)", padding: "14px 18px",
      }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 2, color: "#4fc3f7", marginBottom: 10 }}>
          🇺🇸 FLOTĂ US NAVY — DESFĂȘURARE CENTCOM
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FLEET_POSITIONS.map((ship, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem" }}>{ship.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 600, color: "#4fc3f7" }}>
                    {ship.name}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-muted)" }}>
                    {ship.type}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-secondary)" }}>
                  {ship.region}
                </div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: "0.4rem", letterSpacing: 1,
                  color: ship.status === "CLASIFICAT" ? "#ff9100" : "#69f0ae",
                }}>
                  {ship.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
