// ============================================================
// INTEL LIVE — Agent System (REAL DATA + AI ANALYSIS)
//
// Data flow:
//   1. Fetch REAL articles from 27+ RSS feeds (/api/rss)
//   2. Classify + extract intel using keywords
//   3. Fetch GDELT global event database (/api/events)
//   4. Each agent runs AI analysis on its domain events
//   5. Global strategic analysis via AI models
//   6. Emit to UI + SSE eventStore
//
// AI providers (reads from Vercel env vars via /api/claude):
//   OpenRouter → Groq → Cerebras → Mistral → Gemini → HuggingFace
// ============================================================

import {
  AGENTS,
  AI_MODELS,
  VERIFICATION_MODELS,
} from './config'
import { extractIntelFromRSS, deduplicateIntel } from './extraction'
import { eventStore } from './cache'
import type {
  IntelItem,
  AnalysisResult,
  BreakingItem,
  AgentProgress,
  AgentUpdatePayload,
  IntelMap,
  LogEntry,
  VerificationResult,
  RSSArticle,
  AgentId,
} from './types'

// ── Always use /api/claude — reads env vars on server ──
const API_PATH = '/api/claude'

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function getModelName(modelId: string): string {
  const m = AI_MODELS.find((ai) => ai.id === modelId)
  return m ? `${m.icon} ${m.name}` : modelId
}

