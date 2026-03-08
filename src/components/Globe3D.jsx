import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const SEVERITY_COLORS = {
  5: "#FF3B30", 4: "#FFB020", 3: "#FFD60A", 2: "#30D158", 1: "#30D158",
};

// Strategic locations with labels
const BASES = [
  { lat: 35.6892, lng: 51.389, name: "Tehran", type: "capital", color: "#FF3B30", size: 0.7, label: true },
  { lat: 32.6546, lng: 51.668, name: "Isfahan/Natanz", type: "nuclear", color: "#FF3B30", size: 0.6, label: true },
  { lat: 34.0048, lng: 51.4025, name: "Fordow", type: "nuclear", color: "#FF3B30", size: 0.5 },
  { lat: 28.9784, lng: 50.836, name: "Bushehr", type: "nuclear", color: "#FF3B30", size: 0.5 },
  { lat: 31.7683, lng: 35.2137, name: "Jerusalem", type: "capital", color: "#3B82F6", size: 0.7, label: true },
  { lat: 32.0853, lng: 34.7818, name: "Tel Aviv", type: "command", color: "#3B82F6", size: 0.6, label: true },
  { lat: 31.5017, lng: 34.4674, name: "Gaza", type: "conflict", color: "#FF3B30", size: 0.8, label: true },
  { lat: 25.4111, lng: 51.226, name: "Al Udeid AFB", type: "us_base", color: "#60A5FA", size: 0.5, label: true },
  { lat: 26.2285, lng: 50.586, name: "5th Fleet HQ", type: "us_base", color: "#60A5FA", size: 0.5, label: true },
  { lat: 24.4539, lng: 54.3773, name: "Al Dhafra AFB", type: "us_base", color: "#60A5FA", size: 0.5 },
  { lat: 15.3694, lng: 44.191, name: "Sanaa (Houthis)", type: "proxy", color: "#FB923C", size: 0.6, label: true },
  { lat: 33.8938, lng: 35.5018, name: "Beirut (Hezbollah)", type: "proxy", color: "#FB923C", size: 0.6, label: true },
  { lat: 26.5667, lng: 56.25, name: "Strait of Hormuz", type: "chokepoint", color: "#22D3EE", size: 0.7, label: true },
  { lat: 12.5833, lng: 43.1453, name: "Bab el-Mandeb", type: "chokepoint", color: "#22D3EE", size: 0.6, label: true },
  { lat: 30.425, lng: 32.3444, name: "Suez Canal", type: "chokepoint", color: "#22D3EE", size: 0.6 },
  { lat: 27.1832, lng: 56.2765, name: "Bandar Abbas", type: "naval", color: "#FF3B30", size: 0.5, label: true },
  { lat: 29.0700, lng: 48.08, name: "Kharg Island", type: "energy", color: "#F59E0B", size: 0.5 },
  { lat: 30.9563, lng: 34.9498, name: "Dimona", type: "nuclear", color: "#3B82F6", size: 0.5 },
  { lat: 33.5138, lng: 36.2765, name: "Damascus", type: "capital", color: "#FB923C", size: 0.5 },
  { lat: 33.3152, lng: 44.3661, name: "Baghdad", type: "capital", color: "#FB923C", size: 0.5 },
  { lat: 38.08, lng: 46.2919, name: "Tabriz", type: "military", color: "#FF3B30", size: 0.4 },
  { lat: 29.6168, lng: 52.5319, name: "Shiraz", type: "military", color: "#FF3B30", size: 0.4 },
  { lat: 14.7978, lng: 42.9547, name: "Hodeidah", type: "proxy", color: "#FB923C", size: 0.5 },
  { lat: 25.2048, lng: 55.2708, name: "Dubai", type: "gulf", color: "#F59E0B", size: 0.4 },
  { lat: 24.7136, lng: 46.6753, name: "Riyadh", type: "gulf", color: "#F59E0B", size: 0.4 },
];

