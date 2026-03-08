// ============================================================
// INTEL LIVE — Client-side hook for real-time data feeds
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AircraftPosition, FireHotspot, NaturalEvent, GDELTEvent, IntelItem } from './types'

interface LiveData {
  aircraft: AircraftPosition[]
  fires: FireHotspot[]
  naturalEvents: NaturalEvent[]
  gdeltEvents: GDELTEvent[]
  extractedIntel: IntelItem[]
  loading: boolean
  errors: Record<string, string>
  lastUpdated: Record<string, number>
  refresh: () => void
}

const INTERVALS = {
  aircraft: 30_000,   // 30s
  fires: 300_000,     // 5min
  events: 300_000,    // 5min
}

export function useLiveData(): LiveData {
  const [aircraft, setAircraft] = useState<AircraftPosition[]>([])
  const [fires, setFires] = useState<FireHotspot[]>([])
  const [naturalEvents, setNaturalEvents] = useState<NaturalEvent[]>([])
  const [gdeltEvents, setGdeltEvents] = useState<GDELTEvent[]>([])
  const [extractedIntel, setExtractedIntel] = useState<IntelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({})
  const intervalsRef = useRef<NodeJS.Timeout[]>([])

  const fetchAircraft = useCallback(async () => {
    try {
      const res = await fetch('/api/opensky')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setAircraft(data.aircraft || [])
      setLastUpdated(prev => ({ ...prev, aircraft: Date.now() }))
      setErrors(prev => { const n = { ...prev }; delete n.aircraft; return n })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, aircraft: err.message }))
    }
  }, [])

  const fetchFires = useCallback(async () => {
    try {
      const res = await fetch('/api/firms')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setFires(data.hotspots || [])
      setLastUpdated(prev => ({ ...prev, fires: Date.now() }))
      setErrors(prev => { const n = { ...prev }; delete n.fires; return n })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, fires: err.message }))
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setNaturalEvents(data.natural?.events || [])
      setGdeltEvents(data.gdelt?.events || [])
      setLastUpdated(prev => ({ ...prev, events: Date.now() }))
      setErrors(prev => { const n = { ...prev }; delete n.events; return n })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, events: err.message }))
    }
  }, [])

  const fetchExtracted = useCallback(async () => {
    try {
      const res = await fetch('/api/extract')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setExtractedIntel(data.intel || [])
      setLastUpdated(prev => ({ ...prev, extracted: Date.now() }))
      setErrors(prev => { const n = { ...prev }; delete n.extracted; return n })
    } catch (err: any) {
      setErrors(prev => ({ ...prev, extracted: err.message }))
    }
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.allSettled([fetchAircraft(), fetchFires(), fetchEvents(), fetchExtracted()])
      .finally(() => setLoading(false))
  }, [fetchAircraft, fetchFires, fetchEvents, fetchExtracted])

  useEffect(() => {
    // Initial fetch
    refresh()

    // Set up intervals
    intervalsRef.current = [
      setInterval(fetchAircraft, INTERVALS.aircraft),
      setInterval(fetchFires, INTERVALS.fires),
      setInterval(fetchEvents, INTERVALS.events),
      setInterval(fetchExtracted, 180_000), // 3 min
    ]

    return () => {
      intervalsRef.current.forEach(clearInterval)
    }
  }, [refresh, fetchAircraft, fetchFires, fetchEvents, fetchExtracted])

  return { aircraft, fires, naturalEvents, gdeltEvents, extractedIntel, loading, errors, lastUpdated, refresh }
}
