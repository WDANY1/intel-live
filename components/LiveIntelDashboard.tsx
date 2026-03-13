'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  AGENTS,
  WEBCAM_FEEDS,
  NEWS_STREAMS,
  REFRESH_INTERVAL,
  AI_MODELS,
  SEVERITY_CONFIG,
} from '@/lib/config'
import { AgentManager, verifyIntel } from '@/lib/agents'
import { useLiveData } from '@/lib/useLiveData'
import { useEventStream } from '@/lib/useEventStream'
import { extractIntelFromRSS } from '@/lib/extraction'
import type {
  IntelItem,
  AnalysisResult,
  BreakingItem,
  AgentStatusMap,
  IntelMap,
  RSSArticle,
  VerificationResult,
  AgentProgress,
} from '@/lib/types'

// Load Globe dynamically (WebGL, browser-only)
const Globe3D = dynamic(() => import('./Globe3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #081428 0%, #050A12 70%)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#00E5FF]/20 mx-auto mb-3"
          style={{ borderTopColor: '#00E5FF', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontFamily: 'var(--display)', fontSize: '0.65rem', color: '#00E5FF', letterSpacing: 6 }}>
          INITIALIZING
        </div>
      </div>
    </div>
  ),
})

// ── Utility ──
function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'NOW'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function formatZuluTime(date: Date): string {
  return date.toISOString().slice(11, 19)
}

// ── Severity components ──
function SeverityDot({ level, size = 5 }: { level: number; size?: number }) {
  const c = SEVERITY_CONFIG[level as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG[3]
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: c.color,
      boxShadow: `0 0 ${size + 2}px ${c.color}`, display: 'inline-block', flexShrink: 0,
    }} />
  )
}

function SeverityBadge({ level }: { level: number }) {
  const c = SEVERITY_CONFIG[level as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG[3]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 5px', borderRadius: 2, fontSize: '0.5rem',
      fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: 1.5,
      background: `${c.color}10`, color: c.color, border: `1px solid ${c.color}20`,
    }}>
      {c.label}
    </span>
  )
}

