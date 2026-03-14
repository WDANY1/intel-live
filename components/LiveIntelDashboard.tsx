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
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,242,255,0.12)', borderTopColor: '#00f2ff', animation: 'spin 0.9s linear infinite', margin: '0 auto 10px' }} />
        <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.5rem', color: '#00f2ff', letterSpacing: 5, textTransform: 'uppercase' }}>Loading Globe</div>
      </div>
    </div>
  ),
})

// ── Design tokens (matching the provided HTML reference exactly) ──
const D = {
  cyan:        '#00f2ff',
  green:       '#00ff41',
  red:         '#FF3040',
  yellow:      '#eab308',
  bg:          '#000000',
  bgLight:     '#0a0a0a',
  bgPanel:     'rgba(10, 10, 10, 0.85)',
  bgCard:      'rgba(255, 255, 255, 0.02)',
  bgCardHover: 'rgba(255, 255, 255, 0.035)',
  border:      'rgba(255, 255, 255, 0.05)',
  borderMed:   'rgba(255, 255, 255, 0.1)',
  borderCyan:  'rgba(0, 242, 255, 0.2)',
  borderCyanHover: 'rgba(0, 242, 255, 0.35)',
  text:        '#f1f5f9',
  textMuted:   '#94a3b8',
  textDim:     '#64748b',
  mono:        "'JetBrains Mono', monospace",
  display:     "'Space Grotesk', sans-serif",
}

// ── Status config ──
const STATUS_CFG = {
  STABLE:   { color: D.green,  bg: 'rgba(0,255,65,0.18)',    border: 'rgba(0,255,65,0.3)',    barColor: D.cyan,   textColor: D.cyan  },
  WARNING:  { color: D.yellow, bg: 'rgba(234,179,8,0.18)',   border: 'rgba(234,179,8,0.3)',   barColor: D.yellow, textColor: '#fff'  },
  CRITICAL: { color: '#ef4444',bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.3)',   barColor: '#ef4444',textColor: '#ef4444'},
}

// ── Node prefix mapping ──
const NODE_PREFIX: Record<string, string> = {
  sigint: 'SIGMA', osint: 'ALPHA', humint: 'KAPPA', geoint: 'OMEGA',
  econint: 'DELTA', proxy: 'THETA', diplo: 'LAMBDA',
}

// ── Location map ──
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

