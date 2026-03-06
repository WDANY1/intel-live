import { useEffect, useRef, useState, useCallback } from "react";

// Static strategic locations
const CONFLICT_ZONES = [
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
  { lat: 31.7683, lng: 35.2137, name: "Jerusalem", country: "Israel", type: "capital", icon: "🏛️", info: "Capitala Israelului", risk: "high" },
  { lat: 32.0853, lng: 34.7818, name: "Tel Aviv", country: "Israel", type: "command", icon: "🏢", info: "Centru comandă IDF - Kirya", risk: "high" },
  { lat: 32.7940, lng: 34.9896, name: "Haifa", country: "Israel", type: "naval", icon: "⚓", info: "Bază navală principală", risk: "high" },
  { lat: 31.2357, lng: 34.7925, name: "Beer Sheva", country: "Israel", type: "military", icon: "🎯", info: "Comandament IDF Sud", risk: "medium" },
  { lat: 30.9563, lng: 34.9498, name: "Dimona", country: "Israel", type: "nuclear", icon: "☢️", info: "Reactor nuclear Negev", risk: "critical" },
  { lat: 29.5581, lng: 34.9482, name: "Eilat", country: "Israel", type: "naval", icon: "⚓", info: "Port strategic Marea Roșie", risk: "medium" },
  { lat: 31.8644, lng: 34.7309, name: "Palmachim", country: "Israel", type: "military", icon: "🚀", info: "Bază lansare rachete Arrow/Iron Dome", risk: "high" },
  { lat: 30.6393, lng: 34.6670, name: "Nevatim", country: "Israel", type: "military", icon: "✈️", info: "Bază F-35I Adir", risk: "high" },
  { lat: 24.4539, lng: 54.3773, name: "Abu Dhabi / Al Dhafra", country: "UAE", type: "base_us", icon: "🇺🇸", info: "Bază aeriană Al Dhafra - USAF", risk: "medium" },
  { lat: 25.4111, lng: 51.2260, name: "Al Udeid", country: "Qatar", type: "base_us", icon: "🇺🇸", info: "Bază aeriană Al Udeid - CENTCOM Forward", risk: "high" },
  { lat: 26.2285, lng: 50.5860, name: "Manama", country: "Bahrain", type: "base_us", icon: "🇺🇸", info: "NSA Bahrain - Flota 5 US Navy", risk: "high" },
  { lat: 29.3117, lng: 47.4818, name: "Kuwait City", country: "Kuwait", type: "base_us", icon: "🇺🇸", info: "Camp Arifjan - US Army", risk: "medium" },
  { lat: 23.5880, lng: 58.3829, name: "Muscat", country: "Oman", type: "strategic", icon: "⚓", info: "Strâmtoarea Hormuz - intrare", risk: "medium" },
  { lat: 33.8938, lng: 35.5018, name: "Beirut", country: "Liban", type: "proxy", icon: "🎯", info: "Hezbollah HQ - zona Dahieh", risk: "high" },
  { lat: 33.5138, lng: 36.2765, name: "Damascus", country: "Siria", type: "proxy", icon: "🎯", info: "Prezență militară iraniană", risk: "high" },
  { lat: 33.3152, lng: 44.3661, name: "Baghdad", country: "Irak", type: "proxy", icon: "🎯", info: "Miliții PMF pro-Iran", risk: "medium" },
  { lat: 15.3694, lng: 44.1910, name: "Sanaa", country: "Yemen", type: "proxy", icon: "🎯", info: "Capitala Houthi - rachete anti-navă", risk: "high" },
  { lat: 12.8028, lng: 45.0286, name: "Aden", country: "Yemen", type: "strategic", icon: "⚓", info: "Bab el-Mandeb - rută maritimă", risk: "high" },
  { lat: 26.5667, lng: 56.2500, name: "Strâmtoarea Hormuz", country: "Intl", type: "chokepoint", icon: "🚢", info: "20% petrol mondial - punct strategic #1", risk: "critical" },
  { lat: 12.5833, lng: 43.1453, name: "Bab el-Mandeb", country: "Intl", type: "chokepoint", icon: "🚢", info: "Acces Marea Roșie - atacuri Houthi", risk: "critical" },
  { lat: 30.4250, lng: 32.3444, name: "Canalul Suez", country: "Egipt", type: "chokepoint", icon: "🚢", info: "12% comerț global - rută vitală", risk: "high" },
];

