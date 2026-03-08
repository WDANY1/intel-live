// ============================================================
// API Route: /api/stream — Server-Sent Events for real-time push
// Streams intel updates, aircraft alerts, fire detections
// ============================================================

import { NextRequest } from 'next/server'
import { eventStore } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
      )

      // Send recent events
      const recent = eventStore.getRecent()
      for (const event of recent.slice(-10)) {
        controller.enqueue(
          encoder.encode(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
        )
      }

      // Subscribe to new events
      const unsubscribe = eventStore.subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
          )
        } catch {
          unsubscribe()
        }
      })

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
          unsubscribe()
        }
      }, 30_000)

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
