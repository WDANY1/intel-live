import { NextRequest, NextResponse } from 'next/server'
import { getEvents, getStats, isStale } from '@/lib/storage'
import { MOCK_EVENTS } from '@/lib/mockData'

export const runtime = 'nodejs'
export const revalidate = 0

// Prevent concurrent pipeline runs
let running = false

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 60)

  let events = await getEvents(limit)

  // Auto-trigger pipeline in background if data is stale (>10 min)
  // No external cron needed — self-refreshing on every visitor request
  if (!running && isStale()) {
    running = true
    const base = new URL(req.url).origin
    const secret = process.env.CRON_SECRET || ''
    fetch(`${base}/api/cron/ingest`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
      .catch(() => {})
      .finally(() => { running = false })
  }

  // Fallback to mock data on first load
  if (events.length === 0) {
    events = MOCK_EVENTS.slice(0, limit)
  }

  const stats = await getStats()

  return NextResponse.json(
    { events, stats, timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store, no-cache' } }
  )
}
