'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { IntelItem, StrategicBase, ConflictArc, GlobeEventPoint, AircraftPosition, FireHotspot } from '@/lib/types'

// ── Severity config ──
const SEVERITY_COLORS: Record<number, string> = {
  5: '#FF3B30', 4: '#FFB020', 3: '#FFD60A', 2: '#30D158', 1: '#30D158',
}

// ── Strategic bases ──
const BASES: StrategicBase[] = [
  { lat: 35.6892, lng: 51.389, name: 'Tehran', type: 'capital', color: '#FF3B30', size: 0.7, label: true },
  { lat: 32.6546, lng: 51.668, name: 'Isfahan / Natanz', type: 'nuclear', color: '#FF3B30', size: 0.6, label: true },
  { lat: 34.0048, lng: 51.4025, name: 'Fordow', type: 'nuclear', color: '#FF3B30', size: 0.5 },
  { lat: 28.9784, lng: 50.836, name: 'Bushehr', type: 'nuclear', color: '#FF3B30', size: 0.5, label: true },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', type: 'capital', color: '#3B82F6', size: 0.7, label: true },
  { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv', type: 'command', color: '#3B82F6', size: 0.6, label: true },
  { lat: 31.5017, lng: 34.4674, name: 'Gaza', type: 'conflict', color: '#FF3B30', size: 0.8, label: true },
  { lat: 32.6625, lng: 35.1671, name: 'Palmachim AFB', type: 'military', color: '#3B82F6', size: 0.4 },
  { lat: 31.1341, lng: 35.0094, name: 'Nevatim AFB', type: 'military', color: '#3B82F6', size: 0.4 },
  { lat: 25.4111, lng: 51.226, name: 'Al Udeid AFB', type: 'us_base', color: '#60A5FA', size: 0.5, label: true },
  { lat: 26.2285, lng: 50.586, name: '5th Fleet (Bahrain)', type: 'us_base', color: '#60A5FA', size: 0.5, label: true },
  { lat: 24.4539, lng: 54.3773, name: 'Al Dhafra AFB', type: 'us_base', color: '#60A5FA', size: 0.5 },
  { lat: 29.5574, lng: 48.0834, name: 'Ali Al Salem AB', type: 'us_base', color: '#60A5FA', size: 0.4 },
  { lat: 15.3694, lng: 44.191, name: 'Sanaa (Houthis)', type: 'proxy', color: '#FB923C', size: 0.6, label: true },
  { lat: 33.8938, lng: 35.5018, name: 'Beirut (Hezbollah)', type: 'proxy', color: '#FB923C', size: 0.6, label: true },
  { lat: 33.3152, lng: 44.3661, name: 'Baghdad', type: 'capital', color: '#FB923C', size: 0.5, label: true },
  { lat: 26.5667, lng: 56.25, name: 'Strait of Hormuz', type: 'chokepoint', color: '#22D3EE', size: 0.7, label: true },
  { lat: 12.5833, lng: 43.1453, name: 'Bab el-Mandeb', type: 'chokepoint', color: '#22D3EE', size: 0.6, label: true },
  { lat: 30.425, lng: 32.3444, name: 'Suez Canal', type: 'chokepoint', color: '#22D3EE', size: 0.6, label: true },
  { lat: 27.1832, lng: 56.2765, name: 'Bandar Abbas', type: 'naval', color: '#FF3B30', size: 0.5, label: true },
  { lat: 29.07, lng: 48.08, name: 'Kharg Island', type: 'energy', color: '#F59E0B', size: 0.5, label: true },
  { lat: 26.7958, lng: 49.9722, name: 'Ras Tanura', type: 'energy', color: '#F59E0B', size: 0.5 },
  { lat: 30.9563, lng: 34.9498, name: 'Dimona (Negev NRC)', type: 'nuclear', color: '#3B82F6', size: 0.5 },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus', type: 'capital', color: '#FB923C', size: 0.5, label: true },
  { lat: 38.08, lng: 46.2919, name: 'Tabriz', type: 'military', color: '#FF3B30', size: 0.4 },
  { lat: 14.7978, lng: 42.9547, name: 'Hodeidah', type: 'proxy', color: '#FB923C', size: 0.5 },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai', type: 'gulf', color: '#F59E0B', size: 0.4 },
  { lat: 24.7136, lng: 46.6753, name: 'Riyadh', type: 'gulf', color: '#F59E0B', size: 0.4 },
  { lat: 25.2854, lng: 51.531, name: 'Doha', type: 'gulf', color: '#F59E0B', size: 0.4 },
]

// ── Conflict arcs ──
const CONFLICT_ARCS: ConflictArc[] = [
  { startLat: 35.69, startLng: 51.39, endLat: 31.77, endLng: 35.21, color: ['#FF3B3088', '#FF3B3044'], label: 'Iran → Israel', stroke: 0.8 },
  { startLat: 31.77, startLng: 35.21, endLat: 35.69, endLng: 51.39, color: ['#3B82F688', '#3B82F644'], label: 'Israel → Iran', stroke: 0.6 },
  { startLat: 15.37, startLng: 44.19, endLat: 12.58, endLng: 43.15, color: ['#FB923C88', '#FB923C44'], label: 'Houthis → Bab el-Mandeb', stroke: 0.6 },
  { startLat: 33.89, startLng: 35.50, endLat: 31.77, endLng: 35.21, color: ['#FB923C88', '#FB923C44'], label: 'Hezbollah → Israel', stroke: 0.6 },
  { startLat: 25.41, startLng: 51.23, endLat: 26.57, endLng: 56.25, color: ['#60A5FA88', '#60A5FA44'], label: 'Al Udeid → Hormuz', stroke: 0.5 },
  { startLat: 15.37, startLng: 44.19, endLat: 20.00, endLng: 38.00, color: ['#FB923C88', '#FB923C44'], label: 'Houthis → Red Sea', stroke: 0.5 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.89, endLng: 35.50, color: ['#FF3B3066', '#FF3B3033'], label: 'Iran → Hezbollah', stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 15.37, endLng: 44.19, color: ['#FF3B3066', '#FF3B3033'], label: 'Iran → Houthis', stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.32, endLng: 44.37, color: ['#FF3B3044', '#FF3B3022'], label: 'Iran → Iraq Militias', stroke: 0.3 },
]

// ── Location coordinate map ──
const LOCATION_MAP: Record<string, [number, number]> = {
  tehran: [35.6892, 51.389], isfahan: [32.6546, 51.668], natanz: [32.8505, 51.6857],
  fordow: [34.0048, 51.4025], bushehr: [28.9784, 50.836], shiraz: [29.6168, 52.5319],
  tabriz: [38.08, 46.2919], mashhad: [36.2605, 59.6168], bandar: [27.1832, 56.2765],
  jerusalem: [31.7683, 35.2137], 'tel aviv': [32.0853, 34.7818], haifa: [32.794, 34.9896],
  gaza: [31.5017, 34.4674], rafah: [31.2831, 34.2575], dimona: [30.9563, 34.9498],
  beirut: [33.8938, 35.5018], damascus: [33.5138, 36.2765], baghdad: [33.3152, 44.3661],
  sanaa: [15.3694, 44.191], aden: [12.8028, 45.0286], hodeida: [14.7978, 42.9547],
  hormuz: [26.5667, 56.25], suez: [30.425, 32.3444], dubai: [25.2048, 55.2708],
  doha: [25.2854, 51.531], riyadh: [24.7136, 46.6753], iran: [32.5, 53.7],
  israel: [31.5, 34.8], yemen: [16, 48], lebanon: [33.9, 35.8], syria: [34.8, 38.9],
  iraq: [33.2, 43.7], 'red sea': [20, 38], 'persian gulf': [26.5, 52],
  'kharg island': [29.07, 48.08], mecca: [21.4225, 39.8262],
  'west bank': [31.95, 35.2], erbil: [36.19, 44.01], kuwait: [29.37, 47.98],
}

function extractCoords(item: IntelItem): { lat: number; lng: number } | null {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(' ').toLowerCase()
  for (const [key, coords] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return { lat: coords[0], lng: coords[1] }
  }
  return null
}

// ── Layer system ──
export type GlobeLayerId = 'events' | 'bases' | 'arcs' | 'nuclear' | 'energy' | 'usForces' | 'aircraft' | 'fires'

export interface GlobeLayer {
  id: GlobeLayerId
  label: string
  icon: string
  color: string
  enabled: boolean
}

const DEFAULT_LAYERS: GlobeLayer[] = [
  { id: 'events', label: 'EVENTS', icon: '⚡', color: '#FF3B30', enabled: true },
  { id: 'arcs', label: 'CONFLICT FLOWS', icon: '→', color: '#FB923C', enabled: true },
  { id: 'bases', label: 'MILITARY BASES', icon: '🎯', color: '#3B82F6', enabled: true },
  { id: 'nuclear', label: 'NUCLEAR', icon: '☢', color: '#FF3B30', enabled: true },
  { id: 'energy', label: 'ENERGY', icon: '⚡', color: '#F59E0B', enabled: true },
  { id: 'usForces', label: 'US FORCES', icon: '★', color: '#60A5FA', enabled: true },
  { id: 'aircraft', label: 'AIRCRAFT', icon: '✈', color: '#22D3EE', enabled: true },
  { id: 'fires', label: 'FIRES/SAT', icon: '🔥', color: '#F97316', enabled: true },
]

// ── Real-time solar position ──
function getSolarPosition() {
  const now = new Date()
  const jd = now.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180)
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180)
  const eps = 23.439 * (Math.PI / 180)
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam))
  const gmst = (6.697375 + 0.0657098242 * n + (now.getUTCHours() + now.getUTCMinutes() / 60)) % 24
  const sunLng = -((gmst * 15) % 360)
  return { sunLat: dec * (180 / Math.PI), sunLng }
}

