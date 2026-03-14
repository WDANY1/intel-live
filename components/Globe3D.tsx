'use client'

import {
  useEffect, useRef, useState, useCallback, useMemo,
  Component, type ReactNode,
} from 'react'
import * as THREE from 'three'
import type { IntelItem, StrategicBase, ConflictArc, AircraftPosition, FireHotspot } from '@/lib/types'

// ── Severity colors & labels ──
const SEV: Record<number, { color: string; label: string; pulse: string }> = {
  5: { color: '#FF2040', label: 'CRITICAL', pulse: 'rgba(255,32,64,0.4)' },
  4: { color: '#FF8C00', label: 'HIGH',     pulse: 'rgba(255,140,0,0.35)' },
  3: { color: '#FFD700', label: 'MEDIUM',   pulse: 'rgba(255,215,0,0.3)' },
  2: { color: '#00E676', label: 'LOW',      pulse: 'rgba(0,230,118,0.25)' },
  1: { color: '#00B0FF', label: 'INFO',     pulse: 'rgba(0,176,255,0.2)' },
}

// ── Strategic bases ──
const BASES: StrategicBase[] = [
  { lat: 35.6892, lng: 51.389,  name: 'Tehran',         type: 'capital',    color: '#FF3040', size: 0.7,  label: true },
  { lat: 32.6546, lng: 51.668,  name: 'Isfahan/Natanz', type: 'nuclear',    color: '#FF3040', size: 0.5,  label: true },
  { lat: 28.9784, lng: 50.836,  name: 'Bushehr',        type: 'nuclear',    color: '#FF3040', size: 0.5,  label: true },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem',      type: 'capital',    color: '#3B82F6', size: 0.7,  label: true },
  { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv',       type: 'command',    color: '#3B82F6', size: 0.6,  label: true },
  { lat: 31.5017, lng: 34.4674, name: 'Gaza',           type: 'conflict',   color: '#FF3040', size: 0.8,  label: true },
  { lat: 25.4111, lng: 51.226,  name: 'Al Udeid AFB',   type: 'us_base',    color: '#60A5FA', size: 0.5,  label: true },
  { lat: 26.2285, lng: 50.586,  name: 'US 5th Fleet',   type: 'us_base',    color: '#60A5FA', size: 0.5,  label: true },
  { lat: 15.3694, lng: 44.191,  name: 'Sanaa',          type: 'proxy',      color: '#FB923C', size: 0.6,  label: true },
  { lat: 33.8938, lng: 35.5018, name: 'Beirut',         type: 'proxy',      color: '#FB923C', size: 0.6,  label: true },
  { lat: 26.5667, lng: 56.25,   name: 'Str. of Hormuz', type: 'chokepoint', color: '#22D3EE', size: 0.7,  label: true },
  { lat: 30.425,  lng: 32.3444, name: 'Suez Canal',     type: 'chokepoint', color: '#22D3EE', size: 0.6,  label: true },
  { lat: 27.1832, lng: 56.2765, name: 'Bandar Abbas',   type: 'naval',      color: '#FF3040', size: 0.5,  label: true },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus',       type: 'capital',    color: '#FB923C', size: 0.5,  label: true },
  { lat: 33.3152, lng: 44.3661, name: 'Baghdad',        type: 'capital',    color: '#FB923C', size: 0.5,  label: true },
]

const CONFLICT_ARCS: ConflictArc[] = [
  { startLat: 35.69, startLng: 51.39, endLat: 31.77, endLng: 35.21, color: ['#FF304088','#FF304011'], label: 'Iran → Israel',         stroke: 0.7 },
  { startLat: 31.77, startLng: 35.21, endLat: 35.69, endLng: 51.39, color: ['#3B82F688','#3B82F611'], label: 'Israel → Iran',         stroke: 0.5 },
  { startLat: 15.37, startLng: 44.19, endLat: 20.00, endLng: 38.00, color: ['#FB923C88','#FB923C11'], label: 'Houthis → Red Sea',     stroke: 0.5 },
  { startLat: 33.89, startLng: 35.50, endLat: 31.77, endLng: 35.21, color: ['#FB923C88','#FB923C11'], label: 'Hezbollah → Israel',    stroke: 0.5 },
  { startLat: 25.41, startLng: 51.23, endLat: 26.57, endLng: 56.25, color: ['#60A5FA88','#60A5FA11'], label: 'Al Udeid → Hormuz',     stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.89, endLng: 35.50, color: ['#FF304055','#FF304008'], label: 'Iran → Hezbollah',      stroke: 0.35 },
  { startLat: 35.69, startLng: 51.39, endLat: 15.37, endLng: 44.19, color: ['#FF304055','#FF304008'], label: 'Iran → Houthis',        stroke: 0.35 },
]

// ── Location keyword → [lat, lng] ──
const LOCATION_MAP: Record<string, [number, number]> = {
  tehran:       [35.6892,  51.389],  isfahan:       [32.6546,  51.668],
  natanz:       [32.8505,  51.6857], fordow:        [34.0048,  51.4025],
  bushehr:      [28.9784,  50.836],  shiraz:        [29.6168,  52.5319],
  tabriz:       [38.08,    46.2919], mashhad:       [36.2605,  59.6168],
  bandar:       [27.1832,  56.2765], jerusalem:     [31.7683,  35.2137],
  'tel aviv':   [32.0853,  34.7818], haifa:         [32.794,   34.9896],
  gaza:         [31.5017,  34.4674], rafah:         [31.2831,  34.2575],
  dimona:       [30.9563,  34.9498], beirut:        [33.8938,  35.5018],
  damascus:     [33.5138,  36.2765], baghdad:       [33.3152,  44.3661],
  sanaa:        [15.3694,  44.191],  aden:          [12.8028,  45.0286],
  hodeida:      [14.7978,  42.9547], hormuz:        [26.5667,  56.25],
  suez:         [30.425,   32.3444], dubai:         [25.2048,  55.2708],
  doha:         [25.2854,  51.531],  riyadh:        [24.7136,  46.6753],
  iran:         [32.5,     53.7],    israel:        [31.5,     34.8],
  yemen:        [16,       48],      lebanon:       [33.9,     35.8],
  syria:        [34.8,     38.9],    iraq:          [33.2,     43.7],
  'red sea':    [20,       38],      'persian gulf':[26.5,     52],
  ukraine:      [48.38,    31.17],   kyiv:          [50.45,    30.52],
  moscow:       [55.76,    37.62],   russia:        [55.76,    37.62],
  china:        [35.86,    104.2],   taiwan:        [23.7,     120.96],
  washington:   [38.9,    -77.0],    london:        [51.51,    -0.13],
  paris:        [48.86,    2.35],    ankara:        [39.93,    32.86],
  cairo:        [30.04,    31.24],   pakistan:      [30.38,    69.35],
  'new york':   [40.71,   -74.01],   berlin:        [52.52,    13.41],
  tokyo:        [35.69,    139.69],  beijing:       [39.91,    116.39],
}

export function extractCoords(item: IntelItem): { lat: number; lng: number } | null {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(' ').toLowerCase()
  for (const [key, coords] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return { lat: coords[0], lng: coords[1] }
  }
  return null
}

// ── Atmospheric glow shader ──
const ATM_VERT = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const ATM_FRAG = `
varying vec3 vNormal;
void main() {
  float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
  vec3 color = mix(vec3(0.05, 0.3, 0.9), vec3(0.0, 0.8, 1.0), intensity);
  gl_FragColor = vec4(color, 1.0) * intensity * 1.4;
}
`

interface Props {
  intelItems:     IntelItem[]
  onSelectEvent?: (item: IntelItem) => void
  selectedEvent?: IntelItem | null
  aircraft?:      AircraftPosition[]
  fires?:         FireHotspot[]
}

interface EventPopup {
  item: IntelItem
  screenX: number
  screenY: number
}

// ── Main Globe ──
function Globe3DInner({ intelItems, onSelectEvent, selectedEvent, aircraft = [], fires = [] }: Props) {
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const globeRef     = useRef<any>(null)
  const cloudRef     = useRef<THREE.Mesh | null>(null)
  const animFrameRef = useRef<number>(0)
  const [ready, setReady] = useState(false)
  const [popup, setPopup] = useState<EventPopup | null>(null)

  // WebGL event points
  const eventPoints = useMemo(() => {
    return intelItems
      .map((item, idx) => {
        const c = extractCoords(item)
        if (!c) return null
        const sev = SEV[item.severity] || SEV[1]
        return {
          lat:      c.lat + ((idx * 7919  % 100) / 100 - 0.5) * 0.3,
          lng:      c.lng + ((idx * 10472 % 100) / 100 - 0.5) * 0.3,
          color:    sev.color,
          size:     item.severity >= 5 ? 0.6 : item.severity >= 4 ? 0.42 : 0.25,
          altitude: 0.01 + item.severity * 0.005,
          item,
          label: `[${(item.agentId || 'OSINT').toUpperCase()}] ${item.headline}`,
        }
      })
      .filter(Boolean) as Array<{
        lat: number; lng: number; color: string; size: number
        altitude: number; item: IntelItem; label: string
      }>
  }, [intelItems])

  // Aircraft rings
  const aircraftRings = useMemo(() =>
    aircraft
      .filter(a => !a.onGround && a.lat && a.lng)
      .slice(0, 120)
      .map(a => ({
        lat: a.lat, lng: a.lng,
        maxR: 1.4, propagationSpeed: 3.5, repeatPeriod: 700,
        color: () => a.category === 'military' ? '#FF3040' : '#22D3EE',
      }))
  , [aircraft])

  // Fire points
  const firePoints = useMemo(() =>
    fires.slice(0, 80).map(f => ({
      lat: f.lat, lng: f.lng,
      color: '#FF6B35', size: 0.18, altitude: 0.003,
      label: `FIRE [FRP:${f.frp?.toFixed(0) || '?'}MW] ${f.region || ''}`,
    }))
  , [fires])

  useEffect(() => {
    if (!wrapperRef.current || globeRef.current) return

    const mountDiv = document.createElement('div')
    mountDiv.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;'
    wrapperRef.current.appendChild(mountDiv)

    let cancelled = false
    let resizeObs: ResizeObserver | null = null

    import('globe.gl').then(({ default: GlobeLib }) => {
      if (cancelled) { mountDiv.remove(); return }

      const globe = (GlobeLib as any)()
        // ── Night Earth — city lights ──
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(false)          // we add a custom one below
        .width(mountDiv.clientWidth)
        .height(mountDiv.clientHeight)
        .pointOfView({ lat: 28, lng: 46, altitude: 2.2 }, 0)

        // ── Event dots (WebGL — 60fps) ──
        .pointsData([])
        .pointLat('lat').pointLng('lng').pointAltitude('altitude')
        .pointColor('color').pointRadius('size').pointResolution(10)
        .pointsMerge(false)
        .pointLabel('label')
        .onPointClick((pt: any, _evt: MouseEvent, { x, y }: { x: number; y: number }) => {
          if (pt?.item) {
            onSelectEvent?.(pt.item)
            globe.controls().autoRotate = false
            setPopup({ item: pt.item, screenX: x, screenY: y })
          }
        })

        // ── Conflict arcs ──
        .arcsData(CONFLICT_ARCS)
        .arcColor('color')
        .arcDashLength(0.38).arcDashGap(0.08).arcDashAnimateTime(2400)
        .arcStroke((d: ConflictArc) => d.stroke)
        .arcAltitudeAutoScale(0.42).arcLabel('label')

        // ── Base labels ──
        .labelsData(BASES.filter(b => b.label))
        .labelLat((d: StrategicBase) => d.lat).labelLng((d: StrategicBase) => d.lng)
        .labelText((d: StrategicBase) => d.name).labelSize(0.36)
        .labelDotRadius(0.16).labelColor((d: StrategicBase) => d.color)
        .labelAltitude(0.014).labelResolution(2)

        // ── Aircraft rings ──
        .ringsData([]).ringLat('lat').ringLng('lng')
        .ringMaxRadius('maxR').ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod').ringColor('color')

        (mountDiv)

      globeRef.current = globe

      // ── Globe material — boost emissive (dark-side city lights) ──
      const mat = globe.globeMaterial() as THREE.MeshPhongMaterial
      mat.emissive         = new THREE.Color('#050e22')
      mat.emissiveIntensity = 0.75
      mat.shininess        = 35
      mat.specular         = new THREE.Color('#0a1a3a')

      const scene = globe.scene() as THREE.Scene

      // ── Atmospheric glow (custom shader sphere) ──
      const atmoGeo = new THREE.SphereGeometry(103.8, 64, 64)
      const atmoMat = new THREE.ShaderMaterial({
        vertexShader:   ATM_VERT,
        fragmentShader: ATM_FRAG,
        side:           THREE.FrontSide,
        blending:       THREE.AdditiveBlending,
        transparent:    true,
        depthWrite:     false,
      })
      scene.add(new THREE.Mesh(atmoGeo, atmoMat))

      // ── Outer halo (very subtle, wider) ──
      const haloGeo = new THREE.SphereGeometry(107, 32, 32)
      const haloMat = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float i = pow(0.9 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 5.0);
            gl_FragColor = vec4(0.05, 0.4, 0.9, 1.0) * i * 0.5;
          }
        `,
        side:        THREE.BackSide,
        blending:    THREE.AdditiveBlending,
        transparent: true,
        depthWrite:  false,
      })
      scene.add(new THREE.Mesh(haloGeo, haloMat))

      // ── Lighting ──
      // Warm sunlight (day/night contrast)
      const sun = new THREE.DirectionalLight(0xfff0d0, 3.2)
      sun.position.set(-4, 5, 2)
      scene.add(sun)
      // Deep blue space ambient
      scene.add(new THREE.AmbientLight(0x040d24, 1.1))
      // Cyan rim light (atmosphere edge definition)
      const rim = new THREE.DirectionalLight(0x2266ff, 0.6)
      rim.position.set(3, -2, -5)
      scene.add(rim)
      // Fill light (soft from right)
      const fill = new THREE.DirectionalLight(0x001833, 0.4)
      fill.position.set(4, 0, 3)
      scene.add(fill)

      // ── Cloud layer ──
      const cloudGeo = new THREE.SphereGeometry(102.4, 48, 48)
      const cloudTex = new THREE.TextureLoader().load(
        '//unpkg.com/three-globe/example/img/earth-clouds.png'
      )
      cloudTex.colorSpace = THREE.SRGBColorSpace
      const cloudMat = new THREE.MeshPhongMaterial({
        map:         cloudTex,
        transparent: true,
        opacity:     0.25,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })
      cloudRef.current = new THREE.Mesh(cloudGeo, cloudMat)
      scene.add(cloudRef.current)

      // ── Starfield enhancement (extra particles) ──
      const starGeo = new THREE.BufferGeometry()
      const starCount = 3000
      const positions = new Float32Array(starCount * 3)
      for (let i = 0; i < starCount; i++) {
        const r = 1200 + Math.random() * 800
        const theta = Math.random() * Math.PI * 2
        const phi   = Math.acos(2 * Math.random() - 1)
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = r * Math.cos(phi)
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const starMat = new THREE.PointsMaterial({ color: 0xaaaacc, size: 1.2, sizeAttenuation: false })
      scene.add(new THREE.Points(starGeo, starMat))

      // ── Camera controls ──
      const ctrl = globe.controls()
      ctrl.autoRotate      = true
      ctrl.autoRotateSpeed = 0.15
      ctrl.enableDamping   = true
      ctrl.dampingFactor   = 0.06
      ctrl.minDistance     = 112
      ctrl.maxDistance     = 720

      // ── Close popup on background click ──
      globe.onGlobeClick(() => setPopup(null))

      // ── Render loop ──
      const tick = () => {
        animFrameRef.current = requestAnimationFrame(tick)
        if (cloudRef.current) cloudRef.current.rotation.y += 0.00006
      }
      tick()

      // ── Resize observer ──
      resizeObs = new ResizeObserver(() => {
        if (mountDiv.parentNode && globeRef.current) {
          globe.width(mountDiv.clientWidth)
          globe.height(mountDiv.clientHeight)
        }
      })
      resizeObs.observe(mountDiv)

      setReady(true)
    }).catch(console.error)

    return () => {
      cancelled = true
      cancelAnimationFrame(animFrameRef.current)
      resizeObs?.disconnect()
      if (globeRef.current) {
        try { globeRef.current._destructor?.() } catch {}
        globeRef.current = null
      }
      try { mountDiv.remove() } catch {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update event points
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.pointsData([...eventPoints, ...firePoints])
  }, [eventPoints, firePoints, ready])

  // Update aircraft rings
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.ringsData(aircraftRings)
  }, [aircraftRings, ready])

  // Fly to selected event
  useEffect(() => {
    if (!globeRef.current || !selectedEvent || !ready) return
    const c = extractCoords(selectedEvent)
    if (c) {
      globeRef.current.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.2 }, 1200)
      globeRef.current.controls().autoRotate = false
      setPopup(null)
    }
  }, [selectedEvent, ready])

  const closePopup = useCallback(() => {
    setPopup(null)
    if (globeRef.current) globeRef.current.controls().autoRotate = true
  }, [])

  return (
    <div ref={wrapperRef} className="w-full h-full relative"
      style={{ background: 'radial-gradient(ellipse at 42% 50%, #071428 0%, #030a18 55%, #010408 100%)' }}
    >
      {/* Loading state */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1.5px solid rgba(0,229,255,0.1)',
              borderTopColor: '#00E5FF', borderRightColor: 'rgba(0,229,255,0.4)',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 14px',
            }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', color: '#00E5FF', letterSpacing: 6, textTransform: 'uppercase' }}>
              INITIALIZING GLOBE
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 3, marginTop: 5 }}>
              NIGHT EARTH · ATMOSPHERE · CLOUD LAYER
            </div>
          </div>
        </div>
      )}

      {/* Event detail popup */}
      {popup && (
        <EventPopupPanel popup={popup} onClose={closePopup} />
      )}

      {/* Live stats overlay (bottom-left of globe) */}
      {ready && intelItems.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none" style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.92rem',
          color: 'rgba(0,229,255,0.45)',
          letterSpacing: 2,
        }}>
          <div>● {eventPoints.length} EVENTS MAPPED</div>
          {aircraft.length > 0 && <div>✦ {aircraft.filter(a => !a.onGround).length} AIRCRAFT TRACKED</div>}
          {fires.length > 0   && <div>◈ {fires.length} HEAT SIGNATURES</div>}
        </div>
      )}
    </div>
  )
}

// ── Event Detail Popup ──
function EventPopupPanel({ popup, onClose }: { popup: EventPopup; onClose: () => void }) {
  const { item } = popup
  const sev = SEV[item.severity] || SEV[1]

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{
        top: Math.min(popup.screenY, window.innerHeight - 260) + 'px',
        left: Math.min(popup.screenX + 10, window.innerWidth - 320) + 'px',
        width: 300,
        background: 'rgba(4,8,20,0.96)',
        border: `1px solid ${sev.color}44`,
        borderLeft: `3px solid ${sev.color}`,
        boxShadow: `0 0 30px ${sev.color}22, 0 8px 32px rgba(0,0,0,0.8)`,
        backdropFilter: 'blur(16px)',
        animation: 'fadeInUp 0.2s ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: sev.color, boxShadow: `0 0 8px ${sev.color}`,
            animation: 'pulse 1.5s ease infinite',
          }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.01rem', color: sev.color, letterSpacing: 3, fontWeight: 700 }}>
            {sev.label}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
            [{(item.agentId || 'OSINT').toUpperCase()}]
          </span>
        </div>
        <button onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.89rem', lineHeight: 1 }}
          className="hover:text-white transition-colors"
        >✕</button>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2">
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.51rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4 }}>
          {item.headline}
        </div>

        <div className="flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem' }}>
          <span style={{ color: '#00E5FF' }}>◉</span>
          <span style={{ color: '#94a3b8' }}>{item.location || 'LOCATION UNKNOWN'}</span>
        </div>

        {item.summary && (
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.3rem', color: '#64748b', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
            {item.summary.slice(0, 180)}{item.summary.length > 180 ? '…' : ''}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between pt-1" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem', color: '#475569' }}>
          <span>{item.source}</span>
          <span>{item.time}</span>
        </div>

        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem',
              color: '#00E5FF', letterSpacing: 2, padding: '4px 0',
              borderTop: '1px solid rgba(0,229,255,0.1)',
              textDecoration: 'none',
            }}
            className="hover:opacity-80 transition-opacity"
          >
            OPEN SOURCE →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Error Boundary ──
class GlobeErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #081428 0%, #030810 70%)' }}
      >
        <div className="text-center">
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.26rem', color: '#FF3040', letterSpacing: 3 }}>GLOBE INIT FAILED</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
            {this.state.error.message}
          </div>
        </div>
      </div>
    )
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
