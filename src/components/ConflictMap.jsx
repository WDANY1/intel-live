import { useEffect, useRef, useState } from "react";

// Static strategic locations
const CONFLICT_ZONES = [
  { lat: 35.6892, lng: 51.3890, name: "Tehran", country: "Iran", type: "capital", icon: "🏛️", info: "Iran Capital — Command Center", risk: "high" },
  { lat: 32.6546, lng: 51.6680, name: "Isfahan", country: "Iran", type: "nuclear", icon: "☢️", info: "Uranium Conversion Facility UCF", risk: "critical" },
  { lat: 34.3277, lng: 47.0778, name: "Kermanshah", country: "Iran", type: "military", icon: "🎯", info: "IRGC Ballistic Missile Base", risk: "high" },
  { lat: 32.8505, lng: 51.6857, name: "Natanz", country: "Iran", type: "nuclear", icon: "☢️", info: "Uranium Enrichment Center", risk: "critical" },
  { lat: 34.0048, lng: 51.4025, name: "Qom/Fordow", country: "Iran", type: "nuclear", icon: "☢️", info: "Underground Facility Fordow", risk: "critical" },
  { lat: 28.9784, lng: 50.8361, name: "Bushehr", country: "Iran", type: "nuclear", icon: "☢️", info: "Nuclear Power Plant", risk: "high" },
  { lat: 27.1832, lng: 56.2765, name: "Bandar Abbas", country: "Iran", type: "naval", icon: "⚓", info: "Main Naval Base", risk: "high" },
  { lat: 36.2605, lng: 59.6168, name: "Mashhad", country: "Iran", type: "military", icon: "🎯", info: "Air Base & Missiles", risk: "medium" },
  { lat: 29.6168, lng: 52.5319, name: "Shiraz", country: "Iran", type: "military", icon: "✈️", info: "Tactical Air Base", risk: "medium" },
  { lat: 38.0800, lng: 46.2919, name: "Tabriz", country: "Iran", type: "military", icon: "🎯", info: "IRGC Northwest Base", risk: "medium" },
  { lat: 31.7683, lng: 35.2137, name: "Jerusalem", country: "Israel", type: "capital", icon: "🏛️", info: "Capital of Israel", risk: "high" },
  { lat: 32.0853, lng: 34.7818, name: "Tel Aviv", country: "Israel", type: "command", icon: "🏢", info: "IDF Command Center — Kirya", risk: "high" },
  { lat: 32.7940, lng: 34.9896, name: "Haifa", country: "Israel", type: "naval", icon: "⚓", info: "Main Naval Base", risk: "high" },
  { lat: 31.2357, lng: 34.7925, name: "Beer Sheva", country: "Israel", type: "military", icon: "🎯", info: "IDF Southern Command", risk: "medium" },
  { lat: 30.9563, lng: 34.9498, name: "Dimona", country: "Israel", type: "nuclear", icon: "☢️", info: "Negev Nuclear Reactor", risk: "critical" },
  { lat: 29.5581, lng: 34.9482, name: "Eilat", country: "Israel", type: "naval", icon: "⚓", info: "Red Sea Strategic Port", risk: "medium" },
  { lat: 31.8644, lng: 34.7309, name: "Palmachim", country: "Israel", type: "military", icon: "🚀", info: "Arrow/Iron Dome Launch Base", risk: "high" },
  { lat: 30.6393, lng: 34.6670, name: "Nevatim", country: "Israel", type: "military", icon: "✈️", info: "F-35I Adir Air Base", risk: "high" },
  { lat: 31.5017, lng: 34.4674, name: "Gaza", country: "Palestine", type: "proxy", icon: "🎯", info: "Active Conflict — Hamas", risk: "critical" },
  { lat: 24.4539, lng: 54.3773, name: "Al Dhafra", country: "UAE", type: "base_us", icon: "🇺🇸", info: "USAF Air Base", risk: "medium" },
  { lat: 25.4111, lng: 51.2260, name: "Al Udeid", country: "Qatar", type: "base_us", icon: "🇺🇸", info: "CENTCOM Forward HQ", risk: "high" },
  { lat: 26.2285, lng: 50.5860, name: "Manama", country: "Bahrain", type: "base_us", icon: "🇺🇸", info: "US Navy 5th Fleet", risk: "high" },
  { lat: 29.3117, lng: 47.4818, name: "Kuwait City", country: "Kuwait", type: "base_us", icon: "🇺🇸", info: "Camp Arifjan — US Army", risk: "medium" },
  { lat: 23.5880, lng: 58.3829, name: "Muscat", country: "Oman", type: "strategic", icon: "⚓", info: "Strait of Hormuz — Entry", risk: "medium" },
  { lat: 33.8938, lng: 35.5018, name: "Beirut", country: "Lebanon", type: "proxy", icon: "🎯", info: "Hezbollah HQ", risk: "high" },
  { lat: 33.5138, lng: 36.2765, name: "Damascus", country: "Syria", type: "proxy", icon: "🎯", info: "Iranian Military Presence", risk: "high" },
  { lat: 33.3152, lng: 44.3661, name: "Baghdad", country: "Iraq", type: "proxy", icon: "🎯", info: "PMF Pro-Iran Militias", risk: "medium" },
  { lat: 15.3694, lng: 44.1910, name: "Sanaa", country: "Yemen", type: "proxy", icon: "🎯", info: "Houthi — Anti-Ship Missiles", risk: "high" },
  { lat: 12.8028, lng: 45.0286, name: "Aden", country: "Yemen", type: "strategic", icon: "⚓", info: "Bab el-Mandeb Approach", risk: "high" },
  { lat: 26.5667, lng: 56.2500, name: "Hormuz", country: "Intl", type: "chokepoint", icon: "🚢", info: "20% Global Oil Transit", risk: "critical" },
  { lat: 12.5833, lng: 43.1453, name: "Bab el-Mandeb", country: "Intl", type: "chokepoint", icon: "🚢", info: "Active Houthi Attacks", risk: "critical" },
  { lat: 30.4250, lng: 32.3444, name: "Suez Canal", country: "Egypt", type: "chokepoint", icon: "🚢", info: "12% Global Trade", risk: "high" },
];