// ── Top Command Bar ──
function CommandBar({
  status, cycle, totalItems, modelsActive, onRefresh, aircraftCount, fireCount, sseConnected,
}: {
  status: string; cycle: number; totalItems: number; modelsActive: number;
  onRefresh: () => void; aircraftCount?: number; fireCount?: number; sseConnected?: boolean
}) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 40, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      background: 'rgba(5,10,18,0.92)', backdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(0,229,255,0.06)',
    }}>
      {/* Left: Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: status === 'running' ? '#00E676' : '#00E5FF',
            boxShadow: `0 0 8px ${status === 'running' ? '#00E676' : '#00E5FF'}`,
            animation: status === 'running' ? 'pulse 1.2s ease infinite' : 'pulse 3s ease infinite',
          }} />
          <span style={{ fontFamily: 'var(--display)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 4, color: '#fff' }}>
            INTEL<span style={{ color: 'var(--accent)' }}>LIVE</span>
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--text-dim)', letterSpacing: 2 }}>v11.0</span>
        </div>
      </div>

      {/* Center: Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--mono)', fontSize: '0.55rem', letterSpacing: 1 }}>
        <span style={{ color: status === 'running' ? '#00E676' : 'var(--text-muted)' }}>
          STATUS: {status === 'running' ? 'SCANNING' : 'NOMINAL'}
        </span>
        <span style={{ color: 'var(--text-dim)' }}>|</span>
        <span style={{ color: 'var(--accent)' }}>ZULU {formatZuluTime(time)}</span>
        <span style={{ color: 'var(--text-dim)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--accent)' }}>{totalItems}</span> SIGNALS
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--accent)' }}>{modelsActive}</span> AI
        </span>
        {(aircraftCount ?? 0) > 0 && (
          <span style={{ color: '#22D3EE' }}>{aircraftCount} AC</span>
        )}
        {sseConnected && <span className="live-dot" title="SSE Connected" />}
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Signal bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 14 }}>
          {[4, 7, 10, 13, 14].map((h, i) => (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 1,
              background: i < 4 ? 'var(--accent)' : 'rgba(0,229,255,0.2)',
              transition: 'height 0.3s ease',
            }} />
          ))}
        </div>
        <button onClick={onRefresh} style={{
          fontFamily: 'var(--mono)', fontSize: '0.5rem', letterSpacing: 2, fontWeight: 700,
          color: 'var(--accent)', padding: '4px 12px',
          border: '1px solid rgba(0,229,255,0.25)', borderRadius: 3,
          background: 'rgba(0,229,255,0.06)', cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          REFRESH
        </button>
      </div>
    </div>
  )
}

// ── Breaking Ticker ──
function BreakingTicker({ items = [] }: { items: BreakingItem[] }) {
  if (!items.length) return null
  const doubled = [...items, ...items]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 26, zIndex: 1000,
      background: 'rgba(5,10,18,0.92)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,48,64,0.12)',
      display: 'flex', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{
        padding: '0 10px', fontFamily: 'var(--display)', fontSize: '0.5rem', fontWeight: 700,
        color: '#FF3040', letterSpacing: 3, flexShrink: 0, animation: 'alertFlash 2s ease infinite',
      }}>
        BREAKING
      </div>
      <div style={{ width: 1, height: 12, background: 'rgba(255,48,64,0.2)', flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          animation: `tickerScroll ${Math.max(items.length * 8, 40)}s linear infinite`,
          whiteSpace: 'nowrap',
        }}>
          {doubled.map((item, i) => (
            <span key={i} style={{
              fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-primary)',
              marginRight: 40, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <SeverityDot level={item.severity || 3} size={3} />
              {item.text || item.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Event Feed Card (monitor-the-situation style) ──
function EventCard({
  item, onClick, isSelected, index,
}: {
  item: IntelItem; onClick?: (i: IntelItem) => void; isSelected: boolean; index: number
}) {
  const sev = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG[3]
  const agent = AGENTS.find((a) => a.id === item.agentId)
  const sevClass = item.severity >= 5 ? 'event-card--critical' : item.severity >= 4 ? 'event-card--high' : item.severity >= 3 ? 'event-card--medium' : ''

  return (
    <div
      className={`event-card ${sevClass} ${isSelected ? 'event-card--selected' : ''}`}
      onClick={() => onClick?.(item)}
      style={{
        borderLeftColor: sev.color,
        animationDelay: `${Math.min(index * 0.03, 0.5)}s`,
      }}
    >
      {/* Top: Agent + Severity + Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        {agent && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '0.48rem', fontWeight: 700,
            color: agent.color, letterSpacing: 1, opacity: 0.9,
          }}>
            {agent.icon} {agent.name}
          </span>
        )}
        <SeverityBadge level={item.severity} />
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.45rem',
          color: 'var(--accent)', opacity: 0.6,
        }}>
          {item.time}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontFamily: 'var(--sans)', fontSize: '0.73rem', fontWeight: 600,
        color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 3,
      }}>
        {item.headline}
      </div>

      {/* Summary (truncated) */}
      {item.summary && (
        <div style={{
          fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--text-muted)',
          lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.summary}
        </div>
      )}

      {/* Image */}
      {item.image && (
        <img src={item.image} alt="" style={{
          width: '100%', height: 70, objectFit: 'cover', borderRadius: 3,
          marginTop: 4, opacity: 0.75, border: '1px solid rgba(255,255,255,0.04)',
        }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}

      {/* Footer: Source + Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
        {item.source && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)' }}>
            {item.source}
          </span>
        )}
        {item.location && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--accent)', opacity: 0.5 }}>
            {item.location}
          </span>
        )}
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.4rem',
          color: 'var(--text-dim)', letterSpacing: 1,
        }}>
          CLICK FOR DETAILS
        </span>
      </div>
    </div>
  )
}

// ── RSS Card ──
function RSSCard({ article, index }: { article: RSSArticle; index: number }) {
  const keywords = ['iran', 'israel', 'military', 'strike', 'missile', 'houthi', 'hezbollah', 'gulf', 'nuclear', 'war', 'attack', 'bomb', 'drone', 'navy']
  const text = `${article.title} ${article.description}`.toLowerCase()
  const severity = text.includes('strike') || text.includes('attack') || text.includes('bomb') ? 5 :
    text.includes('missile') || text.includes('military') ? 4 :
    text.includes('nuclear') || text.includes('war') ? 4 :
    keywords.some((k) => text.includes(k)) ? 3 : 2
  const sev = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG[3]
  const timeAgo = article.pubDate ? getTimeAgo(new Date(article.pubDate)) : ''

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="event-card"
      style={{
        display: 'block', borderLeftColor: sev.color, textDecoration: 'none', color: 'inherit',
        animationDelay: `${Math.min(index * 0.02, 0.4)}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', fontWeight: 700, color: '#06b6d4', letterSpacing: 1 }}>RSS</span>
        <SeverityBadge level={severity} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)' }}>{timeAgo}</span>
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 2 }}>
        {article.title}
      </div>
      {article.description && (
        <div style={{
          fontFamily: 'var(--sans)', fontSize: '0.62rem', color: 'var(--text-muted)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.description}
        </div>
      )}
      {article.image && (
        <img src={article.image} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 3, marginTop: 4, opacity: 0.7 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)' }}>{article.source}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--accent)', opacity: 0.5, marginLeft: 'auto' }}>READ ↗</span>
      </div>
    </a>
  )
}

// ── Event Detail Modal (fullscreen overlay) ──
function EventDetailModal({
  item, onClose, onVerify, verification,
}: {
  item: IntelItem; onClose: () => void;
  onVerify?: (i: IntelItem) => void;
  verification?: VerificationResult | { loading: boolean } | { error: boolean } | null
}) {
  const sev = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG[3]
  const agent = AGENTS.find((a) => a.id === item.agentId)
  const searchQuery = encodeURIComponent(item.headline)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(5,10,18,0.85)', backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto',
          background: 'rgba(10,16,28,0.97)', border: `1px solid ${sev.color}25`,
          borderRadius: 8, boxShadow: `0 0 60px rgba(0,0,0,0.5), 0 0 20px ${sev.color}10`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${sev.color}15`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <SeverityBadge level={item.severity} />
              {agent && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: agent.color }}>
                  {agent.icon} {agent.fullName}
                </span>
              )}
              {item.time && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: 'var(--text-dim)' }}>{item.time}</span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--heading)', fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {item.headline}
            </div>
          </div>
          <button onClick={onClose} style={{
            fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-dim)',
            padding: '2px 6px', cursor: 'pointer', flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4,
          }}>
            ✕
          </button>
        </div>

        {/* Image */}
        {item.image && (
          <div style={{ padding: '0 18px', marginTop: 10 }}>
            <img src={item.image} alt="" style={{
              width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.04)',
            }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '14px 18px' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
            {item.summary}
          </p>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
            {[
              { label: 'SOURCE', value: item.source },
              { label: 'TIME', value: item.time },
              { label: 'LOCATION', value: item.location },
              { label: 'AI MODEL', value: item.aiModelName },
            ].filter((m) => m.value).map((m) => (
              <div key={m.label} style={{
                padding: '7px 10px', background: 'rgba(255,255,255,0.02)',
                borderRadius: 4, border: '1px solid rgba(255,255,255,0.03)',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-primary)' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Direct source link */}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '10px', marginBottom: 12, borderRadius: 4,
              background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)',
              fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2,
              color: 'var(--accent)', textDecoration: 'none',
            }}>
              READ FULL ARTICLE ↗
            </a>
          )}

          {/* Search links */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6 }}>FIND FULL STORY</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Google News', url: `https://news.google.com/search?q=${searchQuery}`, color: '#4285f4' },
                { label: 'X / Twitter', url: `https://x.com/search?q=${searchQuery}&f=live`, color: '#1da1f2' },
                { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${searchQuery}&sp=CAI%253D`, color: '#ff0000' },
                { label: 'Reuters', url: `https://www.reuters.com/search/news?query=${searchQuery}`, color: '#ff8000' },
              ].map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  borderRadius: 3, fontSize: '0.5rem', fontFamily: 'var(--mono)', fontWeight: 600,
                  color: link.color, background: `${link.color}08`, border: `1px solid ${link.color}18`,
                  textDecoration: 'none', letterSpacing: 0.5,
                }}>
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>

          {/* Verify button */}
          {!verification && (
            <button onClick={() => onVerify?.(item)} style={{
              width: '100%', padding: '9px', fontFamily: 'var(--mono)', fontSize: '0.6rem',
              letterSpacing: 2, color: 'var(--accent)', border: '1px solid rgba(0,229,255,0.15)',
              borderRadius: 4, background: 'rgba(0,229,255,0.03)', cursor: 'pointer',
            }}>
              CROSS-VERIFY WITH {AI_MODELS.length} AI MODELS
            </button>
          )}

          {'loading' in (verification || {}) && (
            <div style={{ padding: 14, textAlign: 'center' }}>
              <div className="spin-loading" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: 2 }}>VERIFYING...</div>
            </div>
          )}

          {verification && !('loading' in verification) && !('error' in verification) && (
            <div style={{
              padding: 10, borderRadius: 4, marginTop: 10,
              border: `1px solid ${(verification as VerificationResult).verified ? '#00E67620' : '#FF304020'}`,
              background: (verification as VerificationResult).verified ? 'rgba(0,230,118,0.03)' : 'rgba(255,48,64,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 700,
                  color: (verification as VerificationResult).verified ? '#00E676' : '#FF3040',
                }}>
                  {(verification as VerificationResult).crossVerification?.consensus || 'VERIFIED'}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                  Confidence: {(verification as VerificationResult).confidence}%
                </span>
              </div>
              {(verification as VerificationResult).corroborating_sources?.length > 0 && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                  Sources: {(verification as VerificationResult).corroborating_sources.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Agent Status Grid ──
function AgentStatusGrid({ agentStatuses }: { agentStatuses: AgentStatusMap }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 12px', flexWrap: 'wrap' }}>
      {AGENTS.map((agent) => {
        const st = agentStatuses[agent.id]
        const isRunning = st?.status === 'running'
        const isDone = st?.status === 'done'
        const isError = st?.status === 'error'
        const statusColor = isRunning ? 'var(--accent)' : isDone ? '#00E676' : isError ? '#FF3040' : 'var(--text-dim)'

        return (
          <div
            key={agent.id}
            title={`${agent.fullName}: ${st?.message || 'pending'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 3,
              background: isRunning ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${isRunning ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)'}`,
            }}
          >
            <span style={{
              width: 4, height: 4, borderRadius: '50%', background: statusColor,
              animation: isRunning ? 'pulse 1s ease infinite' : 'none',
            }} />
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.45rem', fontWeight: 600,
              letterSpacing: 1, color: statusColor,
            }}>
              {agent.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Analysis Panel ──
function AnalysisPanel({ analysis }: { analysis: AnalysisResult }) {
  const tColor = analysis.threat_level >= 7 ? '#FF3040' : analysis.threat_level >= 4 ? '#FFB020' : '#00E676'
  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--display)', fontSize: '1.1rem', fontWeight: 800, color: tColor,
          border: `2px solid ${tColor}30`, background: `${tColor}08`,
          animation: 'pulseGlow 2s ease infinite',
        }}>
          {analysis.threat_level}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, color: tColor }}>
            {analysis.threat_label}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)' }}>
            Escalation: {analysis.escalation_probability}% | Nuclear: {analysis.nuclear_risk}%
          </div>
        </div>
      </div>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
        {analysis.situation_summary}
      </p>
      {analysis.breaking_alerts?.map((alert, i) => (
        <div key={i} style={{
          padding: '5px 8px', marginBottom: 3, borderRadius: 3,
          background: 'rgba(255,48,64,0.03)', borderLeft: '2px solid #FF3040',
          fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-primary)',
        }}>
          {alert}
        </div>
      ))}
      {analysis.key_risks?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 4 }}>KEY RISKS</div>
          {analysis.key_risks.map((risk, i) => (
            <div key={i} style={{
              padding: '3px 0', fontFamily: 'var(--sans)', fontSize: '0.65rem',
              color: 'var(--text-secondary)', display: 'flex', gap: 5,
            }}>
              <span style={{ color: '#FFB020', flexShrink: 0 }}>●</span>{risk}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Webcams Panel ──
function WebcamsPanel() {
  const [activeCam, setActiveCam] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'cams' | 'news'>('cams')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {[{ id: 'cams', label: 'LIVE CAMS' }, { id: 'news', label: 'NEWS TV' }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'cams' | 'news')} style={{
            flex: 1, padding: '6px 0', fontFamily: 'var(--mono)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: 2,
            color: activeTab === tab.id ? '#ef4444' : 'var(--text-dim)',
            borderBottom: activeTab === tab.id ? '2px solid #ef4444' : '2px solid transparent', cursor: 'pointer',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active player */}
      {activeCam && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeCam.id}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: '#ef4444', fontWeight: 700 }}>LIVE</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-muted)' }}>{activeCam.name}</span>
            </div>
            <button onClick={() => setActiveCam(null)} style={{
              fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--text-dim)', cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
        {activeTab === 'cams' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {WEBCAM_FEEDS.map((cam) => (
              <div
                key={cam.id}
                onClick={() => setActiveCam(cam)}
                style={{
                  borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.04)', background: '#0a0e14',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)')}
              >
                <div style={{ position: 'relative', height: 55, background: '#0d1117' }}>
                  <img
                    src={`https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`}
                    alt={cam.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div style={{
                    position: 'absolute', top: 2, left: 2, display: 'flex', alignItems: 'center',
                    gap: 2, padding: '1px 4px', borderRadius: 2,
                    background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(239,68,68,0.3)',
                  }}>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s ease infinite' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.33rem', color: '#ef4444', fontWeight: 700 }}>LIVE</span>
                  </div>
                  <div style={{ position: 'absolute', top: 2, right: 2, fontSize: '0.55rem' }}>{cam.flag}</div>
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.43rem', fontWeight: 600, color: '#e2e8f0' }}>{cam.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.35rem', color: 'rgba(255,255,255,0.25)' }}>{cam.city}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NEWS_STREAMS.map((stream) => (
              <div
                key={stream.id}
                onClick={() => setActiveCam({ id: stream.id, name: stream.name })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  borderRadius: 4, border: `1px solid ${stream.color}15`, background: '#0a0e14',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${stream.color}40`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${stream.color}15`)}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: stream.color, animation: 'pulse 2s ease infinite' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', fontWeight: 700, color: stream.color }}>{stream.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>24/7</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Console Logs ──
function ConsoleLogs({ items, agentStatuses }: { items: IntelItem[]; agentStatuses: AgentStatusMap }) {
  const [logs, setLogs] = useState<{ time: string; msg: string; type: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString().slice(11, 19)
      const messages = [
        { msg: 'Scanning global threat feeds...', type: 'sys' },
        { msg: 'Processing RSS intelligence...', type: 'info' },
        { msg: `Active signals: ${items.length}`, type: 'info' },
        { msg: 'Crossreferencing event sources...', type: 'sys' },
        { msg: 'Satellite imagery scan complete.', type: 'info' },
        { msg: 'Monitoring Strait of Hormuz...', type: 'sys' },
        { msg: 'Checking OSINT network updates...', type: 'sys' },
      ]
      const runningAgents = Object.entries(agentStatuses).filter(([, s]) => s?.status === 'running')
      if (runningAgents.length > 0) {
        const [id] = runningAgents[Math.floor(Math.random() * runningAgents.length)]
        messages.push({ msg: `Agent ${id.toUpperCase()} collecting intel...`, type: 'info' })
      }
      const msg = messages[Math.floor(Math.random() * messages.length)]
      setLogs(prev => [...prev.slice(-25), { time: now, ...msg }])
    }, 3000)
    return () => clearInterval(interval)
  }, [items.length, agentStatuses])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.48rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
          CONSOLE LOGS
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.4rem', color: 'var(--accent)', opacity: 0.5 }}>
          LIVE
        </span>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '4px 10px' }}>
        {logs.map((log, i) => (
          <div key={i} className="console-line" style={{
            color: log.type === 'info' ? 'var(--accent)' : log.type === 'warn' ? 'var(--warning)' :
              log.type === 'error' ? 'var(--alert)' : 'var(--text-dim)',
          }}>
            <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>[{log.time}]</span>
            <span style={{ color: log.type === 'info' ? '#00E5FF' : log.type === 'warn' ? '#FFB020' : 'var(--text-muted)', fontWeight: 600 }}>
              {log.type.toUpperCase()}:
            </span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{log.msg}</span>
          </div>
        ))}
        <span style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--accent)', opacity: 0.7, animation: 'blink 1s step-end infinite', marginLeft: 2 }} />
      </div>
    </div>
  )
}

