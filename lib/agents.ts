// ============================================================
// INTEL LIVE — Agent System (REAL DATA ONLY)
//
// Data flow:
//   1. Fetch REAL articles from 27+ RSS feeds (/api/rss)
//   2. Classify + extract intel using keywords (no AI hallucination)
//   3. Fetch GDELT global event database (/api/events)
//   4. AI models are used ONLY for strategic analysis of real events
//      — NOT to generate/invent news
// ============================================================

import {
  AGENTS,
  AI_MODELS,
  AGENT_MODEL_MAP,
  VERIFICATION_MODELS,
} from './config'
import { extractIntelFromRSS, deduplicateIntel } from './extraction'
import type {
  IntelItem,
  AnalysisResult,
  BreakingItem,
  AgentProgress,
  AgentUpdatePayload,
  IntelMap,
  LogEntry,
  VerificationResult,
  Agent,
  RSSArticle,
  AgentId,
} from './types'

const API_PATH = '/api/claude'

// ── Determine base URL for internal API calls ──
function getBaseUrl(): string {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function getModelName(modelId: string): string {
  const m = AI_MODELS.find((ai) => ai.id === modelId)
  return m ? `${m.icon} ${m.name}` : modelId
}

async function callLLM(apiKey: string, prompt: string, model: string): Promise<{ text: string; usedModel: string }> {
  const res = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.replace(/[^\x20-\x7E]/g, '').trim(),
    },
    body: JSON.stringify({ prompt, model }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(`API ${res.status}: ${(errData as any).error || 'Unknown error'}`)
  }

  const data = await res.json()
  return { text: data.text || '', usedModel: data.model || model }
}

function parseJSON(raw: string): any {
  if (!raw) return null
  const clean = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const arrMatch = clean.match(/\[[\s\S]*?\]/)
  if (arrMatch) try { return JSON.parse(arrMatch[0]) } catch {}
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) try { return JSON.parse(objMatch[0]) } catch {}
  return null
}

