export type Tier = 1 | 2 | 3
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type EventStatus = 'VERIFIED' | 'PROBABLE' | 'DEVELOPING' | 'UNVERIFIED'
export type SeverityColor = 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE'
export type EventCategory = 'STRIKE' | 'MOVEMENT' | 'DIPLOMATIC' | 'INTELLIGENCE' | 'OTHER'

export interface Source {
  handle: string
  name: string
  tier: Tier
  rssUrl?: string
  nitterBase?: string
}

export interface RawArticle {
  id: string
  title: string
  content: string
  url: string
  publishedAt: string
  sourceHandle: string
  sourceTier: Tier
  fetchedAt: string
}

export interface EventSource {
  handle: string
  tier: Tier
  url: string
  quote: string
}

export interface VerifiedEvent {
  id: string
  createdAt: string
  headline: string
  summary: string
  locationName: string
  latitude: number
  longitude: number
  country: string
  region: string
  severity: Severity
  severityColor: SeverityColor
  category: EventCategory
  sources: EventSource[]
  confidenceScore: number
  status: EventStatus
  tags: string[]
  perspective: {
    sideA: string
    sideB: string
    neutral: string
  }
}

export interface PipelineStats {
  fetched: number
  filtered: number
  clustered: number
  published: number
  errors: string[]
  runAt: string
}
