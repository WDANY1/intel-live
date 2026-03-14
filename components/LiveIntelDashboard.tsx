'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AgentManager } from '@/lib/agents'
import { useLiveData } from '@/lib/useLiveData'
import type { IntelItem, AgentStatusMap, LogEntry } from '@/lib/types'

const Globe3D = dynamic(() => import('./Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#020810' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1.5px solid rgba(0,229,255,0.1)',
          borderTopColor: '#00E5FF',
          animation: 'spin 0.9s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.46rem', color: '#00E5FF', letterSpacing: 5 }}>
          LOADING GLOBE
        </div>
      </div>
    </div>
  ),
})

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:        '#010508',
  panel:     'rgba(4,8,18,0.95)',
  border:    'rgba(255,255,255,0.05)',
  borderMed: 'rgba(255,255,255,0.09)',
  borderCyan:'rgba(0,229,255,0.18)',
  cyan:      '#00E5FF',
  green:     '#00FF41',
  red:       '#FF2040',
  orange:    '#FF8C00',
  yellow:    '#FFD700',
  text:      '#e2e8f0',
  muted:     '#64748b',
  dim:       '#334155',
  mono:      "'JetBrains Mono', monospace",
  sans:      "'Space Grotesk', 'Inter', sans-serif",
}

// ─────────────────────────────────────────────────────────────────
// SEVERITY CONSTANTS
// ─────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<number, string> = {
  5: '#FF2040', 4: '#FF8C00', 3: '#FFD700', 2: '#00E676', 1: '#00B0FF',
}
const SEV_LABEL: Record<number, string> = {
  5: 'CRITICAL', 4: 'HIGH', 3: 'MEDIUM', 2: 'LOW', 1: 'INFO',
}
const SEV_CLASS: Record<number, string> = {
  5: 'event-card--critical', 4: 'event-card--high', 3: '', 2: '', 1: '',
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY ICONS
// ─────────────────────────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  military: '⚔', missile: '🚀', explosion: '💥', drone: '⬡',
  airraid: '✈', cyber: '⬡', naval: '⚓', satellite: '◎',
  political: '◆', nuclear: '☢', diplomatic: '◈', economic: '◉',
  default: '◉',
}

// ─────────────────────────────────────────────────────────────────
// WEBCAM / YOUTUBE STREAMS
// ─────────────────────────────────────────────────────────────────
const LIVE_STREAMS = [
  { id: 'Xrge9NP_aMY', name: 'Al Jazeera English', region: 'GLOBAL', flag: '🌍' },
  { id: 'h3MuIUNCCLI', name: 'DW News Live',        region: 'EU',     flag: '🇩🇪' },
  { id: 'F5uM8jI2SLk', name: 'France 24 English',   region: 'EU',     flag: '🇫🇷' },
  { id: '9Auq9mYxFEE', name: 'Sky News Live',        region: 'UK',     flag: '🇬🇧' },
  { id: 'B-kxSbQFCvU', name: 'Euronews Live',        region: 'EU',     flag: '🇪🇺' },
  { id: 'w_Ma8oQLmSM', name: 'BBC World News',       region: 'UK',     flag: '🇬🇧' },
]

// ─────────────────────────────────────────────────────────────────
// AGENT DISPLAY CONFIG
// ─────────────────────────────────────────────────────────────────
const AGENT_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  sigint:  { label: 'SIGINT',  color: '#FF2040', icon: '◎' },
  osint:   { label: 'OSINT',   color: '#00E5FF', icon: '◉' },
  humint:  { label: 'HUMINT',  color: '#FF8C00', icon: '◈' },
  geoint:  { label: 'GEOINT', color: '#A78BFA', icon: '◆' },
  econint: { label: 'ECONINT', color: '#00FF41', icon: '◇' },
  proxy:   { label: 'PROXY',   color: '#FB923C', icon: '⬡' },
  diplo:   { label: 'DIPLO',   color: '#22D3EE', icon: '◈' },
}