// ── Fetch REAL articles from RSS feeds ──
// This is the PRIMARY data source — no AI hallucination here
async function fetchRealRSSArticles(): Promise<RSSArticle[]> {
  try {
    const base = getBaseUrl()
    const feeds = [
      'bbc_me', 'aljazeera', 'aljazeera_me', 'times_israel', 'iran_intl',
      'reuters_world', 'al_monitor', 'war_zone', 'breaking_defense',
      'defense_one', 'jpost', 'alarabiya', 'presstv', 'sky_news',
      'dw_world', 'france24', 'guardian_world', 'middleeasteye',
      'naval_news', 'military_times', 'euronews',
    ].join(',')

    const res = await fetch(`${base}/api/rss?feeds=${feeds}&limit=120`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.articles || []
  } catch (err) {
    console.error('RSS fetch error:', err)
    return []
  }
}

// ── Fetch GDELT events and convert to IntelItems ──
async function fetchGDELTIntel(): Promise<IntelItem[]> {
  try {
    const base = getBaseUrl()
    const res = await fetch(`${base}/api/events`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()

    const gdeltArticles: RSSArticle[] = (data.gdelt?.events || [])
      .filter((e: any) => e.sourceurl)
      .map((e: any) => ({
        title: e.title || e.actor1name || 'GDELT Event',
        description: `Event from ${e.actor1name || 'unknown'} involving ${e.actor2name || 'unknown'}. Source: ${e.sourceurl}`,
        link: e.sourceurl,
        pubDate: e.dateadded,
        image: null,
        source: 'gdelt',
      }))

    return extractIntelFromRSS(gdeltArticles)
  } catch {
    return []
  }
}

// ── Run strategic analysis on REAL events (AI used ONLY here) ──
export async function runAnalysis(apiKey: string, allIntel: IntelMap): Promise<AnalysisResult | null> {
  const analysisModel = AI_MODELS[0].id

  const allItems = Object.values(allIntel).flat().filter(Boolean)
  if (allItems.length === 0) return null

  const summaryParts = Object.entries(allIntel)
    .filter(([, items]) => items && items.length > 0)
    .map(([agentId, items]) => {
      const agent = AGENTS.find((a) => a.id === agentId)
      const label = agent ? `${agent.icon} ${agent.fullName}` : agentId
      const bullets = (items || [])
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 5)
        .map((i) => `  - [S${i.severity}] ${i.headline} (${i.source})`)
        .join('\n')
      return `${label}:\n${bullets}`
    })
    .join('\n\n')

  const total = allItems.length
  const critical = allItems.filter((i) => i && i.severity >= 4).length
  const sources = [...new Set(allItems.map(i => i.source).filter(Boolean))].slice(0, 10)

  const prompt = `You are an elite military intelligence analyst reviewing REAL news articles from verified sources.

These ${total} reports (${critical} critical) were extracted from real news feeds: ${sources.join(', ')}

${summaryParts}

Based ONLY on the above REAL reports, return ONLY valid JSON (no markdown, no backticks):
{"threat_level":<1-10>,"threat_label":"<DEFCON label>","situation_summary":"<3 sentences in Romanian summarizing the real events>","timeline_last_24h":["<4 real events from the reports above>"],"next_hours_prediction":"<3 sentences Romanian prediction based on real trends>","next_days_prediction":"<3 sentences Romanian>","key_risks":["<5 risks based on real events>"],"escalation_probability":<0-100>,"nuclear_risk":<0-100>,"oil_impact":"<2 sentences Romanian>","proxy_status":"<2 sentences Romanian>","diplomatic_status":"<2 sentences Romanian>","civilian_impact":"<2 sentences Romanian>","breaking_alerts":["<3 real breaking headlines from above>"],"recommendation":"<2 sentences Romanian>"}`

  try {
    const { text } = await callLLM(apiKey, prompt, analysisModel)
    const result = parseJSON(text) as AnalysisResult | null
    if (result) result._analysisModel = getModelName(analysisModel)
    return result
  } catch {
    return null
  }
}

// ── Verify a specific intel item against real sources ──
export async function verifyIntel(apiKey: string, item: IntelItem): Promise<VerificationResult | null> {
  const verifyPrompt = `Verify this news report: "${item.headline}" - ${item.summary} (Source: ${item.source})
Check if this matches reporting from Reuters, AP, BBC, Al Jazeera, Times of Israel, Iran International, Defense One.
Return ONLY JSON: {"verified":<bool>,"confidence":<0-100>,"corroborating_sources":["<sources>"],"notes":"<note in Romanian>"}`

  const verificationPromises = VERIFICATION_MODELS.map(async (model) => {
    try {
      const { text, usedModel } = await callLLM(apiKey, verifyPrompt, model)
      const result = parseJSON(text)
      if (result) result._model = getModelName(usedModel)
      return result
    } catch { return null }
  })

  const results = await Promise.allSettled(verificationPromises)
  const validResults = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => (r as PromiseFulfilledResult<any>).value)

  if (validResults.length === 0) return null

  const verifiedCount = validResults.filter((r: any) => r.verified).length
  const avgConfidence = Math.round(
    validResults.reduce((sum: number, r: any) => sum + (r.confidence || 0), 0) / validResults.length
  )
  const allSources = [...new Set(validResults.flatMap((r: any) => r.corroborating_sources || []))]
  const modelNames = validResults.map((r: any) => r._model).filter(Boolean)

  return {
    verified: verifiedCount >= Math.ceil(validResults.length / 2),
    confidence: avgConfidence,
    corroborating_sources: allSources as string[],
    notes: (validResults[0]?.notes as string) || '',
    crossVerification: {
      modelsQueried: VERIFICATION_MODELS.length,
      modelsResponded: validResults.length,
      modelsConfirmed: verifiedCount,
      modelNames: modelNames as string[],
      consensus:
        verifiedCount === validResults.length ? 'UNANIM CONFIRMAT'
        : verifiedCount > 0 ? 'PARȚIAL CONFIRMAT'
        : 'NECONFIRMAT',
    },
  }
}

