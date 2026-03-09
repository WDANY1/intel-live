// ============================================================
// INTEL LIVE — Multi-Model API Layer & Agent System (TypeScript)
// ============================================================

import {
  AGENTS,
  NEWS_SOURCES,
  ITEMS_PER_AGENT_QUERY,
  AI_MODELS,
  AGENT_MODEL_MAP,
  VERIFICATION_MODELS,
} from './config'
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
} from './types'

const API_PATH = '/api/claude'

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
  try {
    return JSON.parse(clean)
  } catch {
    const arrMatch = clean.match(/\[[\s\S]*?\]/)
    if (arrMatch) try { return JSON.parse(arrMatch[0]) } catch {}
    const objMatch = clean.match(/\{[\s\S]*\}/)
    if (objMatch) try { return JSON.parse(objMatch[0]) } catch {}
    return null
  }
}

async function runAgentQuery(apiKey: string, agent: Agent): Promise<IntelItem[]> {
  const model = AGENT_MODEL_MAP[agent.id] || AI_MODELS[0].id
  const mainQuery = agent.queries[0]
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const prompt = `Intelligence analyst: "${mainQuery}". Today is ${today}. Last 24h only. Both sides.
Return JSON array of ${ITEMS_PER_AGENT_QUERY} items: [{"headline":"<title>","summary":"<2 sentences>","source":"<outlet>","time":"<when>","severity":<1-5>,"verified":<bool>,"location":"<place>"}]
Severity: 1=routine 2=notable 3=significant 4=high 5=critical. JSON only, no markdown.`

  const { text, usedModel } = await callLLM(apiKey, prompt, model)
  const items = parseJSON(text)
  if (!Array.isArray(items)) return []

  return items.map((item: any) => ({
    ...item,
    agentId: agent.id,
    category: agent.name,
    categoryFull: agent.fullName,
    fetchedAt: Date.now(),
    severity: Math.min(5, Math.max(1, Number(item.severity) || 3)) as 1 | 2 | 3 | 4 | 5,
    aiModel: usedModel,
    aiModelName: getModelName(usedModel),
  })) as IntelItem[]
}

async function runAgent(
  apiKey: string,
  agent: Agent,
  onProgress?: (p: AgentProgress) => void
): Promise<IntelItem[]> {
  const modelName = getModelName(AGENT_MODEL_MAP[agent.id] || AI_MODELS[0].id)
  onProgress?.({ agentId: agent.id, status: 'running', message: `Scanare via ${modelName}...` })
  try {
    const items = await runAgentQuery(apiKey, agent)
    onProgress?.({ agentId: agent.id, status: 'done', count: items.length, message: `${items.length} rapoarte (${modelName})` })
    return items
  } catch (err: any) {
    onProgress?.({ agentId: agent.id, status: 'error', message: err.message?.slice(0, 100) })
    return []
  }
}

export async function runAllAgents(
  apiKey: string,
  onAgentProgress?: (p: AgentProgress) => void,
  onPartialResults?: (results: IntelMap) => void
): Promise<IntelMap> {
  const allResults: IntelMap = {}

  // Run all agents in parallel, emit partial results as each completes
  const promises = AGENTS.map(async (agent) => {
    const items = await runAgent(apiKey, agent, onAgentProgress)
    allResults[agent.id] = items
    // Emit partial results so UI updates immediately per agent
    if (items.length > 0 && onPartialResults) {
      onPartialResults({ ...allResults })
    }
  })
  await Promise.allSettled(promises)
  return allResults
}

export async function runAnalysis(apiKey: string, allIntel: IntelMap): Promise<AnalysisResult | null> {
  const analysisModel = AI_MODELS[0].id

  const summaryParts = Object.entries(allIntel)
    .filter(([, items]) => items && items.length > 0)
    .map(([agentId, items]) => {
      const agent = AGENTS.find((a) => a.id === agentId)
      const label = agent ? `${agent.icon} ${agent.fullName}` : agentId
      const bullets = (items || [])
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 4)
        .map((i) => `  - [S${i.severity}] ${i.headline}: ${i.summary}`)
        .join('\n')
      return `${label}:\n${bullets}`
    })
    .join('\n\n')

  if (!summaryParts) return null

  const total = Object.values(allIntel).flat().length
  const critical = Object.values(allIntel).flat().filter((i) => i && i.severity >= 4).length
  const modelsUsed = [...new Set(Object.values(allIntel).flat().map((i) => i?.aiModelName).filter(Boolean))]

  const prompt = `You are an elite military intelligence analyst.
Based on these ${total} reports (${critical} critical) about the Iran-Israel-US conflict, gathered from ${modelsUsed.length} AI models (${modelsUsed.join(', ')}):

${summaryParts}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{"threat_level":<1-10>,"threat_label":"<DEFCON label>","situation_summary":"<3 sentences in Romanian>","timeline_last_24h":["<4 events in Romanian>"],"next_hours_prediction":"<3 sentences Romanian>","next_days_prediction":"<3 sentences Romanian>","key_risks":["<5 risks Romanian>"],"escalation_probability":<0-100>,"nuclear_risk":<0-100>,"oil_impact":"<2 sentences Romanian>","proxy_status":"<2 sentences Romanian>","diplomatic_status":"<2 sentences Romanian>","civilian_impact":"<2 sentences Romanian>","breaking_alerts":["<3 breaking headlines Romanian>"],"recommendation":"<2 sentences Romanian>"}`

  const { text } = await callLLM(apiKey, prompt, analysisModel)
  const result = parseJSON(text) as AnalysisResult | null
  if (result) result._analysisModel = getModelName(analysisModel)
  return result
}

