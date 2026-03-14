'use client'

import { useEffect, useRef, useState } from 'react'
import { VerifiedEvent } from '@/lib/types'

interface Props {
  events: VerifiedEvent[]
  selectedEvent: VerifiedEvent | null
  onEventSelect: (e: VerifiedEvent | null) => void
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#FF1744',
  HIGH:     '#FF6D00',
  MEDIUM:   '#FFD600',
  LOW:      '#00E5FF',
}

export default function Globe3D({ events, selectedEvent, onEventSelect }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<any>(null)
  const [error, setError]   = useState<string | null>(null)
  const [ready, setReady]   = useState(false)

  // ── Init globe once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return
    let cancelled = false

    const init = async () => {
      try {
        // Dynamic import — only runs in browser (ssr:false guaranteed by parent)
        const mod = await import('globe.gl')
        if (cancelled) return

        // globe.gl exports a factory function (call without `new`)
        const GlobeFactory = (mod as any).default ?? mod
        const globe = GlobeFactory()

        globe
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .atmosphereColor('#00D4FF')
          .atmosphereAltitude(0.18)
          .width(mountRef.current!.clientWidth || window.innerWidth)
          .height(mountRef.current!.clientHeight || window.innerHeight)

        // Mount to DOM
        globe(mountRef.current!)
        globeRef.current = globe

        // Camera + controls
        globe.controls().autoRotate      = true
        globe.controls().autoRotateSpeed = 0.4
        globe.controls().enableZoom      = true
        globe.controls().minDistance     = 150
        globe.controls().maxDistance     = 600
        globe.pointOfView({ lat: 28, lng: 45, altitude: 2.2 }, 0)

        setReady(true)
      } catch (err) {
        console.error('[Globe3D] init failed:', err)
        setError(String(err))
      }
    }

    // Small delay to ensure DOM is painted
    const t = setTimeout(init, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  // ── Resize handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (globeRef.current && mountRef.current) {
        globeRef.current
          .width(mountRef.current.clientWidth)
          .height(mountRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Update markers when events change ──────────────────────────────────────
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !ready || events.length === 0) return

    try {
      const rings = events.map(evt => ({
        lat:              evt.latitude,
        lng:              evt.longitude,
        maxR:             evt.severity === 'CRITICAL' ? 3.5 : evt.severity === 'HIGH' ? 2.5 : 1.8,
        propagationSpeed: evt.severity === 'CRITICAL' ? 2.5 : 1.5,
        repeatPeriod:     evt.severity === 'CRITICAL' ? 700 : 1300,
        color:            SEV_COLOR[evt.severity] ?? '#00E5FF',
        altitude:         (evt.confidenceScore / 100) * 0.07 + 0.01,
        _evt:             evt,
      }))

      globe
        .ringsData(rings)
        .ringColor((d: any) => (t: number) => {
          const hex = d.color
          const alpha = Math.max(0, 1 - t * t)
          return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
        })
        .ringMaxRadius('maxR')
        .ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod')
        .ringAltitude('altitude')
        .onRingClick((d: any) => {
          onEventSelect(d._evt)
          globe.controls().autoRotate = false
          globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.4 }, 1200)
        })

      // Dot HTML markers
      const htmlData = events.map(evt => {
        const color = SEV_COLOR[evt.severity] ?? '#00E5FF'
        const el = document.createElement('div')
        el.style.cssText = [
          'width:10px', 'height:10px', 'border-radius:50%',
          `background:${color}`, `box-shadow:0 0 10px 3px ${color}88`,
          'cursor:pointer', 'transition:transform 0.2s', `border:1px solid ${color}`,
        ].join(';')
        el.onmouseenter = () => { el.style.transform = 'scale(2)' }
        el.onmouseleave = () => { el.style.transform = 'scale(1)' }
        el.onclick = () => {
          onEventSelect(evt)
          globe.controls().autoRotate = false
          globe.pointOfView({ lat: evt.latitude, lng: evt.longitude, altitude: 1.4 }, 1200)
        }
        return { lat: evt.latitude, lng: evt.longitude, el, _evt: evt }
      })

      globe
        .htmlElementsData(htmlData)
        .htmlElement('el')
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0.006)
    } catch (err) {
      console.warn('[Globe3D] marker update failed:', err)
    }
  }, [events, ready, onEventSelect])

  // ── Auto-rotate control ────────────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = !selectedEvent
  }, [selectedEvent])

  // ── Error fallback ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-32 h-32 rounded-full border border-[rgba(0,212,255,0.15)] mx-auto flex items-center justify-center">
            <span className="font-mono text-[0.6rem] text-[#475569] tracking-[2px]">GLOBE<br/>OFFLINE</span>
          </div>
          <p className="font-mono text-[0.5rem] text-[#2d3748]">WebGL unavailable — feed active</p>
        </div>
      </div>
    )
  }

  return <div ref={mountRef} className="w-full h-full" />
}
