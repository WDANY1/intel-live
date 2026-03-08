// ============================================================
// INTEL LIVE — Real Data Integration Services (Phase 3)
// ============================================================
// Free APIs: OpenSky Network, NASA FIRMS, NASA EONET, GDELT
// ============================================================

import type {
  AircraftPosition,
  FireHotspot,
  NaturalEvent,
  GDELTEvent,
} from './types'

// ── Region bounding boxes for Middle East / conflict zone ──
const MIDDLE_EAST_BBOX = {
  latMin: 12,
  latMax: 42,
  lngMin: 25,
  lngMax: 65,
}

// Known military/government ICAO hex prefixes (partial list)
const MILITARY_ICAO_PREFIXES = [
  'AE', // USA military (USAF, etc.)
  '43', // Israel (4X)
  '73', // Iran
  '74', // Iraq
  '71', // Syria
  '70', // Lebanon
  '50', // Saudi Arabia
  '60', // Turkey
]

function classifyAircraft(icao24: string, callsign: string, origin: string): AircraftPosition['category'] {
  const cs = (callsign || '').trim().toUpperCase()
  const icaoUpper = (icao24 || '').toUpperCase()

  // US military callsigns
  if (/^(RCH|REACH|EVAC|MC|JAKE|NAVY|DUKE|DOOM|VIPER|COBRA|TOPCAT|EXPO|IRON|STEEL|FORTE|HOMER|LAGR|DRAKE|GORDO)/i.test(cs)) return 'military'
  // NATO / mil callsigns
  if (/^(NATO|MMF|IAM|GAF|RRR|ASY|CFC|RFR|BAF|CASA)/i.test(cs)) return 'military'
  // ICAO prefix check
  if (MILITARY_ICAO_PREFIXES.some(p => icaoUpper.startsWith(p))) return 'government'
  // Israeli Air Force
  if (origin === 'Israel') return 'government'

  return 'civilian'
}

// ── OpenSky Network: Real aircraft tracking ──
export async function fetchAircraft(): Promise<AircraftPosition[]> {
  const { latMin, latMax, lngMin, lngMax } = MIDDLE_EAST_BBOX
  const url = `https://opensky-network.org/api/states/all?lamin=${latMin}&lomin=${lngMin}&lamax=${latMax}&lomax=${lngMax}`

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error(`OpenSky API error: ${res.status}`)
      return []
    }

    const data = await res.json()
    if (!data.states) return []

    return data.states
      .filter((s: any[]) => s[5] != null && s[6] != null) // must have lat/lng
      .map((s: any[]): AircraftPosition => ({
        icao24: s[0],
        callsign: (s[1] || '').trim(),
        originCountry: s[2],
        lat: s[6],
        lng: s[5],
        altitude: s[7] || s[13] || 0,
        velocity: s[9] || 0,
        heading: s[10] || 0,
        onGround: s[8],
        lastContact: s[4],
        category: classifyAircraft(s[0], s[1], s[2]),
      }))
  } catch (err) {
    console.error('OpenSky fetch error:', err)
    return []
  }
}

