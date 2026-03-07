import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const EVENT_COLORS = {
  strike: "#FF3B30",
  missile: "#FF3B30",
  naval: "#00E5FF",
  air: "#A78BFA",
  nuclear: "#FF3B30",
  diplomatic: "#A78BFA",
  economic: "#FFD60A",
  protest: "#FFB020",
  default: "#00E5FF",
};

const SEVERITY_COLORS = {
  5: "#FF3B30",
  4: "#FFB020",
  3: "#FFD60A",
  2: "#30D158",
  1: "#30D158",
};

// Strategic locations to show as static points
const BASES = [
  { lat: 35.6892, lng: 51.389, name: "Tehran", type: "capital", color: "#FF3B30", size: 0.6 },
  { lat: 32.6546, lng: 51.668, name: "Isfahan/Natanz", type: "nuclear", color: "#FF3B30", size: 0.5 },
  { lat: 34.0048, lng: 51.4025, name: "Fordow", type: "nuclear", color: "#FF3B30", size: 0.5 },
  { lat: 31.7683, lng: 35.2137, name: "Jerusalem", type: "capital", color: "#3B82F6", size: 0.6 },
  { lat: 32.0853, lng: 34.7818, name: "Tel Aviv", type: "command", color: "#3B82F6", size: 0.5 },
  { lat: 31.5017, lng: 34.4674, name: "Gaza", type: "conflict", color: "#FF3B30", size: 0.7 },
  { lat: 25.4111, lng: 51.226, name: "Al Udeid", type: "us_base", color: "#3B82F6", size: 0.4 },
  { lat: 26.2285, lng: 50.586, name: "Bahrain 5th Fleet", type: "us_base", color: "#3B82F6", size: 0.4 },
  { lat: 24.4539, lng: 54.3773, name: "Al Dhafra", type: "us_base", color: "#3B82F6", size: 0.4 },
  { lat: 15.3694, lng: 44.191, name: "Sanaa (Houthis)", type: "proxy", color: "#FB923C", size: 0.5 },
  { lat: 33.8938, lng: 35.5018, name: "Beirut (Hezbollah)", type: "proxy", color: "#FB923C", size: 0.5 },
  { lat: 26.5667, lng: 56.25, name: "Strait of Hormuz", type: "chokepoint", color: "#22D3EE", size: 0.6 },
  { lat: 12.5833, lng: 43.1453, name: "Bab el-Mandeb", type: "chokepoint", color: "#22D3EE", size: 0.5 },
  { lat: 30.425, lng: 32.3444, name: "Suez Canal", type: "chokepoint", color: "#22D3EE", size: 0.5 },
  { lat: 27.1832, lng: 56.2765, name: "Bandar Abbas", type: "naval", color: "#FF3B30", size: 0.4 },
  { lat: 29.0700, lng: 48.08, name: "Kharg Island", type: "energy", color: "#F59E0B", size: 0.4 },
];

// Location extraction for events
const LOCATION_MAP = {
  tehran: [35.6892, 51.389], isfahan: [32.6546, 51.668], natanz: [32.8505, 51.6857],
  fordow: [34.0048, 51.4025], bushehr: [28.9784, 50.836], shiraz: [29.6168, 52.5319],
  tabriz: [38.08, 46.2919], mashhad: [36.2605, 59.6168], bandar: [27.1832, 56.2765],
  jerusalem: [31.7683, 35.2137], "tel aviv": [32.0853, 34.7818], haifa: [32.794, 34.9896],
  gaza: [31.5017, 34.4674], rafah: [31.2831, 34.2575], dimona: [30.9563, 34.9498],
  beirut: [33.8938, 35.5018], damascus: [33.5138, 36.2765], baghdad: [33.3152, 44.3661],
  sanaa: [15.3694, 44.191], aden: [12.8028, 45.0286], hodeida: [14.7978, 42.9547],
  hormuz: [26.5667, 56.25], suez: [30.425, 32.3444], dubai: [25.2048, 55.2708],
  doha: [25.2854, 51.531], riyadh: [24.7136, 46.6753], iran: [32.5, 53.7],
  israel: [31.5, 34.8], yemen: [16, 48], lebanon: [33.9, 35.8], syria: [34.8, 38.9],
  iraq: [33.2, 43.7], "red sea": [20, 38], "persian gulf": [26.5, 52],
};

function extractCoords(item) {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(" ").toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return { lat: coords[0], lng: coords[1] };
  }
  return null;
}

function detectEventType(text) {
  if (!text) return "default";
  const t = text.toLowerCase();
  if (/strike|atac|bomb|airstrike/.test(t)) return "strike";
  if (/missile|rachet|balistic|intercept/.test(t)) return "missile";
  if (/naval|ship|carrier|destroyer|fleet/.test(t)) return "naval";
  if (/aircraft|f-35|drone|uav|airspace/.test(t)) return "air";
  if (/nuclear|uraniu|centrifuge|iaea/.test(t)) return "nuclear";
  if (/diplomat|un|nato|negotiat|summit/.test(t)) return "diplomatic";
  if (/oil|sanction|trade|market|economic/.test(t)) return "economic";
  return "default";
}

function GlobeFallback({ error }) {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse at center, #0a1628 0%, #060A0F 70%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "#FF3B30", letterSpacing: 2, marginBottom: 8 }}>
          GLOBE ERROR
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
          {error?.message || "3D rendering failed"}
        </div>
      </div>
    </div>
  );
}