export async function verifyIntel(apiKey: string, item: IntelItem): Promise<VerificationResult | null> {
  const verifyPrompt = `Verify this intelligence report: "${item.headline}" - ${item.summary} (Source: ${item.source})
Search for corroboration from major news sources (Reuters, AP, BBC, Al Jazeera, Times of Israel, Iran International, etc).
Return ONLY JSON: {"verified":<bool>,"confidence":<0-100>,"corroborating_sources":["<sources>"],"notes":"<note in Romanian>"}`

  const verificationPromises = VERIFICATION_MODELS.map(async (model) => {
    try {
      const { text, usedModel } = await callLLM(apiKey, verifyPrompt, model)
      const result = parseJSON(text)
      if (result) result._model = getModelName(usedModel)
      return result
    } catch {
      return null
    }
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
  const allNotes = validResults.map((r: any) => r.notes).filter(Boolean)
  const modelNames = validResults.map((r: any) => r._model).filter(Boolean)

  return {
    verified: verifiedCount >= Math.ceil(validResults.length / 2),
    confidence: avgConfidence,
    corroborating_sources: allSources as string[],
    notes: (allNotes[0] as string) || '',
    crossVerification: {
      modelsQueried: VERIFICATION_MODELS.length,
      modelsResponded: validResults.length,
      modelsConfirmed: verifiedCount,
      modelNames: modelNames as string[],
      consensus:
        verifiedCount === validResults.length
          ? 'UNANIM CONFIRMAT'
          : verifiedCount > 0
          ? 'PARȚIAL CONFIRMAT'
          : 'NECONFIRMAT',
    },
  }
}

export async function fetchBreakingNews(apiKey: string): Promise<BreakingItem[]> {
  const breakingModel = AI_MODELS[1].id
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const prompt = `Today is ${today}. Report the absolute latest breaking news about the Iran-Israel-US conflict.
Check Reuters, AP, Al Jazeera, BBC, CNN, Times of Israel, Iran International.
Return ONLY a JSON array (no markdown, no backticks): [{"text":"<headline in Romanian max 20 words>","severity":<1-5>,"time":"<when>"}] — exactly 6 items.`
  const { text } = await callLLM(apiKey, prompt, breakingModel)
  const items = parseJSON(text)
  return Array.isArray(items) ? items : []
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
    const modelList = AI_MODELS.map((m) => m.name).join(', ')
    this.log(`Ciclul #${this.cycleCount} — ${AI_MODELS.length} modele AI active: ${modelList}`, 'system')

    try {
      const results = await runAllAgents(
        this.apiKey,
        (progress) => {
          this.onAgentStatus?.(progress)
          if (progress.status === 'done') {
            this.log(`${progress.agentId.toUpperCase()}: ${progress.count} rapoarte — ${progress.message}`, 'success')
          } else if (progress.status === 'error') {
            this.log(`${progress.agentId.toUpperCase()}: EROARE — ${progress.message}`, 'error')
          }
        },
        // Emit partial results — UI updates as each agent finishes
        (partialResults) => {
          const modelsUsed = [
            ...new Set(Object.values(partialResults).flat().map((i) => i?.aiModel).filter(Boolean)),
          ] as string[]
          this.onUpdate?.({
            intel: partialResults,
            analysis: null,
            breaking: [],
            timestamp: Date.now(),
            cycle: this.cycleCount,
            modelsUsed,
          })
        }
      )

      const totalItems = Object.values(results).flat().length
      let analysisResult: AnalysisResult | null = null
      let breakingResult: BreakingItem[] = []

      if (totalItems > 0) {
        this.log(
          `Analiză strategică via ${getModelName(AI_MODELS[0].id)} + breaking news via ${getModelName(AI_MODELS[1].id)}...`,
          'system'
        )
        const [analysis, breaking] = await Promise.allSettled([
          runAnalysis(this.apiKey, results),
          fetchBreakingNews(this.apiKey),
        ])
        analysisResult = analysis.status === 'fulfilled' ? analysis.value : null
        breakingResult = breaking.status === 'fulfilled' ? breaking.value : []
        if (analysisResult) this.log('Analiză completă', 'success')
        else if (analysis.status === 'rejected')
          this.log(`Analiză eșuată: ${(analysis.reason as Error)?.message?.slice(0, 80)}`, 'error')
      } else {
        this.log('Niciun raport colectat — verifică API key', 'error')
      }

      const modelsUsed = [
        ...new Set(Object.values(results).flat().map((i) => i?.aiModel).filter(Boolean)),
      ] as string[]

      this.onUpdate?.({
        intel: results,
        analysis: analysisResult,
        breaking: breakingResult,
        timestamp: Date.now(),
        cycle: this.cycleCount,
        modelsUsed,
      })

      this.log(
        `Ciclu #${this.cycleCount} complet — ${totalItems} rapoarte din ${modelsUsed.length} modele AI`,
        totalItems > 0 ? 'success' : 'error'
      )
    } catch (err: any) {
      this.log(`Eroare ciclu #${this.cycleCount}: ${err.message}`, 'error')
    }
  }

  start(intervalSec = 300) {
    if (this.running) return
    this.running = true
    this.log(
      `Sistem pornit — ${AI_MODELS.length} modele AI: ${AI_MODELS.map((m) => `${m.icon} ${m.name}`).join(' | ')}`,
      'system'
    )
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
    this.log('Refresh manual', 'system')
    await this.runFullCycle()
  }
}
