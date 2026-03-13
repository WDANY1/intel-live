'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import type { IntelItem, StrategicBase, ConflictArc, AircraftPosition, FireHotspot } from '@/lib/types'

// ── Severity colors ──
const SEV_COLOR: Record<number, string> = {
  5: '#FF3040', 4: '#FFB020', 3: '#FFD60A', 2: '#00E676', 1: '#00E676',
}

// ── Strategic bases ──
const BASES: StrategicBase[] = [
  { lat: 35.6892, lng: 51.389, name: 'Tehran', type: 'capital', color: '#FF3040', size: 0.7, label: true },
  { lat: 32.6546, lng: 51.668, name: 'Isfahan/Natanz', type: 'nuclear', color: '#FF3040', size: 0.5, label: true },
  { lat: 28.9784, lng: 50.836, name: 'Bushehr', type: 'nuclear', color: '#FF3040', size: 0.5, label: true },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', type: 'capital', color: '#3B82F6', size: 0.7, label: true },
  { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv', type: 'command', color: '#3B82F6', size: 0.6, label: true },
  { lat: 31.5017, lng: 34.4674, name: 'Gaza', type: 'conflict', color: '#FF3040', size: 0.8, label: true },
  { lat: 25.4111, lng: 51.226, name: 'Al Udeid AFB', type: 'us_base', color: '#60A5FA', size: 0.5, label: true },
  { lat: 26.2285, lng: 50.586, name: '5th Fleet', type: 'us_base', color: '#60A5FA', size: 0.5, label: true },
  { lat: 15.3694, lng: 44.191, name: 'Sanaa', type: 'proxy', color: '#FB923C', size: 0.6, label: true },
  { lat: 33.8938, lng: 35.5018, name: 'Beirut', type: 'proxy', color: '#FB923C', size: 0.6, label: true },
  { lat: 26.5667, lng: 56.25, name: 'Str. of Hormuz', type: 'chokepoint', color: '#22D3EE', size: 0.7, label: true },
  { lat: 30.425, lng: 32.3444, name: 'Suez Canal', type: 'chokepoint', color: '#22D3EE', size: 0.6, label: true },
  { lat: 27.1832, lng: 56.2765, name: 'Bandar Abbas', type: 'naval', color: '#FF3040', size: 0.5, label: true },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus', type: 'capital', color: '#FB923C', size: 0.5, label: true },
  { lat: 33.3152, lng: 44.3661, name: 'Baghdad', type: 'capital', color: '#FB923C', size: 0.5, label: true },
]

// ── Conflict arcs ──
const CONFLICT_ARCS: ConflictArc[] = [
  { startLat: 35.69, startLng: 51.39, endLat: 31.77, endLng: 35.21, color: ['#FF304088', '#FF304022'], label: 'Iran → Israel', stroke: 0.7 },
  { startLat: 31.77, startLng: 35.21, endLat: 35.69, endLng: 51.39, color: ['#3B82F688', '#3B82F622'], label: 'Israel → Iran', stroke: 0.5 },
  { startLat: 15.37, startLng: 44.19, endLat: 20.00, endLng: 38.00, color: ['#FB923C88', '#FB923C22'], label: 'Houthis → Red Sea', stroke: 0.5 },
  { startLat: 33.89, startLng: 35.50, endLat: 31.77, endLng: 35.21, color: ['#FB923C88', '#FB923C22'], label: 'Hezbollah → Israel', stroke: 0.5 },
  { startLat: 25.41, startLng: 51.23, endLat: 26.57, endLng: 56.25, color: ['#60A5FA88', '#60A5FA22'], label: 'Al Udeid → Hormuz', stroke: 0.4 },
  { startLat: 35.69, startLng: 51.39, endLat: 33.89, endLng: 35.50, color: ['#FF304055', '#FF304011'], label: 'Iran → Hezbollah', stroke: 0.35 },
  { startLat: 35.69, startLng: 51.39, endLat: 15.37, endLng: 44.19, color: ['#FF304055', '#FF304011'], label: 'Iran → Houthis', stroke: 0.35 },
]

// ── Location map for event coord extraction ──
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
  ukraine: [48.38, 31.17], kyiv: [50.45, 30.52], moscow: [55.76, 37.62],
  russia: [55.76, 37.62], china: [35.86, 104.2], taiwan: [23.7, 120.96],
  washington: [38.9, -77.0], london: [51.51, -0.13], paris: [48.86, 2.35],
  ankara: [39.93, 32.86], cairo: [30.04, 31.24], pakistan: [30.38, 69.35],
}