// ── Call AI via /api/claude (server reads env vars automatically) ──
// Pass 'server-side' as key → server uses OPENROUTER_API_KEY / GROQ_API_KEY etc.
async function callLLM(prompt: string, model: string): Promise<{ text: string; usedModel: string }> {
  const res = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'server-side', // server reads from process.env
    },
    body: JSON.stringify({ prompt, model }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(`API ${res.status}: ${(errData as any).error || 'Unknown'}`)
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

// ── Fetch REAL articles from all RSS feeds ──
async function fetchRealRSSArticles(): Promise<RSSArticle[]> {
  try {
    const base = getBaseUrl()
    const feeds = [
      'bbc_me', 'bbc_world', 'aljazeera', 'aljazeera_me',
      'times_israel', 'iran_intl', 'reuters_world', 'ap_top',
      'al_monitor', 'war_zone', 'breaking_defense', 'defense_one',
      'jpost', 'alarabiya', 'presstv', 'sky_news', 'dw_world',
      'france24', 'guardian_world', 'middleeasteye', 'naval_news',
      'military_times', 'euronews', 'nyt_world', 'wapo', 'cnn_world',
    ].join(',')

    const res = await fetch(`${base}/api/rss?feeds=${feeds}&limit=200`, {
      signal: AbortSignal.timeout(18000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.articles || []
  } catch (err) {
    console.error('[agents] RSS fetch error:', err)
    return []
  }
}

// ── Fetch GDELT events ──
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
      .slice(0, 30)
      .map((e: any) => ({
        title: e.title || e.actor1name || 'GDELT Event',
        description: `${e.actor1name || 'Unknown'} — ${e.actor2name || 'Unknown'}. ${e.sourceurl}`,
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

// ── Per-agent AI analysis ──
// Each agent analyzes its domain events and produces enriched summaries
const AGENT_PROMPTS: Record<AgentId, string> = {
  sigint: `You are SIGINT agent. Analyze these signals intelligence reports about electronic warfare, communications, radar, cyber operations. Extract the most operationally significant items.`,
  osint: `You are OSINT agent. Analyze these open-source intelligence items from verified news feeds. Identify patterns, corroborate reports, assess reliability.`,
  humint: `You are HUMINT agent. Analyze these human intelligence reports from officials, spokespeople, and insiders. Assess credibility and strategic significance.`,
  geoint: `You are GEOINT agent. Analyze these geospatial intelligence items about troop movements, satellite imagery, territorial changes, base activities.`,
  econint: `You are ECONINT agent. Analyze these economic intelligence items — oil prices, sanctions, trade disruptions, currency impacts, financial warfare.`,
  proxy: `You are PROXY agent. Analyze Hezbollah, Hamas, Houthis, PMU, IRGC-proxy activities. Map the Iranian proxy network and assess operational tempo.`,
  diplo: `You are DIPLO agent. Analyze diplomatic signals — UN statements, ambassador recalls, summit outcomes, back-channel communications, ceasefire prospects.`,
}

async function runAgentAIAnalysis(
  agentId: AgentId,
  items: IntelItem[]
): Promise<{ summary: string; keyFindings: string[]; threatLevel: number; model: string } | null> {
  if (items.length === 0) return null

  const bulletPoints = items
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 8)
    .map(i => `  [S${i.severity}] ${i.headline} | ${i.source} | ${i.time}`)
    .join('\n')

  const agentPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.osint

  const prompt = `${agentPrompt}

INCOMING INTELLIGENCE (${items.length} items from real news feeds):
${bulletPoints}

Return ONLY valid JSON (no markdown):
{
  "summary": "<2-sentence operational assessment in English>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "threatLevel": <1-5>,
  "confidence": <0-100>
}`

  try {
    const model = AI_MODELS[0].id // Use primary model
    const { text, usedModel } = await callLLM(prompt, model)
    const parsed = parseJSON(text)
    if (!parsed) return null
    return {
      summary: parsed.summary || '',
      keyFindings: parsed.keyFindings || [],
      threatLevel: parsed.threatLevel || 2,
      model: usedModel,
    }
  } catch (err: any) {
    console.error(`[agents] ${agentId} AI error:`, err.message)
    return null
  }
}

// ── Global strategic analysis ──
export async function runAnalysis(_apiKey: string, allIntel: IntelMap): Promise<AnalysisResult | null> {
  const allItems = Object.values(allIntel).flat().filter(Boolean)
  if (allItems.length === 0) return null

  const summaryParts = Object.entries(allIntel)
    .filter(([, items]) => items && items.length > 0)
    .map(([agentId, items]) => {
      const agent = AGENTS.find((a) => a.id === agentId)
      const label = agent ? `${agent.icon} ${agent.fullName}` : agentId
      const bullets = (items || [])
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 4)
        .map(i => `  - [S${i.severity}] ${i.headline} (${i.source})`)
        .join('\n')
      return `${label}:\n${bullets}`
    })
    .join('\n\n')

  const total = allItems.length
  const critical = allItems.filter(i => i && i.severity >= 4).length
  const sources = [...new Set(allItems.map(i => i.source).filter(Boolean))].slice(0, 10)

  const prompt = `You are an elite military intelligence analyst reviewing REAL news from verified sources.

${total} reports (${critical} critical) from: ${sources.join(', ')}

${summaryParts}

Based ONLY on these REAL reports, return ONLY valid JSON (no markdown):
{"threat_level":<1-10>,"threat_label":"<DEFCON label>","situation_summary":"<3 sentences summarizing real events>","timeline_last_24h":["<4 real events from above>"],"next_hours_prediction":"<3 sentences prediction based on real trends>","next_days_prediction":"<3 sentences>","key_risks":["<5 risks based on real events>"],"escalation_probability":<0-100>,"nuclear_risk":<0-100>,"oil_impact":"<2 sentences>","proxy_status":"<2 sentences>","diplomatic_status":"<2 sentences>","civilian_impact":"<2 sentences>","breaking_alerts":["<3 real breaking headlines from above>"],"recommendation":"<2 sentences>"}`

  try {
    const { text } = await callLLM(prompt, AI_MODELS[0].id)
    const result = parseJSON(text) as AnalysisResult | null
    if (result) result._analysisModel = getModelName(AI_MODELS[0].id)
    return result
  } catch {
    return null
  }
}

// ── Verify intel item ──
export async function verifyIntel(_apiKey: string, item: IntelItem): Promise<VerificationResult | null> {
  const verifyPrompt = `Verify this news: "${item.headline}" — ${item.summary} (Source: ${item.source})
Cross-check with Reuters, AP, BBC, Al Jazeera, Times of Israel, Iran International, Defense One.
Return ONLY JSON: {"verified":<bool>,"confidence":<0-100>,"corroborating_sources":["<sources>"],"notes":"<brief note>"}`

  const results = await Promise.allSettled(
    VERIFICATION_MODELS.slice(0, 2).map(async (model) => {
      try {
        const { text, usedModel } = await callLLM(verifyPrompt, model)
        const result = parseJSON(text)
        if (result) result._model = getModelName(usedModel)
        return result
      } catch { return null }
    })
  )

  const valid = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => (r as PromiseFulfilledResult<any>).value)

  if (valid.length === 0) return null

  const verifiedCount = valid.filter((r: any) => r.verified).length
  const avgConf = Math.round(valid.reduce((s: number, r: any) => s + (r.confidence || 0), 0) / valid.length)
  const allSources = [...new Set(valid.flatMap((r: any) => r.corroborating_sources || []))]

  return {
    verified: verifiedCount >= Math.ceil(valid.length / 2),
    confidence: avgConf,
    corroborating_sources: allSources as string[],
    notes: (valid[0]?.notes as string) || '',
    crossVerification: {
      modelsQueried: VERIFICATION_MODELS.slice(0, 2).length,
      modelsResponded: valid.length,
      modelsConfirmed: verifiedCount,
      modelNames: valid.map((r: any) => r._model).filter(Boolean) as string[],
      consensus: verifiedCount === valid.length ? 'UNANIM CONFIRMAT'
        : verifiedCount > 0 ? 'PARȚIAL CONFIRMAT'
        : 'NECONFIRMAT',
    },
  }
}

function extractBreakingFromReal(items: IntelItem[]): BreakingItem[] {
  return items
    .filter(i => i.severity >= 4)
    .sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0))
    .slice(0, 8)
    .map(i => ({ text: i.headline, severity: i.severity, time: i.time || 'recent' }))
}

// ═══════════════════════════════════════════════════════
// AGENT MANAGER
// ═══════════════════════════════════════════════════════
export class AgentManager {
  private onUpdate: (data: AgentUpdatePayload) => void
  private onAgentStatus: (progress: AgentProgress) => void
  private onLog: (entry: LogEntry) => void
  private timers: ReturnType<typeof setInterval>[] = []
  private running = false
  public cycleCount = 0

  // Keep backward-compat signature (apiKey arg kept but unused — server reads env vars)
  constructor(
    _apiKey: string,
    onUpdate: (data: AgentUpdatePayload) => void,
    onAgentStatus: (progress: AgentProgress) => void,
    onLog: (entry: LogEntry) => void
  ) {
    this.onUpdate = onUpdate
    this.onAgentStatus = onAgentStatus
    this.onLog = onLog
  }

  private log(msg: string, type: LogEntry['type'] = 'info') {
    this.onLog?.({ time: new Date().toISOString().slice(11, 19) + 'Z', message: msg, type })
  }

  async runFullCycle() {
    this.cycleCount++
    this.log(`── Cycle #${this.cycleCount} starting ──`, 'system')

    try {
      // STEP 1 — Fetch real RSS articles + GDELT
      this.log(`Fetching RSS feeds + GDELT...`, 'info')
      AGENTS.forEach(a => this.onAgentStatus?.({ agentId: a.id, status: 'running', message: 'Fetching data...', count: 0 }))

      const [rssArticles, gdeltItems] = await Promise.all([
        fetchRealRSSArticles(),
        fetchGDELTIntel(),
      ])

      this.log(`${rssArticles.length} RSS articles fetched`, 'success')

      // STEP 2 — Extract + deduplicate
      const rawIntel = extractIntelFromRSS(rssArticles)
      const dedupedIntel = deduplicateIntel([...rawIntel, ...gdeltItems])

      this.log(`${dedupedIntel.length} unique events extracted (${gdeltItems.length} from GDELT)`, 'success')

      // STEP 3 — Distribute by agent
      const intelMap: IntelMap = {}
      for (const agent of AGENTS) {
        intelMap[agent.id] = dedupedIntel.filter(i => i.agentId === agent.id)
      }
      // Unclassified → OSINT
      const unclassified = dedupedIntel.filter(i => !i.agentId)
      if (unclassified.length > 0) {
        intelMap['osint'] = [...(intelMap['osint'] || []), ...unclassified]
      }

      // Log per-agent counts
      for (const agent of AGENTS) {
        const count = (intelMap[agent.id] || []).length
        this.onAgentStatus?.({ agentId: agent.id, status: 'done', count, message: `${count} items` })
        if (count > 0) this.log(`${agent.id.toUpperCase()}: ${count} events`, 'info')
      }

      const breakingItems = extractBreakingFromReal(dedupedIntel)

      // STEP 4 — Emit raw intel immediately (no waiting for AI)
      this.onUpdate?.({
        intel: intelMap,
        analysis: null,
        breaking: breakingItems,
        timestamp: Date.now(),
        cycle: this.cycleCount,
        modelsUsed: ['RSS', 'GDELT'],
      })

      // Push new events to SSE store (server-side only)
      if (typeof window === 'undefined') {
        for (const item of dedupedIntel.slice(0, 20)) {
          eventStore.push('intel', item)
        }
      }

      this.log(`${dedupedIntel.length} events live — starting AI analysis...`, 'success')

      // STEP 5 — Per-agent AI analysis (parallel, non-blocking)
      // Each agent uses AI to analyze its domain
      const agentAnalysisResults: Record<string, any> = {}

      const agentTasks = AGENTS
        .filter(agent => (intelMap[agent.id] || []).length > 0)
        .map(async (agent) => {
          this.onAgentStatus?.({ agentId: agent.id, status: 'running', message: 'AI analysis...', count: (intelMap[agent.id] || []).length })
          try {
            const result = await runAgentAIAnalysis(agent.id, intelMap[agent.id] || [])
            if (result) {
              agentAnalysisResults[agent.id] = result
              this.log(`${agent.id.toUpperCase()} AI complete — threat: ${result.threatLevel}/5 [${result.model}]`, 'success')

              // Enrich items with AI summary
              intelMap[agent.id] = (intelMap[agent.id] || []).map(item => ({
                ...item,
                summary: result.keyFindings[0]
                  ? `${result.summary} Key: ${result.keyFindings[0]}`
                  : item.summary,
                aiModel: result.model,
                aiModelName: getModelName(result.model),
                severity: Math.max(item.severity, result.threatLevel) as any,
              }))
            }
          } catch (err: any) {
            this.log(`${agent.id.toUpperCase()} AI error: ${err.message?.slice(0, 60)}`, 'error')
          }
          this.onAgentStatus?.({ agentId: agent.id, status: 'done', count: (intelMap[agent.id] || []).length, message: 'Done' })
        })

      // Run all agents in parallel (don't await — emit as they complete)
      const agentPromise = Promise.allSettled(agentTasks).then(() => {
        // Emit updated intel after all agents finish
        this.onUpdate?.({
          intel: intelMap,
          analysis: null,
          breaking: breakingItems,
          timestamp: Date.now(),
          cycle: this.cycleCount,
          modelsUsed: ['RSS', 'GDELT', ...Object.values(agentAnalysisResults).map((r: any) => r.model).filter(Boolean)],
        })
        this.log('All agent AI analyses complete', 'success')
      })

      // STEP 6 — Global strategic analysis (runs while agents analyze)
      const strategicPromise = runAnalysis('server-side', intelMap).then(analysis => {
        if (analysis) {
          this.log(`Strategic analysis complete — Threat: ${analysis.threat_level}/10 — ${analysis.threat_label}`, 'success')
          this.onUpdate?.({
            intel: intelMap,
            analysis,
            breaking: breakingItems,
            timestamp: Date.now(),
            cycle: this.cycleCount,
            modelsUsed: ['RSS', 'GDELT', analysis._analysisModel || ''].filter(Boolean),
          })
        }
      }).catch(err => this.log(`Strategic analysis error: ${err.message?.slice(0, 60)}`, 'error'))

      // Await both
      await Promise.allSettled([agentPromise, strategicPromise])

      this.log(
        `── Cycle #${this.cycleCount} complete — ${dedupedIntel.length} events from ${new Set(dedupedIntel.map(i => i.source)).size} sources ──`,
        'success'
      )

    } catch (err: any) {
      this.log(`Cycle #${this.cycleCount} error: ${err.message}`, 'error')
    }
  }

  start(intervalSec = 180) {
    if (this.running) return
    this.running = true
    this.log('INTEL LIVE — Agent system starting...', 'system')
    this.log('Sources: BBC, Reuters, Al Jazeera, Times of Israel, Iran Intl, Defense One, War Zone...', 'info')
    this.log('AI: OpenRouter → Groq → Cerebras → Mistral → Gemini → HuggingFace', 'system')
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
    this.log('Agent system stopped', 'system')
  }

  async manualRefresh() {
    this.log('Manual refresh triggered...', 'system')
    await this.runFullCycle()
  }
}

// ── Backward-compat exports ──
export async function runAllAgents(
  _apiKey: string,
  onAgentProgress?: (p: AgentProgress) => void,
  onPartialResults?: (results: IntelMap) => void
): Promise<IntelMap> {
  const articles = await fetchRealRSSArticles()
  const rawIntel = extractIntelFromRSS(articles)
  const dedupedIntel = deduplicateIntel(rawIntel)
  const intelMap: IntelMap = {}
  for (const agent of AGENTS) {
    intelMap[agent.id] = dedupedIntel.filter(i => i.agentId === agent.id)
    onAgentProgress?.({ agentId: agent.id, status: 'done', count: intelMap[agent.id].length, message: `${intelMap[agent.id].length} items` })
  }
  onPartialResults?.(intelMap)
  return intelMap
}

export async function fetchBreakingNews(_apiKey: string): Promise<BreakingItem[]> {
  const articles = await fetchRealRSSArticles()
  const items = extractIntelFromRSS(articles)
  return extractBreakingFromReal(items)
}
