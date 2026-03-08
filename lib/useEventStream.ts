// ============================================================
// INTEL LIVE — Client-side SSE hook for real-time updates
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react'

interface StreamEvent {
  id: string
  type: string
  data: any
  ts: number
}

interface UseEventStreamOptions {
  onEvent?: (event: StreamEvent) => void
  enabled?: boolean
}

export function useEventStream({ onEvent, enabled = true }: UseEventStreamOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null)
  const [eventCount, setEventCount] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource('/api/stream')
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setConnected(true)
    })

    es.addEventListener('intel_update', (e) => {
      const event: StreamEvent = { id: e.lastEventId, type: 'intel_update', data: JSON.parse(e.data), ts: Date.now() }
      setLastEvent(event)
      setEventCount(c => c + 1)
      onEvent?.(event)
    })

    es.addEventListener('aircraft_alert', (e) => {
      const event: StreamEvent = { id: e.lastEventId, type: 'aircraft_alert', data: JSON.parse(e.data), ts: Date.now() }
      setLastEvent(event)
      setEventCount(c => c + 1)
      onEvent?.(event)
    })

    es.addEventListener('fire_alert', (e) => {
      const event: StreamEvent = { id: e.lastEventId, type: 'fire_alert', data: JSON.parse(e.data), ts: Date.now() }
      setLastEvent(event)
      setEventCount(c => c + 1)
      onEvent?.(event)
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      // Reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }
  }, [onEvent])

  useEffect(() => {
    if (!enabled) return

    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connect])

  return { connected, lastEvent, eventCount }
}