// More arcs showing conflict dynamics
const CONFLICT_ARCS = [
  { startLat: 35.69, startLng: 51.39, endLat: 31.77, endLng: 35.21, color: ["#FF3B3088", "#FF3B3044"], label: "Iran → Israel", stroke: 0.8 },
  { startLat: 31.77, startLng: 35.21, endLat: 35.69, endLng: 51.39, color: ["#3B82F688", "#3B82F644"], label: "Israel → Iran", stroke: 0.6 },
  { startLat: 15.37, startLng: 44.19, endLat: 12.58, endLng: 43.15, color: ["#FB923C88", "#FB923C44"], label: "Houthis → Bab el-Mandeb", stroke: 0.6 },
  { startLat: 33.89, startLng: 35.50, endLat: 31.77, endLng: 35.21, color: ["#FB923C88", "#FB923C44"], label: "Hezbollah → Israel", stroke: 0.6 },
  { startLat: 25.41, startLng: 51.23, endLat: 26.57, endLng: 56.25, color: ["#60A5FA88", "#60A5FA44"], label: "Al Udeid → Hormuz", stroke: 0.5 },
  { startLat: 15.37, startLng: 44.19, endLat: 20.00, endLng: 38.00, color: ["#FB923C88", "#FB923C44"], label: "Houthis → Red Sea", stroke: 0.5 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.89, endLng: 35.50, color: ["#FF3B3066", "#FF3B3033"], label: "Iran → Hezbollah", stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 15.37, endLng: 44.19, color: ["#FF3B3066", "#FF3B3033"], label: "Iran → Houthis", stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.32, endLng: 44.37, color: ["#FF3B3044", "#FF3B3022"], label: "Iran → Iraq Militias", stroke: 0.3 },
];

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
  "kharg island": [29.07, 48.08], mecca: [21.4225, 39.8262],
  "west bank": [31.95, 35.2], erbil: [36.19, 44.01],
};

function extractCoords(item) {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(" ").toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return { lat: coords[0], lng: coords[1] };
  }
  return null;
}

function GlobeFallback({ error }) {
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse at center, #0a1628 0%, #060A0F 70%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "#FF3B30", letterSpacing: 2, marginBottom: 8 }}>GLOBE ERROR</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>{error?.message || "3D rendering failed"}</div>
      </div>
    </div>
  );
}

