import { useEffect, useRef, useState } from "react";

// Conflict zones with strategic locations
const CONFLICT_ZONES = [
  // IRAN - Military/Nuclear Sites
  { lat: 35.6892, lng: 51.3890, name: "Tehran", country: "Iran", type: "capital", icon: "🏛️", info: "Capitala Iranului - Centru de comandă", risk: "high" },
  { lat: 32.6546, lng: 51.6680, name: "Isfahan", country: "Iran", type: "nuclear", icon: "☢️", info: "Facilități de conversie uraniu UCF", risk: "critical" },
  { lat: 34.3277, lng: 47.0778, name: "Kermanshah", country: "Iran", type: "military", icon: "🎯", info: "Bază rachete balistice IRGC", risk: "high" },
  { lat: 32.8505, lng: 51.6857, name: "Natanz", country: "Iran", type: "nuclear", icon: "☢️", info: "Centru îmbogățire uraniu", risk: "critical" },
  { lat: 34.0048, lng: 51.4025, name: "Qom/Fordow", country: "Iran", type: "nuclear", icon: "☢️", info: "Facilitare subterană Fordow", risk: "critical" },
  { lat: 28.9784, lng: 50.8361, name: "Bushehr", country: "Iran", type: "nuclear", icon: "☢️", info: "Centrală nucleară", risk: "high" },
  { lat: 27.1832, lng: 56.2765, name: "Bandar Abbas", country: "Iran", type: "naval", icon: "⚓", info: "Bază navală principală - Strâmtoarea Hormuz", risk: "high" },
  { lat: 36.2605, lng: 59.6168, name: "Mashhad", country: "Iran", type: "military", icon: "🎯", info: "Bază aeriană & rachete", risk: "medium" },
  { lat: 29.6168, lng: 52.5319, name: "Shiraz", country: "Iran", type: "military", icon: "✈️", info: "Bază aeriană tactică", risk: "medium" },
  { lat: 38.0800, lng: 46.2919, name: "Tabriz", country: "Iran", type: "military", icon: "🎯", info: "Bază IRGC nord-vest", risk: "medium" },

  // ISRAEL - Strategic Sites
  { lat: 31.7683, lng: 35.2137, name: "Jerusalem", country: "Israel", type: "capital", icon: "🏛️", info: "Capitala Israelului", risk: "high" },
  { lat: 32.0853, lng: 34.7818, name: "Tel Aviv", country: "Israel", type: "command", icon: "🏢", info: "Centru comandă IDF - Kirya", risk: "high" },
  { lat: 32.7940, lng: 34.9896, name: "Haifa", country: "Israel", type: "naval", icon: "⚓", info: "Bază navală principală", risk: "high" },
  { lat: 31.2357, lng: 34.7925, name: "Beer Sheva", country: "Israel", type: "military", icon: "🎯", info: "Comandament IDF Sud", risk: "medium" },
  { lat: 30.9563, lng: 34.9498, name: "Dimona", country: "Israel", type: "nuclear", icon: "☢️", info: "Reactor nuclear Negev", risk: "critical" },
  { lat: 29.5581, lng: 34.9482, name: "Eilat", country: "Israel", type: "naval", icon: "⚓", info: "Port strategic Marea Roșie", risk: "medium" },
  { lat: 31.8644, lng: 34.7309, name: "Palmachim", country: "Israel", type: "military", icon: "🚀", info: "Bază lansare rachete Arrow/Iron Dome", risk: "high" },
  { lat: 30.6393, lng: 34.6670, name: "Nevatim", country: "Israel", type: "military", icon: "✈️", info: "Bază F-35I Adir", risk: "high" },

  // GULF STATES
  { lat: 24.4539, lng: 54.3773, name: "Abu Dhabi", country: "UAE", type: "base_us", icon: "🇺🇸", info: "Bază aeriană Al Dhafra - USAF", risk: "medium" },
  { lat: 25.4111, lng: 51.2260, name: "Al Udeid", country: "Qatar", type: "base_us", icon: "🇺🇸", info: "Bază aeriană Al Udeid - CENTCOM Forward", risk: "high" },
  { lat: 26.2285, lng: 50.5860, name: "Manama", country: "Bahrain", type: "base_us", icon: "🇺🇸", info: "NSA Bahrain - Flota 5 US Navy", risk: "high" },
  { lat: 29.3117, lng: 47.4818, name: "Kuwait City", country: "Kuwait", type: "base_us", icon: "🇺🇸", info: "Camp Arifjan - US Army", risk: "medium" },
  { lat: 23.5880, lng: 58.3829, name: "Muscat", country: "Oman", type: "strategic", icon: "⚓", info: "Strâmtoarea Hormuz - intrare", risk: "medium" },

  // CONFLICT AREAS
  { lat: 33.8938, lng: 35.5018, name: "Beirut", country: "Liban", type: "proxy", icon: "🎯", info: "Hezbollah HQ - zona Dahieh", risk: "high" },
  { lat: 33.5138, lng: 36.2765, name: "Damascus", country: "Siria", type: "proxy", icon: "🎯", info: "Prezență militară iraniană", risk: "high" },
  { lat: 33.3152, lng: 44.3661, name: "Baghdad", country: "Irak", type: "proxy", icon: "🎯", info: "Miliții PMF pro-Iran", risk: "medium" },
  { lat: 15.3694, lng: 44.1910, name: "Sanaa", country: "Yemen", type: "proxy", icon: "🎯", info: "Capitala Houthi - rachete anti-navă", risk: "high" },
  { lat: 12.8028, lng: 45.0286, name: "Aden", country: "Yemen", type: "strategic", icon: "⚓", info: "Bab el-Mandeb - rută maritimă", risk: "high" },

  // MARITIME CHOKEPOINTS
  { lat: 26.5667, lng: 56.2500, name: "Strâmtoarea Hormuz", country: "Intl", type: "chokepoint", icon: "🚢", info: "20% petrol mondial - punct strategic #1", risk: "critical" },
  { lat: 12.5833, lng: 43.1453, name: "Bab el-Mandeb", country: "Intl", type: "chokepoint", icon: "🚢", info: "Acces Marea Roșie - atacuri Houthi", risk: "critical" },
  { lat: 30.4250, lng: 32.3444, name: "Canalul Suez", country: "Egipt", type: "chokepoint", icon: "🚢", info: "12% comerț global - rută vitală", risk: "high" },
];