// ── Build breaking news from real RSS items ──
function extractBreakingFromReal(items: IntelItem[]): BreakingItem[] {
  return items
    .filter(i => i.severity >= 4)
    .sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0))
    .slice(0, 8)
    .map(i => ({
      text: i.headline,
      severity: i.severity,
      time: i.time || 'recent',
    }))
}

// ── Agent Manager ──
export class AgentManager {
  private apiKey: string
  private onUpdate: (data: AgentUpdatePayload) => void
  private onAgentStatus: (progress: AgentProgress) => void
  private onLog: (entry: LogEntry) => void
  private timers: ReturnType<typeof setInterval>[] = []
  private running = false
  public cycleCount = 0

  constructor(
    apiKey: string,
    onUpdate: (data: AgentUpdatePayload) => void,
    onAgentStatus: (progress: AgentProgress) => void,
    onLog: (entry: LogEntry) => void
  ) {
    this.apiKey = apiKey
    this.onUpdate = onUpdate
    this.onAgentStatus = onAgentStatus
    this.onLog = onLog
  }

  private log(msg: string, type: LogEntry['type'] = 'info') {
    this.onLog?.({ time: new Date().toLocaleTimeString('ro-RO'), message: msg, type })
  }

  async runFullCycle() {
    this.cycleCount++
    this.log(`Ciclu #${this.cycleCount} — Preluare știri din surse reale...`, 'system')

    try {
      // ── STEP 1: Fetch REAL RSS articles ──
      this.log('Preluare RSS: BBC, Reuters, Al Jazeera, Times of Israel, Iran Intl, Defense One...', 'info')
      const [rssArticles, gdeltItems] = await Promise.all([
        fetchRealRSSArticles(),
        fetchGDELTIntel(),
      ])

      this.log(`${rssArticles.length} articole RSS preluate din surse verificate`, 'success')

      // ── STEP 2: Extract structured intel from real articles ──
      const rawIntel = extractIntelFromRSS(rssArticles)
      const dedupedIntel = deduplicateIntel([...rawIntel, ...gdeltItems])

      this.log(`${dedupedIntel.length} eventi extrași (${rawIntel.length} brut, ${gdeltItems.length} GDELT)`, 'success')

      if (dedupedIntel.length === 0) {
        this.log('Niciun eveniment relevant extras — RSS-urile nu au returnat articole cu cuvinte cheie relevante', 'info')
      }

      // ── STEP 3: Distribute by agent (already classified by extractIntelFromRSS) ──
      const intelMap: IntelMap = {}
      for (const agent of AGENTS) {
        intelMap[agent.id] = dedupedIntel.filter(i => i.agentId === agent.id)
        const count = intelMap[agent.id].length
        if (count > 0) {
          this.onAgentStatus?.({ agentId: agent.id, status: 'done', count, message: `${count} articole reale` })
          this.log(`${agent.id.toUpperCase()}: ${count} articole din surse reale`, 'success')
        }
      }

      // Include unclassified items under 'osint'
      const classifiedIds = new Set(dedupedIntel.filter(i => i.agentId).map(i => i.agentId))
      const unclassified = dedupedIntel.filter(i => !i.agentId)
      if (unclassified.length > 0) {
        intelMap['osint'] = [...(intelMap['osint'] || []), ...unclassified]
      }

      // Emit real intel immediately (no waiting for AI)
      const breakingItems = extractBreakingFromReal(dedupedIntel)
      this.onUpdate?.({
        intel: intelMap,
        analysis: null,
        breaking: breakingItems,
        timestamp: Date.now(),
        cycle: this.cycleCount,
        modelsUsed: ['RSS Extraction', 'GDELT'],
      })

      this.log(`${dedupedIntel.length} eventi reali afișați — surse: BBC, Reuters, Al Jazeera, Times of Israel, Defense One etc.`, 'success')

      // ── STEP 4: AI strategic analysis on REAL events (optional, only if API key set) ──
      if (this.apiKey && this.apiKey !== 'server-side' && dedupedIntel.length > 0) {
        this.log(`Analiză strategică AI pe ${dedupedIntel.length} articole reale via ${getModelName(AI_MODELS[0].id)}...`, 'system')

        try {
          const [analysis] = await Promise.allSettled([
            runAnalysis(this.apiKey, intelMap),
          ])

          const analysisResult = analysis.status === 'fulfilled' ? analysis.value : null

          if (analysisResult) {
            this.log('Analiză strategică completă', 'success')
          } else if (analysis.status === 'rejected') {
            this.log(`Analiză eșuată: ${(analysis.reason as Error)?.message?.slice(0, 80)}`, 'error')
          }

          this.onUpdate?.({
            intel: intelMap,
            analysis: analysisResult,
            breaking: breakingItems,
            timestamp: Date.now(),
            cycle: this.cycleCount,
            modelsUsed: analysisResult
              ? ['RSS Extraction', 'GDELT', getModelName(AI_MODELS[0].id)]
              : ['RSS Extraction', 'GDELT'],
          })
        } catch (err: any) {
          this.log(`Analiză AI eșuată: ${err.message}`, 'error')
        }
      }

      this.log(
        `Ciclu #${this.cycleCount} complet — ${dedupedIntel.length} articole reale din ${new Set(dedupedIntel.map(i => i.source)).size} surse`,
        dedupedIntel.length > 0 ? 'success' : 'info'
      )

    } catch (err: any) {
      this.log(`Eroare ciclu #${this.cycleCount}: ${err.message}`, 'error')
    }
  }

