// ============================================================
// API Route: /api/intel — Paginated intel events
// Returns current intel with cursor-based pagination
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { eventStore } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

// In-memory store for accumulated intel items
// (shared with SSE stream via eventStore)
const PAGE_SIZE = 25

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = parseInt(searchParams.get('cursor') || '0', 10)
    const limit  = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE), 10), 100)
    const minSev = parseInt(searchParams.get('severity') || '1', 10)
    const agent  = searchParams.get('agent') || ''

    // Pull intel events from event store
    const allEvents = eventStore.getRecent()
      .filter(e => e.type === 'intel')
      .map(e => e.data)
      .filter(Boolean)
      .filter((item: any) => item.severity >= minSev)
      .filter((item: any) => !agent || item.agentId === agent)

    // Paginate
    const total  = allEvents.length
    const sliced = allEvents.slice(cursor, cursor + limit)
    const nextCursor = cursor + limit < total ? cursor + limit : null

    return NextResponse.json({
      items:      sliced,
      total,
      cursor,
      nextCursor,
      hasMore:    nextCursor !== null,
      timestamp:  Date.now(),
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Total-Count': String(total),
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch intel', details: err.message },
      { status: 500 }
    )
  }
}