function Globe3DInner({ intelItems = [], onSelectEvent, selectedEvent }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Process intel items into globe points
  const eventPoints = useCallback(() => {
    return intelItems.map((item, i) => {
      const coords = extractCoords(item);
      if (!coords) return null;
      const type = detectEventType([item.headline, item.summary].join(" "));
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.3,
        lng: coords.lng + (Math.random() - 0.5) * 0.3,
        color: SEVERITY_COLORS[item.severity] || EVENT_COLORS[type] || "#00E5FF",
        size: item.severity >= 5 ? 1.2 : item.severity >= 4 ? 0.8 : 0.5,
        altitude: 0.01 + (item.severity || 3) * 0.005,
        item,
        label: item.headline,
      };
    }).filter(Boolean);
  }, [intelItems]);

  // Generate arcs between related points (e.g., Iran->Israel, Yemen->Red Sea)
  const arcsData = useCallback(() => {
    const arcs = [
      { startLat: 35.69, startLng: 51.39, endLat: 31.77, endLng: 35.21, color: ["#FF3B3066", "#FF3B3066"], label: "Iran → Israel" },
      { startLat: 15.37, startLng: 44.19, endLat: 12.58, endLng: 43.15, color: ["#FB923C66", "#FB923C66"], label: "Houthis → Bab el-Mandeb" },
      { startLat: 33.89, startLng: 35.50, endLat: 31.77, endLng: 35.21, color: ["#FB923C66", "#FB923C66"], label: "Hezbollah → Israel" },
      { startLat: 25.41, startLng: 51.23, endLat: 26.57, endLng: 56.25, color: ["#3B82F666", "#3B82F666"], label: "Al Udeid → Hormuz" },
    ];
    return arcs;
  }, []);

  useEffect(() => {
    if (!containerRef.current || globeRef.current) return;

    import("globe.gl").then((GlobeModule) => {
      const Globe = GlobeModule.default;

      const globe = Globe()
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
        .showAtmosphere(true)
        .atmosphereColor("#00E5FF")
        .atmosphereAltitude(0.15)
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .pointOfView({ lat: 28, lng: 48, altitude: 2.2 }, 0)
        // Base points (strategic locations)
        .customLayerData(BASES)
        .customThreeObject((d) => {
          const group = new THREE.Group();
          // Outer ring
          const ringGeo = new THREE.RingGeometry(d.size * 0.8, d.size, 32);
          const ringMat = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          group.add(ring);
          // Center dot
          const dotGeo = new THREE.CircleGeometry(d.size * 0.3, 16);
          const dotMat = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          group.add(dot);
          return group;
        })
        .customThreeObjectUpdate((obj, d) => {
          Object.assign(obj.position, globe.getCoords(d.lat, d.lng, 0.01));
          obj.lookAt(0, 0, 0);
          obj.rotateZ(Math.PI);
        })
        // Arcs
        .arcsData(arcsData())
        .arcColor("color")
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .arcStroke(0.5)
        .arcAltitudeAutoScale(0.3)
        // HTML labels for event points (will add dynamically)
        .htmlElementsData([])
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.style.cssText = `
            width: ${8 + (d.item?.severity || 3) * 3}px;
            height: ${8 + (d.item?.severity || 3) * 3}px;
            border-radius: 50%;
            background: ${d.color};
            box-shadow: 0 0 ${(d.item?.severity || 3) * 4}px ${d.color};
            cursor: pointer;
            transition: transform 0.2s;
            animation: pulse 2s ease infinite;
          `;
          el.title = d.label || "";
          el.onclick = () => onSelectEvent?.(d.item);
          el.onmouseenter = () => { el.style.transform = "scale(1.8)"; };
          el.onmouseleave = () => { el.style.transform = "scale(1)"; };
          return el;
        })
        .htmlAltitude((d) => d.altitude || 0.01)
        (containerRef.current);

      // Store reference
      globeRef.current = globe;

      // Auto-rotate slowly
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.3;
      globe.controls().enableDamping = true;
      globe.controls().dampingFactor = 0.1;

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && globeRef.current) {
          globe.width(containerRef.current.clientWidth);
          globe.height(containerRef.current.clientHeight);
        }
      };
      window.addEventListener("resize", handleResize);

      setReady(true);

      return () => window.removeEventListener("resize", handleResize);
    });

    return () => {
      if (globeRef.current) {
        globeRef.current._destructor?.();
        globeRef.current = null;
      }
    };
  }, []);

  // Update event points when intel changes
  useEffect(() => {
    if (!globeRef.current || !ready) return;
    const points = eventPoints();
    globeRef.current.htmlElementsData(points);
  }, [intelItems, ready, eventPoints]);

  // Focus on selected event
  useEffect(() => {
    if (!globeRef.current || !selectedEvent) return;
    const coords = extractCoords(selectedEvent);
    if (coords) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.5 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
  }, [selectedEvent]);

  return (
    <div ref={containerRef} style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse at center, #0a1628 0%, #060A0F 70%)",
    }}>
      {!ready && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, border: "2px solid #00E5FF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "#00E5FF", letterSpacing: 3 }}>INITIALIZING GLOBE</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Error boundary wrapper
import { Component } from "react";
class GlobeErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <GlobeFallback error={this.state.error} />;
    return this.props.children;
  }
}

export default function Globe3D(props) {
  return (
    <GlobeErrorBoundary>
      <Globe3DInner {...props} />
    </GlobeErrorBoundary>
  );
}