// Location extraction
const LOCATION_COORDS = {
  "tehran": { lat: 35.6892, lng: 51.3890 }, "isfahan": { lat: 32.6546, lng: 51.6680 },
  "natanz": { lat: 32.8505, lng: 51.6857 }, "fordow": { lat: 34.0048, lng: 51.4025 },
  "bandar abbas": { lat: 27.1832, lng: 56.2765 }, "bushehr": { lat: 28.9784, lng: 50.8361 },
  "mashhad": { lat: 36.2605, lng: 59.6168 }, "tabriz": { lat: 38.0800, lng: 46.2919 },
  "shiraz": { lat: 29.6168, lng: 52.5319 }, "kermanshah": { lat: 34.3277, lng: 47.0778 },
  "jerusalem": { lat: 31.7683, lng: 35.2137 }, "tel aviv": { lat: 32.0853, lng: 34.7818 },
  "haifa": { lat: 32.7940, lng: 34.9896 }, "dimona": { lat: 30.9563, lng: 34.9498 },
  "eilat": { lat: 29.5581, lng: 34.9482 }, "gaza": { lat: 31.5017, lng: 34.4674 },
  "rafah": { lat: 31.2831, lng: 34.2575 }, "beirut": { lat: 33.8938, lng: 35.5018 },
  "damascus": { lat: 33.5138, lng: 36.2765 }, "baghdad": { lat: 33.3152, lng: 44.3661 },
  "sanaa": { lat: 15.3694, lng: 44.1910 }, "aden": { lat: 12.8028, lng: 45.0286 },
  "hodeida": { lat: 14.7978, lng: 42.9547 }, "hormuz": { lat: 26.5667, lng: 56.2500 },
  "bab el-mandeb": { lat: 12.5833, lng: 43.1453 }, "suez": { lat: 30.4250, lng: 32.3444 },
  "dubai": { lat: 25.2048, lng: 55.2708 }, "doha": { lat: 25.2854, lng: 51.5310 },
  "riyadh": { lat: 24.7136, lng: 46.6753 }, "kuwait": { lat: 29.3117, lng: 47.4818 },
  "al udeid": { lat: 25.4111, lng: 51.2260 }, "red sea": { lat: 20.0, lng: 38.0 },
  "persian gulf": { lat: 26.5, lng: 52.0 }, "israel": { lat: 31.5, lng: 34.8 },
  "iran": { lat: 32.5, lng: 53.7 }, "yemen": { lat: 16.0, lng: 48.0 },
  "lebanon": { lat: 33.9, lng: 35.8 }, "liban": { lat: 33.9, lng: 35.8 },
  "syria": { lat: 34.8, lng: 38.9 }, "iraq": { lat: 33.2, lng: 43.7 },
};

