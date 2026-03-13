'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { WEBCAM_FEEDS, NEWS_STREAMS, SEVERITY_CONFIG } from '@/lib/config'
import { AgentManager } from '@/lib/agents'
import { useLiveData } from '@/lib/useLiveData'
import type { IntelItem, AgentStatusMap, LogEntry } from '@/lib/types'

const Globe3D = dynamic(() => import('./Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 40% 50%, #081830 0%, #030a18 55%, #010408 100%)' }}>
      <div className="text-center">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.12)', borderTopColor: '#00E5FF', animation: 'spin 0.9s linear infinite', margin: '0 auto 10px' }} />
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: '#00E5FF', letterSpacing: 5 }}>LOADING GLOBE</div>
      </div>
    </div>
  ),
})

// ── Constants ──
const NODE_PREFIX: Record<string, string> = {
  sigint: 'SIGMA', osint: 'ALPHA', humint: 'KAPPA', geoint: 'OMEGA',
  econint: 'DELTA', proxy: 'THETA', diplo: 'LAMBDA',
}

// ── Location map for coord display ──
const LOCATION_MAP: Record<string, [number, number]> = {
  tehran: [35.69, 51.39], isfahan: [32.65, 51.67], bushehr: [28.98, 50.84],
  jerusalem: [31.77, 35.21], 'tel aviv': [32.09, 34.78], gaza: [31.50, 34.47],
  beirut: [33.89, 35.50], damascus: [33.51, 36.28], baghdad: [33.32, 44.37],
  sanaa: [15.37, 44.19], hormuz: [26.57, 56.25], suez: [30.43, 32.34],
  dubai: [25.20, 55.27], doha: [25.29, 51.53], riyadh: [24.71, 46.68],
  moscow: [55.76, 37.62], kyiv: [50.45, 30.52], london: [51.51, -0.13],
  paris: [48.86, 2.35], washington: [38.90, -77.04], beijing: [39.91, 116.39],
  iran: [32.50, 53.70], israel: [31.50, 34.80], yemen: [16.00, 48.00],
  ukraine: [48.38, 31.17], russia: [55.76, 37.62], china: [35.86, 104.20],
}

function extractCoords(item: IntelItem): [number, number] | null {
  const text = [item.location, item.headline, item.summary].filter(Boolean).join(' ').toLowerCase()
  for (const [key, c] of Object.entries(LOCATION_MAP)) {
    if (text.includes(key)) return c
  }
  return null
}

function zuluNow(d: Date) { return d.toISOString().slice(11, 19) }

function nodeStatus(sev: number): 'STABLE' | 'WARNING' | 'CRITICAL' {
  if (sev >= 4) return 'CRITICAL'
  if (sev === 3) return 'WARNING'
  return 'STABLE'
}

function nodeBarWidth(sev: number) {
  return `${Math.min(95, 20 + sev * 15)}%`
}

const STATUS_COLOR = { STABLE: '#00E676', WARNING: '#FFB020', CRITICAL: '#FF3040' }
const STATUS_BG = { STABLE: 'rgba(0,230,118,0.12)', WARNING: 'rgba(255,176,32,0.12)', CRITICAL: 'rgba(255,48,64,0.12)' }

