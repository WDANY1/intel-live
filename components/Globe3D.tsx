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
  const mountRef   = useRef<HTMLDivElement>(null)
  const globeRef   = useRef<any>(null)
  const [ready, setReady] = useState(false)

  // Initialize globe once
  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined') return

    let globe: any

    ;(async () => {
      const GlobeModule = await import('globe.gl')
      const GlobeConstructor = (GlobeModule as any).default ?? GlobeModule

      globe = new GlobeConstructor()
      globeRef.current = globe

      globe
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereColor('#00D4FF')
        .atmosphereAltitude(0.18)
        .width(mountRef.current!.clientWidth)
        .height(mountRef.current!.clientHeight)
        (mountRef.current!)

      globe.controls().autoRotate      = true
      globe.controls().autoRotateSpeed = 0.4
      globe.controls().enableZoom      = true
      globe.controls().minDistance     = 150
      globe.controls().maxDistance     = 600

      globe.pointOfView({ lat: 30, lng: 45, altitude: 2.2 }, 0)
      setReady(true)
    })()

    const handleResize = () => {
      if (globeRef.current && mountRef.current) {
        globeRef.current
          .width(mountRef.current.clientWidth)
          .height(mountRef.current.clientHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      globeRef.current?._destructor?.()
    }
  }, [])

  // Update rings when events change
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !ready) return

    const rings = events.map(evt => ({
      lat:              evt.latitude,
      lng:              evt.longitude,
      maxR:             evt.severity === 'CRITICAL' ? 3.5 : evt.severity === 'HIGH' ? 2.5 : 1.8,
      propagationSpeed: evt.severity === 'CRITICAL' ? 2.5 : 1.5,
      repeatPeriod:     evt.severity === 'CRITICAL' ? 700 : 1200,
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

    // HTML dot markers
    if (typeof document !== 'undefined') {
      const htmlData = events.map(evt => {
        const color = SEV_COLOR[evt.severity] ?? '#00E5FF'
        const el = document.createElement('div')
        el.style.cssText = [
          'width:10px','height:10px','border-radius:50%',
          `background:${color}`,`box-shadow:0 0 10px 3px ${color}88`,
          'cursor:pointer','transition:transform 0.2s',`border:1px solid ${color}`,
        ].join(';')
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.9)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        el.addEventListener('click', () => {
          onEventSelect(evt)
          globe.controls().autoRotate = false
          globe.pointOfView({ lat: evt.latitude, lng: evt.longitude, altitude: 1.4 }, 1200)
        })
        return { lat: evt.latitude, lng: evt.longitude, el, _evt: evt }
      })

      globe
        .htmlElementsData(htmlData)
        .htmlElement('el')
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0.006)
    }
  }, [events, ready, onEventSelect])

  // Resume auto-rotation when deselected
  useEffect(() => {
    if (!globeRef.current) return
    if (!selectedEvent) {
      globeRef.current.controls().autoRotate = true
    }
  }, [selectedEvent])

  return <div ref={mountRef} className="w-full h-full" />
}