// Risk colors
const RISK_COLORS = {
  critical: "#ff1744",
  high: "#ff6d00",
  medium: "#ffab00",
  low: "#69f0ae",
};

const TYPE_COLORS = {
  capital: "#b388ff",
  nuclear: "#ff1744",
  military: "#ff6b35",
  naval: "#4fc3f7",
  command: "#e040fb",
  base_us: "#4fc3f7",
  proxy: "#ff9100",
  strategic: "#ffd740",
  chokepoint: "#00e5ff",
};

export default function ConflictMap({ intelItems = [], analysis }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState("all");
  const markersRef = useRef([]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    // Dynamically import Leaflet
    import("leaflet").then((L) => {
      // Fix default icon issue
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [30, 48],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        minZoom: 3,
        maxZoom: 12,
      });

      // Dark tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Zoom control in top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;
      window._leafletMap = map;
      window._L = L;

      // Add markers
      renderMarkers(L, map, "all");
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when layer changes
  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderMarkers(window._L, mapInstanceRef.current, activeLayer);
  }, [activeLayer, mapReady]);

  function renderMarkers(L, map, layer) {
    // Clear existing
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const filtered = layer === "all"
      ? CONFLICT_ZONES
      : CONFLICT_ZONES.filter((z) => z.type === layer || z.country.toLowerCase().includes(layer));

    filtered.forEach((zone) => {
      const color = TYPE_COLORS[zone.type] || "#fff";
      const riskColor = RISK_COLORS[zone.risk] || "#fff";
      const size = zone.risk === "critical" ? 14 : zone.risk === "high" ? 11 : 8;

      // Create custom div icon
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${size}px; height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid ${riskColor};
          box-shadow: 0 0 ${zone.risk === 'critical' ? '12' : '6'}px ${color}66;
          animation: ${zone.risk === 'critical' ? 'pulse 1.5s ease infinite' : 'none'};
          cursor: pointer;
        "></div>`,
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon }).addTo(map);

      // Popup
      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; min-width: 200px; color: #e8e8ec; background: #12121a; padding: 12px; border-radius: 8px; border: 1px solid ${color}44;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 16px;">${zone.icon}</span>
            <div>
              <div style="font-weight: 700; color: ${color}; font-size: 12px;">${zone.name}</div>
              <div style="color: rgba(255,255,255,0.5); font-size: 9px; letter-spacing: 1px;">${zone.country.toUpperCase()}</div>
            </div>
          </div>
          <div style="color: rgba(255,255,255,0.7); font-size: 10px; line-height: 1.5; margin-bottom: 6px;">${zone.info}</div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="background: ${riskColor}22; color: ${riskColor}; border: 1px solid ${riskColor}44; padding: 1px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; letter-spacing: 1px;">
              RISC ${zone.risk.toUpperCase()}
            </span>
            <span style="background: ${color}22; color: ${color}; border: 1px solid ${color}44; padding: 1px 6px; border-radius: 8px; font-size: 8px; letter-spacing: 1px;">
              ${zone.type.toUpperCase()}
            </span>
          </div>
        </div>
      `, {
        className: "dark-popup",
        maxWidth: 280,
      });

      marker.on("click", () => setSelectedZone(zone));
      markersRef.current.push(marker);
    });

    // Add range circles for nuclear sites
    filtered.filter((z) => z.type === "nuclear").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 50000,
        color: "#ff174466",
        fillColor: "#ff174411",
        fillOpacity: 0.3,
        weight: 1,
        dashArray: "5, 5",
      }).addTo(map);
      markersRef.current.push(circle);
    });

    // Add missile range arcs for Iran -> Israel
    if (layer === "all" || layer === "military") {
      const iranCenter = [32.6546, 51.6680]; // Isfahan
      const rangeCircle = L.circle(iranCenter, {
        radius: 2000000, // 2000km
        color: "#ff3b3b22",
        fillColor: "#ff3b3b08",
        fillOpacity: 0.2,
        weight: 1,
        dashArray: "8, 4",
      }).addTo(map);
      markersRef.current.push(rangeCircle);
    }

    // Add chokepoint lines
    filtered.filter((z) => z.type === "chokepoint").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 30000,
        color: "#00e5ff44",
        fillColor: "#00e5ff11",
        fillOpacity: 0.4,
        weight: 2,
      }).addTo(map);
      markersRef.current.push(circle);
    });
  }

  const layers = [
    { id: "all", label: "TOATE", color: "#fff" },
    { id: "nuclear", label: "NUCLEAR", color: "#ff1744" },
    { id: "military", label: "MILITAR", color: "#ff6b35" },
    { id: "naval", label: "NAVAL", color: "#4fc3f7" },
    { id: "base_us", label: "BAZE US", color: "#4fc3f7" },
    { id: "proxy", label: "PROXY", color: "#ff9100" },
    { id: "chokepoint", label: "MARITIME", color: "#00e5ff" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Map Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", background: "rgba(255,59,59,0.05)",
        border: "1px solid rgba(255,59,59,0.15)", borderRadius: "var(--radius)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1rem" }}>🗺️</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
            HARTĂ CONFLICT INTERACTIVĂ
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>
            {CONFLICT_ZONES.length} locații strategice
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, fontFamily: "var(--mono)", fontSize: "0.5rem" }}>
          {Object.entries(TYPE_COLORS).slice(0, 5).map(([type, color]) => (
            <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              {type.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Layer Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {layers.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            style={{
              padding: "4px 12px", borderRadius: 14,
              fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 0.5,
              background: activeLayer === l.id ? `${l.color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeLayer === l.id ? `${l.color}44` : "var(--border)"}`,
              color: activeLayer === l.id ? l.color : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div style={{
        position: "relative", borderRadius: "var(--radius)", overflow: "hidden",
        border: "1px solid var(--border)", height: 500,
      }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Threat overlay */}
        {analysis && (
          <div style={{
            position: "absolute", bottom: 12, left: 12, zIndex: 1000,
            background: "rgba(10,10,15,0.9)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "10px 14px", maxWidth: 220,
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 2, color: "var(--text-muted)", marginBottom: 4 }}>
              NIVEL AMENINȚARE
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "1.2rem", fontWeight: 800,
                color: analysis.threat_level >= 7 ? "#ff1744" : analysis.threat_level >= 4 ? "#ff9100" : "#69f0ae",
              }}>
                {analysis.threat_level}/10
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "#ff9100" }}>
                {analysis.threat_label}
              </span>
            </div>
            {analysis.escalation_probability != null && (
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)", marginTop: 4 }}>
                Escaladare: {analysis.escalation_probability}%
              </div>
            )}
          </div>
        )}

        {/* Selected zone info */}
        {selectedZone && (
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 1000,
            background: "rgba(10,10,15,0.9)", backdropFilter: "blur(10px)",
            border: `1px solid ${TYPE_COLORS[selectedZone.type]}44`, borderRadius: 8,
            padding: "12px 16px", maxWidth: 260,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "1.2rem" }}>{selectedZone.icon}</span>
              <button
                onClick={() => setSelectedZone(null)}
                style={{ fontSize: "0.7rem", color: "var(--text-muted)", padding: 4 }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: TYPE_COLORS[selectedZone.type], marginBottom: 2 }}>
              {selectedZone.name}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 6 }}>
              {selectedZone.country.toUpperCase()} • {selectedZone.type.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {selectedZone.info}
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 1, fontWeight: 600,
                padding: "2px 8px", borderRadius: 8,
                background: `${RISK_COLORS[selectedZone.risk]}22`,
                color: RISK_COLORS[selectedZone.risk],
                border: `1px solid ${RISK_COLORS[selectedZone.risk]}44`,
              }}>
                RISC {selectedZone.risk.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Below Map */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {[
          { label: "NUCLEAR", count: CONFLICT_ZONES.filter((z) => z.type === "nuclear").length, color: "#ff1744", icon: "☢️" },
          { label: "BAZE MILITARE", count: CONFLICT_ZONES.filter((z) => z.type === "military").length, color: "#ff6b35", icon: "🎯" },
          { label: "BAZE US", count: CONFLICT_ZONES.filter((z) => z.type === "base_us").length, color: "#4fc3f7", icon: "🇺🇸" },
          { label: "PROXY", count: CONFLICT_ZONES.filter((z) => z.type === "proxy").length, color: "#ff9100", icon: "🎯" },
          { label: "CHOKEPOINTS", count: CONFLICT_ZONES.filter((z) => z.type === "chokepoint").length, color: "#00e5ff", icon: "🚢" },
          { label: "RISC CRITIC", count: CONFLICT_ZONES.filter((z) => z.risk === "critical").length, color: "#ff1744", icon: "⚠️" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: "0.9rem" }}>{stat.icon}</span>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 1.5, color: "var(--text-muted)" }}>{stat.label}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "1rem", fontWeight: 700, color: stat.color }}>{stat.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