// ── Top Header Bar ──
function HeaderBar({ time, connected }: { time: Date; connected: boolean }) {
  const [bars, setBars] = useState([3, 3, 2])
  useEffect(() => {
    const t = setInterval(() => setBars([
      2 + Math.floor(Math.random() * 2),
      2 + Math.floor(Math.random() * 2),
      1 + Math.floor(Math.random() * 3),
    ]), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      height: 50, display: 'flex', alignItems: 'center',
      background: '#0b0e15',
      borderBottom: '1px solid rgba(0,229,255,0.08)',
      padding: '0 16px', flexShrink: 0, gap: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1.5px solid rgba(0,229,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,229,255,0.05)',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00E5FF', opacity: 0.8 }} />
        </div>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '0.85rem', color: '#fff', letterSpacing: 2 }}>INTEL-LIVE</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>V4.0.2</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)', marginRight: 20 }} />

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 8px #00E676', animation: 'pulse 2s ease infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
          SYSTEM STATUS: <span style={{ color: '#00E676' }}>NOMINAL</span>
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)', marginRight: 20 }} />

      {/* Zulu time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>ZULU TIME:</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.65rem', color: '#00E5FF', fontWeight: 600, letterSpacing: 2 }}>{zuluNow(time)}</span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Uplink signal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>
          UPLINK SIGNAL STRENGTH
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
          {[4, 4, 3].map((maxH, i) => (
            <div key={i} style={{
              width: 5, borderRadius: 1,
              background: bars[i] >= maxH - 1 ? '#00E5FF' : 'rgba(0,229,255,0.2)',
              height: `${(i + 1) * 4 + 4}px`,
              transition: 'background 0.5s',
            }} />
          ))}
        </div>
      </div>

      {/* Establish Uplink button */}
      <button style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', fontWeight: 700,
        letterSpacing: 2, color: '#00E5FF', padding: '6px 14px',
        border: '1px solid rgba(0,229,255,0.4)', borderRadius: 3,
        background: 'rgba(0,229,255,0.04)',
        cursor: 'pointer', transition: 'all 0.2s', marginRight: 10,
      }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.04)')}
      >
        ESTABLISH UPLINK
      </button>

      {/* White square */}
      <div style={{ width: 28, height: 28, background: connected ? '#fff' : 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
    </div>
  )
}

