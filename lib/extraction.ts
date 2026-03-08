// ============================================================
// INTEL LIVE — Structured Event Extraction (Phase 5)
// Extracts structured intelligence from RSS articles
// ============================================================

import type { RSSArticle, IntelItem, AgentId, SeverityLevel } from './types'
import { isDuplicate } from './cache'

// ── Keyword-based severity classification ──
const SEVERITY_KEYWORDS: Record<number, string[]> = {
  5: ['nuclear', 'nuke', 'atomic', 'wmd', 'ballistic missile launch', 'war declared', 'invasion', 'mass casualty'],
  4: ['missile strike', 'airstrike', 'bombing', 'explosion', 'killed', 'casualties', 'shot down', 'intercept', 'iron dome', 'retali'],
  3: ['military', 'troops', 'deployment', 'sanctions', 'drone', 'navy', 'aircraft carrier', 'uranium', 'enrichment', 'hezbollah', 'hamas'],
  2: ['diplomatic', 'talks', 'summit', 'agreement', 'ceasefire', 'negotiations', 'UN', 'IAEA'],
  1: ['statement', 'comment', 'report', 'analysis', 'opinion'],
}

// ── Agent routing by content ──
const AGENT_KEYWORDS: Record<AgentId, string[]> = {
  sigint: ['intercept', 'signal', 'communication', 'surveillance', 'radar', 'satellite', 'electronic', 'jamming', 'cyber'],
  osint: ['social media', 'video', 'photo', 'footage', 'confirmed', 'reported', 'breaking'],
  humint: ['source', 'official', 'spokesperson', 'leaked', 'insider', 'intelligence official'],
  geoint: ['map', 'satellite image', 'movement', 'deploy', 'border', 'territory', 'base', 'airfield'],
  econint: ['oil', 'sanctions', 'economy', 'trade', 'currency', 'stock', 'price', 'GDP', 'inflation'],
  proxy: ['hezbollah', 'hamas', 'houthi', 'militia', 'proxy', 'pmu', 'quds', 'irgc'],
  diplo: ['diplomat', 'ambassador', 'UN', 'security council', 'summit', 'treaty', 'agreement', 'talk'],
}

// ── Location extraction from text ──
const LOCATION_PATTERNS: Record<string, string> = {
  'tehran': 'Tehran, Iran',
  'isfahan': 'Isfahan, Iran',
  'natanz': 'Natanz, Iran',
  'bushehr': 'Bushehr, Iran',
  'jerusalem': 'Jerusalem',
  'tel aviv': 'Tel Aviv, Israel',
  'gaza': 'Gaza',
  'west bank': 'West Bank',
  'beirut': 'Beirut, Lebanon',
  'damascus': 'Damascus, Syria',
  'baghdad': 'Baghdad, Iraq',
  'sanaa': "Sana'a, Yemen",
  'riyadh': 'Riyadh, Saudi Arabia',
  'dubai': 'Dubai, UAE',
  'doha': 'Doha, Qatar',
  'strait of hormuz': 'Strait of Hormuz',
  'red sea': 'Red Sea',
  'suez': 'Suez Canal',
  'iran': 'Iran',
  'israel': 'Israel',
  'syria': 'Syria',
  'lebanon': 'Lebanon',
  'iraq': 'Iraq',
  'yemen': 'Yemen',
  'saudi': 'Saudi Arabia',
}

function classifySeverity(text: string): SeverityLevel {
  const lower = text.toLowerCase()
  for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    if (keywords.some(kw => lower.includes(kw))) {
      return Number(level) as SeverityLevel
    }
  }
  return 2
}

function classifyAgent(text: string): AgentId {
  const lower = text.toLowerCase()
  let bestAgent: AgentId = 'osint'
  let bestScore = 0

  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestAgent = agentId as AgentId
    }
  }
  return bestAgent
}

function extractLocation(text: string): string {
  const lower = text.toLowerCase()
  for (const [pattern, location] of Object.entries(LOCATION_PATTERNS)) {
    if (lower.includes(pattern)) return location
  }
  return 'Middle East'
}

function getTimeAgo(pubDate: string): string {
  const d = new Date(pubDate)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Main extraction function ──
export function extractIntelFromRSS(articles: RSSArticle[]): IntelItem[] {
  const items: IntelItem[] = []

  for (const article of articles) {
    const text = `${article.title} ${article.description || ''}`

    // Skip if duplicate
    if (isDuplicate(article.title)) continue

    // Check relevance — must mention conflict-related terms
    const relevant = /iran|israel|gaza|hezbollah|hamas|houthi|irgc|missile|strike|nuclear|military|pentagon|idf|centcom/i.test(text)
    if (!relevant) continue

    const severity = classifySeverity(text)
    const agentId = classifyAgent(text)
    const location = extractLocation(text)

    items.push({
      headline: article.title.slice(0, 150),
      summary: (article.description || article.title).slice(0, 300),
      source: article.source || 'RSS',
      time: article.pubDate ? getTimeAgo(article.pubDate) : 'recent',
      severity,
      verified: true, // from established news source
      location,
      agentId,
      category: agentId.toUpperCase(),
      categoryFull: `Auto-extracted ${agentId.toUpperCase()} intelligence`,
      fetchedAt: Date.now(),
      aiModel: 'extraction',
      aiModelName: 'RSS Extraction',
      image: article.image || undefined,
    })
  }

  return items.sort((a, b) => b.severity - a.severity)
}

// ── Semantic deduplication (simple token overlap) ──
export function deduplicateIntel(items: IntelItem[]): IntelItem[] {
  const seen: { tokens: Set<string>; item: IntelItem }[] = []

  return items.filter(item => {
    const tokens = new Set(
      item.headline.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    )

    // Check against already seen items
    for (const existing of seen) {
      const overlap = [...tokens].filter(t => existing.tokens.has(t)).length
      const similarity = overlap / Math.max(tokens.size, existing.tokens.size)
      if (similarity > 0.6) return false // too similar
    }

    seen.push({ tokens, item })
    return true
  })
}
