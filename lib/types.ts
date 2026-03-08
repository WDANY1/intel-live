// ============================================================
// INTEL LIVE — TypeScript Type Definitions
// ============================================================

export type SeverityLevel = 1 | 2 | 3 | 4 | 5

export type AgentId = 'sigint' | 'osint' | 'humint' | 'geoint' | 'econint' | 'proxy' | 'diplo'

export type AgentStatus = 'pending' | 'running' | 'done' | 'error'

export type VerificationConsensus = 'UNANIM CONFIRMAT' | 'PARȚIAL CONFIRMAT' | 'NECONFIRMAT'

// ── Intelligence item from agents ──
export interface IntelItem {
  headline: string
  summary: string
  source: string
  time: string
  severity: SeverityLevel
  verified: boolean
  location: string
  agentId: AgentId
  category: string
  categoryFull: string
  fetchedAt: number
  aiModel: string
  aiModelName: string
  image?: string
}

// ── Deep analysis report ──
export interface AnalysisResult {
  threat_level: number
  threat_label: string
  situation_summary: string
  timeline_last_24h: string[]
  next_hours_prediction: string
  next_days_prediction: string
  key_risks: string[]
  escalation_probability: number
  nuclear_risk: number
  oil_impact: string
  proxy_status: string
  diplomatic_status: string
  civilian_impact: string
  breaking_alerts: string[]
  recommendation: string
  _analysisModel: string
}

// ── Breaking ticker item ──
export interface BreakingItem {
  text?: string
  title?: string
  severity: SeverityLevel
  time?: string
  pubDate?: string
}

// ── RSS article ──
export interface RSSArticle {
  title: string
  description: string
  link: string
  pubDate: string
  image: string | null
  source: string
}

// ── Agent progress update ──
export interface AgentProgress {
  agentId: AgentId
  status: AgentStatus
  message: string
  count?: number
}

// ── Agent status map ──
export type AgentStatusMap = Partial<Record<AgentId, AgentProgress>>

// ── Intel result map (per agent) ──
export type IntelMap = Partial<Record<AgentId, IntelItem[]>>

// ── Agent manager update payload ──
export interface AgentUpdatePayload {
  intel: IntelMap
  analysis: AnalysisResult | null
  breaking: BreakingItem[]
  timestamp: number
  cycle: number
  modelsUsed: string[]
}

// ── Log entry ──
export interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'system'
}

// ── Verification result ──
export interface VerificationResult {
  verified: boolean
  confidence: number
  corroborating_sources: string[]
  notes: string
  crossVerification: {
    modelsQueried: number
    modelsResponded: number
    modelsConfirmed: number
    modelNames: string[]
    consensus: VerificationConsensus
  }
}

// ── AI Model definition ──
export interface AIModel {
  id: string
  name: string
  provider: string
  color: string
  icon: string
  strength: string
  contextWindow: number
}

// ── Agent definition ──
export interface Agent {
  id: AgentId
  name: string
  fullName: string
  icon: string
  color: string
  description: string
  queries: string[]
  interval: number
  sources: string[]
}

// ── OSINT source ──
export interface OSINTSource {
  handle: string
  name: string
  tier: 0 | 1 | 2
  focus: string
}

// ── News channel ──
export interface NewsChannel {
  name: string
  type: 'wire' | 'tv' | 'news' | 'defense'
  region: string
  url: string
}

// ── Webcam ──
export interface WebcamFeed {
  id: string
  name: string
  city: string
  country: string
  flag: string
  region: string
}

// ── Globe event point ──
export interface GlobeEventPoint {
  lat: number
  lng: number
  color: string
  size: number
  altitude: number
  item: IntelItem
  label: string
}

// ── Strategic base ──
export interface StrategicBase {
  lat: number
  lng: number
  name: string
  type: string
  color: string
  size: number
  label?: boolean
}

// ── Conflict arc ──
export interface ConflictArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string[]
  label: string
  stroke: number
}