interface Props {
  intelItems: IntelItem[]
  onSelectEvent?: (item: IntelItem) => void
  selectedEvent?: IntelItem | null
  aircraft?: AircraftPosition[]
  fires?: FireHotspot[]
}

function GlobeFallback({ error }: { error?: Error }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #060A0F 70%)' }}>
      <div className="text-center">
        <div className="text-sm tracking-[2px] mb-2" style={{ fontFamily: 'var(--mono)', color: '#FF3B30' }}>
          GLOBE ERROR
        </div>
        <div className="text-[0.65rem]" style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
          {error?.message || '3D rendering failed'}
        </div>
      </div>
    </div>
  )
}

// ── Globe HUD ──
function GlobeHUD({ sunPos, eventCount, aircraftCount, fireCount }: {
  sunPos: { lat: number; lng: number } | null; eventCount: number; aircraftCount?: number; fireCount?: number
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 14, zIndex: 50,
      background: 'rgba(6,10,15,0.72)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '4px 14px',
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--accent)' }}>
        {time.toISOString().slice(11, 19)} UTC
      </span>
      {sunPos && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'rgba(255,200,100,0.7)' }}>
          ☀ {sunPos.lat.toFixed(0)}° {sunPos.lng.toFixed(0)}°
        </span>
      )}
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: '#FF3B30' }}>
        {eventCount} events
      </span>
      {(aircraftCount ?? 0) > 0 && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: '#22D3EE' }}>
          ✈ {aircraftCount}
        </span>
      )}
      {(fireCount ?? 0) > 0 && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: '#F97316' }}>
          🔥 {fireCount}
        </span>
      )}
    </div>
  )
}