// ════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════
function Header({ time, connected }: { time: Date; connected: boolean }) {
  const [bars, setBars] = useState([true, true, true, false, false])

  useEffect(() => {
    const t = setInterval(() => {
      const strength = 2 + Math.floor(Math.random() * 2)
      setBars([true, true, strength >= 3, strength >= 4, strength >= 5])
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 52, flexShrink: 0,
      background: D.bgPanel, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${D.borderMed}`,
      position: 'relative', zIndex: 50,
    }}>
      {/* Left: Logo + Divider + Status + Divider + Zulu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          <span style={{
            fontSize: 22, lineHeight: 1,
            background: `linear-gradient(135deg, ${D.cyan}, #0d7ff2)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>◉</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: D.display, fontWeight: 700, fontSize: '1.05rem', color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Intel-Live
            </span>
            <span style={{ fontFamily: D.mono, fontSize: '0.52rem', fontWeight: 300, color: 'rgba(0,242,255,0.45)', letterSpacing: '0.05em' }}>
              v4.0.2
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: D.borderMed, marginRight: 24 }} />

        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 24 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: D.green, boxShadow: `0 0 8px ${D.green}`,
            animation: 'pulse 2s ease infinite',
          }} />
          <span style={{ fontFamily: D.mono, fontSize: '0.58rem', color: D.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            System Status: <span style={{ color: D.green }}>Nominal</span>
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: D.borderMed, marginRight: 24 }} />

        {/* Zulu time */}
        <div style={{ fontFamily: D.mono, fontSize: '0.58rem', color: D.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Zulu Time: <span style={{ color: D.cyan, fontWeight: 600 }}>{zuluNow(time)}</span>
        </div>
      </div>

      {/* Right: Signal + Button + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Uplink signal strength */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontFamily: D.mono, fontSize: '0.44rem', color: D.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Uplink Signal Strength
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {[8, 10, 12, 10, 10].map((h, i) => (
              <div key={i} style={{
                width: 4, height: h,
                background: bars[i] ? D.cyan : `rgba(0,242,255,0.25)`,
                transition: 'background 0.6s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Establish Uplink button */}
        <button
          style={{
            fontFamily: D.display, fontSize: '0.58rem', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: D.cyan, padding: '7px 20px',
            border: `1px solid ${D.cyan}`,
            background: `rgba(0,242,255,0.08)`,
            cursor: 'pointer', transition: 'all 0.2s',
            borderRadius: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = D.cyan
            e.currentTarget.style.color = '#000'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,242,255,0.08)'
            e.currentTarget.style.color = D.cyan
          }}
        >
          Establish Uplink
        </button>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32,
          border: `1px solid rgba(255,255,255,0.2)`,
          padding: 1, flexShrink: 0,
        }}>
          <div style={{
            width: '100%', height: '100%',
            background: connected
              ? 'linear-gradient(135deg, #e2e8f0, #cbd5e1)'
              : 'rgba(255,255,255,0.4)',
          }} />
        </div>
      </div>
    </header>
  )
}

// ════════════════════════════════════════════════════════════
// NODE CARD
// ════════════════════════════════════════════════════════════
function NodeCard({ item, index, onClick, selected }: {
  item: IntelItem; index: number; onClick: () => void; selected: boolean
}) {
  const prefix = NODE_PREFIX[item.agentId] || 'NODE'
  const name = `NODE::${prefix}-${String((index % 99) + 1).padStart(2, '0')}`
  const status = nodeStatus(item.severity)
  const s = STATUS_CFG[status]
  const coords = extractCoords(item)
  const barWidth = `${Math.min(98, 18 + item.severity * 16)}%`

  const borderColor = selected
    ? (status === 'STABLE' ? D.borderCyan : s.border)
    : D.border

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        border: `1px solid ${borderColor}`,
        margin: '0 8px 4px',
        background: selected ? `rgba(0,242,255,0.03)` : D.bgCard,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = D.borderCyanHover
          e.currentTarget.style.background = D.bgCardHover
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = D.border
          e.currentTarget.style.background = D.bgCard
        }
      }}
    >
      {/* Name + Status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{
          fontFamily: D.mono, fontSize: '0.62rem', fontWeight: 700,
          color: s.textColor, letterSpacing: '0.05em',
        }}>
          {name}
        </span>
        <span style={{
          fontFamily: D.mono, fontSize: '0.46rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '2px 5px',
          color: s.color, background: s.bg, border: `1px solid ${s.border}`,
        }}>
          {status}
        </span>
      </div>

      {/* Coordinates */}
      <div style={{
        fontFamily: D.mono, fontSize: '0.52rem',
        color: D.textMuted, marginBottom: 6,
        letterSpacing: '0.03em',
      }}>
        {coords
          ? `LAT: ${coords[0].toFixed(4)} | LON: ${coords[1].toFixed(4)}`
          : item.location ? item.location.slice(0, 30) : 'LAT: — | LON: —'}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: barWidth,
          background: s.barColor,
          transition: 'width 0.6s ease',
          boxShadow: `0 0 6px ${s.barColor}55`,
        }} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// LEFT PANEL
// ════════════════════════════════════════════════════════════
function LeftPanel({ items, selected, onSelect }: {
  items: IntelItem[]
  selected: IntelItem | null
  onSelect: (item: IntelItem) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const criticalCount = items.filter(i => i.severity >= 4).length

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

  return (
    <aside style={{
      width: 296, flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: D.bgPanel, backdropFilter: 'blur(12px)',
      borderRight: `1px solid rgba(255,255,255,0.05)`,
      zIndex: 40,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${D.borderMed}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: D.display, fontSize: '0.62rem', fontWeight: 700,
          color: D.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase',
        }}>
          Active Nodes
        </span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
          <rect x="1" y="3.5" width="12" height="1.2" rx="0.6" fill="white" />
          <rect x="3.5" y="6.5" width="7" height="1.2" rx="0.6" fill="white" />
          <rect x="6" y="9.5" width="2" height="1.2" rx="0.6" fill="white" />
        </svg>
      </div>

      {/* Scrollable node list */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 6, paddingBottom: 4 }}>
        {visible.length === 0 ? (
          <div style={{ padding: '16px 14px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                margin: '0 0 4px',
                border: `1px solid ${D.border}`, padding: '10px 12px',
                background: D.bgCard,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ height: 8, background: 'rgba(0,242,255,0.06)', borderRadius: 1, width: '55%' }} />
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 1, width: '22%' }} />
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 1, marginBottom: 7, width: '70%' }} />
                <div style={{ height: 3, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
            <div style={{
              textAlign: 'center', marginTop: 12,
              fontFamily: D.mono, fontSize: '0.44rem',
              color: 'rgba(0,242,255,0.3)', letterSpacing: '0.2em',
              textTransform: 'uppercase', animation: 'pulse 1.5s ease infinite',
            }}>
              Scanning agents...
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
            <div ref={bottomRef} style={{ padding: '10px', textAlign: 'center' }}>
              {visible.length < items.length && (
                <div style={{
                  fontFamily: D.mono, fontSize: '0.42rem',
                  color: 'rgba(0,242,255,0.3)', letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  Loading more...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Node stats footer */}
      <div style={{
        padding: '10px 14px 8px',
        background: 'rgba(255,255,255,0.015)',
        borderTop: `1px solid ${D.borderMed}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: D.mono, fontSize: '0.5rem', color: D.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total Nodes
          </span>
          <span style={{ fontFamily: D.mono, fontSize: '0.55rem', color: '#fff', fontWeight: 600 }}>
            {(Math.max(items.length, 12) * 7 + 845).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: D.mono, fontSize: '0.5rem', color: D.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Active Uplinks
          </span>
          <span style={{ fontFamily: D.mono, fontSize: '0.55rem', color: D.cyan, fontWeight: 600 }}>
            {(94 + (items.length % 5)).toFixed(1)}%
          </span>
        </div>
      </div>
    </aside>
  )
}

// ════════════════════════════════════════════════════════════
// CENTER PANEL
// ════════════════════════════════════════════════════════════
function CenterPanel({ items, selected, onSelect, aircraft, fires }: {
  items: IntelItem[]
  selected: IntelItem | null
  onSelect: (item: IntelItem | null) => void
  aircraft: any[]
  fires: any[]
}) {
  const defcon = items.length > 20 ? 3 : items.length > 8 ? 4 : 5
  const defconColor = defcon <= 3 ? D.red : defcon === 4 ? D.yellow : D.green
  const globalLoad = Math.min(98, Math.round(items.length * 1.8 + 22))
  const dataRate = (items.length * 0.04 + 0.8).toFixed(1)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* Globe area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Globe3D
          intelItems={items}
          onSelectEvent={onSelect}
          selectedEvent={selected}
          aircraft={aircraft}
          fires={fires}
        />

        {/* HUD top-left overlay */}
        <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none', zIndex: 5 }}>
          <div style={{
            fontFamily: D.mono, fontSize: '0.58rem', color: D.cyan,
            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 5,
          }}>
            Visualizing::Live_Orbits
          </div>
          <div style={{ width: 130, height: 1, background: `linear-gradient(90deg, ${D.cyan}, transparent)` }} />
        </div>

        {/* Zoom controls — floating right */}
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 3, zIndex: 10,
        }}>
          {[
            { label: '+', title: 'Zoom In' },
            { label: '−', title: 'Zoom Out' },
          ].map(({ label, title }) => (
            <button key={label} title={title} style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: D.bgPanel, backdropFilter: 'blur(12px)',
              border: `1px solid ${D.borderMed}`,
              color: 'rgba(0,242,255,0.65)', fontSize: '1.1rem', fontFamily: D.mono,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,242,255,0.12)'; e.currentTarget.style.color = D.cyan }}
              onMouseLeave={e => { e.currentTarget.style.background = D.bgPanel; e.currentTarget.style.color = 'rgba(0,242,255,0.65)' }}
            >
              {label}
            </button>
          ))}
          <button title="Reset view" onClick={() => onSelect(null)} style={{
            width: 36, height: 36, marginTop: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: D.bgPanel, backdropFilter: 'blur(12px)',
            border: `1px solid ${D.borderCyan}`,
            color: D.cyan, fontSize: '0.8rem', fontFamily: D.mono,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,242,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = D.bgPanel }}
          >
            ⊙
          </button>
        </div>

        {/* Selected event popup */}
        {selected && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(20px)',
            border: `1px solid ${SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.color || D.cyan}44`,
            padding: '12px 16px', maxWidth: 440, zIndex: 20, minWidth: 300,
            animation: 'fadeInUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ fontFamily: D.mono, fontSize: '0.44rem', color: D.cyan, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                [{(selected.agentId || 'OSINT').toUpperCase()}]
              </span>
              <span style={{
                fontFamily: D.mono, fontSize: '0.42rem', fontWeight: 700,
                color: SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.color || '#fff',
                padding: '1px 5px',
                background: SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.bg || 'transparent',
              }}>
                {SEVERITY_CONFIG[selected.severity as keyof typeof SEVERITY_CONFIG]?.label || 'MEDIUM'}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: D.mono, fontSize: '0.4rem', color: 'rgba(0,242,255,0.45)' }}>
                {selected.time}
              </span>
            </div>
            <div style={{ fontFamily: D.display, fontSize: '0.74rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3, marginBottom: 6 }}>
              {selected.headline}
            </div>
            {selected.summary && (
              <div style={{ fontFamily: D.display, fontSize: '0.6rem', color: 'rgba(241,245,249,0.45)', lineHeight: 1.45, marginBottom: 5 }}>
                {selected.summary.slice(0, 200)}{selected.summary.length > 200 ? '…' : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              {selected.source && <span style={{ fontFamily: D.mono, fontSize: '0.4rem', color: 'rgba(255,255,255,0.28)' }}>{selected.source}</span>}
              {selected.location && <span style={{ fontFamily: D.mono, fontSize: '0.4rem', color: 'rgba(255,255,255,0.22)' }}>📍 {selected.location}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        background: D.bgPanel, backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${D.borderMed}`,
      }}>
        {[
          { label: 'Global Load',  value: `${globalLoad}`, suffix: '%',      color: '#fff'  },
          { label: 'Data Rate',    value: `${dataRate}`,   suffix: 'TB/s',   color: '#fff'  },
          { label: 'Security',     value: `DEFCON-${defcon}`, suffix: '',    color: defconColor },
        ].map((stat, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            borderRight: i < 2 ? `1px solid ${D.borderMed}` : 'none',
          }}>
            <span style={{
              fontFamily: D.mono, fontSize: '0.42rem',
              color: D.textDim, textTransform: 'uppercase',
              letterSpacing: '0.2em', marginBottom: 3,
            }}>
              {stat.label}
            </span>
            <span style={{ fontFamily: D.mono, fontSize: '1.05rem', fontWeight: 700, color: stat.color }}>
              {stat.value}<span style={{ color: D.cyan }}>{stat.suffix}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TELEMETRY CHART
// ════════════════════════════════════════════════════════════
function TelemetryChart() {
  const [bars, setBars] = useState(() => Array.from({ length: 8 }, () => 20 + Math.random() * 70))
  useEffect(() => {
    const t = setInterval(() => {
      setBars(prev => prev.map(v => Math.max(12, Math.min(98, v + (Math.random() - 0.5) * 22))))
    }, 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'relative', height: 88, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[0.33, 0.66, 1].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: `${pos * 100}%`,
            left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.05)',
          }} />
        ))}
      </div>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1,
          background: `rgba(0,242,255,0.18)`,
          borderTop: `1px solid rgba(0,242,255,0.5)`,
          height: `${h}%`,
          transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// WEBCAM VIEWER
// ════════════════════════════════════════════════════════════
function WebcamViewer({ feeds, activeIndex, onNext, onPrev }: {
  feeds: typeof WEBCAM_FEEDS
  activeIndex: number
  onNext: () => void
  onPrev: () => void
}) {
  const [iframeKey, setIframeKey] = useState(0)
  const feed = feeds[activeIndex]

  useEffect(() => {
    // Small delay before loading iframe so prev stream teardown completes
    const t = setTimeout(() => setIframeKey(k => k + 1), 300)
    return () => clearTimeout(t)
  }, [activeIndex])

  return (
    <div>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: `1px solid ${D.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: D.red, animation: 'pulse 1s ease infinite', boxShadow: `0 0 5px ${D.red}` }} />
          <span style={{ fontFamily: D.mono, fontSize: '0.44rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {feed.flag} {feed.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onPrev} style={{ fontFamily: D.mono, fontSize: '0.5rem', color: D.cyan, cursor: 'pointer', padding: '1px 7px', border: `1px solid ${D.borderCyan}`, background: 'transparent' }}>‹</button>
          <span style={{ fontFamily: D.mono, fontSize: '0.42rem', color: D.textDim }}>{activeIndex + 1}/{feeds.length}</span>
          <button onClick={onNext} style={{ fontFamily: D.mono, fontSize: '0.5rem', color: D.cyan, cursor: 'pointer', padding: '1px 7px', border: `1px solid ${D.borderCyan}`, background: 'transparent' }}>›</button>
        </div>
      </div>

      {/* Video container */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', overflow: 'hidden' }}>
        <iframe
          key={iframeKey}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          src={`https://www.youtube-nocookie.com/embed/${feed.id}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          title={feed.name}
          loading="lazy"
        />
        {/* Scan lines overlay for aesthetic */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 6px)',
          zIndex: 1,
        }} />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// CONSOLE LOGS
// ════════════════════════════════════════════════════════════
function ConsoleLogs({ logs }: { logs: LogEntry[] }) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const TYPE_COLOR = { info: D.cyan, success: D.green, error: D.red, system: 'rgba(0,242,255,0.5)' }
  const TYPE_LABEL = { info: 'INFO', success: 'INFO', error: 'ERR ', system: 'SYS ' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: D.mono }}>
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, animation: 'fadeIn 0.15s ease' }}>
          <span style={{ fontSize: '0.44rem', color: 'rgba(148,163,184,0.35)', flexShrink: 0, lineHeight: 1.8 }}>
            [{log.time}]
          </span>
          <span style={{ fontSize: '0.48rem', color: TYPE_COLOR[log.type], flexShrink: 0, fontWeight: 700, lineHeight: 1.8 }}>
            {TYPE_LABEL[log.type]}:
          </span>
          <span style={{ fontSize: '0.48rem', color: 'rgba(241,245,249,0.55)', lineHeight: 1.55 }}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// RIGHT PANEL
// ════════════════════════════════════════════════════════════
function RightPanel({ logs, items }: {
  logs: LogEntry[]
  items: IntelItem[]
}) {
  const [bottomTab, setBottomTab] = useState<'console' | 'cams'>('console')
  const [camIndex, setCamIndex] = useState(0)
  const [pktLoss, setPktLoss] = useState('0.0001')
  const [latency, setLatency] = useState(14)
  const [cmd, setCmd] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setPktLoss((Math.random() * 0.0008 + 0.00005).toFixed(5))
      setLatency(Math.round(9 + Math.random() * 18))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  const nextCam = useCallback(() => setCamIndex(i => (i + 1) % WEBCAM_FEEDS.length), [])
  const prevCam = useCallback(() => setCamIndex(i => (i - 1 + WEBCAM_FEEDS.length) % WEBCAM_FEEDS.length), [])

  const coordItem = items[0]
  const coords = coordItem ? extractCoords(coordItem) : null

  return (
    <aside style={{
      width: 375, flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: D.bgPanel, backdropFilter: 'blur(12px)',
      borderLeft: `1px solid rgba(255,255,255,0.05)`,
      zIndex: 40,
    }}>

      {/* ── TOP HALF: LIVE TELEMETRY ── */}
      <div style={{
        height: '50%', display: 'flex', flexDirection: 'column',
        borderBottom: `1px solid ${D.borderMed}`,
      }}>
        {/* Telemetry header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${D.borderMed}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: D.display, fontSize: '0.62rem', fontWeight: 700,
            color: D.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            Live Telemetry
          </span>
          <span style={{
            fontFamily: D.mono, fontSize: '0.44rem', color: D.cyan,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '2px 7px', border: `1px solid ${D.borderCyan}`,
          }}>
            Real-Time
          </span>
        </div>

        {/* Chart + metrics */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 8px' }}>
          {/* Bar chart */}
          <TelemetryChart />

          {/* 2×2 metric grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 0, marginTop: 10,
            border: `1px solid ${D.border}`,
            overflow: 'hidden',
          }}>
            {[
              { label: 'Packet Loss', value: `${pktLoss}%`,  color: '#f1f5f9' },
              { label: 'Latency',     value: `${latency}ms`, color: '#f1f5f9' },
              { label: 'Encryption',  value: 'AES-256',      color: D.green   },
              { label: 'Protocol',    value: 'HTTP/3',       color: '#f1f5f9' },
            ].map((m, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: D.bgCard,
                borderRight: i % 2 === 0 ? `1px solid ${D.border}` : 'none',
                borderBottom: i < 2 ? `1px solid ${D.border}` : 'none',
              }}>
                <div style={{
                  fontFamily: D.mono, fontSize: '0.42rem',
                  color: D.textDim, textTransform: 'uppercase',
                  letterSpacing: '0.12em', marginBottom: 4,
                }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: D.mono, fontSize: '1rem', fontWeight: 700, color: m.color }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM HALF: CONSOLE LOGS / LIVE CAMS ── */}
      <div style={{
        height: '50%', display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.35)',
      }}>
        {/* Tab header */}
        <div style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${D.borderMed}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['console', 'cams'] as const).map(t => (
              <button key={t} onClick={() => setBottomTab(t)} style={{
                fontFamily: D.display, fontSize: '0.5rem', letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '3px 9px',
                cursor: 'pointer', transition: 'all 0.15s',
                color: bottomTab === t ? D.cyan : 'rgba(255,255,255,0.3)',
                background: bottomTab === t ? 'rgba(0,242,255,0.07)' : 'transparent',
                border: bottomTab === t ? `1px solid ${D.borderCyan}` : '1px solid transparent',
                fontWeight: bottomTab === t ? 600 : 400,
              }}>
                {t === 'console' ? 'Console Logs' : '📡 Live Cams'}
              </button>
            ))}
          </div>
          {/* Terminal icon */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ opacity: 0.3 }}>
            <rect x="1" y="1" width="11" height="11" rx="1" stroke="white" strokeWidth="1" />
            <path d="M3.5 5L5.5 7L3.5 9" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 9H9.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {bottomTab === 'console' ? (
            <>
              <ConsoleLogs logs={logs} />
              {/* Command input */}
              <div style={{
                padding: '6px 12px',
                borderTop: `1px solid ${D.border}`,
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '5px 9px',
                  border: `1px solid ${D.border}`,
                }}>
                  <span style={{ fontFamily: D.mono, fontSize: '0.62rem', color: D.cyan, opacity: 0.7 }}>$</span>
                  <input
                    value={cmd}
                    onChange={e => setCmd(e.target.value)}
                    placeholder="Enter command..."
                    style={{
                      flex: 1, background: 'transparent',
                      border: 'none', outline: 'none',
                      fontFamily: D.mono, fontSize: '0.55rem',
                      color: 'rgba(241,245,249,0.6)',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '8px 10px', overflowY: 'auto', flex: 1 }}>
              <WebcamViewer feeds={WEBCAM_FEEDS} activeIndex={camIndex} onNext={nextCam} onPrev={prevCam} />
              {/* News streams */}
              <div style={{ marginTop: 10 }}>
                <div style={{
                  fontFamily: D.mono, fontSize: '0.46rem',
                  color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em',
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                  Live News Streams
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {NEWS_STREAMS.map(ns => (
                    <a
                      key={ns.id}
                      href={`https://www.youtube.com/watch?v=${ns.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: D.mono, fontSize: '0.42rem',
                        color: ns.color, padding: '3px 8px',
                        border: `1px solid ${ns.color}33`,
                        textDecoration: 'none', letterSpacing: '0.08em',
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
      </div>

      {/* Coordinate bar */}
      <div style={{
        padding: '5px 12px',
        background: 'rgba(0,0,0,0.35)',
        borderTop: `1px solid ${D.border}`,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: D.mono, fontSize: '0.42rem',
          color: 'rgba(255,255,255,0.22)', letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {coords
            ? `COORD: ${Math.abs(coords[0]).toFixed(4)}°${coords[0] >= 0 ? 'N' : 'S'}, ${Math.abs(coords[1]).toFixed(4)}°${coords[1] >= 0 ? 'E' : 'W'} | ALT: 35,786 KM | ORBIT: GEOSTATIONARY`
            : 'COORD: 38.8977° N, 77.0365° W | ALT: 35,786 KM | ORBIT: GEOSTATIONARY'}
        </span>
      </div>
    </aside>
  )
}

// ════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════
function Footer({ items }: { items: IntelItem[] }) {
  const criticalCount = items.filter(i => i.severity >= 4).length
  return (
    <footer style={{
      height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
      background: D.bgPanel, backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${D.borderMed}`,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.green }} />
          <span style={{ fontFamily: D.mono, fontSize: '0.48rem', color: D.textDim, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Global Mesh: Online
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: D.mono, fontSize: '0.48rem', color: D.textDim, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Alerts:
          </span>
          <span style={{
            fontFamily: D.mono, fontSize: '0.5rem', fontWeight: 700,
            color: criticalCount > 0 ? D.red : D.green,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {criticalCount} Active
          </span>
        </div>
      </div>
      <div style={{
        fontFamily: D.mono, fontSize: '0.42rem',
        color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        COORD: 38.8977° N, 77.0365° W | ALT: 35,786 KM | ORBIT: GEOSTATIONARY
      </div>
    </footer>
  )
}

// ════════════════════════════════════════════════════════════
// LOG FACTORY
// ════════════════════════════════════════════════════════════
function makeLog(msg: string, type: LogEntry['type']): LogEntry {
  return { time: new Date().toISOString().slice(11, 19), message: msg, type }
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════
export default function LiveIntelDashboard() {
  const [time, setTime] = useState(new Date())
  const [items, setItems] = useState<IntelItem[]>([])
  const [selected, setSelected] = useState<IntelItem | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusMap>({})
  const [connected, setConnected] = useState(true)

  const agentManagerRef = useRef<AgentManager | null>(null)
  const { aircraft, fires } = useLiveData()

  // ── Live clock ──
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'system') => {
    setLogs(prev => [...prev.slice(-90), makeLog(msg, type)])
  }, [])

  // ── SSE stream ──
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
                if (novel.length > 0) addLog(`Received ${novel.length} new intel event(s) via stream`, 'info')
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

  // ── Agent manager ──
  useEffect(() => {
    addLog('Initializing INTEL-LIVE v4.0.2 command center', 'system')
    addLog('Handshake initiated with NODE::ALPHA-07', 'info')
    addLog('Synchronizing global temporal buffers...', 'system')

    const agentManager = new AgentManager(
      process.env.NEXT_PUBLIC_OPENROUTER_KEY || '',
      (payload) => {
        const allItems: IntelItem[] = Object.values(payload.intel).flat()
        setItems(prev => {
          const existing = new Set(prev.map(x => x.headline))
          const novel = allItems.filter(x => !existing.has(x.headline))
          if (novel.length > 0) addLog(`Intel cycle #${payload.cycle}: +${novel.length} events from ${payload.modelsUsed.length} models`, 'info')
          return [...novel, ...prev].slice(0, 200)
        })
      },
      (progress) => {
        setAgentStatuses(prev => ({ ...prev, [progress.agentId]: progress }))
        if (progress.status === 'running') addLog(`Agent ${progress.agentId.toUpperCase()} scanning: ${progress.message}`, 'system')
        else if (progress.status === 'done') addLog(`Agent ${progress.agentId.toUpperCase()} completed — ${progress.count || 0} events indexed`, 'info')
        else if (progress.status === 'error') addLog(`Agent ${progress.agentId.toUpperCase()} error: ${progress.message}`, 'error')
      },
      (entry) => setLogs(prev => [...prev.slice(-90), entry])
    )

    agentManagerRef.current = agentManager
    agentManager.start()

    // ── Simulated boot-up logs ──
    const sysLogs = [
      { msg: 'High jitter detected on satellite link 4-B', type: 'error' as const, delay: 3200 },
      { msg: 'Establishing encrypted tunnel to primary relay...', type: 'info' as const, delay: 6400 },
      { msg: 'AES-256 encryption layer active on all channels', type: 'system' as const, delay: 9100 },
      { msg: 'Auto-rerouting traffic through NODE::SIGMA-04', type: 'system' as const, delay: 12500 },
      { msg: 'Uplink stability restored — all systems nominal', type: 'info' as const, delay: 15800 },
      { msg: 'Scanning for new incidents_', type: 'system' as const, delay: 18000 },
    ]
    const timers = sysLogs.map(({ msg, type, delay }) => setTimeout(() => addLog(msg, type), delay))

    return () => {
      agentManager.stop()
      timers.forEach(clearTimeout)
    }
  }, [addLog])

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: D.bg, color: D.text,
      fontFamily: D.display,
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        backgroundImage: `linear-gradient(to bottom, transparent 50%, rgba(0,242,255,0.018) 50%)`,
        backgroundSize: '100% 4px',
      }} />

      {/* Header */}
      <Header time={time} connected={connected} />

      {/* Main 3-column body */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <LeftPanel items={items} selected={selected} onSelect={setSelected} />
        <CenterPanel
          items={items}
          selected={selected}
          onSelect={setSelected}
          aircraft={aircraft}
          fires={fires}
        />
        <RightPanel logs={logs} items={items} />
      </main>

      {/* Footer */}
      <Footer items={items} />
    </div>
  )
}