// ── Live Telemetry Panel ──
function TelemetryPanel({ items, liveData }: { items: IntelItem[]; liveData: any }) {
  const criticalCount = items.filter(i => i.severity >= 5).length
  const highCount = items.filter(i => i.severity >= 4).length

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 8 }}>
        LIVE TELEMETRY
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
        {[
          { label: 'SIGNALS', value: items.length.toString(), color: 'var(--accent)' },
          { label: 'CRITICAL', value: criticalCount.toString(), color: '#FF3040' },
          { label: 'AIRCRAFT', value: (liveData.aircraft?.length || 0).toString(), color: '#22D3EE' },
          { label: 'FIRES', value: (liveData.fires?.length || 0).toString(), color: '#F97316' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: '6px 8px', background: 'rgba(255,255,255,0.02)',
            borderRadius: 3, border: '1px solid rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Severity distribution bar */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 4 }}>
        SEVERITY DISTRIBUTION
      </div>
      <div style={{ display: 'flex', gap: 2, height: 3, marginBottom: 10, borderRadius: 2, overflow: 'hidden' }}>
        {[5, 4, 3, 2, 1].map((sev) => {
          const count = items.filter(i => i.severity === sev).length
          const pct = items.length > 0 ? (count / items.length) * 100 : 0
          const colors: Record<number, string> = { 5: '#FF3040', 4: '#FFB020', 3: '#FFD60A', 2: '#00E676', 1: '#00E676' }
          return <div key={sev} style={{ width: `${pct}%`, background: colors[sev], minWidth: pct > 0 ? 2 : 0, transition: 'width 0.5s' }} />
        })}
      </div>

      {/* Recent high-severity alerts */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.38rem', color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 4 }}>
        HIGH PRIORITY ALERTS
      </div>
      {items.filter(i => i.severity >= 4).slice(0, 4).map((item, i) => (
        <div key={i} style={{
          padding: '4px 6px', marginBottom: 2, borderRadius: 3,
          borderLeft: `2px solid ${SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG]?.color || '#FFB020'}`,
          background: 'rgba(255,255,255,0.01)',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.headline}
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════
export default function LiveIntelDashboard() {
  const [intel, setIntel] = useState<IntelMap>({})
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [breaking, setBreaking] = useState<BreakingItem[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusMap>({})
  const [cycle, setCycle] = useState(0)
  const [modelsUsed, setModelsUsed] = useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = useState<IntelItem | null>(null)
  const [verifications, setVerifications] = useState<Record<string, VerificationResult | { loading: boolean } | { error: boolean }>>({})
  const [leftTab, setLeftTab] = useState<'signals' | 'news' | 'analysis'>('signals')
  const [rightTab, setRightTab] = useState<'telemetry' | 'webcams' | 'console'>('telemetry')
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [rssArticles, setRssArticles] = useState<RSSArticle[]>([])
  const [rssLoading, setRssLoading] = useState(true)
  const managerRef = useRef<AgentManager | null>(null)

  // Live data feeds
  const liveData = useLiveData()

  // SSE connection
  const { connected: sseConnected } = useEventStream()

  // Fetch RSS feeds immediately
  useEffect(() => {
    const fetchRSS = () => {
      fetch('/api/rss?feeds=bbc_me,aljazeera,times_israel,iran_intl,reuters_world,al_monitor,war_zone,breaking_defense,sky_news,guardian_world,cnn_world&limit=60')
        .then((r) => r.json())
        .then((data) => {
          setRssArticles(data.articles || [])
          if (data.articles?.length > 0) {
            setBreaking(data.articles.slice(0, 10).map((a: RSSArticle) => ({
              text: a.title, severity: 3,
              time: a.pubDate ? getTimeAgo(new Date(a.pubDate)) : '',
            })))
          }
          setRssLoading(false)
        })
        .catch(() => setRssLoading(false))
    }
    fetchRSS()
    // Auto-refresh RSS every 2 minutes for more frequent updates
    const interval = setInterval(fetchRSS, 120_000)
    return () => clearInterval(interval)
  }, [])

  // Convert RSS to structured intel
  const rssIntelItems = useMemo(
    () => rssArticles.length > 0 ? extractIntelFromRSS(rssArticles) : [],
    [rssArticles]
  )

  const allItems = useMemo(() => {
    const aiItems = Object.values(intel).flat()
    const combined = [...aiItems, ...rssIntelItems, ...liveData.extractedIntel]
    const seen = new Set<string>()
    return combined
      .filter(item => {
        const key = item.headline.toLowerCase().slice(0, 60)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => (b.severity || 0) - (a.severity || 0))
  }, [intel, rssIntelItems, liveData.extractedIntel])

  const totalItems = allItems.length + rssArticles.length

  // Start agent manager
  useEffect(() => {
    const manager = new AgentManager(
      'server-side',
      (data) => {
        setIntel(data.intel || {})
        setAnalysis(data.analysis)
        if (data.breaking?.length) setBreaking(data.breaking)
        setCycle(data.cycle || 0)
        setModelsUsed(data.modelsUsed || [])
      },
      (progress: AgentProgress) => setAgentStatuses((prev) => ({ ...prev, [progress.agentId]: progress })),
      () => {}
    )
    managerRef.current = manager
    manager.start(REFRESH_INTERVAL)
    return () => manager.stop()
  }, [])

  const handleVerify = useCallback(async (item: IntelItem) => {
    const key = `${item.agentId}-${item.headline}`
    setVerifications((prev) => ({ ...prev, [key]: { loading: true } }))
    try {
      const result = await verifyIntel('server-side', item)
      setVerifications((prev) => ({ ...prev, [key]: result || { error: true } }))
    } catch {
      setVerifications((prev) => ({ ...prev, [key]: { error: true } }))
    }
  }, [])

  const handleRefresh = useCallback(() => { managerRef.current?.manualRefresh() }, [])
  const selectedKey = selectedEvent ? `${selectedEvent.agentId}-${selectedEvent.headline}` : null
  const isScanning = Object.values(agentStatuses).some((s) => s?.status === 'running')

  // Responsive
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) { setLeftOpen(false); setRightOpen(false) }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const leftW = leftOpen ? (isMobile ? Math.min(window.innerWidth * 0.85, 400) : 400) : 0
  const rightW = rightOpen ? (isMobile ? Math.min(window.innerWidth * 0.85, 320) : 320) : 0

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Subtle scanline overlay */}
      <div className="scanline-overlay" />

      {/* Command bar */}
      <CommandBar
        status={isScanning ? 'running' : 'idle'}
        cycle={cycle}
        totalItems={totalItems}
        modelsActive={modelsUsed.length || AI_MODELS.length}
        onRefresh={handleRefresh}
        aircraftCount={liveData.aircraft.length}
        fireCount={liveData.fires.length}
        sseConnected={sseConnected}
      />

      {/* 3D Globe — full background */}
      <div className="absolute inset-0 z-[1]" style={{ top: 40, bottom: 26 }}>
        <Globe3D
          intelItems={allItems}
          onSelectEvent={setSelectedEvent}
          selectedEvent={selectedEvent}
          aircraft={liveData.aircraft}
          fires={liveData.fires}
        />
      </div>

      {/* ── Left Panel: Intel Feed ── */}
      <div style={{
        position: 'absolute', top: 40, left: 0, bottom: 26, zIndex: 100,
        width: leftW, transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Toggle button */}
        <button onClick={() => setLeftOpen(!leftOpen)} style={{
          position: 'absolute', top: 10, right: leftOpen ? -20 : -28,
          width: 20, height: 40, zIndex: 10, background: 'rgba(5,10,18,0.92)',
          border: '1px solid rgba(0,229,255,0.08)', borderRadius: '0 4px 4px 0',
          color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.55rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          {leftOpen ? '◀' : '▶'}
        </button>

        {leftOpen && (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(90deg, rgba(5,10,18,0.94) 0%, rgba(5,10,18,0.90) 80%, rgba(5,10,18,0) 100%)',
            backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(0,229,255,0.04)',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid rgba(0,229,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '0.55rem', letterSpacing: 4, color: 'var(--accent)' }}>
                LIVE INTEL FEED
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.42rem', color: 'var(--text-dim)', letterSpacing: 1 }}>
                REAL-TIME
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {[
                { id: 'signals', label: 'SIGNALS', count: allItems.length },
                { id: 'news', label: 'NEWS', count: rssArticles.length },
                { id: 'analysis', label: 'ANALYSIS', count: undefined },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setLeftTab(tab.id as typeof leftTab)} style={{
                  flex: 1, padding: '7px 0', fontFamily: 'var(--mono)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: 2,
                  color: leftTab === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: leftTab === tab.id ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'color 0.15s',
                }}>
                  {tab.label}
                  {tab.count != null && (
                    <span style={{ marginLeft: 4, fontSize: '0.42rem', opacity: 0.7 }}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Agent status */}
            <AgentStatusGrid agentStatuses={agentStatuses} />

            {/* Content area */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {leftTab === 'signals' && (
                <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                  {allItems.length === 0 && rssLoading && (
                    <div style={{ padding: 30, textAlign: 'center' }}>
                      <div className="spin-loading" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
                        LOADING INTELLIGENCE...
                      </div>
                    </div>
                  )}
                  {allItems.length === 0 && !rssLoading && (
                    <div style={{ padding: 30, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
                        NO SIGNALS DETECTED
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.45rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        Switch to NEWS tab for all articles
                      </div>
                    </div>
                  )}
                  {allItems.map((item, i) => (
                    <EventCard
                      key={`${item.agentId}-${i}`}
                      item={item}
                      index={i}
                      onClick={setSelectedEvent}
                      isSelected={selectedEvent?.headline === item.headline && selectedEvent?.agentId === item.agentId}
                    />
                  ))}
                </div>
              )}

              {leftTab === 'news' && (
                <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                  {rssLoading ? (
                    <div style={{ padding: 30, textAlign: 'center' }}>
                      <div className="spin-loading" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
                        LOADING RSS...
                      </div>
                    </div>
                  ) : rssArticles.map((article, i) => (
                    <RSSCard key={i} article={article} index={i} />
                  ))}
                </div>
              )}

              {leftTab === 'analysis' && (
                <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                  {analysis ? (
                    <AnalysisPanel analysis={analysis} />
                  ) : (
                    <div style={{ padding: 30, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 2 }}>
                      {allItems.length > 0 ? 'ANALYZING...' : 'WAITING FOR DATA...'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Telemetry + Webcams + Console ── */}
      <div style={{
        position: 'absolute', top: 40, right: 0, bottom: 26, zIndex: 100,
        width: rightW, transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Toggle button */}
        <button onClick={() => setRightOpen(!rightOpen)} style={{
          position: 'absolute', top: 10, left: rightOpen ? -20 : -28,
          width: 20, height: 40, zIndex: 10, background: 'rgba(5,10,18,0.92)',
          border: '1px solid rgba(0,229,255,0.08)', borderRadius: '4px 0 0 4px',
          color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '0.55rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          {rightOpen ? '▶' : '◀'}
        </button>

        {rightOpen && (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(270deg, rgba(5,10,18,0.94) 0%, rgba(5,10,18,0.90) 80%, rgba(5,10,18,0) 100%)',
            backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(0,229,255,0.04)',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid rgba(0,229,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '0.55rem', letterSpacing: 4, color: 'var(--accent)' }}>
                MONITORING
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '0.4rem', color: '#00E676', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00E676', animation: 'pulse 2s ease infinite' }} />
                ONLINE
              </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {[
                { id: 'telemetry', label: 'TELEMETRY' },
                { id: 'webcams', label: 'WEBCAMS' },
                { id: 'console', label: 'CONSOLE' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setRightTab(tab.id as typeof rightTab)} style={{
                  flex: 1, padding: '7px 0', fontFamily: 'var(--mono)', fontSize: '0.45rem', fontWeight: 700, letterSpacing: 2,
                  color: rightTab === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: rightTab === tab.id ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'color 0.15s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {rightTab === 'telemetry' && (
                <TelemetryPanel items={allItems} liveData={liveData} />
              )}
              {rightTab === 'webcams' && <WebcamsPanel />}
              {rightTab === 'console' && (
                <ConsoleLogs items={allItems} agentStatuses={agentStatuses} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            item={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onVerify={handleVerify}
            verification={selectedKey ? verifications[selectedKey] : null}
          />
        )}
      </AnimatePresence>

      {/* Breaking ticker */}
      <BreakingTicker items={breaking} />
    </div>
  )
}