// ── Layer toggle panel ──
function LayerControls({ layers, onToggle }: { layers: GlobeLayer[]; onToggle: (id: GlobeLayerId) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      {expanded && (
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center',
          background: 'rgba(6,10,15,0.88)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px',
          marginBottom: 4, maxWidth: 480,
        }}>
          {layers.map((layer) => (
            <button key={layer.id} onClick={() => onToggle(layer.id)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
              borderRadius: 4, cursor: 'pointer', fontSize: '0.48rem', fontFamily: 'var(--mono)',
              letterSpacing: 1, fontWeight: 700, transition: 'all 0.15s',
              background: layer.enabled ? `${layer.color}18` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${layer.enabled ? `${layer.color}55` : 'rgba(255,255,255,0.06)'}`,
              color: layer.enabled ? layer.color : 'var(--text-dim)',
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: layer.enabled ? layer.color : 'rgba(255,255,255,0.15)',
                boxShadow: layer.enabled ? `0 0 4px ${layer.color}` : 'none',
              }} />
              {layer.label}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
        borderRadius: 20, cursor: 'pointer', fontSize: '0.48rem', fontFamily: 'var(--mono)',
        letterSpacing: 2, fontWeight: 700,
        background: 'rgba(6,10,15,0.88)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,229,255,0.2)', color: 'var(--accent)',
      }}>
        {expanded ? '▼' : '▲'} LAYERS
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.42rem', color: 'var(--text-dim)' }}>
          {layers.filter((l) => l.enabled).length}/{layers.length}
        </span>
      </button>
    </div>
  )
}

// ── Main Globe Inner ──
function Globe3DInner({ intelItems, onSelectEvent, selectedEvent, aircraft = [], fires = [] }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const cloudMeshRef = useRef<THREE.Mesh | null>(null)
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null)
  const animFrameRef = useRef<number>(0)
  const [ready, setReady] = useState(false)
  const [layers, setLayers] = useState<GlobeLayer[]>(DEFAULT_LAYERS)
  const [sunPos, setSunPos] = useState<{ lat: number; lng: number } | null>(null)

  const toggleLayer = useCallback((id: GlobeLayerId) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)))
  }, [])

  const layerMap = useMemo(
    () => Object.fromEntries(layers.map((l) => [l.id, l.enabled])),
    [layers]
  )

  const filteredBases = useMemo(
    () => BASES.filter((b) => {
      if (!layerMap.bases) return false
      if (b.type === 'nuclear' && !layerMap.nuclear) return false
      if (b.type === 'energy' && !layerMap.energy) return false
      if (b.type === 'us_base' && !layerMap.usForces) return false
      return true
    }),
    [layerMap]
  )

  const filteredArcs = useMemo(
    () => (layerMap.arcs ? CONFLICT_ARCS : []),
    [layerMap.arcs]
  )

  const eventPoints = useCallback((): GlobeEventPoint[] => {
    if (!layerMap.events) return []
    return intelItems
      .map((item, idx) => {
        const coords = extractCoords(item)
        if (!coords) return null
        const offset = ((idx * 7919) % 100) / 100
        return {
          lat: coords.lat + (offset - 0.5) * 0.4,
          lng: coords.lng + (((idx * 104729) % 100) / 100 - 0.5) * 0.4,
          color: SEVERITY_COLORS[item.severity] || '#00E5FF',
          size: item.severity >= 5 ? 1.5 : item.severity >= 4 ? 1.0 : 0.6,
          altitude: 0.01 + (item.severity || 3) * 0.006,
          item,
          label: item.headline,
        } as GlobeEventPoint
      })
      .filter(Boolean) as GlobeEventPoint[]
  }, [intelItems, layerMap.events])

  // Initialize globe once
  useEffect(() => {
    if (!wrapperRef.current || globeRef.current) return

    const mountDiv = document.createElement('div')
    mountDiv.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;'
    wrapperRef.current.appendChild(mountDiv)

    let cancelled = false
    let resizeHandler: (() => void) | null = null

    import('globe.gl').then((GlobeModule) => {
      if (cancelled) { mountDiv.remove(); return }

      const Globe = GlobeModule.default as any

      const globe = Globe()
        // NASA Blue Marble + topology bump + night texture
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        // Atmosphere glow — thicker, more cinematic
        .showAtmosphere(true)
        .atmosphereColor('#0077ff')
        .atmosphereAltitude(0.25)
        .width(mountDiv.clientWidth)
        .height(mountDiv.clientHeight)
        .pointOfView({ lat: 28, lng: 46, altitude: 2.0 }, 0)
        // Strategic base markers
        .customLayerData(BASES)
        .customThreeObject((d: StrategicBase) => {
          const group = new THREE.Group()
          const outerRing = new THREE.RingGeometry(d.size * 0.9, d.size * 1.1, 32)
          group.add(new THREE.Mesh(outerRing, new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })))
          const innerRing = new THREE.RingGeometry(d.size * 0.45, d.size * 0.75, 32)
          group.add(new THREE.Mesh(innerRing, new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })))
          group.add(new THREE.Mesh(new THREE.CircleGeometry(d.size * 0.22, 16), new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide })))
          return group
        })
        .customThreeObjectUpdate((obj: THREE.Group, d: StrategicBase) => {
          Object.assign(obj.position, globe.getCoords(d.lat, d.lng, 0.012))
          obj.lookAt(0, 0, 0)
          obj.rotateZ(Math.PI)
          if (obj.children[0]) {
            const t = Date.now() * 0.001
            ;(obj.children[0] as THREE.Mesh<any, THREE.MeshBasicMaterial>).material.opacity =
              0.15 + Math.sin(t * 2 + d.lat) * 0.15
          }
        })
        // Conflict arcs
        .arcsData(CONFLICT_ARCS)
        .arcColor('color')
        .arcDashLength(0.45)
        .arcDashGap(0.12)
        .arcDashAnimateTime(1500)
        .arcStroke((d: ConflictArc) => d.stroke || 0.5)
        .arcAltitudeAutoScale(0.38)
        .arcLabel('label')
        // Labels
        .labelsData(BASES.filter((b) => b.label))
        .labelLat((d: StrategicBase) => d.lat)
        .labelLng((d: StrategicBase) => d.lng)
        .labelText((d: StrategicBase) => d.name)
        .labelSize(0.55)
        .labelDotRadius(0.12)
        .labelColor((d: StrategicBase) => d.color)
        .labelResolution(2)
        .labelAltitude(0.015)
        // Event markers — multi-layer pulsing dots with rich tooltips
        .htmlElementsData([])
        .htmlElement((d: GlobeEventPoint) => {
          const sev = d.item?.severity || 3
          const agent = d.item?.agentId || 'osint'
          const outerSz = 20 + sev * 6 // outer pulse ring
          const innerSz = 6 + sev * 2   // inner solid dot
          const agentIcons: Record<string, string> = {
            sigint: '📡', osint: '🔍', humint: '👤', geoint: '🛰️',
            econint: '📊', proxy: '🎯', diplo: '🏛️',
          }

          const el = document.createElement('div')
          el.style.cssText = `
            position:relative;width:${outerSz}px;height:${outerSz}px;
            cursor:pointer;transition:transform 0.2s ease;
          `

          // Outer pulsing ring
          const pulseRing = document.createElement('div')
          pulseRing.style.cssText = `
            position:absolute;inset:0;border-radius:50%;
            border:1.5px solid ${d.color};opacity:0.4;
            animation:globePulse 2s ease-in-out infinite;
          `
          el.appendChild(pulseRing)

          // Second pulse ring (staggered)
          if (sev >= 4) {
            const pulseRing2 = document.createElement('div')
            pulseRing2.style.cssText = `
              position:absolute;inset:-4px;border-radius:50%;
              border:1px solid ${d.color};opacity:0.2;
              animation:globePulse 2s ease-in-out 0.5s infinite;
            `
            el.appendChild(pulseRing2)
          }

          // Glow background
          const glow = document.createElement('div')
          glow.style.cssText = `
            position:absolute;inset:0;border-radius:50%;
            background:radial-gradient(circle,${d.color}44 0%,${d.color}11 50%,transparent 70%);
          `
          el.appendChild(glow)

          // Inner solid dot
          const dot = document.createElement('div')
          const dotOffset = (outerSz - innerSz) / 2
          dot.style.cssText = `
            position:absolute;left:${dotOffset}px;top:${dotOffset}px;
            width:${innerSz}px;height:${innerSz}px;border-radius:50%;
            background:${d.color};box-shadow:0 0 ${sev * 3}px ${d.color};
          `
          el.appendChild(dot)

          // Rich tooltip card — shows on hover
          const tip = document.createElement('div')
          const sevLabels = ['', 'LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
          const sevColors = ['', '#30D158', '#30D158', '#FFD60A', '#FFB020', '#FF3B30']
          tip.style.cssText = `
            position:absolute;bottom:${outerSz + 8}px;left:50%;transform:translateX(-50%);
            background:rgba(6,10,15,0.95);border:1px solid ${d.color}55;border-radius:6px;
            padding:8px 10px;pointer-events:none;z-index:100;
            opacity:0;transition:opacity 0.15s;backdrop-filter:blur(12px);
            min-width:200px;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,0.6);
          `
          tip.innerHTML = `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <span style="font-size:10px">${agentIcons[agent] || '⚡'}</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:${d.color};letter-spacing:1px;">${(agent || 'OSINT').toUpperCase()}</span>
              <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;color:${sevColors[sev]};padding:1px 4px;border-radius:2px;background:${sevColors[sev]}15;border:1px solid ${sevColors[sev]}30;">${sevLabels[sev]}</span>
            </div>
            <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;color:#e2e8f0;line-height:1.3;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${d.item?.headline || d.label || ''}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              ${d.item?.source ? `<span style="font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(255,255,255,0.4);">${d.item.source}</span>` : ''}
              ${d.item?.time ? `<span style="font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(0,229,255,0.5);">${d.item.time}</span>` : ''}
              ${d.item?.location ? `<span style="font-family:'JetBrains Mono',monospace;font-size:7px;color:rgba(255,255,255,0.3);">📍 ${d.item.location}</span>` : ''}
            </div>
            <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:6px;color:rgba(0,229,255,0.3);letter-spacing:1px;">CLICK FOR DETAILS</div>
          `
          el.appendChild(tip)

          el.onclick = () => onSelectEvent?.(d.item)
          el.onmouseenter = () => {
            el.style.transform = 'scale(1.5)'
            tip.style.opacity = '1'
          }
          el.onmouseleave = () => {
            el.style.transform = 'scale(1)'
            tip.style.opacity = '0'
          }
          return el
        })
        .htmlAltitude((d: GlobeEventPoint) => d.altitude || 0.015)(mountDiv)

      globeRef.current = globe

      // Enhanced globe material — cinematic look
      const globeMaterial = globe.globeMaterial()
      globeMaterial.bumpScale = 8
      globeMaterial.emissive = new THREE.Color('#041628')
      globeMaterial.emissiveIntensity = 0.15
      globeMaterial.shininess = 40
      globeMaterial.specular = new THREE.Color('#1a3a5c')

      const scene = globe.scene()

      // Cinematic lighting setup
      scene.add(new THREE.AmbientLight(0x224488, 0.6))
      const sunLight = new THREE.DirectionalLight(0xfff0d0, 1.8)
      sunLight.position.set(5, 3, 5)
      scene.add(sunLight)
      sunLightRef.current = sunLight

      // Subtle blue rim light from behind
      const rimLight = new THREE.DirectionalLight(0x0055ff, 0.3)
      rimLight.position.set(-3, -1, -3)
      scene.add(rimLight)

      // Cloud layer (rotates slowly)
      const cloudGeo = new THREE.SphereGeometry(102.2, 64, 64)
      const cloudTex = new THREE.TextureLoader().load(
        '//unpkg.com/three-globe/example/img/earth-clouds.png'
      )
      const cloudMat = new THREE.MeshPhongMaterial({
        map: cloudTex, transparent: true, opacity: 0.32,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
      const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat)
      scene.add(cloudMesh)
      cloudMeshRef.current = cloudMesh

      // Controls
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.2
      globe.controls().enableDamping = true
      globe.controls().dampingFactor = 0.1
      globe.controls().minDistance = 140
      globe.controls().maxDistance = 600

      // Animation loop
      let frame = 0
      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate)
        frame++
        if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += 0.00008
        if (frame % 120 === 0) {
          const { sunLat, sunLng } = getSolarPosition()
          setSunPos({ lat: sunLat, lng: sunLng })
          if (sunLightRef.current) {
            const phi = (90 - sunLat) * (Math.PI / 180)
            const theta = (sunLng + 180) * (Math.PI / 180)
            sunLightRef.current.position.setFromSphericalCoords(500, phi, theta)
          }
        }
      }
      animate()

      resizeHandler = () => {
        if (mountDiv.parentNode && globeRef.current) {
          globe.width(mountDiv.clientWidth)
          globe.height(mountDiv.clientHeight)
        }
      }
      window.addEventListener('resize', resizeHandler)
      setReady(true)
    }).catch(() => {})

    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      if (globeRef.current) {
        try { globeRef.current._destructor?.() } catch {}
        globeRef.current = null
      }
      try { mountDiv.remove() } catch {}
    }
  }, [])

  // Update event markers
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.htmlElementsData(eventPoints())
  }, [intelItems, ready, eventPoints])

  // Update bases/labels when layers change
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.customLayerData(filteredBases)
    globeRef.current.labelsData(filteredBases.filter((b: StrategicBase) => b.label))
  }, [filteredBases, ready])

  // Update arcs when layers change
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.arcsData(filteredArcs)
  }, [filteredArcs, ready])

  // Update aircraft points when data changes
  const aircraftPoints = useMemo(() => {
    if (!layerMap.aircraft || !aircraft.length) return []
    return aircraft
      .filter(a => !a.onGround && a.lat && a.lng)
      .slice(0, 300)
      .map(a => ({
        lat: a.lat,
        lng: a.lng,
        alt: Math.min((a.altitude || 1000) / 100000, 0.15),
        color: a.category === 'military' ? '#FF3B30' : a.category === 'government' ? '#FFB020' : '#22D3EE',
        size: a.category === 'military' ? 0.35 : 0.15,
        label: `${a.callsign || a.icao24} [${a.originCountry}] ${Math.round(a.altitude)}m`,
      }))
  }, [aircraft, layerMap.aircraft])

  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current
      .pointsData(aircraftPoints)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('alt')
      .pointColor('color')
      .pointRadius('size')
      .pointLabel('label')
  }, [aircraftPoints, ready])

  // Update fire/hotspot rings when data changes
  const fireRings = useMemo(() => {
    if (!layerMap.fires || !fires.length) return []
    return fires
      .filter(f => f.confidence !== 'low' && f.frp > 5)
      .slice(0, 200)
      .map(f => ({
        lat: f.lat,
        lng: f.lng,
        maxR: Math.min(f.frp / 20, 3),
        propagationSpeed: 2,
        repeatPeriod: 1200,
        color: f.frp > 100 ? '#FF3B30' : f.frp > 30 ? '#FB923C' : '#F59E0B',
      }))
  }, [fires, layerMap.fires])

  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current
      .ringsData(fireRings)
      .ringLat('lat')
      .ringLng('lng')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      .ringColor('color')
  }, [fireRings, ready])

  // Fly to selected event
  useEffect(() => {
    if (!globeRef.current || !selectedEvent) return
    const coords = extractCoords(selectedEvent)
    if (coords) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.4 }, 1000)
      globeRef.current.controls().autoRotate = false
    }
  }, [selectedEvent])

  return (
    <div ref={wrapperRef} className="w-full h-full relative"
      style={{ background: 'radial-gradient(ellipse at center, #081428 0%, #040810 50%, #020408 100%)' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#00E5FF]/30 mx-auto mb-4"
              style={{ borderTopColor: '#00E5FF', animation: 'spin 1s linear infinite', boxShadow: '0 0 20px rgba(0,229,255,0.2)' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#00E5FF', letterSpacing: 4, marginBottom: 6 }}>
              INITIALIZING GLOBE
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 2 }}>
              NASA BLUE MARBLE · CLOUD LAYER · SOLAR TERMINATOR
            </div>
          </div>
        </div>
      )}
      {ready && (
        <>
          <GlobeHUD sunPos={sunPos} eventCount={intelItems.length} aircraftCount={aircraft.length} fireCount={fires.length} />
          <LayerControls layers={layers} onToggle={toggleLayer} />
        </>
      )}
    </div>
  )
}

// Error boundary
import { Component, type ReactNode } from 'react'

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <GlobeFallback error={this.state.error} />
    return this.props.children
  }
}

export default function Globe3D(props: Props) {
  return (
    <GlobeErrorBoundary>
      <Globe3DInner {...props} />
    </GlobeErrorBoundary>
  )
}
