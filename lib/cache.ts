// ============================================================
// INTEL LIVE — Server-side caching layer (Phase 4)
// Works without external dependencies — in-memory with TTL
// Optional Upstash Redis if UPSTASH_REDIS_REST_URL is set
// ============================================================

interface CacheEntry<T> {
  data: T
  ts: number
  ttl: number
}

class IntelCache {
  private store = new Map<string, CacheEntry<any>>()
  private maxEntries = 500

  set<T>(key: string, data: T, ttlMs: number = 60_000): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldest = [...this.store.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) this.store.delete(oldest[0])
    }
    this.store.set(key, { data, ts: Date.now(), ttl: ttlMs })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > entry.ttl) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  stats(): { size: number; keys: string[] } {
    // Clean expired entries
    for (const [key, entry] of this.store.entries()) {
      if (Date.now() - entry.ts > entry.ttl) this.store.delete(key)
    }
    return { size: this.store.size, keys: [...this.store.keys()] }
  }
}

// Singleton
export const cache = new IntelCache()

// ── Deduplication helper ──
const seenHeadlines = new Map<string, number>()
const DEDUP_WINDOW = 3600_000 // 1 hour

export function isDuplicate(headline: string): boolean {
  const key = headline.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '')
  const now = Date.now()

  // Clean old entries
  if (seenHeadlines.size > 1000) {
    for (const [k, ts] of seenHeadlines.entries()) {
      if (now - ts > DEDUP_WINDOW) seenHeadlines.delete(k)
    }
  }

  if (seenHeadlines.has(key)) return true
  seenHeadlines.set(key, now)
  return false
}

// ── Rate limiter ──
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimits.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

// ── Event store for SSE ──
interface StoredEvent {
  id: string
  type: string
  data: any
  ts: number
}

class EventStore {
  private events: StoredEvent[] = []
  private maxEvents = 200
  private listeners = new Set<(event: StoredEvent) => void>()

  push(type: string, data: any): void {
    const event: StoredEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      data,
      ts: Date.now(),
    }
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
    // Notify listeners
    for (const listener of this.listeners) {
      try { listener(event) } catch {}
    }
  }

  subscribe(listener: (event: StoredEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getRecent(since?: number): StoredEvent[] {
    if (!since) return this.events.slice(-50)
    return this.events.filter(e => e.ts > since)
  }
}

export const eventStore = new EventStore()
