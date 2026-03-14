'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { VerifiedEvent } from '@/lib/types'

interface Props {
  onEventSelect: (e: VerifiedEvent) => void
  selectedEventId: string | null
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#FF1744',
  HIGH: '#FF6D00',
  MEDIUM: '#FFD600',
  LOW: '#00E5FF',
}

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: '#00E676',
  PROBABLE: '#FFAB40',
  DEVELOPING: '#80DEEA',
  UNVERIFIED: '#9E9E9E',
}

const TIER_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' }
const TIER_COLOR: Record<number, string> = {
  1: '#00E676',
  2: '#FFAB40',
  3: '#80DEEA',
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

interface ApiResponse {
  events: VerifiedEvent[]
  stats: { total: number; verified: number; critical: number; lastRunAt: string | null }
}

export default function LiveFeed({ onEventSelect, selectedEventId }: Props) {
  const [events, setEvents] = useState<VerifiedEvent[]>([])
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const prevIds = useRef<Set<string>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?limit=50', { cache: 'no-store' })
      if (!res.ok) return
      const data: ApiResponse = await res.json()

      const incoming = data.events || []
      const fresh = new Set<string>()
      for (const e of incoming) {
        if (!prevIds.current.has(e.id)) fresh.add(e.id)
      }

      prevIds.current = new Set(incoming.map(e => e.id))
      setNewIds(fresh)
      setEvents(incoming)
      setStats(data.stats)
      setLastUpdated(new Date().toLocaleTimeString())
      setLoading(false)

      // Clear "new" highlights after 4s
      if (fresh.size > 0) {
        setTimeout(() => setNewIds(new Set()), 4000)
      }
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    intervalRef.current = setInterval(fetchEvents, 30000)
    return () => clearInterval(intervalRef.current)
  }, [fetchEvents])

  return (
    <div className="flex flex-col h-full bg-[rgba(3,7,18,0.92)] backdrop-blur-md border-r border-[rgba(0,212,255,0.1)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[rgba(0,212,255,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF1744] animate-pulse" />
            <span className="font-mono text-[0.65rem] font-bold tracking-[3px] text-[#00D4FF]">LIVE INTEL FEED</span>
          </div>
          <span className="font-mono text-[0.55rem] text-[#475569]">{lastUpdated || '—'}</span>
        </div>
        {stats && (
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'EVENTS', value: stats.total, color: '#00D4FF' },
              { label: 'VERIFIED', value: stats.verified, color: '#00E676' },
              { label: 'CRITICAL', value: stats.critical, color: '#FF1744' },
            ].map(s => (
              <div key={s.label} className="bg-[rgba(255,255,255,0.03)] rounded px-2 py-1 text-center">
                <div className="font-mono text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="font-mono text-[0.5rem] text-[#475569] tracking-[1px]">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            <span className="font-mono text-[0.55rem] text-[#475569] tracking-[2px]">SCANNING FEEDS...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 text-center">
            <span className="font-mono text-[0.6rem] text-[#475569]">NO EVENTS LOADED</span>
          </div>
        ) : (
          events.map(evt => (
            <EventCard
              key={evt.id}
              event={evt}
              isSelected={evt.id === selectedEventId}
              isNew={newIds.has(evt.id)}
              onClick={() => onEventSelect(evt)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-[rgba(0,212,255,0.06)]">
        <div className="font-mono text-[0.5rem] text-[#2d3748] tracking-[1px] text-center">
          AUTO-REFRESH 30s · GROQ + GEMINI AI · RSS + NITTER + GDELT
        </div>
      </div>
    </div>
  )
}

function EventCard({
  event, isSelected, isNew, onClick,
}: {
  event: VerifiedEvent; isSelected: boolean; isNew: boolean; onClick: () => void
}) {
  const sevColor = SEV_COLOR[event.severity] || '#00E5FF'
  const statusColor = STATUS_COLOR[event.status] || '#9E9E9E'

  return (
    <div
      onClick={onClick}
      className="cursor-pointer border-b border-[rgba(255,255,255,0.04)] transition-all duration-300"
      style={{
        background: isSelected
          ? `rgba(0,212,255,0.08)`
          : isNew
          ? `rgba(0,230,118,0.06)`
          : 'transparent',
        borderLeft: isSelected ? `2px solid ${sevColor}` : '2px solid transparent',
      }}
    >
      <div className="px-3 py-3">
        {/* Top row: severity + time + status */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: sevColor, boxShadow: `0 0 4px ${sevColor}` }}
            />
            <span className="font-mono text-[0.55rem] font-bold tracking-[2px]" style={{ color: sevColor }}>
              {event.severity}
            </span>
            {isNew && (
              <span className="font-mono text-[0.45rem] px-1 py-px rounded bg-[#00E676]/20 text-[#00E676] tracking-[1px]">
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-[0.45rem] px-1 py-px rounded tracking-[1px]"
              style={{ color: statusColor, background: `${statusColor}18` }}
            >
              {event.status}
            </span>
            <span className="font-mono text-[0.5rem] text-[#475569]">{timeAgo(event.createdAt)}</span>
          </div>
        </div>

        {/* Headline */}
        <p className="font-sans text-[0.72rem] font-semibold text-[#E2E8F0] leading-snug mb-1.5">
          {event.headline}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 mb-2">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#475569"/>
          </svg>
          <span className="font-mono text-[0.55rem] text-[#475569]">{event.locationName}</span>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[0.5rem] text-[#475569] w-8">
            {event.confidenceScore}%
          </span>
          <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${event.confidenceScore}%`,
                background: event.confidenceScore >= 75
                  ? '#00E676'
                  : event.confidenceScore >= 45
                  ? '#FFAB40'
                  : '#FF5252',
              }}
            />
          </div>
        </div>

        {/* Sources */}
        <div className="flex flex-wrap gap-1">
          {event.sources.slice(0, 4).map((src, i) => (
            <span
              key={i}
              className="font-mono text-[0.48rem] px-1.5 py-px rounded"
              style={{
                color: TIER_COLOR[src.tier] || '#9E9E9E',
                background: `${TIER_COLOR[src.tier] || '#9E9E9E'}18`,
                border: `1px solid ${TIER_COLOR[src.tier] || '#9E9E9E'}30`,
              }}
            >
              {TIER_LABEL[src.tier]} {src.handle}
            </span>
          ))}
          {event.sources.length > 4 && (
            <span className="font-mono text-[0.48rem] text-[#475569]">+{event.sources.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  )
}