function extractLocation(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (key.includes(" ") && lower.includes(key)) return { ...coords, name: key };
  }
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (!key.includes(" ") && lower.includes(key)) return { ...coords, name: key };
  }
  return null;
}

// Event type detection
const EVENT_TYPES = {
  strike: { keywords: ["strike", "atac", "bombardment", "airstrike", "bomb"], icon: "💥", color: "#FF3B30" },
  missile: { keywords: ["missile", "rachet", "balistic", "ICBM", "cruise", "intercept"], icon: "🚀", color: "#FF3B30" },
  naval: { keywords: ["naval", "ship", "nav", "carrier", "destroyer", "submarine", "fleet"], icon: "🚢", color: "#00E5FF" },
  air: { keywords: ["aircraft", "F-35", "avion", "aerian", "airspace", "drone", "UAV"], icon: "✈️", color: "#A78BFA" },
  protest: { keywords: ["protest", "demonstra", "manifesta", "riot", "civil unrest"], icon: "✊", color: "#FFB020" },
  economic: { keywords: ["oil", "petrol", "sanctions", "sanc", "trade", "embargo", "market"], icon: "📊", color: "#FFD60A" },
  nuclear: { keywords: ["nuclear", "uraniu", "centrifuge", "IAEA", "enrichment"], icon: "☢️", color: "#FF3B30" },
  diplomatic: { keywords: ["diplomatic", "UN", "NATO", "negotiat", "summit", "ambassador"], icon: "🏛️", color: "#A78BFA" },
};

function detectEventType(text) {
  if (!text) return { icon: "📡", color: "#00E5FF", type: "intel" };
  const lower = text.toLowerCase();
  for (const [type, cfg] of Object.entries(EVENT_TYPES)) {
    if (cfg.keywords.some((k) => lower.includes(k.toLowerCase()))) return { ...cfg, type };
  }
  return { icon: "📡", color: "#00E5FF", type: "intel" };
}

function jitter(val, amount = 0.2) {
  return val + (Math.random() - 0.5) * amount;
}

const RISK_COLORS = { critical: "#FF3B30", high: "#FFB020", medium: "#FFD60A", low: "#30D158" };
const TYPE_COLORS = {
  capital: "#A78BFA", nuclear: "#FF3B30", military: "#FFB020", naval: "#00E5FF",
  command: "#D946EF", base_us: "#3B82F6", proxy: "#FB923C", strategic: "#FFD60A", chokepoint: "#22D3EE",
};

// Layer definitions
const LAYERS = [
  { id: "all", label: "ALL", color: "#E5E7EB" },
  { id: "military", label: "MILITARY", color: "#FFB020" },
  { id: "naval", label: "NAVAL", color: "#00E5FF" },
  { id: "nuclear", label: "NUCLEAR", color: "#FF3B30" },
  { id: "base_us", label: "US BASES", color: "#3B82F6" },
  { id: "proxy", label: "PROXY", color: "#FB923C" },
  { id: "chokepoint", label: "MARITIME", color: "#22D3EE" },
  { id: "events", label: "INTEL", color: "#00E5FF" },
];