function Globe3DInner({ intelItems = [], onSelectEvent, selectedEvent }) {
  const wrapperRef = useRef(null);
  const globeMountRef = useRef(null);
  const globeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Memoize event points with stable random offsets
  const eventPoints = useCallback(() => {
    return intelItems.map((item, idx) => {
      const coords = extractCoords(item);
      if (!coords) return null;
      // Use index-based offset instead of random (prevents jittering on re-render)
      const offset = ((idx * 7919) % 100) / 100; // deterministic pseudo-random
      return {
        lat: coords.lat + (offset - 0.5) * 0.4,
        lng: coords.lng + (((idx * 104729) % 100) / 100 - 0.5) * 0.4,
        color: SEVERITY_COLORS[item.severity] || "#00E5FF",
        size: item.severity >= 5 ? 1.5 : item.severity >= 4 ? 1.0 : 0.6,
        altitude: 0.01 + (item.severity || 3) * 0.006,
        item,
        label: item.headline,
      };
    }).filter(Boolean);
  }, [intelItems]);

  useEffect(() => {
    if (!wrapperRef.current || globeRef.current) return;

    const mountDiv = document.createElement("div");
    mountDiv.style.cssText = "width:100%;height:100%;position:absolute;inset:0;";
    wrapperRef.current.appendChild(mountDiv);
    globeMountRef.current = mountDiv;

    let cancelled = false;
    let resizeHandler = null;

    import("globe.gl").then((GlobeModule) => {
      if (cancelled) { mountDiv.remove(); return; }

      const Globe = GlobeModule.default;

      const globe = Globe()
        // HD textures
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
        .showAtmosphere(true)
        .atmosphereColor("rgba(0,229,255,0.5)")
        .atmosphereAltitude(0.2)
        .width(mountDiv.clientWidth)
        .height(mountDiv.clientHeight)
        .pointOfView({ lat: 28, lng: 46, altitude: 2.0 }, 0)
        // Strategic base markers with labels
        .customLayerData(BASES)
        .customThreeObject((d) => {
          const group = new THREE.Group();
          // Outer pulsing ring
          const outerRing = new THREE.RingGeometry(d.size * 0.9, d.size * 1.1, 32);
          const outerMat = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
          group.add(new THREE.Mesh(outerRing, outerMat));
          // Inner ring
          const innerRing = new THREE.RingGeometry(d.size * 0.5, d.size * 0.8, 32);
          const innerMat = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
          group.add(new THREE.Mesh(innerRing, innerMat));
          // Center dot
          const dotGeo = new THREE.CircleGeometry(d.size * 0.25, 16);
          const dotMat = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide });
          group.add(new THREE.Mesh(dotGeo, dotMat));
          return group;
        })
        .customThreeObjectUpdate((obj, d) => {
          Object.assign(obj.position, globe.getCoords(d.lat, d.lng, 0.01));
          obj.lookAt(0, 0, 0);
          obj.rotateZ(Math.PI);
          // Animate outer ring opacity
          if (obj.children[0]) {
            const t = Date.now() * 0.001;
            obj.children[0].material.opacity = 0.15 + Math.sin(t * 2) * 0.15;
          }
        })
        // Conflict arcs
        .arcsData(CONFLICT_ARCS)
        .arcColor("color")
        .arcDashLength(0.5)
        .arcDashGap(0.15)
        .arcDashAnimateTime(1500)
        .arcStroke(d => d.stroke || 0.5)
        .arcAltitudeAutoScale(0.35)
        .arcLabel("label")
        // Base labels as HTML
        .labelsData(BASES.filter(b => b.label))
        .labelLat(d => d.lat)
        .labelLng(d => d.lng)
        .labelText(d => d.name)
        .labelSize(0.6)
        .labelDotRadius(0.15)
        .labelColor(d => d.color)
        .labelResolution(2)
        .labelAltitude(0.015)
        // Event markers as HTML elements
        .htmlElementsData([])
        .htmlElement((d) => {
          const el = document.createElement("div");
          const sz = 8 + (d.item?.severity || 3) * 4;
          el.style.cssText = `
            width: ${sz}px; height: ${sz}px; border-radius: 50%;
            background: radial-gradient(circle, ${d.color} 0%, ${d.color}88 40%, transparent 70%);
            box-shadow: 0 0 ${(d.item?.severity || 3) * 6}px ${d.color}, 0 0 ${(d.item?.severity || 3) * 12}px ${d.color}44;
            cursor: pointer; transition: transform 0.2s;
            animation: pulse 2s ease infinite;
            border: 1px solid ${d.color}88;
          `;
          // Add tooltip
          const tooltip = document.createElement("div");
          tooltip.style.cssText = `
            position: absolute; bottom: ${sz + 4}px; left: 50%; transform: translateX(-50%);
            background: rgba(6,10,15,0.92); border: 1px solid ${d.color}44; border-radius: 4px;
            padding: 3px 6px; white-space: nowrap; pointer-events: none;
            font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #e2e8f0;
            opacity: 0; transition: opacity 0.2s; backdrop-filter: blur(8px);
            max-width: 200px; overflow: hidden; text-overflow: ellipsis;
          `;
          tooltip.textContent = d.label || "";
          el.appendChild(tooltip);
          el.onclick = () => onSelectEvent?.(d.item);
          el.onmouseenter = () => { el.style.transform = "scale(1.6)"; tooltip.style.opacity = "1"; };
          el.onmouseleave = () => { el.style.transform = "scale(1)"; tooltip.style.opacity = "0"; };
          return el;
        })
        .htmlAltitude((d) => d.altitude || 0.015)
        (mountDiv);

      globeRef.current = globe;

      // Better globe material
      const globeMaterial = globe.globeMaterial();
      globeMaterial.bumpScale = 3;
      globeMaterial.emissive = new THREE.Color("#061833");
      globeMaterial.emissiveIntensity = 0.15;
      globeMaterial.shininess = 20;

      // Add ambient and directional light
      const scene = globe.scene();
      scene.add(new THREE.AmbientLight(0x334477, 1.0));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 3, 5);
      scene.add(dirLight);

      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.25;
      globe.controls().enableDamping = true;
      globe.controls().dampingFactor = 0.12;
      globe.controls().minDistance = 150;
      globe.controls().maxDistance = 600;

      resizeHandler = () => {
        if (mountDiv.parentNode && globeRef.current) {
          globe.width(mountDiv.clientWidth);
          globe.height(mountDiv.clientHeight);
        }
      };
      window.addEventListener("resize", resizeHandler);
      setReady(true);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (globeRef.current) {
        try { globeRef.current._destructor?.(); } catch {}
        globeRef.current = null;
      }
      try { mountDiv.remove(); } catch {}
      globeMountRef.current = null;
    };
  }, []);

  // Update event HTML elements when intel changes
  useEffect(() => {
    if (!globeRef.current || !ready) return;
    const points = eventPoints();
    globeRef.current.htmlElementsData(points);
  }, [intelItems, ready, eventPoints]);

  // Fly to selected event
  useEffect(() => {
    if (!globeRef.current || !selectedEvent) return;
    const coords = extractCoords(selectedEvent);
    if (coords) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.4 }, 1000);
      globeRef.current.controls().autoRotate = false;
    }
  }, [selectedEvent]);

  return (
    <div ref={wrapperRef} style={{
      width: "100%", height: "100%", position: "relative",
      background: "radial-gradient(ellipse at center, #081428 0%, #040810 50%, #020408 100%)",
    }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "2px solid rgba(0,229,255,0.3)", borderTopColor: "#00E5FF",
              animation: "spin 1s linear infinite", margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(0,229,255,0.2)",
            }} />
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "#00E5FF", letterSpacing: 4, marginBottom: 6 }}>INITIALIZING GLOBE</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(0,229,255,0.3)", letterSpacing: 2 }}>LOADING HD TEXTURES...</div>
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
