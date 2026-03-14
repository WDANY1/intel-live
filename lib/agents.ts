import { RawArticle, VerifiedEvent, Tier } from './types'
import { getSourceByHandle } from './sources'

// ─── AI API call with Groq primary → Gemini fallback ────────────────────────
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  // Try Groq first (fastest, most generous free tier)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage },
          ],
          temperature: 0.05,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.status === 429) throw new Error('RATE_LIMIT')
      if (!res.ok) throw new Error(`Groq error ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content
    } catch (err) {
      if ((err as Error).message !== 'RATE_LIMIT') {
        // Real error — fall through to Gemini
      }
    }
  }

  // Fallback: Google Gemini 2.0 Flash (free tier)
  if (process.env.GEMINI_API_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    )
    if (!res.ok) throw new Error(`Gemini error ${res.status}`)
    const data = await res.json()
    return data.candidates[0].content.parts[0].text
  }

  throw new Error('No AI API key configured (GROQ_API_KEY or GEMINI_API_KEY required)')
}

// ─── Safe JSON parse ─────────────────────────────────────────────────────────
function safeJSON<T>(str: string, fallback: T): T {
  try {
    const cleaned = str.replace(/```json\n?|```\n?/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

// ─── AGENT 1: Triage & Clustering ────────────────────────────────────────────
const TRIAGE_PROMPT = `You are a military intelligence triage officer. You receive news articles about Middle East conflicts.
Your ONLY job: group articles reporting the SAME specific event into clusters.

CLUSTERING RULES:
- Same event = same location + same type of action + within 3 hours of each other
- Do NOT merge different events even in same country
- Each cluster needs a brief topic label (max 12 words)
- Minimum 1 article per cluster; prefer 2+

OUTPUT: Valid JSON only, no prose:
{
  "clusters": [
    {
      "topic": "short description of the event",
      "location": "City, Country",
      "articleIds": ["id1", "id2"]
    }
  ]
}`

interface Cluster { topic: string; location: string; articleIds: string[] }

async function triageAgent(articles: RawArticle[]): Promise<Cluster[]> {
  if (articles.length === 0) return []

  const payload = articles.map(a => ({
    id: a.id, title: a.title,
    source: a.sourceHandle, tier: a.sourceTier,
    time: a.publishedAt, snippet: a.content.slice(0, 300),
  }))

  const result = await callAI(TRIAGE_PROMPT, JSON.stringify(payload))
  const parsed = safeJSON<{ clusters: Cluster[] }>(result, { clusters: [] })
  return parsed.clusters || []
}

// ─── AGENT 2: Fact-Check & Confidence Scoring ────────────────────────────────
const FACTCHECK_PROMPT = `You are an OSINT fact-checking engine. You receive a cluster of articles about the same event.
Calculate a confidence score using EXACT rules below.

SOURCE TIER DEFINITIONS:
- Tier 1 = Major wire services (Reuters, AP, AFP, BBC, Al Jazeera, France24, Guardian, Sky News)
- Tier 2 = Regional news + institutional OSINT (Times of Israel, Al-Monitor, ISW, Bellingcat, Oryx, Iran Intl, Defense One)
- Tier 3 = OSINT Twitter accounts (sentdefender, ELINTNews, clashreport, AuroraIntel, etc.)

CONFIDENCE SCORE FORMULA (apply exactly):
- 1x Tier 1 alone → 82-90, status: VERIFIED
- 1x Tier 1 + any other → 90-97, status: VERIFIED
- 3+ Tier 2 agree → 78-88, status: VERIFIED
- 2x Tier 2 agree → 58-75, status: PROBABLE
- 1x Tier 2 alone → 42-58, status: DEVELOPING
- 3+ Tier 3 + 1x Tier 2 → 50-68, status: PROBABLE
- 2-4x Tier 3 no Tier 1/2 → 28-45, status: DEVELOPING
- 1x Tier 3 alone → 10-28, status: UNVERIFIED

ANTI-HALLUCINATION RULES (CRITICAL):
1. NEVER add details not in source texts
2. If sources contradict, note both versions
3. Output REJECT if event seems fabricated or inconsistent
4. Do not speculate on casualties beyond sources

OUTPUT: Valid JSON only:
{
  "confidenceScore": 74,
  "status": "PROBABLE",
  "shouldPublish": true,
  "rejectionReason": null,
  "notes": "Why this score was assigned"
}`

interface FactCheckResult {
  confidenceScore: number
  status: 'VERIFIED' | 'PROBABLE' | 'DEVELOPING' | 'UNVERIFIED'
  shouldPublish: boolean
  rejectionReason: string | null
  notes: string
}

async function factCheckAgent(cluster: Cluster, articles: RawArticle[]): Promise<FactCheckResult | null> {
  const clusterArticles = articles.filter(a => cluster.articleIds.includes(a.id))
  if (clusterArticles.length === 0) return null

  const payload = {
    topic: cluster.topic,
    location: cluster.location,
    articles: clusterArticles.map(a => ({
      title: a.title,
      snippet: a.content.slice(0, 400),
      source: a.sourceHandle,
      tier: a.sourceTier,
    })),
  }

  const result = await callAI(FACTCHECK_PROMPT, JSON.stringify(payload))
  const parsed = safeJSON<FactCheckResult>(result, {
    confidenceScore: 0, status: 'UNVERIFIED',
    shouldPublish: false, rejectionReason: 'Parse error', notes: '',
  })
  return parsed
}

// ─── AGENT 3: Synthesis & Publishing ─────────────────────────────────────────
const SYNTHESIS_PROMPT = `You are a neutral wire service editor (AP/Reuters style). Write a factual intelligence report.

WRITING RULES:
1. Headline: max 80 chars, past tense, neutral, no sensationalism
   GOOD: "IDF intercepts ballistic missile over Red Sea"
   BAD: "MASSIVE Israeli counterattack DESTROYS Houthi threat!"
2. Summary: 2-3 sentences, strictly factual, state uncertainty explicitly
3. Severity levels:
   - CRITICAL (RED): active strikes, launches, confirmed 10+ casualties
   - HIGH (ORANGE): skirmishes, movements, confirmed casualties, naval incidents
   - MEDIUM (YELLOW): threats, diplomatic incidents, unconfirmed movements
   - LOW (BLUE): sanctions, statements, exercises, arrests
4. Category: STRIKE / MOVEMENT / DIPLOMATIC / INTELLIGENCE / OTHER
5. Tags: 3-8 proper nouns/acronyms only
6. Location: most specific place mentioned, format "City, Country"
   Then estimate lat/lon from knowledge (1 decimal precision)
7. Perspective: separate what each side claims (max 100 chars each)
8. Quote: for each source, extract a verbatim 100-char snippet from their text

OUTPUT: Valid JSON only:
{
  "headline": "...",
  "summary": "...",
  "severity": "HIGH",
  "severityColor": "ORANGE",
  "category": "STRIKE",
  "tags": ["tag1", "tag2"],
  "locationName": "City, Country",
  "country": "Country",
  "region": "Middle East",
  "latitude": 32.1,
  "longitude": 34.8,
  "perspective": {
    "sideA": "Iran/Hezbollah/Houthi/Hamas position",
    "sideB": "Israel/IDF/US/Coalition position",
    "neutral": "What is independently confirmed"
  },
  "sourceQuotes": {
    "@handle": "verbatim quote max 120 chars"
  }
}`

interface SynthesisResult {
  headline: string
  summary: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  severityColor: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE'
  category: 'STRIKE' | 'MOVEMENT' | 'DIPLOMATIC' | 'INTELLIGENCE' | 'OTHER'
  tags: string[]
  locationName: string
  country: string
  region: string
  latitude: number
  longitude: number
  perspective: { sideA: string; sideB: string; neutral: string }
  sourceQuotes: Record<string, string>
}

async function synthesisAgent(
  cluster: Cluster,
  factCheck: FactCheckResult,
  articles: RawArticle[]
): Promise<SynthesisResult | null> {
  const clusterArticles = articles.filter(a => cluster.articleIds.includes(a.id))

  const payload = {
    topic: cluster.topic,
    location: cluster.location,
    confidenceScore: factCheck.confidenceScore,
    status: factCheck.status,
    articles: clusterArticles.map(a => ({
      title: a.title,
      content: a.content.slice(0, 500),
      source: a.sourceHandle,
      tier: a.sourceTier,
    })),
  }

  const result = await callAI(SYNTHESIS_PROMPT, JSON.stringify(payload))
  return safeJSON<SynthesisResult>(result, null as unknown as SynthesisResult)
}

// ─── Build final VerifiedEvent ────────────────────────────────────────────────
function buildEvent(
  cluster: Cluster,
  factCheck: FactCheckResult,
  synthesis: SynthesisResult,
  articles: RawArticle[]
): VerifiedEvent {
  const clusterArticles = articles.filter(a => cluster.articleIds.includes(a.id))

  const sources = clusterArticles.map(a => {
    const src = getSourceByHandle(a.sourceHandle)
    const quote = synthesis.sourceQuotes?.[a.sourceHandle] || a.title.slice(0, 120)
    return {
      handle: a.sourceHandle,
      tier: (src?.tier ?? a.sourceTier) as Tier,
      url: a.url || `https://x.com/${a.sourceHandle.replace('@', '')}`,
      quote,
    }
  })

  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    headline: synthesis.headline,
    summary: synthesis.summary,
    locationName: synthesis.locationName || cluster.location,
    latitude: synthesis.latitude ?? 32.0,
    longitude: synthesis.longitude ?? 35.0,
    country: synthesis.country,
    region: synthesis.region || 'Middle East',
    severity: synthesis.severity,
    severityColor: synthesis.severityColor,
    category: synthesis.category,
    sources,
    confidenceScore: factCheck.confidenceScore,
    status: factCheck.status,
    tags: synthesis.tags || [],
    perspective: synthesis.perspective || { sideA: '', sideB: '', neutral: '' },
  }
}