// ── NASA FIRMS: Satellite fire/hotspot detection ──
export async function fetchFires(): Promise<FireHotspot[]> {
  // FIRMS VIIRS data for last 24h — covers entire Middle East region
  // Using the open CSV endpoint (no API key needed for VIIRS_SNPP_NRT)
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/OPEN_KEY/VIIRS_SNPP_NRT/world/1`

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })

    if (!res.ok) {
      // Fallback to MODIS
      return fetchFiresFallback()
    }

    const text = await res.text()
    const lines = text.split('\n')
    const header = lines[0].split(',')

    const latIdx = header.indexOf('latitude')
    const lngIdx = header.indexOf('longitude')
    const brightIdx = header.indexOf('bright_ti4')
    const scanIdx = header.indexOf('scan')
    const trackIdx = header.indexOf('track')
    const dateIdx = header.indexOf('acq_date')
    const timeIdx = header.indexOf('acq_time')
    const satIdx = header.indexOf('satellite')
    const confIdx = header.indexOf('confidence')
    const frpIdx = header.indexOf('frp')
    const dnIdx = header.indexOf('daynight')

    const { latMin, latMax, lngMin, lngMax } = MIDDLE_EAST_BBOX

    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const cols = line.split(',')
        const lat = parseFloat(cols[latIdx])
        const lng = parseFloat(cols[lngIdx])
        return { lat, lng, cols }
      })
      .filter(({ lat, lng }) =>
        lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax
      )
      .map(({ lat, lng, cols }): FireHotspot => ({
        lat,
        lng,
        brightness: parseFloat(cols[brightIdx]) || 0,
        scan: parseFloat(cols[scanIdx]) || 0,
        track: parseFloat(cols[trackIdx]) || 0,
        acqDate: cols[dateIdx] || '',
        acqTime: cols[timeIdx] || '',
        satellite: cols[satIdx] || 'VIIRS',
        confidence: cols[confIdx] || 'nominal',
        frp: parseFloat(cols[frpIdx]) || 0,
        dayNight: (cols[dnIdx] || 'D') as 'D' | 'N',
      }))
      .slice(0, 500) // limit to 500 hotspots
  } catch (err) {
    console.error('FIRMS fetch error:', err)
    return fetchFiresFallback()
  }
}

async function fetchFiresFallback(): Promise<FireHotspot[]> {
  // Fallback: NASA EONET wildfires category
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&days=2&limit=50', {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const { latMin, latMax, lngMin, lngMax } = MIDDLE_EAST_BBOX

    return (data.events || [])
      .filter((e: any) => e.geometry?.length > 0)
      .map((e: any) => {
        const geo = e.geometry[e.geometry.length - 1]
        return {
          lat: geo.coordinates[1],
          lng: geo.coordinates[0],
          brightness: 400,
          scan: 1,
          track: 1,
          acqDate: geo.date?.split('T')[0] || '',
          acqTime: geo.date?.split('T')[1]?.substring(0, 4) || '',
          satellite: 'EONET',
          confidence: 'high',
          frp: 50,
          dayNight: 'D' as const,
        }
      })
      .filter((f: FireHotspot) =>
        f.lat >= latMin && f.lat <= latMax && f.lng >= lngMin && f.lng <= lngMax
      )
  } catch {
    return []
  }
}

// ── NASA EONET: Natural events (volcanoes, storms, etc.) ──
export async function fetchNaturalEvents(): Promise<NaturalEvent[]> {
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?days=7&limit=50', {
      next: { revalidate: 600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.events || []).map((e: any): NaturalEvent => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      link: e.link || '',
      categories: e.categories || [],
      sources: e.sources || [],
      geometry: e.geometry || [],
      closed: e.closed || null,
    }))
  } catch (err) {
    console.error('EONET fetch error:', err)
    return []
  }
}

// ── GDELT: Global event database ──
export async function fetchGDELTEvents(): Promise<GDELTEvent[]> {
  // GDELT GKG API — query conflict events in Middle East
  const query = encodeURIComponent('(Iran OR Israel OR "United States" OR Syria OR Lebanon OR Yemen OR Hezbollah OR Hamas) (military OR missile OR attack OR strike OR nuclear)')
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=50&format=json&timespan=24h`

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()

    if (!data.articles) return []

    return data.articles
      .filter((a: any) => a.seendate)
      .slice(0, 30)
      .map((a: any, i: number): GDELTEvent => ({
        globaleventid: `gdelt-${Date.now()}-${i}`,
        dateadded: a.seendate || '',
        actor1name: a.sourcecountry || '',
        actor2name: '',
        actor1countrycode: '',
        actor2countrycode: '',
        eventcode: '',
        goldsteinscale: a.tone ? parseFloat(String(a.tone).split(',')[0]) || 0 : 0,
        nummentions: 1,
        avgtone: a.tone ? parseFloat(String(a.tone).split(',')[0]) || 0 : 0,
        lat: 0,
        lng: 0,
        sourceurl: a.url || '',
      }))
  } catch (err) {
    console.error('GDELT fetch error:', err)
    return []
  }
}