// ── Node Card ──
function NodeCard({ item, index, onClick, selected }: {
  item: IntelItem; index: number; onClick: () => void; selected: boolean
}) {
  const prefix = NODE_PREFIX[item.agentId] || 'NODE'
  const name = `NODE::${prefix}-${String((index % 99) + 1).padStart(2, '0')}`
  const status = nodeStatus(item.severity)
  const coords = extractCoords(item)
  const statusColor = STATUS_COLOR[status]
  const statusBg = STATUS_BG[status]

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        borderLeft: `2px solid ${selected ? statusColor : 'transparent'}`,
        background: selected ? `${statusBg}` : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
        animation: 'fadeInUp 0.25s ease both',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(0,229,255,0.03)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Node name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '0.65rem',
          color: selected ? statusColor : '#00E5FF', letterSpacing: 1,
        }}>
          {name}
        </span>
        <span style={{
          fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', fontWeight: 700,
          letterSpacing: 1.5, padding: '2px 6px', borderRadius: 2,
          color: statusColor, background: statusBg,
          border: `1px solid ${statusColor}30`,
        }}>
          {status}
        </span>
      </div>

      {/* Coordinates */}
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', marginBottom: 3, letterSpacing: 0.5 }}>
        {coords
          ? `LAT: ${coords[0].toFixed(4)} | LON: ${coords[1].toFixed(4)}`
          : item.location
            ? item.location.slice(0, 30)
            : 'LAT: — | LON: —'
        }
      </div>

      {/* Event title */}
      <div style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: '0.52rem',
        color: 'rgba(255,255,255,0.55)', lineHeight: 1.35, marginBottom: 6,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.headline}
      </div>

      {/* Status bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: nodeBarWidth(item.severity), borderRadius: 1,
          background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`,
          transition: 'width 0.6s ease',
          boxShadow: `0 0 6px ${statusColor}66`,
        }} />
      </div>
    </div>
  )
}

// ── Left Panel ──
function LeftPanel({ items, selected, onSelect, agentStatuses, totalScanned }: {
  items: IntelItem[]
  selected: IntelItem | null
  onSelect: (item: IntelItem) => void
  agentStatuses: AgentStatusMap
  totalScanned: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!bottomRef.current) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setPage(p => p + 1) },
      { threshold: 0.1 }
    )
    observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [])

  const visible = items.slice(0, page * PAGE_SIZE)
  const criticalCount = items.filter(i => i.severity >= 4).length

  return (
    <div style={{
      width: 285, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(0,229,255,0.07)',
      background: '#0b0e15',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 3 }}>
          ACTIVE NODES
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {items.length > 0 && (
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
              {items.length} NODES
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="3" width="10" height="1.2" rx="0.6" fill="rgba(255,255,255,0.3)" />
            <rect x="3" y="5.9" width="6" height="1.2" rx="0.6" fill="rgba(255,255,255,0.3)" />
            <rect x="5" y="8.8" width="2" height="1.2" rx="0.6" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '20px 14px' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              animation: 'pulse 1.5s ease infinite',
            }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ height: 8, background: 'rgba(0,229,255,0.06)', borderRadius: 2, marginBottom: 5, width: '70%' }} />
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 2, marginBottom: 6, width: '55%' }} />
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, fontFamily: 'JetBrains Mono,monospace', fontSize: '0.48rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 2 }}>
              SCANNING AGENTS...
            </div>
          </div>
        ) : (
          <>
            {visible.map((item, i) => (
              <NodeCard
                key={`${item.fetchedAt}-${i}`}
                item={item}
                index={i}
                onClick={() => onSelect(item)}
                selected={selected === item}
              />
            ))}
            {visible.length < items.length && (
              <div ref={bottomRef} style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 2 }}>
                  LOADING MORE...
                </div>
              </div>
            )}
            {visible.length >= items.length && (
              <div ref={bottomRef} style={{ height: 1 }} />
            )}
          </>
        )}
      </div>

      {/* Footer totals */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>TOTAL NODES</span>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: '#fff', fontWeight: 600 }}>
            {(Math.max(items.length, 12) * 7 + 845).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>ACTIVE UPLINKS</span>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem', color: '#00E5FF', fontWeight: 600 }}>
            {(94 + (items.length % 5)).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 14px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 6px #00E676', animation: 'pulse 2s ease infinite' }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: '#00E5FF', letterSpacing: 1 }}>GLOBAL MESH: ONLINE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)' }}>ALERTS:</span>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: criticalCount > 0 ? '#FF3040' : '#00E676', fontWeight: 700 }}>
            {criticalCount} ACTIVE
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Center Panel ──
function CenterPanel({ items, selected, onSelect, aircraft, fires, zoomIn, zoomOut, resetView }: {
  items: IntelItem[]
  selected: IntelItem | null
  onSelect: (item: IntelItem | null) => void
  aircraft: any[]
  fires: any[]
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}) {
  const defcon = items.length > 20 ? 3 : items.length > 8 ? 4 : 5
  const defconColor = defcon <= 3 ? '#FF3040' : defcon === 4 ? '#FFB020' : '#00E676'
  const globalLoad = Math.min(98, Math.round(items.length * 1.8 + 22))
  const dataRate = (items.length * 0.04 + 0.8).toFixed(1)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Sub-header */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid rgba(0,229,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.62rem', color: '#00E5FF', letterSpacing: 3 }}>
            VISUALIZING::LIVE_ORBITS
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,229,255,0.3), transparent)' }} />
          {selected && (
            <button onClick={() => onSelect(null)} style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
              padding: '2px 6px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2,
            }}>
              RESET VIEW
            </button>
          )}
        </div>
      </div>

      {/* Globe fills remaining space */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Globe3D
          intelItems={items}
          onSelectEvent={onSelect}
          selectedEvent={selected}
          aircraft={aircraft}
          fires={fires}
        />

        {/* Zoom + target controls — floating right */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 3, zIndex: 10,
        }}>
          {[
            { label: '+', action: zoomIn },
            { label: '−', action: zoomOut },
            { label: '⊙', action: resetView },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{
              width: 30, height: 30, borderRadius: 3,
              background: 'rgba(11,14,21,0.85)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,229,255,0.15)',
              color: 'rgba(0,229,255,0.7)', fontSize: label === '⊙' ? '0.75rem' : '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono,monospace', transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,229,255,0.1)'
                e.currentTarget.style.color = '#00E5FF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(11,14,21,0.85)'
                e.currentTarget.style.color = 'rgba(0,229,255,0.7)'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selected event tooltip */}
        {selected && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(11,14,21,0.95)', backdropFilter: 'blur(20px)',
            border: `1px solid ${SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.color || '#00E5FF'}33`,
            borderRadius: 4, padding: '10px 14px', maxWidth: 400, zIndex: 20,
            animation: 'fadeInUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: '#00E5FF', letterSpacing: 2 }}>
                [{(selected.agentId || 'OSINT').toUpperCase()}]
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', fontWeight: 700,
                color: SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.color || '#fff',
                padding: '1px 5px', borderRadius: 2,
                background: SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.bg || 'transparent',
              }}>
                {SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.label || 'MEDIUM'}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.4rem', color: 'rgba(0,229,255,0.4)' }}>
                {selected.time}
              </span>
            </div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#e8ecf1', lineHeight: 1.3, marginBottom: 5 }}>
              {selected.headline}
            </div>
            {selected.summary && (
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginBottom: 4 }}>
                {selected.summary.slice(0, 180)}{selected.summary.length > 180 ? '…' : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.source && (
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.4rem', color: 'rgba(255,255,255,0.3)' }}>{selected.source}</span>
              )}
              {selected.location && (
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)' }}>📍 {selected.location}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(8,11,18,0.8)',
      }}>
        {[
          { label: 'GLOBAL LOAD', value: `${globalLoad}%`, color: '#00E5FF' },
          { label: 'DATA RATE', value: `${dataRate}TB/s`, color: '#00E5FF' },
          { label: 'SECURITY', value: `DEFCON-${defcon}`, color: defconColor },
        ].map((stat, i) => (
          <div key={i} style={{
            flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 2 }}>
              {stat.label}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.05rem', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Telemetry bar chart ──
function TelemetryChart() {
  const [bars, setBars] = useState(() => Array.from({ length: 8 }, () => 20 + Math.random() * 75))
  useEffect(() => {
    const t = setInterval(() => {
      setBars(prev => prev.map(v => Math.max(15, Math.min(98, v + (Math.random() - 0.5) * 20)))
      )
    }, 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, padding: '0 4px' }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '2px 2px 0 0',
          background: `linear-gradient(180deg, rgba(0,229,255,0.8) 0%, rgba(0,180,220,0.5) 100%)`,
          height: `${h}%`,
          transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 4px rgba(0,229,255,0.3)',
        }} />
      ))}
    </div>
  )
}