// Location keyword → coordinates mapping for event extraction
const LOCATION_COORDS = {
  "tehran": { lat: 35.6892, lng: 51.3890 },
  "isfahan": { lat: 32.6546, lng: 51.6680 },
  "natanz": { lat: 32.8505, lng: 51.6857 },
  "fordow": { lat: 34.0048, lng: 51.4025 },
  "qom": { lat: 34.0048, lng: 51.4025 },
  "bandar abbas": { lat: 27.1832, lng: 56.2765 },
  "bushehr": { lat: 28.9784, lng: 50.8361 },
  "mashhad": { lat: 36.2605, lng: 59.6168 },
  "tabriz": { lat: 38.0800, lng: 46.2919 },
  "shiraz": { lat: 29.6168, lng: 52.5319 },
  "kermanshah": { lat: 34.3277, lng: 47.0778 },
  "ahvaz": { lat: 31.3183, lng: 48.6706 },
  "jerusalem": { lat: 31.7683, lng: 35.2137 },
  "tel aviv": { lat: 32.0853, lng: 34.7818 },
  "haifa": { lat: 32.7940, lng: 34.9896 },
  "beer sheva": { lat: 31.2357, lng: 34.7925 },
  "dimona": { lat: 30.9563, lng: 34.9498 },
  "eilat": { lat: 29.5581, lng: 34.9482 },
  "nevatim": { lat: 30.6393, lng: 34.6670 },
  "palmachim": { lat: 31.8644, lng: 34.7309 },
  "gaza": { lat: 31.5017, lng: 34.4674 },
  "rafah": { lat: 31.2831, lng: 34.2575 },
  "beirut": { lat: 33.8938, lng: 35.5018 },
  "damascus": { lat: 33.5138, lng: 36.2765 },
  "baghdad": { lat: 33.3152, lng: 44.3661 },
  "sanaa": { lat: 15.3694, lng: 44.1910 },
  "aden": { lat: 12.8028, lng: 45.0286 },
  "hodeida": { lat: 14.7978, lng: 42.9547 },
  "hormuz": { lat: 26.5667, lng: 56.2500 },
  "bab el-mandeb": { lat: 12.5833, lng: 43.1453 },
  "bab al-mandab": { lat: 12.5833, lng: 43.1453 },
  "suez": { lat: 30.4250, lng: 32.3444 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "abu dhabi": { lat: 24.4539, lng: 54.3773 },
  "doha": { lat: 25.2854, lng: 51.5310 },
  "manama": { lat: 26.2285, lng: 50.5860 },
  "riyadh": { lat: 24.7136, lng: 46.6753 },
  "kuwait": { lat: 29.3117, lng: 47.4818 },
  "muscat": { lat: 23.5880, lng: 58.3829 },
  "al udeid": { lat: 25.4111, lng: 51.2260 },
  "red sea": { lat: 20.0, lng: 38.0 },
  "persian gulf": { lat: 26.5, lng: 52.0 },
  "arabian sea": { lat: 18.0, lng: 62.0 },
  "israel": { lat: 31.5, lng: 34.8 },
  "iran": { lat: 32.5, lng: 53.7 },
  "yemen": { lat: 16.0, lng: 48.0 },
  "lebanon": { lat: 33.9, lng: 35.8 },
  "liban": { lat: 33.9, lng: 35.8 },
  "siria": { lat: 34.8, lng: 38.9 },
  "syria": { lat: 34.8, lng: 38.9 },
  "iraq": { lat: 33.2, lng: 43.7 },
  "irak": { lat: 33.2, lng: 43.7 },
};

function extractLocation(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Try multi-word first
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (key.includes(" ") && lower.includes(key)) return { ...coords, name: key };
  }
  // Then single word
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (!key.includes(" ") && lower.includes(key)) return { ...coords, name: key };
  }
  return null;
}

// Add small random offset to prevent exact overlap
function jitter(val, amount = 0.3) {
  return val + (Math.random() - 0.5) * amount;
}

const RISK_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const TYPE_COLORS = {
  capital: "#8b5cf6",
  nuclear: "#ef4444",
  military: "#f97316",
  naval: "#06b6d4",
  command: "#d946ef",
  base_us: "#3b82f6",
  proxy: "#fb923c",
  strategic: "#eab308",
  chokepoint: "#22d3ee",
};