function extractCoords(item: IntelItem): { lat: number; lng: number } | null {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(' ').toLowerCase()
  for (const [key, coords] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return { lat: coords[0], lng: coords[1] }
  }
  return null
}

interface Props {
  intelItems: IntelItem[]
  onSelectEvent?: (item: IntelItem) => void
  selectedEvent?: IntelItem | null
  aircraft?: AircraftPosition[]
  fires?: FireHotspot[]
}

// ── Main Globe ──
function Globe3DInner({ intelItems, onSelectEvent, selectedEvent, aircraft = [], fires = [] }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const cloudMeshRef = useRef<THREE.Mesh | null>(null)
  const animFrameRef = useRef<number>(0)
  const [ready, setReady] = useState(false)

  // Build event point list (WebGL points — much faster than HTML elements)
  const eventPoints = useMemo(() => {
    return intelItems
      .map((item, idx) => {
        const coords = extractCoords(item)
        if (!coords) return null
        return {
          lat: coords.lat + ((idx * 7919 % 100) / 100 - 0.5) * 0.35,
          lng: coords.lng + ((idx * 104729 % 100) / 100 - 0.5) * 0.35,
          color: SEV_COLOR[item.severity] || '#00E5FF',
          size: item.severity >= 5 ? 0.55 : item.severity >= 4 ? 0.38 : 0.22,
          altitude: 0.008 + item.severity * 0.004,
          item,
          label: `[${(item.agentId || 'OSINT').toUpperCase()}] ${item.headline}`,
        }
      })
      .filter(Boolean) as Array<{
        lat: number; lng: number; color: string; size: number
        altitude: number; item: IntelItem; label: string
      }>
  }, [intelItems])

  // Aircraft points
  const aircraftPoints = useMemo(() => {
    return aircraft
      .filter(a => !a.onGround && a.lat && a.lng)
      .slice(0, 200)
      .map(a => ({
        lat: a.lat, lng: a.lng,
        alt: Math.min((a.altitude || 1000) / 100000, 0.12),
        color: a.category === 'military' ? '#FF3040' : '#22D3EE',
        size: a.category === 'military' ? 0.3 : 0.12,
        label: `${a.callsign || a.icao24} [${a.originCountry}]`,
      }))
  }, [aircraft])

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
        // ── NIGHT EARTH — city lights on the dark side ──
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('#1a44dd')      // deep blue atmosphere
        .atmosphereAltitude(0.44)        // tall atmospheric glow
        .width(mountDiv.clientWidth)
        .height(mountDiv.clientHeight)
        .pointOfView({ lat: 28, lng: 46, altitude: 2.2 }, 0)

        // ── Event markers via WebGL points (no DOM = 60fps) ──
        .pointsData([])
        .pointLat('lat')
        .pointLng('lng')
        .pointAltitude('altitude')
        .pointColor('color')
        .pointRadius('size')
        .pointResolution(8)
        .pointsMerge(false)
        .onPointClick((point: any) => {
          if (point?.item) {
            onSelectEvent?.(point.item)
            globe.controls().autoRotate = false
          }
        })
        .pointLabel('label')

        // ── Conflict arcs ──
        .arcsData(CONFLICT_ARCS)
        .arcColor('color')
        .arcDashLength(0.4)
        .arcDashGap(0.1)
        .arcDashAnimateTime(2200)
        .arcStroke((d: ConflictArc) => d.stroke || 0.5)
        .arcAltitudeAutoScale(0.4)
        .arcLabel('label')

        // ── Location labels ──
        .labelsData(BASES.filter(b => b.label))
        .labelLat((d: StrategicBase) => d.lat)
        .labelLng((d: StrategicBase) => d.lng)
        .labelText((d: StrategicBase) => d.name)
        .labelSize(0.38)
        .labelDotRadius(0.18)
        .labelColor((d: StrategicBase) => d.color)
        .labelAltitude(0.012)
        .labelResolution(2)(mountDiv)

      globeRef.current = globe

      // ── Night globe material — boost emissive so city lights glow ──
      const mat = globe.globeMaterial()
      mat.emissive = new THREE.Color('#060e22')
      mat.emissiveIntensity = 0.6   // makes dark-side city lights pop
      mat.shininess = 20
      mat.specular = new THREE.Color('#0a1a3a')

      const scene = globe.scene()

      // ── Warm sunlight from upper-left (creates day/night contrast) ──
      const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.8)
      sunLight.position.set(-4, 5, 2)
      scene.add(sunLight)

      // ── Deep blue space ambient ──
      scene.add(new THREE.AmbientLight(0x04112a, 0.9))

      // ── Cyan rim/edge light for atmosphere definition ──
      const rimLight = new THREE.DirectionalLight(0x2255ff, 0.5)
      rimLight.position.set(3, -2, -5)
      scene.add(rimLight)

      // ── Cloud layer ──
      const cloudGeo = new THREE.SphereGeometry(102.3, 48, 48)
      const cloudTex = new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-clouds.png')
      const cloudMat = new THREE.MeshPhongMaterial({
        map: cloudTex, transparent: true, opacity: 0.28,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
      cloudMeshRef.current = new THREE.Mesh(cloudGeo, cloudMat)
      scene.add(cloudMeshRef.current)

      // ── Camera controls ──
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.18
      globe.controls().enableDamping = true
      globe.controls().dampingFactor = 0.08
      globe.controls().minDistance = 115
      globe.controls().maxDistance = 750

      // ── Smooth animation loop ──
      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate)
        if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += 0.00007
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update event points
  useEffect(() => {
    if (!globeRef.current || !ready) return
    globeRef.current.pointsData(eventPoints)
  }, [eventPoints, ready])

  // Update aircraft points (separate point layer via rings)
  useEffect(() => {
    if (!globeRef.current || !ready || !aircraftPoints.length) return
    // Use rings for aircraft for visual distinction
    const rings = aircraftPoints.slice(0, 150).map(a => ({
      lat: a.lat, lng: a.lng,
      maxR: 1.2, propagationSpeed: 3, repeatPeriod: 800,
      color: a.color,
    }))
    globeRef.current
      .ringsData(rings).ringLat('lat').ringLng('lng')
      .ringMaxRadius('maxR').ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod').ringColor('color')
  }, [aircraftPoints, ready])

  // Fly to selected event
  useEffect(() => {
    if (!globeRef.current || !selectedEvent || !ready) return
    const coords = extractCoords(selectedEvent)
    if (coords) {
      globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.3 }, 1100)
      globeRef.current.controls().autoRotate = false
    }
  }, [selectedEvent, ready])

  return (
    <div ref={wrapperRef} className="w-full h-full relative"
      style={{ background: 'radial-gradient(ellipse at 40% 50%, #081830 0%, #030a18 55%, #010408 100%)' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px solid rgba(0,229,255,0.12)',
              borderTopColor: '#00E5FF',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 12px',
            }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.52rem', color: '#00E5FF', letterSpacing: 5 }}>
              LOADING GLOBE
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.38rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 2, marginTop: 4 }}>
              NIGHT EARTH · CITY LIGHTS · CLOUD LAYER
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Error boundary ──
import { Component, type ReactNode } from 'react'

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #081428 0%, #030810 70%)' }}>
        <div className="text-center">
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: '#FF3040', letterSpacing: 3 }}>
            GLOBE ERROR
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
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
