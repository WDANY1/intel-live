'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { VerifiedEvent } from '@/lib/types'
import LiveFeed from '@/components/LiveFeed'
import EventDetail from '@/components/EventDetail'
import ErrorBoundary from '@/components/ErrorBoundary'

const Globe3D = dynamic(() => import('@/components/Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full spin" />
        <span className="font-mono text-[0.55rem] text-[#00D4FF] tracking-[3px]">LOADING GLOBE...</span>
      </div>
    </div>
  ),
})

function useTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Page() {
  const [events, setEvents] = useState<VerifiedEvent[]>([])
  const [selected, setSelected] = useState<VerifiedEvent | null>(null)
  const time = useTime()

  // Keep events in sync with LiveFeed (we fetch independently here for globe)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events?limit=50', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setEvents(data.events || [])
      } catch {}
    }
    fetchEvents()
    const id = setInterval(fetchEvents, 30000)
    return () => clearInterval(id)
  }, [])

  const handleSelect = (evt: VerifiedEvent | null) => {
    setSelected(evt)
  }

  const handleClose = () => setSelected(null)

  // Stats for header
  const critical = events.filter(e => e.severity === 'CRITICAL').length
  const verified = events.filter(e => e.status === 'VERIFIED').length

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030712] flex flex-col">
      {/* Background overlays */}
      <div className="grid-overlay" />
      <div className="scanline" />

      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b"
        style={{
          background: 'rgba(3,7,18,0.95)',
          borderColor: 'rgba(0,212,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF1744] pulse-red" />
            <span className="font-mono text-base font-bold tracking-[4px] text-[#00D4FF] glow-cyan">
              INTEL LIVE
            </span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-[rgba(0,212,255,0.2)]" />
          <span className="hidden sm:block font-mono text-[0.55rem] text-[#475569] tracking-[3px]">
            OSINT INTELLIGENCE PLATFORM
          </span>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-3">
          {critical > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(255,23,68,0.1)] border border-[rgba(255,23,68,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF1744] animate-pulse" />
              <span className="font-mono text-[0.55rem] font-bold text-[#FF1744] tracking-[1px]">
                {critical} CRITICAL
              </span>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(0,230,118,0.08)] border border-[rgba(0,230,118,0.15)]">
            <span className="font-mono text-[0.55rem] text-[#00E676] tracking-[1px]">
              {verified} VERIFIED
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
            <span className="font-mono text-[0.55rem] text-[#475569] tracking-[1px]">
              {events.length} EVENTS
            </span>
          </div>
        </div>

        {/* Right: Time + AI badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)]">
            <span className="font-mono text-[0.5rem] text-[#00D4FF] tracking-[1px]">
              GROQ · GEMINI
            </span>
          </div>
          <span className="font-mono text-[0.55rem] text-[#475569]">{time}</span>
        </div>
      </header>

      {/* ─── MAIN LAYOUT ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Globe — absolute background */}
        <div className="absolute inset-0 z-0 globe-bg">
          <ErrorBoundary>
          <Globe3D
            events={events}
            selectedEvent={selected}
            onEventSelect={handleSelect}
          />
          </ErrorBoundary>
        </div>

        {/* Left panel — Live Feed */}
        <div
          className="relative z-10 flex-shrink-0 overflow-hidden"
          style={{ width: 300 }}
        >
          <LiveFeed
            onEventSelect={handleSelect}
            selectedEventId={selected?.id ?? null}
          />
        </div>

        {/* Center — transparent globe area */}
        <div className="flex-1" />

        {/* Right panel — Event Detail (slides in when event selected) */}
        <div
          className="relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300"
          style={{ width: selected ? 320 : 0 }}
        >
          {selected && (
            <EventDetail event={selected} onClose={handleClose} />
          )}
        </div>
      </div>

      {/* ─── FOOTER TICKER ─────────────────────────────────────────────────── */}
      <footer
        className="relative z-20 flex-shrink-0 overflow-hidden py-1.5 border-t"
        style={{
          background: 'rgba(3,7,18,0.95)',
          borderColor: 'rgba(0,212,255,0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <span
            className="flex-shrink-0 font-mono text-[0.48rem] font-bold text-[#FF1744] tracking-[2px] px-3 border-r border-[rgba(255,23,68,0.2)]"
          >
            ● LIVE
          </span>
          <div className="flex-1 overflow-hidden">
            <div
              className="flex gap-8 whitespace-nowrap"
              style={{ animation: 'ticker 60s linear infinite' }}
            >
              {events.slice(0, 8).map(e => (
                <span key={e.id} className="font-mono text-[0.48rem] text-[#475569]">
                  <span style={{ color: e.severity === 'CRITICAL' ? '#FF1744' : e.severity === 'HIGH' ? '#FF6D00' : '#FFD600' }}>
                    ●
                  </span>{' '}
                  {e.headline}
                </span>
              ))}
            </div>
          </div>
          <span className="flex-shrink-0 font-mono text-[0.45rem] text-[#2d3748] tracking-[1px] px-3">
            OSINT · AI VERIFIED
          </span>
        </div>
      </footer>
    </div>
  )
}