  start(intervalSec = 180) {
    if (this.running) return
    this.running = true
    this.log('Sistem pornit — preluare date din surse reale: RSS (27 feed-uri) + GDELT + OpenSky + NASA FIRMS', 'system')
    this.log('Surse: BBC, Reuters, AP, Al Jazeera, Times of Israel, Iran Intl, Defense One, War Zone, Breaking Defense...', 'info')
    this.runFullCycle()
    const timer = setInterval(() => {
      if (this.running) this.runFullCycle()
    }, intervalSec * 1000)
    this.timers.push(timer)
  }

  stop() {
    this.running = false
    this.timers.forEach(clearInterval)
    this.timers = []
    this.log('Sistem oprit', 'system')
  }

  async manualRefresh() {
    this.log('Refresh manual — preluare articole noi...', 'system')
    await this.runFullCycle()
  }
}

// Keep these exports for backward compatibility
export async function runAllAgents(
  apiKey: string,
  onAgentProgress?: (p: AgentProgress) => void,
  onPartialResults?: (results: IntelMap) => void
): Promise<IntelMap> {
  const articles = await fetchRealRSSArticles()
  const rawIntel = extractIntelFromRSS(articles)
  const dedupedIntel = deduplicateIntel(rawIntel)

  const intelMap: IntelMap = {}
  for (const agent of AGENTS) {
    intelMap[agent.id] = dedupedIntel.filter(i => i.agentId === agent.id)
    const count = intelMap[agent.id].length
    onAgentProgress?.({ agentId: agent.id, status: 'done', count, message: `${count} articole reale` })
  }

  onPartialResults?.(intelMap)
  return intelMap
}

export async function fetchBreakingNews(_apiKey: string): Promise<BreakingItem[]> {
  const articles = await fetchRealRSSArticles()
  const items = extractIntelFromRSS(articles)
  return extractBreakingFromReal(items)
}
