import { VerifiedEvent, PipelineStats } from './types'

// ─── In-Memory Store ─────────────────────────────────────────────────────────
// On Vercel serverless, memory is per-instance. The cron job refills on each run.
// For persistence across instances, set KV_REST_API_URL + KV_REST_API_TOKEN.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_EVENTS = 60
const TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

interface Store {
  events: VerifiedEvent[]
  lastRunAt: string | null
  lastStats: PipelineStats | null
}

// Global singleton — shared across requests within same serverless instance
const store: Store = {
  events: [],
  lastRunAt: null,
  lastStats: null,
}

// ─── Vercel KV helpers (optional) ────────────────────────────────────────────
async function kvGet<T>(key: string): Promise<T | null> {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const { result } = await res.json()
    return result ? JSON.parse(result) : null
  } catch {
    return null
  }
}

async function kvSet(key: string, value: unknown, exSeconds = 172800): Promise<void> {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value), ex: exSeconds }),
    })
  } catch {
    // silent fail — fallback to in-memory
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getEvents(limit = 50): Promise<VerifiedEvent[]> {
  // Try KV first
  const kv = await kvGet<VerifiedEvent[]>('intel:events')
  if (kv && kv.length > 0) {
    store.events = kv
  }
  return store.events.slice(0, limit)
}

export async function saveEvents(newEvents: VerifiedEvent[]): Promise<void> {
  const now = Date.now()
  const cutoff = now - TTL_MS

  // Merge + deduplicate by id
  const existing = store.events.filter(e => new Date(e.createdAt).getTime() > cutoff)
  const existingIds = new Set(existing.map(e => e.id))
  const fresh = newEvents.filter(e => !existingIds.has(e.id))

  const merged = [...fresh, ...existing]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_EVENTS)

  store.events = merged
  await kvSet('intel:events', merged)
}

export async function getStats(): Promise<{
  total: number
  verified: number
  critical: number
  lastRunAt: string | null
}> {
  const events = await getEvents()
  return {
    total: events.length,
    verified: events.filter(e => e.status === 'VERIFIED').length,
    critical: events.filter(e => e.severity === 'CRITICAL').length,
    lastRunAt: store.lastRunAt,
  }
}

export function recordPipelineRun(stats: PipelineStats): void {
  store.lastRunAt = stats.runAt
  store.lastStats = stats
}

// Returns true if last pipeline run was >10 minutes ago (or never ran)
export function isStale(): boolean {
  if (!store.lastRunAt) return true
  return Date.now() - new Date(store.lastRunAt).getTime() > 10 * 60 * 1000
}