export default function ConflictMap({ intelItems = [], analysis, externalLayer }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState("all");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const staticMarkersRef = useRef([]);
  const eventMarkersRef = useRef([]);
  const heatmapRef = useRef([]);

  useEffect(() => { if (externalLayer !== undefined) setActiveLayer(externalLayer); }, [externalLayer]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      const map = L.map(mapRef.current, {
        center: [29, 48], zoom: 5, zoomControl: false, attributionControl: false, minZoom: 3, maxZoom: 13,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd" }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      mapInstanceRef.current = map;
      window._leafletMap = map;
      window._L = L;
      renderStaticMarkers(L, map, "all");
      renderHeatmap(L, map);
      setMapReady(true);
    });
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderStaticMarkers(window._L, mapInstanceRef.current, activeLayer);
  }, [activeLayer, mapReady]);

  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderEventMarkers(window._L, mapInstanceRef.current, intelItems);
  }, [intelItems, mapReady, showEvents]);

  useEffect(() => {
    if (!mapReady || !window._L || !mapInstanceRef.current) return;
    renderHeatmap(window._L, mapInstanceRef.current);
  }, [showHeatmap, mapReady]);

  function renderHeatmap(L, map) {
    heatmapRef.current.forEach((c) => map.removeLayer(c));
    heatmapRef.current = [];
    if (!showHeatmap) return;

    const heatData = [
      ...CONFLICT_ZONES.filter((z) => z.risk === "critical").map((z) => ({ lat: z.lat, lng: z.lng, radius: 80000, intensity: 0.4 })),
      ...CONFLICT_ZONES.filter((z) => z.risk === "high").map((z) => ({ lat: z.lat, lng: z.lng, radius: 50000, intensity: 0.25 })),
      ...CONFLICT_ZONES.filter((z) => z.risk === "medium").map((z) => ({ lat: z.lat, lng: z.lng, radius: 30000, intensity: 0.15 })),
      { lat: 32.0, lng: 35.0, radius: 200000, intensity: 0.2 },
      { lat: 33.0, lng: 52.0, radius: 350000, intensity: 0.15 },
      { lat: 15.5, lng: 44.0, radius: 150000, intensity: 0.25 },
      { lat: 26.5, lng: 56.0, radius: 100000, intensity: 0.3 },
    ];

    heatData.forEach((h) => {
      const circle = L.circle([h.lat, h.lng], {
        radius: h.radius, stroke: false,
        fillColor: "#FF3B30", fillOpacity: h.intensity * 0.4,
      }).addTo(map);
      heatmapRef.current.push(circle);
    });
  }

  function renderStaticMarkers(L, map, layer) {
    staticMarkersRef.current.forEach((m) => map.removeLayer(m));
    staticMarkersRef.current = [];

    if (layer === "events") return;

    const filtered = layer === "all"
      ? CONFLICT_ZONES
      : CONFLICT_ZONES.filter((z) => z.type === layer || z.country.toLowerCase().includes(layer));

    filtered.forEach((zone) => {
      const color = TYPE_COLORS[zone.type] || "#94a3b8";
      const riskColor = RISK_COLORS[zone.risk] || "#94a3b8";
      const size = zone.risk === "critical" ? 14 : zone.risk === "high" ? 11 : 9;

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid ${riskColor};box-shadow:0 0 ${zone.risk === "critical" ? "12" : "6"}px ${color}88;${zone.risk === "critical" ? "animation:pulse 1.5s ease infinite;" : ""}"></div>`,
        iconSize: [size + 4, size + 4], iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;min-width:220px;color:#E5E7EB;background:#121821;padding:14px;border-radius:10px;border:1px solid ${color}44;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:16px;">${zone.icon}</span>
            <div>
              <div style="font-weight:700;color:${color};font-size:14px;">${zone.name}</div>
              <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:1px;">${zone.country.toUpperCase()} · ${zone.type.toUpperCase()}</div>
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.5;margin-bottom:8px;">${zone.info}</div>
          <span style="background:${riskColor}18;color:${riskColor};border:1px solid ${riskColor}44;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:1px;">RISK ${zone.risk.toUpperCase()}</span>
        </div>`, { className: "dark-popup", maxWidth: 300 });
      staticMarkersRef.current.push(marker);
    });

    // Nuclear range circles
    filtered.filter((z) => z.type === "nuclear").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], { radius: 50000, color: "#FF3B3044", fillColor: "#FF3B3011", fillOpacity: 0.3, weight: 1, dashArray: "5, 5" }).addTo(map);
      staticMarkersRef.current.push(circle);
    });

    // Iran missile range
    if (layer === "all" || layer === "military") {
      const rangeCircle = L.circle([32.6546, 51.6680], { radius: 2000000, color: "#FF3B3015", fillColor: "#FF3B3005", fillOpacity: 0.12, weight: 1, dashArray: "8, 4" }).addTo(map);
      staticMarkersRef.current.push(rangeCircle);
    }

    // Chokepoint halos
    filtered.filter((z) => z.type === "chokepoint").forEach((zone) => {
      const circle = L.circle([zone.lat, zone.lng], { radius: 30000, color: "#22D3EE44", fillColor: "#22D3EE11", fillOpacity: 0.3, weight: 2 }).addTo(map);
      staticMarkersRef.current.push(circle);
    });
  }

  function renderEventMarkers(L, map, items) {
    eventMarkersRef.current.forEach((m) => map.removeLayer(m));
    eventMarkersRef.current = [];
    if (!items?.length || !showEvents) return;

    const locationGroups = {};
    items.forEach((item) => {
      const locText = [item.headline, item.summary, item.location].filter(Boolean).join(" ");
      const loc = item.location ? (LOCATION_COORDS[item.location.toLowerCase()] || extractLocation(item.location)) : extractLocation(locText);
      if (!loc) return;
      const key = `${Math.round(loc.lat * 10)},${Math.round(loc.lng * 10)}`;
      if (!locationGroups[key]) locationGroups[key] = { lat: loc.lat, lng: loc.lng, items: [] };
      locationGroups[key].items.push(item);
    });

    Object.values(locationGroups).forEach((group) => {
      const maxSev = Math.max(...group.items.map((i) => i.severity || 3));
      const count = group.items.length;
      const topItem = group.items.reduce((a, b) => ((b.severity || 0) >= (a.severity || 0) ? b : a), group.items[0]);
      const eventType = detectEventType([topItem.headline, topItem.summary].join(" "));
      const sevColor = maxSev >= 5 ? "#FF3B30" : maxSev >= 4 ? "#FFB020" : maxSev >= 3 ? "#FFD60A" : "#30D158";
      const lat = jitter(group.lat, 0.12);
      const lng = jitter(group.lng, 0.12);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${sevColor}88;animation:zoomPulse 2s ease infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:${sevColor}22;border:1px solid ${sevColor}66;"></div>
          <span style="position:relative;font-size:14px;filter:drop-shadow(0 0 4px ${sevColor});">${eventType.icon}</span>
          ${count > 1 ? `<div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#121821;border:1.5px solid ${sevColor};display:flex;align-items:center;justify-content:center;font-size:9px;font-family:monospace;color:${sevColor};font-weight:700;">${Math.min(count, 9)}</div>` : ""}
        </div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      const topItems = group.items.slice(0, 3);
      marker.bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;min-width:240px;max-width:320px;color:#E5E7EB;background:#121821;padding:12px;border-radius:10px;border:1px solid ${sevColor}44;">
          <div style="font-size:10px;letter-spacing:2px;color:${eventType.color};margin-bottom:8px;font-weight:700;">
            ${eventType.icon} ${eventType.type.toUpperCase()} ${count > 1 ? `(${count} EVENTS)` : "EVENT"}
          </div>
          ${topItems.map((item) => {
            const sv = item.severity || 3;
            const c = sv >= 5 ? "#FF3B30" : sv >= 4 ? "#FFB020" : sv >= 3 ? "#FFD60A" : "#30D158";
            const lbl = sv >= 5 ? "CRIT" : sv >= 4 ? "HIGH" : sv >= 3 ? "MED" : "LOW";
            return `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;">
                <span style="width:6px;height:6px;border-radius:50%;background:${c};"></span>
                <span style="font-size:10px;color:${c};font-weight:700;">${lbl}</span>
                <span style="font-size:9px;color:rgba(255,255,255,0.35);">${item.time || ""}</span>
              </div>
              <div style="font-size:12px;color:#E5E7EB;line-height:1.4;font-weight:600;">${(item.headline || "").slice(0, 80)}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">${item.source || ""}</div>
            </div>`;
          }).join("")}
        </div>`, { className: "dark-popup", maxWidth: 340 });
      eventMarkersRef.current.push(marker);
    });
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── LAYER CONTROLS ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
        background: "rgba(18,24,33,0.95)", borderBottom: "1px solid var(--border)",
        flexShrink: 0, overflowX: "auto", backdropFilter: "blur(8px)",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-dim)", marginRight: 6, flexShrink: 0 }}>LAYERS</span>
        {LAYERS.map((l) => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)} style={{
            padding: "4px 10px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: 0.5,
            background: activeLayer === l.id ? `${l.color}15` : "rgba(255,255,255,0.03)",
            border: `1px solid ${activeLayer === l.id ? `${l.color}35` : "rgba(255,255,255,0.06)"}`,
            color: activeLayer === l.id ? l.color : "var(--text-muted)",
            cursor: "pointer", flexShrink: 0, transition: "all 0.15s", fontWeight: activeLayer === l.id ? 700 : 500,
          }}>{l.label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => setShowHeatmap(!showHeatmap)} style={{
            padding: "4px 10px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.6rem",
            background: showHeatmap ? "var(--alert-dim)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${showHeatmap ? "rgba(255,59,48,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: showHeatmap ? "#FF3B30" : "var(--text-muted)", cursor: "pointer", fontWeight: 600,
          }}>🔥 HEAT</button>
          <button onClick={() => setShowEvents(!showEvents)} style={{
            padding: "4px 10px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.6rem",
            background: showEvents ? "var(--accent-dim)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${showEvents ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: showEvents ? "#00E5FF" : "var(--text-muted)", cursor: "pointer", fontWeight: 600,
          }}>📡 EVENTS</button>
        </div>
      </div>

      {/* ── MAP ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Threat overlay */}
        {analysis && (
          <div style={{
            position: "absolute", bottom: 14, left: 14, zIndex: 1000,
            background: "rgba(18,24,33,0.94)", backdropFilter: "blur(12px)",
            border: "1px solid var(--border)", borderRadius: 10,
            padding: "12px 16px", minWidth: 160,
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-dim)", marginBottom: 4 }}>THREAT LEVEL</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "1.8rem", fontWeight: 800, color: analysis.threat_level >= 8 ? "#FF3B30" : analysis.threat_level >= 6 ? "#FFB020" : "#FFD60A" }}>
                {analysis.threat_level}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>/10</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 700, color: analysis.threat_level >= 6 ? "#FFB020" : "#FFD60A", marginLeft: 6 }}>{analysis.threat_label}</span>
            </div>
            {analysis.escalation_probability != null && (
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 3 }}>
                Escalation: <span style={{ color: "#FFB020", fontWeight: 700 }}>{analysis.escalation_probability}%</span>
              </div>
            )}
          </div>
        )}

        {/* Event counter */}
        {intelItems.length > 0 && (
          <div style={{
            position: "absolute", top: 10, right: 50, zIndex: 1000,
            background: "rgba(18,24,33,0.9)", backdropFilter: "blur(8px)",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: "5px 10px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF3B30", animation: "pulse 1.5s ease infinite" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              {intelItems.filter((i) => i.severity >= 4).length} critical · {intelItems.length} total
            </span>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 14, right: 14, zIndex: 1000,
          background: "rgba(18,24,33,0.9)", backdropFilter: "blur(8px)",
          border: "1px solid var(--border)", borderRadius: 8,
          padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 2, color: "var(--text-dim)", marginBottom: 3 }}>LEGEND</div>
          {[
            { icon: "☢️", color: "#FF3B30", label: "Nuclear" },
            { icon: "⚔️", color: "#FFB020", label: "Military" },
            { icon: "⚓", color: "#00E5FF", label: "Naval / US" },
            { icon: "🎯", color: "#FB923C", label: "Proxy Forces" },
            { icon: "🚢", color: "#22D3EE", label: "Chokepoints" },
          ].map(({ icon, color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.7rem" }}>{icon}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4, marginTop: 3 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 3 }}>EVENTS</div>
            {[
              { icon: "💥", label: "Strike" }, { icon: "🚀", label: "Missile" }, { icon: "✈️", label: "Airspace" },
              { icon: "✊", label: "Protest" }, { icon: "📊", label: "Economic" }, { icon: "🏛️", label: "Diplomatic" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: "0.65rem" }}>{icon}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