// ── Webcam viewer ──
function WebcamViewer({ feeds, activeIndex, onNext, onPrev }: {
  feeds: typeof WEBCAM_FEEDS
  activeIndex: number
  onNext: () => void
  onPrev: () => void
}) {
  const [error, setError] = useState(false)
  const feed = feeds[activeIndex]

  useEffect(() => { setError(false) }, [activeIndex])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Feed title */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 6px', background: 'rgba(0,0,0,0.3)',
        borderRadius: '3px 3px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: error ? '#FF3040' : '#FF3040', animation: 'pulse 1s ease infinite', boxShadow: `0 0 5px ${error ? '#FF3040' : '#FF3040'}` }} />
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
            {feed.flag} {feed.name.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onPrev} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: 'rgba(0,229,255,0.6)', cursor: 'pointer', padding: '1px 5px', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 2 }}>‹</button>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>{activeIndex + 1}/{feeds.length}</span>
          <button onClick={onNext} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: 'rgba(0,229,255,0.6)', cursor: 'pointer', padding: '1px 5px', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 2 }}>›</button>
        </div>
      </div>

      {/* Video */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', borderRadius: '0 0 3px 3px', overflow: 'hidden' }}>
        {!error ? (
          <iframe
            key={feed.id}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            src={`https://www.youtube-nocookie.com/embed/${feed.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${feed.id}&modestbranding=1&rel=0&iv_load_policy=3`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            onError={() => setError(true)}
            title={feed.name}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#030608' }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.7rem', color: '#FF3040', letterSpacing: 3, marginBottom: 6 }}>NO SIGNAL</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>ENCRYPTED FEED</div>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg,#fff,#fff 1px,transparent 1px,transparent 3px)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Console logs ──
function ConsoleLogs({ logs }: { logs: LogEntry[] }) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const typeColor = { info: '#00E5FF', success: '#00E676', error: '#FF3040', system: 'rgba(0,229,255,0.45)' }
  const typeLabel = { info: 'INFO', success: 'INFO', error: 'ERR ', system: 'SYS ' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', fontFamily: 'JetBrains Mono,monospace' }}>
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 1, animation: 'fadeIn 0.15s ease' }}>
          <span style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.28)', flexShrink: 0, paddingTop: 1 }}>[{log.time}]</span>
          <span style={{ fontSize: '0.48rem', color: typeColor[log.type], flexShrink: 0, fontWeight: 700, paddingTop: 1 }}>{typeLabel[log.type]}:</span>
          <span style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{log.message}</span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  )
}

