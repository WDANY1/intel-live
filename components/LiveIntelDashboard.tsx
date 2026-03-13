'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  AGENTS,
  WEBCAM_FEEDS,
  NEWS_STREAMS,
  AI_MODELS,
  SEVERITY_CONFIG,
} from '@/lib/config'
import { AgentManager, verifyIntel } from '@/lib/agents'
import { useLiveData } from '@/lib/useLiveData'
import type {
  IntelItem,
  AnalysisResult,
  BreakingItem,
  AgentStatusMap,
  IntelMap,
  LogEntry,
  AgentProgress,
} from '@/lib/types'

const Globe3D = dynamic(() => import('./Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #060d1a 0%, #020509 100%)' }}>
      <div className="text-center">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.15)', borderTopColor: '#00E5FF', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontFamily: 'var(--display)', fontSize: '0.55rem', color: '#00E5FF', letterSpacing: 6 }}>INITIALIZING</div>
      </div>
    </div>
  ),
})

// ── Helpers ──
function zuluTime(d: Date) { return d.toISOString().slice(11, 19) }
function timeAgo(ms: number) {
  const m = Math.floor((Date.now() - ms) / 60000)
  if (m < 1) return 'NOW'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function nodeName(item: IntelItem, index: number): string {
  const agentPrefixes: Record<string, string> = {
    sigint: 'SIG', osint: 'OSN', humint: 'HUM', geoint: 'GEO',
    econint: 'ECN', proxy: 'PRX', diplo: 'DPL',
  }
  const prefix = agentPrefixes[item.agentId || 'osint'] || 'INT'
  return `NODE::${prefix}-${String(index + 1).padStart(2, '0')}`
}

function nodeStatus(severity: number): { label: string; color: string } {
  if (severity >= 5) return { label: 'CRITICAL', color: '#FF3040' }
  if (severity >= 4) return { label: 'HIGH', color: '#FF6B35' }
  if (severity >= 3) return { label: 'WARNING', color: '#FFB020' }
  if (severity >= 2) return { label: 'NOMINAL', color: '#00E5FF' }
  return { label: 'STABLE', color: '#00E676' }
}

// ── Types ──
interface DashState {
  intel: IntelMap
  analysis: AnalysisResult | null
  breaking: BreakingItem[]
  logs: LogEntry[]
  agentStatus: AgentStatusMap
  modelsUsed: string[]
  cycle: number
  status: 'idle' | 'running' | 'done' | 'error'
  apiKey: string
}

// ══════════════════════════════════════════════════════
// TOP HEADER BAR
// ══════════════════════════════════════════════════════
function HeaderBar({
  status, cycle, totalItems, modelsActive, onRefresh, onToggleAgents, agentsRunning,
  onOpenWebcams, sseConnected, aircraftCount,
}: {
  status: string; cycle: number; totalItems: number; modelsActive: number;
  onRefresh: () => void; onToggleAgents: () => void; agentsRunning: boolean;
  onOpenWebcams: () => void; sseConnected?: boolean; aircraftCount?: number;
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isScanning = status === 'running'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 44, zIndex: 1000,
      background: 'rgba(4,8,16,0.97)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,229,255,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 14,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', border: '1.5px solid rgba(0,229,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,229,255,0.06)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 8px #00E5FF' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: 3, lineHeight: 1, color: '#fff' }}>
            INTEL<span style={{ color: '#00E5FF' }}>-LIVE</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(0,229,255,0.4)', letterSpacing: 2 }}>V5.0.2</div>
        </div>
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--mono)', fontSize: '0.52rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isScanning ? '#00E676' : '#00E5FF',
            boxShadow: `0 0 6px ${isScanning ? '#00E676' : '#00E5FF'}`,
            animation: 'pulse 1.5s ease infinite',
          }} />
          <span style={{ color: isScanning ? '#00E676' : 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>
            {isScanning ? 'SCANNING' : 'NOMINAL'}
          </span>
        </div>

        <span style={{ color: '#00E5FF', letterSpacing: 1 }}>ZULU {zuluTime(time)}</span>

        <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
          <span style={{ color: '#00E5FF' }}>{totalItems}</span> SIGNALS
        </span>

        <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
          CYCLE <span style={{ color: '#00E5FF' }}>#{cycle}</span>
        </span>

        {(aircraftCount ?? 0) > 0 && (
          <span style={{ color: '#22D3EE', letterSpacing: 1 }}>{aircraftCount} AIRCRAFT</span>
        )}

        {sseConnected && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#00E676', letterSpacing: 1 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00E676', animation: 'pulse 2s ease infinite' }} />
            LIVE
          </span>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Signal bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
          {[4, 6, 9, 12, 15].map((h, i) => (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 1,
              background: i < 4 ? '#00E5FF' : 'rgba(0,229,255,0.15)',
            }} />
          ))}
        </div>

        <button onClick={onOpenWebcams} style={{
          fontFamily: 'var(--mono)', fontSize: '0.45rem', letterSpacing: 1.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.45)', padding: '3px 8px',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3,
          background: 'transparent', cursor: 'pointer',
        }}>
          FEEDS
        </button>

        <button onClick={onRefresh} style={{
          fontFamily: 'var(--mono)', fontSize: '0.45rem', letterSpacing: 1.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.45)', padding: '3px 8px',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3,
          background: 'transparent', cursor: 'pointer',
        }}>
          REFRESH
        </button>

        <button onClick={onToggleAgents} style={{
          fontFamily: 'var(--mono)', fontSize: '0.48rem', letterSpacing: 2, fontWeight: 700,
          color: agentsRunning ? '#FF3040' : '#00E5FF', padding: '4px 14px',
          border: `1px solid ${agentsRunning ? 'rgba(255,48,64,0.35)' : 'rgba(0,229,255,0.35)'}`,
          borderRadius: 3,
          background: agentsRunning ? 'rgba(255,48,64,0.08)' : 'rgba(0,229,255,0.06)',
          cursor: 'pointer',
        }}>
          {agentsRunning ? 'DISCONNECT' : 'ESTABLISH UPLINK'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// LEFT PANEL — ACTIVE NODES (Intel Feed)
// ══════════════════════════════════════════════════════
function ActiveNodesPanel({
  items, onSelect, selectedItem,
}: {
  items: IntelItem[]; onSelect: (item: IntelItem) => void; selectedItem: IntelItem | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<string>('ALL')
  const agentIds = useMemo(() => ['ALL', ...AGENTS.map(a => a.id.toUpperCase())], [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return items
    return items.filter(i => (i.agentId || '').toUpperCase() === filter)
  }, [items, filter])

  // Auto-scroll to top on new items
  useEffect(() => {
    if (scrollRef.current && scrollRef.current.scrollTop < 100) {
      scrollRef.current.scrollTop = 0
    }
  }, [items.length])

  const criticalCount = items.filter(i => i.severity >= 4).length

  return (
    <div style={{
      width: 290, flexShrink: 0, height: '100%',
      background: 'rgba(4,8,16,0.92)', borderRight: '1px solid rgba(0,229,255,0.07)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '10px 12px 8px', borderBottom: '1px solid rgba(0,229,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 12, background: '#00E5FF', boxShadow: '0 0 6px #00E5FF' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 3, color: '#fff' }}>
              ACTIVE NODES
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {criticalCount > 0 && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '0.42rem', letterSpacing: 1, fontWeight: 700,
                color: '#FF3040', padding: '1px 5px', border: '1px solid rgba(255,48,64,0.3)',
                borderRadius: 2, background: 'rgba(255,48,64,0.08)', animation: 'alertFlash 1.5s ease infinite',
              }}>
                {criticalCount} ALERT
              </span>
            )}
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.42rem', color: 'rgba(0,229,255,0.4)', letterSpacing: 1 }}>
              {filtered.length}/{items.length}
            </span>
          </div>
        </div>

        {/* Agent filters */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {agentIds.slice(0, 8).map(id => (
            <button key={id} onClick={() => setFilter(id)} style={{
              fontFamily: 'var(--mono)', fontSize: '0.38rem', letterSpacing: 1, fontWeight: 600,
              padding: '2px 5px', borderRadius: 2, cursor: 'pointer',
              background: filter === id ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: `1px solid ${filter === id ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: filter === id ? '#00E5FF' : 'rgba(255,255,255,0.3)',
            }}>
              {id === 'ALL' ? 'ALL' : id.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable node list */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '6px 8px',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <AnimatePresence initial={false}>
          {filtered.map((item, idx) => {
            const st = nodeStatus(item.severity)
            const isSelected = selectedItem?.headline === item.headline
            const agentColors: Record<string, string> = {
              sigint: '#FF3040', osint: '#4fc3f7', humint: '#e040fb',
              geoint: '#69f0ae', econint: '#ffd740', proxy: '#ff6b35', diplo: '#b388ff',
            }
            const agColor = agentColors[item.agentId || 'osint'] || '#00E5FF'

            return (
              <motion.div
                key={`${item.headline}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => onSelect(item)}
                style={{
                  background: isSelected ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 4, padding: '8px 10px', cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderLeft: `2px solid ${agColor}`,
                }}
              >
                {/* Top row: name + status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: '0.52rem', fontWeight: 700,
                    color: agColor, letterSpacing: 1,
                  }}>
                    {nodeName(item, items.indexOf(item))}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: '0.4rem', fontWeight: 700,
                    color: st.color, letterSpacing: 1, padding: '1px 4px',
                    border: `1px solid ${st.color}30`, borderRadius: 2,
                    background: `${st.color}10`,
                  }}>
                    {st.label}
                  </span>
                </div>

                {/* Headline */}
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'rgba(232,236,241,0.82)',
                  lineHeight: 1.35, marginBottom: 5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {item.headline}
                </div>

                {/* Coords + time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>
                    {item.location
                      ? `📍 ${item.location.slice(0, 20)}`
                      : `LAT: -- | LON: --`}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'rgba(0,229,255,0.35)' }}>
                    {item.fetchedAt ? timeAgo(item.fetchedAt) : item.time || '--'}
                  </span>
                </div>

                {/* Severity bar */}
                <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(item.severity / 5) * 100}%`,
                    background: st.color, boxShadow: `0 0 4px ${st.color}`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', gap: 8,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(0,229,255,0.15)', borderTopColor: '#00E5FF', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: 'rgba(0,229,255,0.3)', letterSpacing: 2 }}>
              AWAITING SIGNALS
            </span>
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: 1 }}>TOTAL NODES</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{items.length.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5, marginBottom: 1 }}>ACTIVE ALERTS</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 700, color: criticalCount > 0 ? '#FF3040' : '#00E676' }}>
            {criticalCount > 0 ? criticalCount : 'NONE'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// RIGHT PANEL — LIVE TELEMETRY + CONSOLE LOGS
// ══════════════════════════════════════════════════════
function TelemetryPanel({
  logs, items, analysis, modelsUsed, cycle, status,
}: {
  logs: LogEntry[]; items: IntelItem[]; analysis: AnalysisResult | null;
  modelsUsed: string[]; cycle: number; status: string;
}) {
  const logScrollRef = useRef<HTMLDivElement>(null)
  const [cmd, setCmd] = useState('')

  // Auto scroll logs
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
    }
  }, [logs.length])

  const critCount = items.filter(i => i.severity >= 4).length
  const totalSig = items.length
  const threatLevel = analysis?.threat_level ?? (critCount > 3 ? 7 : critCount > 1 ? 5 : 3)
  const defcon = threatLevel >= 8 ? '2' : threatLevel >= 6 ? '3' : threatLevel >= 4 ? '4' : '5'
  const defconColor = defcon === '2' ? '#FF3040' : defcon === '3' ? '#FFB020' : defcon === '4' ? '#FFD60A' : '#00E676'

  // Build bar chart data (last 8 cycles worth of activity)
  const barData = useMemo(() => {
    const agentCounts = AGENTS.map(a => ({
      label: a.id.slice(0, 3).toUpperCase(),
      value: items.filter(i => i.agentId === a.id).length,
      color: ['#FF3040', '#4fc3f7', '#e040fb', '#69f0ae', '#ffd740', '#ff6b35', '#b388ff'][AGENTS.indexOf(a)] || '#00E5FF',
    }))
    const max = Math.max(...agentCounts.map(a => a.value), 1)
    return agentCounts.map(a => ({ ...a, pct: (a.value / max) * 100 }))
  }, [items])

  return (
    <div style={{
      width: 290, flexShrink: 0, height: '100%',
      background: 'rgba(4,8,16,0.92)', borderLeft: '1px solid rgba(0,229,255,0.07)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* LIVE TELEMETRY header */}
      <div style={{
        padding: '10px 12px 8px', borderBottom: '1px solid rgba(0,229,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 12, background: '#00E5FF', boxShadow: '0 0 6px #00E5FF' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 3, color: '#fff' }}>
              LIVE TELEMETRY
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '0.38rem', letterSpacing: 2,
            color: '#00E5FF', padding: '1px 5px', border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: 2, animation: 'pulse 2s ease infinite',
          }}>
            REAL-TIME
          </span>
        </div>
      </div>

      {/* Bar chart — signals per agent */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 50, marginBottom: 4 }}>
          {barData.map((bar, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${bar.pct}%`, minHeight: bar.value > 0 ? 3 : 0,
                background: bar.color, borderRadius: '2px 2px 0 0', opacity: 0.8,
                boxShadow: bar.value > 0 ? `0 0 6px ${bar.color}60` : 'none',
                transition: 'height 0.5s ease',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {barData.map((bar, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.32rem', color: bar.color, letterSpacing: 0.5 }}>{bar.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        {[
          { label: 'SIGNALS', value: String(totalSig), color: '#00E5FF' },
          { label: 'CRITICAL', value: String(critCount), color: critCount > 0 ? '#FF3040' : '#00E676' },
          { label: 'AI MODELS', value: String(modelsUsed.length || AI_MODELS.length), color: '#00E5FF' },
          { label: 'CYCLE', value: `#${cycle}`, color: 'rgba(255,255,255,0.5)' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.36rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 3 }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Threat level + Defcon */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.36rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 3 }}>THREAT LEVEL</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700, color: threatLevel >= 7 ? '#FF3040' : '#FFB020' }}>
            {threatLevel}/10
          </div>
        </div>
        <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.36rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 3 }}>SECURITY</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700, color: defconColor }}>
            DEFCON-{defcon}
          </div>
        </div>
      </div>

      {/* Analysis data — full display */}
      {analysis && (
        <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.36rem', color: 'rgba(0,229,255,0.4)', letterSpacing: 1.5, marginBottom: 5 }}>INTEL SUMMARY</div>

          {analysis.situation_summary && (
            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.54rem', color: 'rgba(232,236,241,0.65)', lineHeight: 1.4, marginBottom: 6 }}>
              {analysis.situation_summary}
            </div>
          )}

          {/* Escalation + Nuclear risk bars */}
          {(analysis.escalation_probability != null || analysis.nuclear_risk != null) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {analysis.escalation_probability != null && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>ESCALATION RISK</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: '#FFB020', fontWeight: 700 }}>{analysis.escalation_probability}%</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${analysis.escalation_probability}%`, background: '#FFB020', borderRadius: 1, boxShadow: '0 0 4px #FFB020' }} />
                  </div>
                </div>
              )}
              {analysis.nuclear_risk != null && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>NUCLEAR RISK</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: '#FF3040', fontWeight: 700 }}>{analysis.nuclear_risk}%</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${analysis.nuclear_risk}%`, background: '#FF3040', borderRadius: 1, boxShadow: '0 0 4px #FF3040' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline last 24h */}
          {analysis.timeline_last_24h?.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(0,229,255,0.35)', letterSpacing: 1.5, marginBottom: 3 }}>TIMELINE 24H</div>
              {analysis.timeline_last_24h.slice(0, 3).map((ev: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 2, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: '#00E5FF', flexShrink: 0, paddingTop: 2 }}>▸</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', color: 'rgba(232,236,241,0.55)', lineHeight: 1.35 }}>{ev}</span>
                </div>
              ))}
            </div>
          )}

          {/* Key risks */}
          {analysis.key_risks?.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,48,64,0.45)', letterSpacing: 1.5, marginBottom: 3 }}>KEY RISKS</div>
              {analysis.key_risks.slice(0, 3).map((risk: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 2, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: '#FF3040', flexShrink: 0, paddingTop: 2 }}>!</span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', color: 'rgba(232,236,241,0.5)', lineHeight: 1.35 }}>{risk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Prediction */}
          {analysis.next_hours_prediction && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,176,32,0.4)', letterSpacing: 1.5, marginBottom: 3 }}>NEXT 24H PREDICTION</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '0.52rem', color: 'rgba(232,236,241,0.5)', lineHeight: 1.4 }}>
                {analysis.next_hours_prediction}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONSOLE LOGS */}
      <div style={{
        padding: '8px 12px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' }}>
            CONSOLE LOGS
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.36rem', color: 'rgba(255,255,255,0.2)' }}>
            {logs.length} entries
          </span>
        </div>
      </div>

      <div ref={logScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 8px' }}>
        {logs.slice(-60).map((log, i) => {
          const colors = { info: '#00E5FF', system: 'rgba(255,255,255,0.45)', error: '#FF3040', success: '#00E676', warn: '#FFB020' }
          const c = colors[log.type as keyof typeof colors] || colors.info
          return (
            <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'rgba(0,229,255,0.3)', flexShrink: 0, paddingTop: 1 }}>
                [{log.time || '--:--:--'}]
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: c, flexShrink: 0, paddingTop: 1 }}>
                {log.type?.toUpperCase().slice(0, 4) || 'INFO'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'rgba(232,236,241,0.5)', lineHeight: 1.4 }}>
                {log.message}
              </span>
            </div>
          )
        })}
        {logs.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.42rem', color: 'rgba(0,229,255,0.2)', padding: '8px 0', letterSpacing: 1 }}>
            $ Awaiting system output...
          </div>
        )}
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'rgba(0,229,255,0.25)', marginTop: 4 }}>
          $ <span style={{ animation: 'pulse 1.2s ease infinite', display: 'inline-block', width: 6, height: 10, background: 'rgba(0,229,255,0.4)', verticalAlign: 'middle' }} />
        </div>
      </div>

      {/* Command input */}
      <div style={{
        padding: '6px 10px', borderTop: '1px solid rgba(0,229,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'rgba(0,229,255,0.4)' }}>$</span>
          <input
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            placeholder="Enter command..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'rgba(255,255,255,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// GLOBE CENTER SECTION
// ══════════════════════════════════════════════════════
function GlobeSection({
  items, selectedItem, onSelectItem, aircraft, fires,
}: {
  items: IntelItem[]; selectedItem: IntelItem | null;
  onSelectItem: (item: IntelItem) => void;
  aircraft: any[]; fires: any[];
}) {
  const critCount = items.filter(i => i.severity >= 4).length
  const defcon = critCount > 5 ? '3' : critCount > 2 ? '4' : '5'
  const defconColor = defcon === '3' ? '#FF3040' : defcon === '4' ? '#FFB020' : '#00E676'
  const globalLoad = Math.min(99, 25 + items.length * 1.2)
  const dataRate = (items.length * 0.04 + 0.5).toFixed(1)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Globe title */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(4,8,16,0.75)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,229,255,0.08)', borderRadius: 4, padding: '3px 14px',
        pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: '0.48rem', color: '#00E5FF', letterSpacing: 3 }}>
          VISUALIZING::LIVE_ORBITS
        </span>
      </div>

      {/* Globe */}
      <div style={{ flex: 1 }}>
        <Globe3D
          intelItems={items}
          onSelectEvent={onSelectItem}
          selectedEvent={selectedItem}
          aircraft={aircraft}
          fires={fires}
        />
      </div>

      {/* Bottom stats bar */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 0,
        background: 'rgba(4,8,16,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden',
      }}>
        {[
          { label: 'GLOBAL LOAD', value: `${globalLoad.toFixed(1)}%`, color: 'var(--accent)' },
          { label: 'DATA RATE', value: `${dataRate}TB/s`, color: 'var(--accent)' },
          { label: 'SECURITY', value: `DEFCON-${defcon}`, color: defconColor },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '5px 16px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.7rem', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {['+', '−', '◎'].map((btn, i) => (
          <button key={i} style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'rgba(4,8,16,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,229,255,0.12)', color: '#00E5FF',
            fontFamily: 'var(--mono)', fontSize: '0.7rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {btn}
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// EVENT DETAIL MODAL
// ══════════════════════════════════════════════════════
function EventDetailModal({ item, onClose }: { item: IntelItem; onClose: () => void }) {
  const st = nodeStatus(item.severity)
  const agentColors: Record<string, string> = {
    sigint: '#FF3040', osint: '#4fc3f7', humint: '#e040fb',
    geoint: '#69f0ae', econint: '#ffd740', proxy: '#ff6b35', diplo: '#b388ff',
  }
  const agColor = agentColors[item.agentId || 'osint'] || '#00E5FF'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(6,12,22,0.98)', border: `1px solid ${agColor}25`,
          borderRadius: 8, padding: '20px 22px', maxWidth: 520, width: '100%',
          boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 0 1px ${agColor}15`,
          borderLeft: `3px solid ${agColor}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: agColor, letterSpacing: 2, marginBottom: 4 }}>
              {(item.agentId || 'OSINT').toUpperCase()} / {item.category}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
              {item.headline}
            </div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 12, flexShrink: 0, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3, padding: '2px 8px', color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--mono)', fontSize: '0.5rem', cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Summary */}
        <div style={{
          fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(232,236,241,0.7)',
          lineHeight: 1.6, marginBottom: 14, padding: '10px 12px',
          background: 'rgba(255,255,255,0.025)', borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {item.summary || 'No summary available.'}
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'SEVERITY', value: `${item.severity}/5 — ${st.label}`, color: st.color },
            { label: 'SOURCE', value: item.source || 'Unknown', color: 'rgba(255,255,255,0.6)' },
            { label: 'TIME', value: item.time || (item.fetchedAt ? timeAgo(item.fetchedAt) : '--'), color: '#00E5FF' },
            { label: 'LOCATION', value: item.location || 'Unknown', color: 'rgba(255,255,255,0.5)' },
            { label: 'VERIFIED', value: item.verified ? 'YES' : 'UNVERIFIED', color: item.verified ? '#00E676' : '#FFB020' },
            { label: 'AI MODEL', value: item.aiModelName?.slice(0, 20) || '--', color: 'rgba(255,255,255,0.4)' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '7px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: m.color, lineHeight: 1.3 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Severity bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(item.severity / 5) * 100}%`, background: st.color, boxShadow: `0 0 8px ${st.color}` }} />
        </div>
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════
// WEBCAM / FEEDS MODAL
// ══════════════════════════════════════════════════════
function WebcamModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'webcam' | 'news'>('webcam')
  const [activeId, setActiveId] = useState(WEBCAM_FEEDS[0]?.id || '')
  const [activeStream, setActiveStream] = useState(NEWS_STREAMS[0]?.id || '')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(4,8,16,0.98)', border: '1px solid rgba(0,229,255,0.1)',
          borderRadius: 8, width: '90vw', maxWidth: 900, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['webcam', 'news'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                fontFamily: 'var(--mono)', fontSize: '0.5rem', letterSpacing: 2, fontWeight: 700,
                padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
                background: activeTab === tab ? 'rgba(0,229,255,0.1)' : 'transparent',
                border: `1px solid ${activeTab === tab ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === tab ? '#00E5FF' : 'rgba(255,255,255,0.35)',
              }}>
                {tab === 'webcam' ? 'LIVE WEBCAMS' : 'NEWS STREAMS'}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3, padding: '3px 10px', color: 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--mono)', fontSize: '0.5rem', cursor: 'pointer',
          }}>✕ CLOSE</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 12, gap: 10 }}>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {activeTab === 'webcam'
              ? WEBCAM_FEEDS.map(f => (
                  <button key={f.id} onClick={() => setActiveId(f.id)} style={{
                    fontFamily: 'var(--mono)', fontSize: '0.42rem', letterSpacing: 1, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                    background: activeId === f.id ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeId === f.id ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: activeId === f.id ? '#00E5FF' : 'rgba(255,255,255,0.35)',
                  }}>
                    {f.flag} {f.city}
                  </button>
                ))
              : NEWS_STREAMS.map(s => (
                  <button key={s.id} onClick={() => setActiveStream(s.id)} style={{
                    fontFamily: 'var(--mono)', fontSize: '0.42rem', letterSpacing: 1, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                    background: activeStream === s.id ? `${s.color}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeStream === s.id ? `${s.color}40` : 'rgba(255,255,255,0.06)'}`,
                    color: activeStream === s.id ? s.color : 'rgba(255,255,255,0.35)',
                  }}>
                    {s.name}
                  </button>
                ))
            }
          </div>

          {/* Embed */}
          <div style={{ flex: 1, borderRadius: 6, overflow: 'hidden', background: '#000', position: 'relative', minHeight: 400 }}>
            <iframe
              key={activeTab === 'webcam' ? activeId : activeStream}
              src={`https://www.youtube.com/embed/${activeTab === 'webcam' ? activeId : activeStream}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════
// BOTTOM STATUS BAR
// ══════════════════════════════════════════════════════
function StatusBar({
  totalItems, critCount, selectedCoords, agentsRunning,
}: {
  totalItems: number; critCount: number; selectedCoords: { lat?: number; lng?: number } | null; agentsRunning: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 22, zIndex: 900,
      background: 'rgba(4,8,16,0.97)', borderTop: '1px solid rgba(0,229,255,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 16,
      fontFamily: 'var(--mono)', fontSize: '0.42rem',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: agentsRunning ? '#00E676' : 'rgba(0,229,255,0.5)' }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: agentsRunning ? '#00E676' : '#00E5FF', animation: 'pulse 2s ease infinite' }} />
        GLOBAL MESH: {agentsRunning ? 'ONLINE' : 'STANDBY'}
      </span>

      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

      <span style={{ color: critCount > 0 ? '#FF3040' : 'rgba(255,255,255,0.35)' }}>
        ALERTS: {critCount > 0 ? <span style={{ animation: 'alertFlash 1.5s ease infinite' }}>{critCount} ACTIVE</span> : '0 ACTIVE'}
      </span>

      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

      <span style={{ color: 'rgba(255,255,255,0.3)' }}>SIGNALS: {totalItems}</span>

      <div style={{ flex: 1 }} />

      {selectedCoords && (
        <span style={{ color: 'rgba(0,229,255,0.4)' }}>
          COORD: {selectedCoords.lat?.toFixed(4)}° N, {selectedCoords.lng?.toFixed(4)}° E
        </span>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// BREAKING NEWS TICKER
// ══════════════════════════════════════════════════════
function BreakingTicker({ items = [] }: { items: BreakingItem[] }) {
  if (!items.length) return null
  const doubled = [...items, ...items]
  return (
    <div style={{
      position: 'fixed', bottom: 22, left: 0, right: 0, height: 24, zIndex: 900,
      background: 'rgba(4,8,16,0.97)', borderTop: '1px solid rgba(255,48,64,0.1)',
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{ padding: '0 10px', fontFamily: 'var(--display)', fontSize: '0.45rem', fontWeight: 700, color: '#FF3040', letterSpacing: 3, flexShrink: 0, animation: 'alertFlash 2s ease infinite' }}>
        BREAKING
      </div>
      <div style={{ width: 1, height: 12, background: 'rgba(255,48,64,0.2)', flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: `tickerScroll ${Math.max(doubled.length * 8, 40)}s linear infinite`, whiteSpace: 'nowrap' }}>
          {doubled.map((item, i) => (
            <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'rgba(232,236,241,0.75)', marginRight: 40, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: item.severity >= 4 ? '#FF3040' : '#FFB020', display: 'inline-block' }} />
              {item.text || item.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// API KEY SETUP
// ══════════════════════════════════════════════════════
function SetupModal({ onConfirm }: { onConfirm: (key: string) => void }) {
  const [key, setKey] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(2,5,10,0.98)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', fontWeight: 800, letterSpacing: 4, color: '#fff', marginBottom: 6 }}>
          INTEL<span style={{ color: '#00E5FF' }}>-LIVE</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'rgba(0,229,255,0.4)', letterSpacing: 3, marginBottom: 24 }}>V5.0.2 — INTELLIGENCE COMMAND SYSTEM</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
          Enter your OpenRouter API key to activate AI agents.<br />
          Keys are stored locally and never sent to our servers.
        </div>
        <input
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && key.trim() && onConfirm(key.trim())}
          placeholder="sk-or-v1-..."
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: 4, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '0.6rem',
            color: '#fff', outline: 'none', marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => key.trim() && onConfirm(key.trim())}
            style={{
              flex: 1, fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: 2, fontWeight: 700,
              color: '#00E5FF', padding: '10px 14px', border: '1px solid rgba(0,229,255,0.35)',
              borderRadius: 4, background: 'rgba(0,229,255,0.08)', cursor: 'pointer',
            }}
          >
            ESTABLISH UPLINK
          </button>
          <button
            onClick={() => onConfirm('server-side')}
            style={{
              fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: 1, fontWeight: 600,
              color: 'rgba(255,255,255,0.35)', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4, background: 'transparent', cursor: 'pointer',
            }}
          >
            USE SERVER KEY
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════
export default function LiveIntelDashboard() {
  const [state, setState] = useState<DashState>({
    intel: {}, analysis: null, breaking: [], logs: [],
    agentStatus: {}, modelsUsed: [], cycle: 0, status: 'idle', apiKey: '',
  })
  const [selectedItem, setSelectedItem] = useState<IntelItem | null>(null)
  const [showSetup, setShowSetup] = useState(true)
  const [showWebcams, setShowWebcams] = useState(false)
  const [agentsRunning, setAgentsRunning] = useState(false)
  const managerRef = useRef<AgentManager | null>(null)
  const { aircraft, fires } = useLiveData()

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString('ro-RO'),
      message: msg, type,
    }
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-80), entry],
    }))
  }, [])

  const allItems = useMemo(() => {
    return Object.values(state.intel).flat().sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0))
  }, [state.intel])

  const criticalCount = useMemo(() => allItems.filter(i => i.severity >= 4).length, [allItems])

  // Load API key from localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('intel_api_key') : null
    if (saved) {
      setState(prev => ({ ...prev, apiKey: saved }))
      setShowSetup(false)
    }
  }, [])

  const handleSetupConfirm = useCallback((key: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('intel_api_key', key)
    setState(prev => ({ ...prev, apiKey: key }))
    setShowSetup(false)
  }, [])

  const startAgents = useCallback((key: string) => {
    if (managerRef.current) { managerRef.current.stop(); managerRef.current = null }
    const mgr = new AgentManager(
      key,
      (data) => {
        setState(prev => ({
          ...prev,
          intel: data.intel,
          analysis: data.analysis || prev.analysis,
          breaking: data.breaking?.length ? data.breaking : prev.breaking,
          cycle: data.cycle,
          modelsUsed: data.modelsUsed || prev.modelsUsed,
          status: 'done',
        }))
      },
      (progress: AgentProgress) => {
        setState(prev => ({
          ...prev,
          agentStatus: { ...prev.agentStatus, [progress.agentId]: progress },
        }))
      },
      (entry: LogEntry) => {
        setState(prev => ({ ...prev, logs: [...prev.logs.slice(-80), entry] }))
      }
    )
    managerRef.current = mgr
    mgr.start(300)
    setAgentsRunning(true)
    setState(prev => ({ ...prev, status: 'running' }))
  }, [])

  const stopAgents = useCallback(() => {
    managerRef.current?.stop()
    managerRef.current = null
    setAgentsRunning(false)
    setState(prev => ({ ...prev, status: 'idle' }))
  }, [])

  const handleToggleAgents = useCallback(() => {
    if (agentsRunning) {
      stopAgents()
    } else {
      startAgents(state.apiKey)
    }
  }, [agentsRunning, stopAgents, startAgents, state.apiKey])

  const handleRefresh = useCallback(() => {
    if (managerRef.current) {
      setState(prev => ({ ...prev, status: 'running' }))
      managerRef.current.manualRefresh()
    } else if (state.apiKey) {
      startAgents(state.apiKey)
    }
  }, [state.apiKey, startAgents])

  // Auto-start after setup
  useEffect(() => {
    if (!showSetup && state.apiKey && !agentsRunning && !managerRef.current) {
      startAgents(state.apiKey)
    }
  }, [showSetup, state.apiKey])

  // Cleanup
  useEffect(() => () => { managerRef.current?.stop() }, [])

  const selectedCoords = useMemo(() => {
    if (!selectedItem) return null
    // Try to extract coords from location string
    return { lat: undefined, lng: undefined }
  }, [selectedItem])

  return (
    <>
      {showSetup && <SetupModal onConfirm={handleSetupConfirm} />}

      <HeaderBar
        status={state.status}
        cycle={state.cycle}
        totalItems={allItems.length}
        modelsActive={state.modelsUsed.length || AI_MODELS.length}
        onRefresh={handleRefresh}
        onToggleAgents={handleToggleAgents}
        agentsRunning={agentsRunning}
        onOpenWebcams={() => setShowWebcams(true)}
      />

      {/* Main layout */}
      <div style={{
        position: 'fixed', inset: 0, top: 44, bottom: state.breaking.length ? 46 : 22,
        display: 'flex', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, #060d1a 0%, #020509 100%)',
      }}>
        <ActiveNodesPanel
          items={allItems}
          onSelect={setSelectedItem}
          selectedItem={selectedItem}
        />

        <GlobeSection
          items={allItems}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          aircraft={aircraft}
          fires={fires}
        />

        <TelemetryPanel
          logs={state.logs}
          items={allItems}
          analysis={state.analysis}
          modelsUsed={state.modelsUsed}
          cycle={state.cycle}
          status={state.status}
        />
      </div>

      <BreakingTicker items={state.breaking} />

      <StatusBar
        totalItems={allItems.length}
        critCount={criticalCount}
        selectedCoords={selectedCoords}
        agentsRunning={agentsRunning}
      />

      <AnimatePresence>
        {selectedItem && (
          <EventDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWebcams && <WebcamModal onClose={() => setShowWebcams(false)} />}
      </AnimatePresence>
    </>
  )
}