export default function ConflictMap({ intelItems = [], analysis, externalLayer }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState("all");
  const staticMarkersRef = useRef([]);
  const eventMarkersRef = useRef([]);

  // Sync external layer prop
  useEffect(() => {
    if (externalLayer !== undefined) setActiveLayer(externalLayer);
  }, [externalLayer]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(mapRef.current, {
        center: [30, 48],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        minZoom: 3,
        maxZoom: 13,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;
      window._leafletMap = map;
      window._L = L;

      renderStaticMarkers(L, map, "all");
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update static markers when layer changes
  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderStaticMarkers(window._L, mapInstanceRef.current, activeLayer);
  }, [activeLayer, mapReady]);

  // Update event markers when intel items change
  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderEventMarkers(window._L, mapInstanceRef.current, intelItems);
  }, [intelItems, mapReady]);

  function renderStaticMarkers(L, map, layer) {
    staticMarkersRef.current.forEach((m) => map.removeLayer(m));
    staticMarkersRef.current = [];

    const filtered = layer === "all"
      ? CONFLICT_ZONES
      : CONFLICT_ZONES.filter((z) => z.type === layer || z.country.toLowerCase().includes(layer));

    filtered.forEach((zone) => {
      const color = TYPE_COLORS[zone.type] || "#94a3b8";
      const riskColor = RISK_COLORS[zone.risk] || "#94a3b8";
      const size = zone.risk === "critical" ? 13 : zone.risk === "high" ? 10 : 7;

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${color};border-radius:50%;
          border:2px solid ${riskColor};
          box-shadow:0 0 ${zone.risk === "critical" ? "10" : "5"}px ${color}99;
          ${zone.risk === "critical" ? "animation:pulse 1.5s ease infinite;" : ""}
        "></div>`,
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;min-width:200px;color:#e2e8f0;background:#0a0e14;padding:12px;border-radius:8px;border:1px solid ${color}44;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:14px;">${zone.icon}</span>
            <div>
              <div style="font-weight:700;color:${color};font-size:12px;">${zone.name}</div>
              <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1px;">${zone.country.toUpperCase()} · ${zone.type.toUpperCase()}</div>
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.6);font-size:10px;line-height:1.5;margin-bottom:6px;">${zone.info}</div>
          <span style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}44;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;letter-spacing:1px;">
            RISC ${zone.risk.toUpperCase()}
          </span>
        </div>
      `, { className: "dark-popup", maxWidth: 280 });

      marker.on("click", () => setSelectedZone(zone));
      staticMarkersRef.current.push(marker);
    });

    // Nuclear range circles
    filtered.filter((z) => z.type === "nuclear").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 50000, color: "#ef444466", fillColor: "#ef444411", fillOpacity: 0.3, weight: 1, dashArray: "5, 5",
      }).addTo(map);
      staticMarkersRef.current.push(circle);
    });

    // Iran missile range
    if (layer === "all" || layer === "military") {
      const rangeCircle = L.circle([32.6546, 51.6680], {
        radius: 2000000, color: "#ef444418", fillColor: "#ef444408", fillOpacity: 0.15, weight: 1, dashArray: "8, 4",
      }).addTo(map);
      staticMarkersRef.current.push(rangeCircle);
    }

    // Chokepoint halos
    filtered.filter((z) => z.type === "chokepoint").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 30000, color: "#22d3ee44", fillColor: "#22d3ee11", fillOpacity: 0.3, weight: 2,
      }).addTo(map);
      staticMarkersRef.current.push(circle);
    });
  }

  function renderEventMarkers(L, map, items) {
    // Clear old event markers
    eventMarkersRef.current.forEach((m) => map.removeLayer(m));
    eventMarkersRef.current = [];

    if (!items || items.length === 0) return;

    // Extract location for each item, deduplicate
    const locationGroups = {};
    items.forEach((item) => {
      const locText = [item.headline, item.summary, item.location].filter(Boolean).join(" ");
      const loc = item.location
        ? (LOCATION_COORDS[item.location.toLowerCase()] || extractLocation(item.location))
        : extractLocation(locText);

      if (!loc) return;

      const key = `${Math.round(loc.lat * 10)},${Math.round(loc.lng * 10)}`;
      if (!locationGroups[key]) locationGroups[key] = { lat: loc.lat, lng: loc.lng, items: [] };
      locationGroups[key].items.push(item);
    });

    Object.values(locationGroups).forEach((group) => {
      const maxSeverity = Math.max(...group.items.map((i) => i.severity || 3));
      const color = maxSeverity >= 5 ? "#ef4444" : maxSeverity >= 4 ? "#f97316" : maxSeverity >= 3 ? "#eab308" : "#22c55e";
      const size = maxSeverity >= 5 ? 11 : maxSeverity >= 4 ? 9 : 7;
      const count = group.items.length;

      // Jitter position slightly to avoid overlap with static markers
      const lat = jitter(group.lat, 0.15);
      const lng = jitter(group.lng, 0.15);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="position:relative;width:${size + 6}px;height:${size + 6}px;">
          <!-- Pulse ring -->
          <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};animation:pulseRing 2s ease infinite;opacity:0.6;"></div>
          <!-- Core dot -->
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};
            box-shadow:0 0 8px ${color}88;
            ${maxSeverity >= 5 ? "animation:pulse 1s ease infinite;" : ""}
          "></div>
          ${count > 1 ? `<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#0a0e14;border:1px solid ${color};display:flex;align-items:center;justify-content:center;font-size:7px;font-family:monospace;color:${color};font-weight:700;">${Math.min(count, 9)}</div>` : ""}
        </div>`,
        iconSize: [size + 12, size + 12],
        iconAnchor: [(size + 12) / 2, (size + 12) / 2],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      // Show top 3 events in popup
      const topItems = group.items.slice(0, 3);
      const popupHtml = `
        <div style="font-family:'JetBrains Mono',monospace;min-width:220px;max-width:300px;color:#e2e8f0;background:#0a0e14;padding:10px;border-radius:8px;border:1px solid ${color}44;">
          <div style="font-size:8px;letter-spacing:2px;color:${color};margin-bottom:6px;font-weight:700;">
            📡 INTEL EVENT ${count > 1 ? `(${count})` : ""}
          </div>
          ${topItems.map((item) => {
            const sv = item.severity || 3;
            const c = sv >= 5 ? "#ef4444" : sv >= 4 ? "#f97316" : sv >= 3 ? "#eab308" : "#22c55e";
            const lbl = sv >= 5 ? "CRITIC" : sv >= 4 ? "RIDICAT" : sv >= 3 ? "MEDIU" : "SCĂZUT";
            return `
              <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                  <span style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0;"></span>
                  <span style="font-size:8px;color:${c};font-weight:700;letter-spacing:1px;">${lbl}</span>
                  <span style="font-size:8px;color:rgba(255,255,255,0.3);">${item.time || ""}</span>
                </div>
                <div style="font-size:10px;color:#e2e8f0;line-height:1.4;font-weight:600;">${(item.headline || "").slice(0, 80)}${item.headline?.length > 80 ? "..." : ""}</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:2px;">${item.source || ""}</div>
              </div>`;
          }).join("")}
        </div>`;

      marker.bindPopup(popupHtml, { className: "dark-popup", maxWidth: 320 });
      eventMarkersRef.current.push(marker);
    });
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map container */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Threat overlay - bottom left */}
      {analysis && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000,
          background: "rgba(7,11,15,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          padding: "10px 14px", minWidth: 150,
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
            NIVEL AMENINȚARE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: "1.4rem", fontWeight: 800,
              color: analysis.threat_level >= 8 ? "#ef4444" : analysis.threat_level >= 6 ? "#f97316" : analysis.threat_level >= 4 ? "#eab308" : "#22c55e",
            }}>
              {analysis.threat_level}
              <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>/10</span>
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", fontWeight: 700, color: analysis.threat_level >= 6 ? "#f97316" : "#eab308" }}>
              {analysis.threat_label}
            </span>
          </div>
          {analysis.escalation_probability != null && (
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.35)" }}>
              Escaladare: <span style={{ color: "#f97316" }}>{analysis.escalation_probability}%</span>
            </div>
          )}
        </div>
      )}

      {/* Event counter - top right of map */}
      {intelItems.length > 0 && (
        <div style={{
          position: "absolute", top: 48, right: 12, zIndex: 1000,
          background: "rgba(7,11,15,0.88)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          padding: "5px 10px", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(255,255,255,0.6)" }}>
            {intelItems.filter((i) => i.severity >= 4).length} critice · {intelItems.length} total
          </span>
        </div>
      )}

      {/* Legend - bottom right */}
      <div style={{
        position: "absolute", bottom: 12, right: 12, zIndex: 1000,
        background: "rgba(7,11,15,0.88)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
        padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 2 }}>LEGENDĂ</div>
        {[
          { color: "#ef4444", label: "CRITIC / Nuclear" },
          { color: "#f97316", label: "RIDICAT / Militar" },
          { color: "#06b6d4", label: "NAVAL / US Baze" },
          { color: "#8b5cf6", label: "Capitale" },
          { color: "#22d3ee", label: "Chokepoints" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 4px ${color}66` }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4, marginTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e" }} />
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.4)" }}>📡 Intel live</span>
          </div>
        </div>
      </div>

      {/* Selected zone detail */}
      {selectedZone && (
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 1001,
          background: "rgba(7,11,15,0.95)", backdropFilter: "blur(12px)",
          border: `1px solid ${TYPE_COLORS[selectedZone.type]}44`, borderRadius: 8,
          padding: "12px 16px", maxWidth: 260,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "1.1rem" }}>{selectedZone.icon}</span>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: TYPE_COLORS[selectedZone.type] }}>{selectedZone.name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>{selectedZone.country.toUpperCase()}</div>
              </div>
            </div>
            <button onClick={() => setSelectedZone(null)} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", padding: 2 }}>✕</button>
          </div>
          <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: "0 0 6px" }}>{selectedZone.info}</p>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 1, fontWeight: 700,
            padding: "2px 8px", borderRadius: 4,
            background: `${RISK_COLORS[selectedZone.risk]}18`,
            color: RISK_COLORS[selectedZone.risk],
            border: `1px solid ${RISK_COLORS[selectedZone.risk]}44`,
          }}>
            RISC {selectedZone.risk.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