// ─────────────────────────────────────────────────────────────────
// SIMULATE TELEMETRY
// ─────────────────────────────────────────────────────────────────
function useTelemetry() {
  const [tel, setTel] = useState({
    latency:  23, packetLoss: 0.2, uplink: 98,
    dataRate: 1.24, encrypt: 'AES-256', protocol: 'HTTP/3',
    signalStrength: 4, jitter: 3,
  })
  useEffect(() => {
    const id = setInterval(() => {
      setTel(t => ({
        ...t,
        latency:     Math.max(8, Math.min(120, t.latency + (Math.random() - 0.45) * 6)),
        packetLoss:  Math.max(0, Math.min(5, t.packetLoss + (Math.random() - 0.5) * 0.2)),
        uplink:      Math.max(85, Math.min(100, t.uplink + (Math.random() - 0.5) * 1.5)),
        jitter:      Math.max(1, Math.min(20, t.jitter + (Math.random() - 0.5) * 2)),
        dataRate:    parseFloat((t.dataRate + (Math.random() - 0.5) * 0.15).toFixed(2)),
        signalStrength: Math.min(5, Math.floor(t.uplink / 22)),
      }))
    }, 2200)
    return () => clearInterval(id)
  }, [])
  return tel
}

// ─────────────────────────────────────────────────────────────────
// ZULU CLOCK
// ─────────────────────────────────────────────────────────────────
function useZuluClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(
        `${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}:${String(n.getUTCSeconds()).padStart(2,'0')}Z`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ─────────────────────────────────────────────────────────────────
// CONSOLE LOG HOOK
// ─────────────────────────────────────────────────────────────────
function useConsole(intelItems: IntelItem[]) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '00:00:00', message: 'INTEL LIVE v9.0 — SYSTEM BOOT', type: 'system' },
    { time: '00:00:01', message: 'Initializing data pipeline...', type: 'info' },
  ])
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date()
    const time = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}`
    setLogs(prev => [...prev.slice(-80), { time, message, type }])
  }, [])

  // Auto-generate system logs from intel
  useEffect(() => {
    if (intelItems.length === 0) return
    const latest = intelItems[0]
    if (latest) {
      addLog(`[${(latest.agentId || 'OSINT').toUpperCase()}] New intel acquired: ${latest.location}`, 'info')
      if (latest.severity >= 4) addLog(`ALERT: High-severity event — ${latest.headline.slice(0, 50)}`, 'error')
    }
  }, [intelItems.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic system logs
  useEffect(() => {
    const msgs = [
      ['SSE handshake maintained — 30s heartbeat', 'info'],
      ['Scanning 27 RSS feeds...', 'info'],
      ['GDELT database query complete', 'info'],
      ['OpenSky aircraft tracking active', 'info'],
      ['AI models: OpenRouter → Groq failover', 'system'],
      ['Deduplication cache: 342 entries', 'system'],
      ['WARN: Feed timeout — reuters.com', 'error'],
      ['Retry in 30s — backoff applied', 'info'],
      ['NASA FIRMS fire detection active', 'info'],
      ['TLS 1.3 — connection secured', 'system'],
    ] as const
    let idx = 0
    const id = setInterval(() => {
      const [msg, type] = msgs[idx % msgs.length]
      addLog(msg, type as LogEntry['type'])
      idx++
    }, 7000)
    return () => clearInterval(id)
  }, [addLog])

  return { logs, addLog }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL METRICS
// ─────────────────────────────────────────────────────────────────
function useGlobalMetrics(itemCount: number) {
  const [metrics, setMetrics] = useState({ load: 42, dataRate: '1.24', defcon: 3, threats: 0 })
  useEffect(() => {
    setMetrics(m => ({
      ...m,
      load:    Math.min(95, 35 + Math.floor(itemCount / 3)),
      threats: itemCount,
    }))
  }, [itemCount])
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        ...m,
        load:     Math.max(20, Math.min(95, m.load + (Math.random() - 0.5) * 3)),
        dataRate: (parseFloat(m.dataRate) + (Math.random() - 0.5) * 0.1).toFixed(2),
      }))
    }, 3000)
    return () => clearInterval(id)
  }, [])
  return metrics
}

// ─────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────
function EventCard({ item, selected, onClick }: {
  item: IntelItem; selected: boolean; onClick: () => void
}) {
  const color = SEV_COLOR[item.severity] || C.cyan
  const agent = AGENT_DISPLAY[item.agentId] || { label: 'OSINT', color: C.cyan, icon: '◉' }
  const catIcon = CAT_ICON[item.category?.toLowerCase()] || CAT_ICON.default

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '10px 14px',
        background: selected ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.012)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderLeft: `2px solid ${color}`,
        borderRight: 'none', borderBottom: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        display: 'block',
        animation: 'fadeInUp 0.28s ease',
      }}
      className={`hover:!bg-white/[0.022]`}
    >
      {/* Top row: severity badge + time */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {/* Pulsing dot */}
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: color, boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
            animation: item.severity >= 4 ? 'pulse 1.2s ease infinite' : 'none',
          }} />
          {/* Severity label */}
          <span style={{
            fontFamily: C.mono, fontSize: '0.44rem', fontWeight: 700,
            color, letterSpacing: 2,
          }}>
            {SEV_LABEL[item.severity] || 'INFO'}
          </span>
          {/* Agent badge */}
          <span style={{
            fontFamily: C.mono, fontSize: '0.4rem', fontWeight: 600,
            color: agent.color, opacity: 0.7, letterSpacing: 1,
          }}>
            [{agent.label}]
          </span>
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted }}>
          {item.time}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontFamily: C.sans, fontSize: '0.72rem', fontWeight: 500,
        color: selected ? '#f1f5f9' : '#cbd5e1', lineHeight: 1.4,
        marginBottom: 4,
      }}>
        {item.headline}
      </div>

      {/* Location + source */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1" style={{ fontFamily: C.mono, fontSize: '0.42rem', color: C.muted }}>
          <span style={{ color: C.cyan, opacity: 0.6 }}>◉</span>
          <span>{item.location || 'LOCATION UNKNOWN'}</span>
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.dim }}>
          {item.source?.slice(0, 12)}
        </span>
      </div>

      {/* Category tag */}
      {item.category && (
        <div className="flex items-center gap-1 mt-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.4rem', color: C.muted }}>
            {catIcon}
          </span>
          <span style={{
            fontFamily: C.mono, fontSize: '0.38rem', color: C.dim,
            background: 'rgba(255,255,255,0.04)', padding: '1px 5px',
            letterSpacing: 1,
          }}>
            {item.category?.toUpperCase()}
          </span>
        </div>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// YOUTUBE EMBED
// ─────────────────────────────────────────────────────────────────
function YouTubePlayer({ videoId, label }: { videoId: string; label: string }) {
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setStatus('loading')
    // Give stream 8s to load, then declare error
    timeoutRef.current = setTimeout(() => {
      if (status === 'loading') setStatus('error')
    }, 8000)
    return () => clearTimeout(timeoutRef.current)
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setStatus('live')
  }, [])

  const handleError = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setStatus('error')
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
      {status !== 'error' && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onLoad={handleLoad}
          onError={handleError}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            border: 'none', display: 'block',
            opacity: status === 'live' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
          title={label}
        />
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2,6,14,0.95)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '1.5px solid rgba(0,229,255,0.12)',
            borderTopColor: C.cyan,
            animation: 'spin 0.9s linear infinite',
            marginBottom: 8,
          }} />
          <span style={{ fontFamily: C.mono, fontSize: '0.4rem', color: 'rgba(0,229,255,0.5)', letterSpacing: 3 }}>
            CONNECTING...
          </span>
        </div>
      )}

      {/* Error / No Signal state */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 2px, rgba(4,8,18,0.95) 2px, rgba(4,8,18,0.95) 4px)',
        }}>
          <div style={{
            fontFamily: C.mono, fontSize: '0.62rem', color: C.muted,
            letterSpacing: 5, marginBottom: 6,
          }}>
            NO SIGNAL
          </div>
          <div style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.dim, letterSpacing: 3, marginBottom: 12 }}>
            ENCRYPTED FEED
          </div>
          <button
            onClick={() => setStatus('loading')}
            style={{
              fontFamily: C.mono, fontSize: '0.38rem', color: C.cyan,
              border: `1px solid ${C.borderCyan}`, padding: '3px 10px',
              background: 'transparent', cursor: 'pointer', letterSpacing: 2,
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* Live badge */}
      {status === 'live' && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(0,0,0,0.7)', padding: '2px 6px',
          border: '1px solid rgba(255,32,64,0.4)',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', background: C.red,
            animation: 'pulse 1.5s ease infinite',
          }} />
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.red, letterSpacing: 2 }}>LIVE</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TELEMETRY WIDGET
// ─────────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: C.muted, letterSpacing: 2 }}>{label}</span>
        <span style={{ fontFamily: C.mono, fontSize: '0.46rem', color, fontWeight: 700 }}>
          {typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}{unit}
        </span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          transition: 'width 0.8s ease',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SIGNAL BARS
// ─────────────────────────────────────────────────────────────────
function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height: 14 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 3,
          height: `${i * 18}%`,
          background: i <= strength ? C.green : 'rgba(255,255,255,0.12)',
          boxShadow: i <= strength ? `0 0 4px ${C.green}` : 'none',
          transition: 'background 0.3s ease',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// BREAKING TICKER
// ─────────────────────────────────────────────────────────────────
function BreakingTicker({ items }: { items: IntelItem[] }) {
  const critical = items.filter(i => i.severity >= 4).slice(0, 8)
  if (critical.length === 0) return null

  const text = critical.map(i => `⬥ ${i.headline}   `).join('   ') + '   '

  return (
    <div style={{
      background: 'rgba(255,32,64,0.08)',
      borderTop: `1px solid rgba(255,32,64,0.25)`,
      borderBottom: `1px solid rgba(255,32,64,0.15)`,
      overflow: 'hidden', whiteSpace: 'nowrap',
      height: 22, display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        fontFamily: C.mono, fontSize: '0.42rem', color: '#ff6080',
        fontWeight: 700, padding: '0 10px', flexShrink: 0,
        borderRight: '1px solid rgba(255,32,64,0.25)',
        letterSpacing: 2,
      }}>
        BREAKING
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{
          display: 'inline-block',
          fontFamily: C.mono, fontSize: '0.42rem', color: '#e2e8f0', letterSpacing: 0.5,
          animation: 'tickerScroll 40s linear infinite',
          whiteSpace: 'nowrap',
        }}>
          {text}{text}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// LEFT PANEL — INFINITE SCROLL EVENT FEED
// ─────────────────────────────────────────────────────────────────
function LeftPanel({
  items, selectedEvent, onSelect,
  agentStatus, loadingMore, sentinelRef,
}: {
  items: IntelItem[]
  selectedEvent: IntelItem | null
  onSelect: (i: IntelItem) => void
  agentStatus: AgentStatusMap
  loadingMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
}) {
  const critCount   = items.filter(i => i.severity >= 5).length
  const highCount   = items.filter(i => i.severity === 4).length

  return (
    <aside style={{
      width: 280, minWidth: 256, maxWidth: 320,
      height: '100%', display: 'flex', flexDirection: 'column',
      background: C.panel,
      borderRight: `1px solid ${C.border}`,
      flexShrink: 0,
    }}>
      {/* Panel header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.text, letterSpacing: 3, fontWeight: 700 }}>
              INCIDENT FEED
            </span>
          </div>
          <span style={{ fontFamily: C.mono, fontSize: '0.4rem', color: C.muted, letterSpacing: 1 }}>
            LIVE
          </span>
        </div>

        {/* Event counts */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <span style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.red, fontWeight: 700 }}>{critCount}</span>
            <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.muted, letterSpacing: 1 }}>CRITICAL</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.orange, fontWeight: 700 }}>{highCount}</span>
            <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.muted, letterSpacing: 1 }}>HIGH</span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.cyan, fontWeight: 700 }}>{items.length}</span>
            <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.muted, letterSpacing: 1 }}>TOTAL</span>
          </div>
        </div>

        {/* Agent status chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(AGENT_DISPLAY).map(([id, cfg]) => {
            const st = agentStatus[id as keyof AgentStatusMap]
            const running = st?.status === 'running'
            return (
              <div key={id} style={{
                fontFamily: C.mono, fontSize: '0.36rem', padding: '1px 5px',
                border: `1px solid ${running ? cfg.color + '55' : 'rgba(255,255,255,0.06)'}`,
                color: running ? cfg.color : C.dim, letterSpacing: 1,
                background: running ? cfg.color + '0f' : 'transparent',
                transition: 'all 0.3s ease',
              }}>
                {running ? '▶' : '○'} {cfg.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable feed */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="event-scroll">
        {items.length === 0 ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontFamily: C.mono, fontSize: '0.46rem', color: C.muted, letterSpacing: 2,
          }}>
            <div style={{ marginBottom: 8, animation: 'pulse 2s ease infinite' }}>◎</div>
            ACQUIRING INTEL...
          </div>
        ) : (
          items.map((item, idx) => (
            <EventCard
              key={`${item.fetchedAt}-${idx}`}
              item={item}
              selected={selectedEvent?.headline === item.headline}
              onClick={() => onSelect(item)}
            />
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ padding: 8, textAlign: 'center' }}>
          {loadingMore && (
            <div style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>
              <span style={{ animation: 'pulse 1s ease infinite' }}>▶▶▶</span> LOADING OLDER EVENTS
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────
// RIGHT PANEL — TELEMETRY + WEBCAM + CONSOLE
// ─────────────────────────────────────────────────────────────────
function RightPanel({
  logs, telemetry, selectedEvent,
}: {
  logs: LogEntry[]
  telemetry: ReturnType<typeof useTelemetry>
  selectedEvent: IntelItem | null
}) {
  const [streamIdx, setStreamIdx] = useState(0)
  const stream = LIVE_STREAMS[streamIdx]
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  return (
    <aside style={{
      width: 300, minWidth: 260,
      height: '100%', display: 'flex', flexDirection: 'column',
      background: C.panel,
      borderLeft: `1px solid ${C.border}`,
      flexShrink: 0,
    }}>
      {/* TELEMETRY SECTION */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontFamily: C.mono, fontSize: '0.44rem', color: C.muted, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>
          TELEMETRY
        </div>
        <MetricBar label="LATENCY"     value={telemetry.latency}    max={200}  color={telemetry.latency > 80 ? C.red : C.cyan}    unit="ms" />
        <MetricBar label="UPLINK"      value={telemetry.uplink}     max={100}  color={C.green}   unit="%" />
        <MetricBar label="PACKET LOSS" value={telemetry.packetLoss} max={10}   color={telemetry.packetLoss > 2 ? C.orange : C.cyan} unit="%" />
        <MetricBar label="JITTER"      value={telemetry.jitter}     max={50}   color={telemetry.jitter > 15 ? C.yellow : C.cyan}   unit="ms" />

        <div className="grid grid-cols-2 gap-2 mt-3" style={{ fontFamily: C.mono, fontSize: '0.4rem' }}>
          <div style={{ background: 'rgba(0,229,255,0.04)', border: `1px solid ${C.border}`, padding: '4px 8px' }}>
            <div style={{ color: C.muted, marginBottom: 1, letterSpacing: 1 }}>ENCRYPT</div>
            <div style={{ color: C.green, fontWeight: 700 }}>{telemetry.encrypt}</div>
          </div>
          <div style={{ background: 'rgba(0,229,255,0.04)', border: `1px solid ${C.border}`, padding: '4px 8px' }}>
            <div style={{ color: C.muted, marginBottom: 1, letterSpacing: 1 }}>PROTOCOL</div>
            <div style={{ color: C.cyan, fontWeight: 700 }}>{telemetry.protocol}</div>
          </div>
        </div>
      </div>

      {/* LIVE FEED / WEBCAM SECTION */}
      <div style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Section header */}
        <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: C.mono, fontSize: '0.44rem', color: C.muted, letterSpacing: 3, fontWeight: 700 }}>
            LIVE FEED
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStreamIdx(i => (i - 1 + LIVE_STREAMS.length) % LIVE_STREAMS.length)}
              style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.muted, padding: '0 4px', cursor: 'pointer', background: 'none', border: 'none' }}
              className="hover:text-white"
            >‹</button>
            <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted }}>
              {streamIdx + 1}/{LIVE_STREAMS.length}
            </span>
            <button
              onClick={() => setStreamIdx(i => (i + 1) % LIVE_STREAMS.length)}
              style={{ fontFamily: C.mono, fontSize: '0.5rem', color: C.muted, padding: '0 4px', cursor: 'pointer', background: 'none', border: 'none' }}
              className="hover:text-white"
            >›</button>
          </div>
        </div>

        {/* Stream info */}
        <div style={{ padding: '0 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.cyan, letterSpacing: 1 }}>
            {stream.flag} {stream.name}
          </span>
          <span style={{ fontFamily: C.mono, fontSize: '0.34rem', color: C.dim, marginLeft: 'auto' }}>
            {stream.region}
          </span>
        </div>

        {/* Stream tabs */}
        <div style={{ display: 'flex', padding: '0 14px 8px', gap: 4, overflowX: 'auto' }}>
          {LIVE_STREAMS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStreamIdx(i)}
              style={{
                fontFamily: C.mono, fontSize: '0.32rem',
                padding: '2px 6px',
                background: streamIdx === i ? `${C.cyan}18` : 'transparent',
                border: `1px solid ${streamIdx === i ? C.borderCyan : C.border}`,
                color: streamIdx === i ? C.cyan : C.dim,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                letterSpacing: 0.5,
              }}
            >
              {s.flag}
            </button>
          ))}
        </div>

        <YouTubePlayer key={stream.id} videoId={stream.id} label={stream.name} />
      </div>

      {/* CONSOLE LOG */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '8px 14px 6px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: C.mono, fontSize: '0.44rem', color: C.muted, letterSpacing: 3, fontWeight: 700 }}>
            CONSOLE
          </span>
        </div>
        <div
          ref={logRef}
          style={{ flex: 1, overflowY: 'auto', padding: '6px 14px' }}
        >
          {logs.map((log, i) => (
            <div key={i} style={{
              fontFamily: C.mono, fontSize: '0.46rem', lineHeight: 1.7, padding: '0.5px 0',
              color: log.type === 'error' ? C.red
                   : log.type === 'system' ? C.muted
                   : log.type === 'success' ? C.green
                   : C.cyan,
              animation: 'fadeIn 0.2s ease',
            }}>
              <span style={{ color: C.dim, marginRight: 6 }}>{log.time}</span>
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────
export default function LiveIntelDashboard() {
  const [intelItems, setIntelItems] = useState<IntelItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<IntelItem | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatusMap>({})
  const [sseConnected, setSseConnected] = useState(false)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const agentRef = useRef<AgentManager | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const zuluTime  = useZuluClock()
  const telemetry = useTelemetry()
  const { aircraft, fires } = useLiveData()
  const { logs } = useConsole(intelItems)
  const metrics   = useGlobalMetrics(intelItems.length)

  // ── Agent manager init ──
  useEffect(() => {
    const mgr = new AgentManager(
      'server-side',
      (payload) => {
        const flat = Object.values(payload.intel).flat().filter(Boolean) as IntelItem[]
        setIntelItems(prev => {
          const combined = [...flat, ...prev]
          const seen = new Set<string>()
          return combined.filter(i => {
            const key = i.headline.slice(0, 60).toLowerCase()
            if (seen.has(key)) return false
            seen.add(key); return true
          }).slice(0, 500)
        })
      },
      (progress) => setAgentStatus(prev => ({ ...prev, [progress.agentId]: progress })),
      (_log) => { /* logs handled by useConsole */ }
    )
    agentRef.current = mgr
    mgr.start()
    return () => { mgr.stop() }
  }, [])

  // ── SSE connection ──
  useEffect(() => {
    let es: EventSource | null = null
    let retry = 0

    const connect = () => {
      try {
        es = new EventSource('/api/stream')
        es.addEventListener('connected', () => { setSseConnected(true); retry = 0 })
        es.addEventListener('intel', (e) => {
          try {
            const item = JSON.parse(e.data) as IntelItem
            setIntelItems(prev => {
              const key = item.headline.slice(0, 60).toLowerCase()
              if (prev.some(p => p.headline.slice(0, 60).toLowerCase() === key)) return prev
              return [item, ...prev].slice(0, 500)
            })
          } catch {}
        })
        es.onerror = () => {
          setSseConnected(false)
          es?.close()
          const delay = Math.min(30000, 1000 * Math.pow(2, retry++))
          setTimeout(connect, delay)
        }
      } catch {}
    }
    connect()
    return () => { es?.close() }
  }, [])

  // ── Infinite scroll — IntersectionObserver ──
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore && intelItems.length >= 20) {
        setLoadingMore(true)
        // Simulate fetching "older" events (re-use current + slight variation)
        setTimeout(() => {
          setPage(p => p + 1)
          setLoadingMore(false)
        }, 800)
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadingMore, intelItems.length])

  // "Paginated" items (simulate loading older events by repeating with time offsets)
  const displayItems = useMemo(() => {
    if (page <= 1) return intelItems
    // For pagination > 1, append duplicates with older timestamps (simulate historical data)
    const extra = intelItems.slice(0, Math.min(20, intelItems.length)).map((item, i) => ({
      ...item,
      headline: item.headline,
      time: `${Math.max(0, parseInt(item.time?.split(':')[0] || '00') - page)}:${item.time?.split(':').slice(1).join(':') || '00:00Z'}`,
      fetchedAt: item.fetchedAt - page * 3600000,
    }))
    return [...intelItems, ...extra]
  }, [intelItems, page])

  const handleSelectEvent = useCallback((item: IntelItem) => {
    setSelectedEvent(item)
  }, [])

  // Global load color
  const loadColor = metrics.load > 75 ? C.red : metrics.load > 55 ? C.orange : C.green
  const defconColor = [C.green, C.green, C.yellow, C.orange, C.red][metrics.defcon - 1] || C.green

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: C.bg, overflow: 'hidden',
      fontFamily: C.sans,
    }}>
      {/* ═══════════════════════════════════════════
          TOP HEADER BAR
      ═══════════════════════════════════════════ */}
      <header style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        background: 'rgba(2,4,12,0.98)',
        borderBottom: `1px solid ${C.border}`,
        gap: 16,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: C.cyan, boxShadow: `0 0 12px ${C.cyan}`,
            animation: 'pulse 2.5s ease infinite',
          }} />
          <span style={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.text, fontWeight: 700, letterSpacing: 3 }}>
            INTEL
          </span>
          <span style={{ fontFamily: C.mono, fontSize: '0.72rem', color: C.cyan, fontWeight: 700, letterSpacing: 3 }}>
            LIVE
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

        {/* ZULU clock */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>ZULU</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.58rem', color: C.cyan, letterSpacing: 2, fontWeight: 600 }}>
            {zuluTime}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

        {/* SSE status */}
        <div className="flex items-center gap-1.5">
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: sseConnected ? C.green : C.red,
            boxShadow: `0 0 6px ${sseConnected ? C.green : C.red}`,
            animation: 'pulse 2s ease infinite',
          }} />
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: sseConnected ? C.green : C.red, letterSpacing: 2 }}>
            {sseConnected ? 'STREAM ACTIVE' : 'RECONNECTING'}
          </span>
        </div>

        {/* Signal bars */}
        <SignalBars strength={telemetry.signalStrength} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* System status */}
        <div style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>
          SYSTEM STATUS
        </div>
        <div style={{
          fontFamily: C.mono, fontSize: '0.42rem', color: C.green,
          border: `1px solid ${C.green}33`, padding: '2px 8px', letterSpacing: 2,
        }}>
          NOMINAL
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

        {/* Intel count */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 1 }}>EVENTS</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.52rem', color: C.cyan, fontWeight: 700 }}>
            {intelItems.length}
          </span>
        </div>

        {/* Connect button */}
        <button style={{
          fontFamily: C.mono, fontSize: '0.4rem',
          color: C.cyan, border: `1px solid ${C.borderCyan}`,
          padding: '3px 12px', background: 'rgba(0,229,255,0.06)',
          cursor: 'pointer', letterSpacing: 2,
          transition: 'all 0.2s ease',
        }}
          className="hover:!bg-cyan-500/10"
        >
          ● CONNECTED
        </button>
      </header>

      {/* Breaking ticker */}
      <BreakingTicker items={intelItems} />

      {/* ═══════════════════════════════════════════
          MAIN 3-COLUMN LAYOUT
      ═══════════════════════════════════════════ */}
      <main style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT — Incident Feed */}
        <LeftPanel
          items={displayItems}
          selectedEvent={selectedEvent}
          onSelect={handleSelectEvent}
          agentStatus={agentStatus}
          loadingMore={loadingMore}
          sentinelRef={sentinelRef}
        />

        {/* CENTER — 3D Globe */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {/* Globe container */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <Globe3D
              intelItems={intelItems}
              onSelectEvent={handleSelectEvent}
              selectedEvent={selectedEvent}
              aircraft={aircraft}
              fires={fires}
            />
          </div>

          {/* Selected event overlay (bottom of globe) */}
          {selectedEvent && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(2,6,14,0.98) 0%, rgba(2,6,14,0.9) 60%, transparent 100%)',
              padding: '32px 20px 16px',
              animation: 'slideDown 0.3s ease',
              pointerEvents: 'none',
            }}>
              <div className="flex items-start gap-3">
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                  background: SEV_COLOR[selectedEvent.severity] || C.cyan,
                  boxShadow: `0 0 10px ${SEV_COLOR[selectedEvent.severity] || C.cyan}`,
                  animation: 'pulse 1.5s ease infinite',
                }} />
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: '0.4rem', color: SEV_COLOR[selectedEvent.severity] || C.cyan, letterSpacing: 3, marginBottom: 3 }}>
                    {SEV_LABEL[selectedEvent.severity]} — {selectedEvent.location}
                  </div>
                  <div style={{ fontFamily: C.sans, fontSize: '0.82rem', fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
                    {selectedEvent.headline}
                  </div>
                  {selectedEvent.summary && (
                    <div style={{ fontFamily: C.sans, fontSize: '0.6rem', color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                      {selectedEvent.summary.slice(0, 200)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    fontFamily: C.mono, fontSize: '0.7rem', color: C.muted,
                    marginLeft: 'auto', flexShrink: 0, pointerEvents: 'auto',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                  className="hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Globe coordinate readout (top-right of globe) */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            fontFamily: C.mono, fontSize: '0.38rem',
            color: 'rgba(0,229,255,0.35)', letterSpacing: 2,
            pointerEvents: 'none',
          }}>
            {selectedEvent ? (
              <>
                <div>LAT {selectedEvent.location?.toUpperCase().slice(0, 20)}</div>
                <div>AGT {(selectedEvent.agentId || 'OSINT').toUpperCase()}</div>
              </>
            ) : (
              <>
                <div>AUTO ROTATE</div>
                <div>GLOBAL VIEW</div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Telemetry + Webcam + Console */}
        <RightPanel
          logs={logs}
          telemetry={telemetry}
          selectedEvent={selectedEvent}
        />
      </main>

      {/* ═══════════════════════════════════════════
          BOTTOM STATUS BAR
      ═══════════════════════════════════════════ */}
      <footer style={{
        height: 30, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 20,
        background: 'rgba(2,4,12,0.98)',
        borderTop: `1px solid ${C.border}`,
      }}>
        {/* Global load */}
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>GLOBAL LOAD</span>
          <div style={{ width: 60, height: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', width: `${metrics.load}%`,
              background: `linear-gradient(90deg, ${loadColor}88, ${loadColor})`,
              transition: 'width 1s ease',
            }} />
          </div>
          <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: loadColor, fontWeight: 700 }}>
            {Math.round(metrics.load)}%
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* Data rate */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>DATA RATE</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: C.cyan, fontWeight: 700 }}>
            {metrics.dataRate} TB/s
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* DEFCON */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>SECURITY</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: defconColor, fontWeight: 700 }}>
            DEFCON {metrics.defcon}
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* Threats */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>THREATS</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: intelItems.filter(i => i.severity >= 4).length > 0 ? C.orange : C.green, fontWeight: 700 }}>
            {intelItems.filter(i => i.severity >= 4).length}
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* Latency */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: C.mono, fontSize: '0.38rem', color: C.muted, letterSpacing: 2 }}>LATENCY</span>
          <span style={{ fontFamily: C.mono, fontSize: '0.42rem', color: telemetry.latency > 80 ? C.red : C.green, fontWeight: 700 }}>
            {Math.round(telemetry.latency)}ms
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Source count */}
        <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.dim, letterSpacing: 1 }}>
          27 FEEDS ACTIVE
        </span>
        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* AI models */}
        <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.dim, letterSpacing: 1 }}>
          7 AI AGENTS
        </span>
        <div style={{ width: 1, height: 14, background: C.border }} />

        {/* Version */}
        <span style={{ fontFamily: C.mono, fontSize: '0.36rem', color: C.dim }}>
          v9.0.0
        </span>
      </footer>
    </div>
  )
}