// ── Right Panel ──
function RightPanel({ logs, agentStatuses, items }: {
  logs: LogEntry[]
  agentStatuses: AgentStatusMap
  items: IntelItem[]
}) {
  const [tab, setTab] = useState<'console' | 'cams'>('console')
  const [camIndex, setCamIndex] = useState(0)
  const [pktLoss, setPktLoss] = useState('0.0001')
  const [latency, setLatency] = useState(14)
  const [cmd, setCmd] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setPktLoss((Math.random() * 0.001 + 0.00005).toFixed(5))
      setLatency(Math.round(10 + Math.random() * 20))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  const nextCam = useCallback(() => setCamIndex(i => (i + 1) % WEBCAM_FEEDS.length), [])
  const prevCam = useCallback(() => setCamIndex(i => (i - 1 + WEBCAM_FEEDS.length) % WEBCAM_FEEDS.length), [])

  // Compute coordinate from items
  const coordItem = items[0]
  const coords = coordItem ? extractCoords(coordItem) : null

  return (
    <div style={{
      width: 365, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid rgba(0,229,255,0.07)',
      background: '#0b0e15',
    }}>
      {/* Telemetry header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 3 }}>
          LIVE TELEMETRY
        </span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.45rem', color: '#00E5FF', letterSpacing: 2, padding: '2px 6px', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 2 }}>
          REAL-TIME
        </span>
      </div>

      {/* Bar chart */}
      <div style={{ padding: '10px 14px 8px', flexShrink: 0 }}>
        <TelemetryChart />
      </div>

      {/* Metric grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, margin: '0 14px 10px',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3,
        overflow: 'hidden', flexShrink: 0,
      }}>
        {[
          { label: 'PACKET LOSS', value: `${pktLoss}%`, color: '#00E5FF', mono: true },
          { label: 'LATENCY', value: `${latency}ms`, color: '#e8ecf1', mono: false },
          { label: 'ENCRYPTION', value: 'AES-256', color: '#00E5FF', mono: true },
          { label: 'PROTOCOL', value: 'HTTP/3', color: '#e8ecf1', mono: false },
        ].map((m, i) => (
          <div key={i} style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.015)',
            borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.95rem', fontWeight: 700, color: m.color, letterSpacing: m.mono ? 1 : 0 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Console / Cams tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px 5px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['console', 'cams'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: '0.5rem', letterSpacing: 2,
              padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
              color: tab === t ? '#00E5FF' : 'rgba(255,255,255,0.3)',
              background: tab === t ? 'rgba(0,229,255,0.08)' : 'transparent',
              border: tab === t ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
              fontWeight: tab === t ? 700 : 400,
            }}>
              {t === 'console' ? 'CONSOLE LOGS' : '📡 LIVE CAMS'}
            </button>
          ))}
        </div>
        {/* Expand icon */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3 }}>
          <path d="M2 4V2H4M8 2H10V4M10 8V10H8M4 10H2V8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'console' ? (
          <ConsoleLogs logs={logs} />
        ) : (
          <div style={{ padding: '8px 10px', overflowY: 'auto' }}>
            <WebcamViewer feeds={WEBCAM_FEEDS} activeIndex={camIndex} onNext={nextCam} onPrev={prevCam} />
            {/* News streams */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6 }}>LIVE NEWS STREAMS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {NEWS_STREAMS.map(ns => (
                  <a
                    key={ns.id}
                    href={`https://www.youtube.com/watch?v=${ns.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem',
                      color: ns.color, padding: '3px 8px',
                      border: `1px solid ${ns.color}33`, borderRadius: 2,
                      textDecoration: 'none', letterSpacing: 1,
                    }}
                  >
                    {ns.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Command input */}
      <div style={{
        padding: '6px 10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.6rem', color: '#00E5FF', opacity: 0.7 }}>$</span>
          <input
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            placeholder="Enter command..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'JetBrains Mono,monospace', fontSize: '0.55rem',
              color: 'rgba(255,255,255,0.6)',
              '::placeholder': { color: 'rgba(255,255,255,0.25)' },
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Coordinate bar */}
      <div style={{
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
          {coords
            ? `COORD: ${Math.abs(coords[0]).toFixed(4)}°${coords[0] >= 0 ? 'N' : 'S'} | ${Math.abs(coords[1]).toFixed(4)}°${coords[1] >= 0 ? 'E' : 'W'} | ALT: 35,796 KM | ORBIT: GEOSTATIONARY`
            : 'COORD: 38.8977°N | 77.0365°W | ALT: 35,796 KM | ORBIT: GEOSTATIONARY'
          }
        </span>
      </div>
    </div>
  )
}

// ── Agent log generator ──
function makeLog(msg: string, type: LogEntry['type']): LogEntry {
  return { time: new Date().toISOString().slice(11, 19), message: msg, type }
}

// ── Main Dashboard ──
export default function LiveIntelDashboard() {
  const [time, setTime] = useState(new Date())
  const [items, setItems] = useState<IntelItem[]>([])
  const [selected, setSelected] = useState<IntelItem | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusMap>({})
  const [connected, setConnected] = useState(true)
  const [totalScanned, setTotalScanned] = useState(0)

  const agentManagerRef = useRef<AgentManager | null>(null)

  const { aircraft, fires } = useLiveData()

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'system') => {
    setLogs(prev => [...prev.slice(-80), makeLog(msg, type)])
  }, [])

  // SSE connection for real-time events
  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    function connect() {
      try {
        es = new EventSource('/api/stream')

        es.onopen = () => {
          setConnected(true)
          addLog('SSE stream connected — awaiting intel push', 'info')
        }

        es.addEventListener('intel', (e) => {
          try {
            const data = JSON.parse(e.data)
            if (Array.isArray(data)) {
              setItems(prev => {
                const existing = new Set(prev.map(x => x.headline))
                const novel = data.filter(d => !existing.has(d.headline))
                if (novel.length > 0) {
                  addLog(`Received ${novel.length} new intel event(s) via stream`, 'info')
                }
                return [...novel, ...prev].slice(0, 200)
              })
            }
          } catch {}
        })

        es.onerror = () => {
          setConnected(false)
          es?.close()
          reconnectTimer = setTimeout(connect, 8000)
        }
      } catch {
        reconnectTimer = setTimeout(connect, 8000)
      }
    }

    connect()
    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [addLog])

  // Agent manager
  useEffect(() => {
    addLog('Initializing INTEL-LIVE v4.0.2 command center', 'system')
    addLog('Handshake initiated with NODE::ALPHA-07', 'info')
    addLog('Synchronizing global temporal buffers...', 'system')

    const agentManager = new AgentManager(
      process.env.NEXT_PUBLIC_OPENROUTER_KEY || '',
      (payload) => {
        const allItems: IntelItem[] = Object.values(payload.intel).flat()
        setTotalScanned(prev => prev + allItems.length)
        setItems(prev => {
          const existing = new Set(prev.map(x => x.headline))
          const novel = allItems.filter(x => !existing.has(x.headline))
          if (novel.length > 0) {
            addLog(`Intel cycle #${payload.cycle}: +${novel.length} events from ${payload.modelsUsed.length} models`, 'info')
          }
          return [...novel, ...prev].slice(0, 200)
        })
      },
      (progress) => {
        setAgentStatuses(prev => ({ ...prev, [progress.agentId]: progress }))
        if (progress.status === 'running') {
          addLog(`Agent ${progress.agentId.toUpperCase()} scanning: ${progress.message}`, 'system')
        } else if (progress.status === 'done') {
          addLog(`Agent ${progress.agentId.toUpperCase()} completed — ${progress.count || 0} events indexed`, 'info')
        } else if (progress.status === 'error') {
          addLog(`Agent ${progress.agentId.toUpperCase()} error: ${progress.message}`, 'error')
        }
      },
      (entry) => {
        setLogs(prev => [...prev.slice(-80), entry])
      }
    )

    agentManagerRef.current = agentManager
    agentManager.start()

    // Simulate system logs
    const sysLogs = [
      { msg: 'High jitter detected on satellite link 4-B', type: 'error' as const, delay: 3000 },
      { msg: 'Establishing encrypted tunnel to primary relay...', type: 'info' as const, delay: 6000 },
      { msg: 'AES-256 encryption layer active on all channels', type: 'system' as const, delay: 9000 },
      { msg: 'Auto-rerouting traffic through NODE::SIGMA-04', type: 'system' as const, delay: 12000 },
      { msg: 'Uplink stability restored — all systems nominal', type: 'info' as const, delay: 15000 },
      { msg: 'Scanning for new incidents_', type: 'system' as const, delay: 18000 },
    ]
    const timers = sysLogs.map(({ msg, type, delay }) =>
      setTimeout(() => addLog(msg, type), delay)
    )

    return () => {
      agentManager.stop()
      timers.forEach(clearTimeout)
    }
  }, [addLog])

  // Globe zoom controls
  const handleZoomIn = useCallback(() => {
    // Globe zoom is handled internally via controls
  }, [])
  const handleZoomOut = useCallback(() => {}, [])
  const handleResetView = useCallback(() => {}, [])

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: '#0b0e15', color: '#e8ecf1',
    }}>
      {/* Scanline overlay — very subtle */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.004) 3px, rgba(0,229,255,0.004) 6px)',
      }} />

      {/* Header */}
      <HeaderBar time={time} connected={connected} />

      {/* Body — 3 columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel
          items={items}
          selected={selected}
          onSelect={setSelected}
          agentStatuses={agentStatuses}
          totalScanned={totalScanned}
        />
        <CenterPanel
          items={items}
          selected={selected}
          onSelect={setSelected}
          aircraft={aircraft}
          fires={fires}
          zoomIn={handleZoomIn}
          zoomOut={handleZoomOut}
          resetView={handleResetView}
        />
        <RightPanel
          logs={logs}
          agentStatuses={agentStatuses}
          items={items}
        />
      </div>
    </div>
  )
}