// ─── Master Pipeline Orchestrator ─────────────────────────────────────────────
export async function runAgentPipeline(articles: RawArticle[]): Promise<{
  events: VerifiedEvent[]
  stats: { clustered: number; published: number; rejected: number; errors: string[] }
}> {
  if (articles.length === 0) {
    return { events: [], stats: { clustered: 0, published: 0, rejected: 0, errors: [] } }
  }

  // Stage 1: Cluster articles
  let clusters: Cluster[] = []
  try {
    clusters = await triageAgent(articles)
  } catch (err) {
    return {
      events: [],
      stats: { clustered: 0, published: 0, rejected: 0, errors: [`Triage failed: ${err}`] },
    }
  }

  const errors: string[] = []
  let rejected = 0
  const events: VerifiedEvent[] = []

  // Stage 2+3: Process clusters (max 15 per run to stay within rate limits)
  const toProcess = clusters.slice(0, 15)

  // Process sequentially to avoid rate limit
  for (const cluster of toProcess) {
    try {
      const factCheck = await factCheckAgent(cluster, articles)
      if (!factCheck || !factCheck.shouldPublish || factCheck.confidenceScore < 15) {
        rejected++
        continue
      }

      // Small delay between AI calls
      await new Promise(r => setTimeout(r, 150))

      const synthesis = await synthesisAgent(cluster, factCheck, articles)
      if (!synthesis || !synthesis.headline) {
        rejected++
        continue
      }

      events.push(buildEvent(cluster, factCheck, synthesis, articles))
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      errors.push(`Cluster "${cluster.topic}": ${err}`)
    }
  }

  return {
    events,
    stats: { clustered: clusters.length, published: events.length, rejected, errors },
  }
}
