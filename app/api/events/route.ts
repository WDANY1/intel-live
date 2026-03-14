import { NextRequest, NextResponse } from 'next/server'
import { getEvents, getStats } from '@/lib/storage'
import { MOCK_EVENTS } from '@/lib/mockData'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 60)

  let events = await getEvents(limit)

  // Return mock data when store is empty (first load / dev)
  if (events.length === 0) {
    events = MOCK_EVENTS.slice(0, limit)
  }

  const stats = await getStats()

  return NextResponse.json(
    { events, stats, timestamp: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
