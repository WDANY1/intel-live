'use client'

import { VerifiedEvent } from '@/lib/types'

interface Props {
  event: VerifiedEvent | null
  onClose: () => void
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

const TIER_COLOR: Record<number, string> = { 1: '#00E676', 2: '#FFAB40', 3: '#80DEEA' }
const TIER_NAME: Record<number, string>  = { 1: 'TIER 1 · WIRE', 2: 'TIER 2 · OSINT', 3: 'TIER 3 · SCANNER' }

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default function EventDetail({ event, onClose }: Props) {
  if (!event) return null

  const sevColor = SEV_COLOR[event.severity] || '#00E5FF'
  const statusColor = STATUS_COLOR[event.status] || '#9E9E9E'

  return (
    <div className="flex flex-col h-full bg-[rgba(3,7,18,0.95)] backdrop-blur-md border-l border-[rgba(0,212,255,0.1)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[rgba(0,212,255,0.1)]">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[0.55rem] font-bold tracking-[3px] text-[#475569]">
            EVENT DETAIL
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-[#475569] hover:text-[#E2E8F0] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="font-mono text-[0.5rem] text-[#475569]">{formatTime(event.createdAt)}</div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">
        {/* Severity + Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-[0.6rem] font-bold px-2 py-1 rounded tracking-[2px]"
            style={{ color: sevColor, background: `${sevColor}20`, border: `1px solid ${sevColor}40` }}
          >
            ● {event.severity}
          </span>
          <span
            className="font-mono text-[0.6rem] px-2 py-1 rounded tracking-[2px]"
            style={{ color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}30` }}
          >
            {event.status}
          </span>
          <span className="font-mono text-[0.55rem] px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] text-[#475569] tracking-[1px]">
            {event.category}
          </span>
        </div>

        {/* Headline */}
        <div>
          <div className="font-mono text-[0.5rem] text-[#475569] tracking-[2px] mb-1">HEADLINE</div>
          <h2 className="font-sans text-sm font-bold text-[#E2E8F0] leading-snug">{event.headline}</h2>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 p-2 rounded bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#00D4FF">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <div>
            <div className="font-mono text-[0.65rem] font-bold text-[#00D4FF]">{event.locationName}</div>
            <div className="font-mono text-[0.5rem] text-[#475569]">
              {event.latitude.toFixed(2)}°N · {event.longitude.toFixed(2)}°E
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="font-mono text-[0.5rem] text-[#475569] tracking-[2px] mb-1.5">INTELLIGENCE SUMMARY</div>
          <p className="font-sans text-[0.72rem] text-[#CBD5E0] leading-relaxed">{event.summary}</p>
        </div>

        {/* Confidence score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[0.5rem] text-[#475569] tracking-[2px]">CONFIDENCE SCORE</span>
            <span
              className="font-mono text-[0.65rem] font-bold"
              style={{
                color: event.confidenceScore >= 75 ? '#00E676'
                  : event.confidenceScore >= 45 ? '#FFAB40'
                  : '#FF5252',
              }}
            >
              {event.confidenceScore}%
            </span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${event.confidenceScore}%`,
                background: event.confidenceScore >= 75
                  ? 'linear-gradient(90deg,#00C853,#00E676)'
                  : event.confidenceScore >= 45
                  ? 'linear-gradient(90deg,#E65100,#FFAB40)'
                  : 'linear-gradient(90deg,#B71C1C,#FF5252)',
              }}
            />
          </div>
        </div>

        {/* Perspectives */}
        {(event.perspective.sideA || event.perspective.sideB) && (
          <div>
            <div className="font-mono text-[0.5rem] text-[#475569] tracking-[2px] mb-2">DUAL PERSPECTIVE</div>
            <div className="space-y-2">
              {event.perspective.sideA && (
                <div className="p-2 rounded bg-[rgba(255,23,68,0.06)] border border-[rgba(255,23,68,0.15)]">
                  <div className="font-mono text-[0.48rem] font-bold text-[#FF5252] tracking-[1px] mb-0.5">
                    AXIS / RESISTANCE
                  </div>
                  <p className="font-sans text-[0.65rem] text-[#CBD5E0] leading-relaxed">{event.perspective.sideA}</p>
                </div>
              )}
              {event.perspective.sideB && (
                <div className="p-2 rounded bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]">
                  <div className="font-mono text-[0.48rem] font-bold text-[#00D4FF] tracking-[1px] mb-0.5">
                    US / COALITION / ISRAEL
                  </div>
                  <p className="font-sans text-[0.65rem] text-[#CBD5E0] leading-relaxed">{event.perspective.sideB}</p>
                </div>
              )}
              {event.perspective.neutral && (
                <div className="p-2 rounded bg-[rgba(0,230,118,0.06)] border border-[rgba(0,230,118,0.12)]">
                  <div className="font-mono text-[0.48rem] font-bold text-[#00E676] tracking-[1px] mb-0.5">
                    INDEPENDENTLY CONFIRMED
                  </div>
                  <p className="font-sans text-[0.65rem] text-[#CBD5E0] leading-relaxed">{event.perspective.neutral}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div>
            <div className="font-mono text-[0.5rem] text-[#475569] tracking-[2px] mb-2">TAGS</div>
            <div className="flex flex-wrap gap-1">
              {event.tags.map((tag, i) => (
                <span
                  key={i}
                  className="font-mono text-[0.55rem] px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#94A3B8] border border-[rgba(255,255,255,0.08)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        <div>
          <div className="font-mono text-[0.5rem] text-[#475569] tracking-[2px] mb-2">
            CORROBORATING SOURCES ({event.sources.length})
          </div>
          <div className="space-y-2">
            {event.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded border transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] group"
                style={{ borderColor: `${TIER_COLOR[src.tier]}25` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-mono text-[0.6rem] font-bold"
                    style={{ color: TIER_COLOR[src.tier] }}
                  >
                    {src.handle}
                  </span>
                  <span
                    className="font-mono text-[0.45rem] px-1 py-px rounded"
                    style={{
                      color: TIER_COLOR[src.tier],
                      background: `${TIER_COLOR[src.tier]}18`,
                    }}
                  >
                    {TIER_NAME[src.tier]}
                  </span>
                </div>
                {src.quote && (
                  <p className="font-sans text-[0.6rem] text-[#64748B] italic leading-relaxed group-hover:text-[#94A3B8] transition-colors">
                    &quot;{src.quote}&quot;
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
