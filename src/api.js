// ============================================================
// INTEL LIVE — API Layer & Agent System
// Parallel intelligence fetching, analysis pipeline, agent orchestration
// ============================================================

import { AGENTS, OSINT_SOURCES, NEWS_SOURCES, ITEMS_PER_AGENT_QUERY } from "./config";

const API_PATH = "/api/claude";

// ── Core API Call ──
async function callClaude(apiKey, messages, useWebSearch = true, maxTokens = 1500) {
  const body = {
    model: "claude-sonnet-4-5-20250514",
    max_tokens: maxTokens,
    messages,
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const res = await fetch(API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const textBlocks = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return textBlocks || "";
}

function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    return null;
  }
}

// ── Single Agent Query ──
export async function runAgentQuery(apiKey, agent, queryIndex = 0) {
  const query = agent.queries[queryIndex % agent.queries.length];
  const sourceMentions = agent.sources
    .map((s) => `@${s}`)
    .join(", ");

  const prompt = `Search for the very latest breaking news about: "${query}".
Today is February 28, 2026. Focus on the most recent updates from the last few hours.
Look for information from credible OSINT sources including: ${sourceMentions}
Also check: ${NEWS_SOURCES.slice(0, 6).join(", ")}

Return ONLY a valid JSON array of the ${ITEMS_PER_AGENT_QUERY} most important/recent updates.
Each item must have these exact fields:
- "headline": short punchy title (max 15 words)
- "summary": 2-3 sentence description with specific details
- "source": news outlet or OSINT account name
- "time": when reported (e.g., "2 hours ago", "30 minutes ago")
- "severity": number 1-5 (5=critical/breaking, 4=high importance, 3=medium, 2=developing, 1=background)
- "verified": boolean, true if confirmed by multiple sources
- "location": geographic location if applicable

Return ONLY the JSON array. No markdown, no backticks, no explanation.`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 1200);
  const items = parseJSON(text);
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    agentId: agent.id,
    category: agent.name,
    categoryFull: agent.fullName,
    fetchedAt: Date.now(),
    severity: Math.min(5, Math.max(1, Number(item.severity) || 3)),
  }));
}

// ── Run All Queries for One Agent (parallel) ──
export async function runAgent(apiKey, agent, onProgress) {
  onProgress?.({ agentId: agent.id, status: "running", message: "Scanning..." });
  const allItems = [];
  try {
    const promises = agent.queries.map((_, idx) => runAgentQuery(apiKey, agent, idx));
    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.length) {
        allItems.push(...r.value);
      }
    }
    // Deduplicate by headline similarity
    const seen = new Set();
    const unique = allItems.filter((item) => {
      const key = item.headline?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onProgress?.({ agentId: agent.id, status: "done", count: unique.length, message: `${unique.length} items` });
    return unique;
  } catch (err) {
    onProgress?.({ agentId: agent.id, status: "error", message: err.message?.slice(0, 80) });
    return [];
  }
}

// ── Run ALL Agents in Parallel ──
export async function runAllAgents(apiKey, onAgentProgress) {
  const allResults = {};
  const promises = AGENTS.map(async (agent) => {
    const items = await runAgent(apiKey, agent, onAgentProgress);
    allResults[agent.id] = items;
  });
  await Promise.allSettled(promises);
  return allResults;
}

// ── Deep Analysis ──
export async function runAnalysis(apiKey, allIntel) {
  const summaryParts = Object.entries(allIntel)
    .filter(([, items]) => items.length > 0)
    .map(([agentId, items]) => {
      const agent = AGENTS.find((a) => a.id === agentId);
      const label = agent ? `${agent.icon} ${agent.fullName}` : agentId;
      const bulletPoints = items
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 5)
        .map((i) => `  - [Severity ${i.severity}] ${i.headline}: ${i.summary}`)
        .join("\n");
      return `${label}:\n${bulletPoints}`;
    })
    .join("\n\n");

  const totalItems = Object.values(allIntel).flat().length;
  const criticalCount = Object.values(allIntel).flat().filter((i) => i.severity >= 4).length;

  const prompt = `You are an elite military intelligence analyst with CIA/Mossad-level analytical capabilities.

Based on these ${totalItems} intelligence reports (${criticalCount} critical) gathered from 70+ OSINT sources about the Iran-Israel-US conflict on February 28, 2026:

${summaryParts}

Perform a comprehensive multi-domain intelligence analysis and return ONLY a valid JSON object (no markdown, no backticks) with these exact fields:

{
  "threat_level": <number 1-10>,
  "threat_label": "<DEFCON-style status label in English>",
  "situation_summary": "<3-4 sentence executive summary in Romanian - what is happening RIGHT NOW>",
  "timeline_last_24h": ["<array of 4-6 key events in chronological order, in Romanian>"],
  "next_hours_prediction": "<What will most likely happen in the next 6-12 hours - 3-4 sentences in Romanian, be specific>",
  "next_days_prediction": "<Strategic outlook for next 3-7 days - 3-4 sentences in Romanian>",
  "key_risks": ["<array of 5-6 specific key risks in Romanian>"],
  "escalation_probability": <number 0-100>,
  "nuclear_risk": <number 0-100>,
  "oil_impact": "<Assessment of oil market and Strait of Hormuz impact in Romanian, 2 sentences>",
  "proxy_status": "<Status of proxy forces Hezbollah/Houthis in Romanian, 2 sentences>",
  "diplomatic_status": "<Diplomatic channels status in Romanian, 2 sentences>",
  "civilian_impact": "<Civilian impact assessment in Romanian, 2 sentences>",
  "breaking_alerts": ["<array of 2-3 most critical breaking items for the ticker, in Romanian>"],
  "recommendation": "<What should people in the region do - practical advice in Romanian, 2-3 sentences>"
}

Be specific, data-driven, and analytical. Use the actual intelligence provided above.`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], false, 2500);
  return parseJSON(text);
}

// ── Verify specific intelligence item ──
export async function verifyIntel(apiKey, item) {
  const prompt = `Quickly verify this intelligence report about the Iran-Israel-US conflict:
Headline: "${item.headline}"
Summary: "${item.summary}"
Source: "${item.source}"

Search for corroborating or contradicting information. Return ONLY a JSON object:
{
  "verified": <boolean>,
  "confidence": <number 0-100>,
  "corroborating_sources": ["<array of source names that confirm this>"],
  "notes": "<brief note about verification, in Romanian>"
}`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 600);
  return parseJSON(text);
}

// ── Quick headlines scan for ticker ──
export async function fetchBreakingNews(apiKey) {
  const prompt = `Search for the absolute latest breaking news about the Iran-Israel-US war conflict right now, February 28 2026.
Check @sentdefender @Osinttechnical @IntelCrab @nexta_tv @clashreport on X/Twitter and Reuters, AP, Al Jazeera, BBC.
Return ONLY a JSON array of the 6 most urgent/breaking items:
[{"text": "<short breaking headline in Romanian, max 20 words>", "severity": <1-5>, "time": "<e.g. 5 min ago>"}]`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 800);
  const items = parseJSON(text);
  return Array.isArray(items) ? items : [];
}

// ── X/Twitter OSINT aggregation ──
export async function fetchOSINTFromX(apiKey, handles) {
  const handleStr = handles.map((h) => `@${h}`).join(", ");
  const prompt = `Search X/Twitter for the very latest posts from these OSINT accounts about the Iran-Israel-US conflict: ${handleStr}

Today is February 28, 2026. Find their most recent posts/updates.
Return ONLY a JSON array of up to 8 items:
[{"account": "@handle", "text": "<post content summarized>", "time": "<when posted>", "engagement": "<likes/retweets if available>", "severity": <1-5>}]`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 1000);
  const items = parseJSON(text);
  return Array.isArray(items) ? items : [];
}

// ── Agent Manager Class ──
export class AgentManager {
  constructor(apiKey, onUpdate, onAgentStatus, onLog) {
    this.apiKey = apiKey;
    this.onUpdate = onUpdate;
    this.onAgentStatus = onAgentStatus;
    this.onLog = onLog;
    this.timers = [];
    this.running = false;
    this.cycleCount = 0;
  }

  log(msg, type = "info") {
    this.onLog?.({ time: new Date().toLocaleTimeString("ro-RO"), message: msg, type });
  }

  async runFullCycle() {
    this.cycleCount++;
    this.log(`Ciclul #${this.cycleCount} — Lansare toți agenții...`, "system");

    // Run all agents in parallel
    const results = await runAllAgents(this.apiKey, (progress) => {
      this.onAgentStatus?.(progress);
      if (progress.status === "done") {
        this.log(`${progress.agentId.toUpperCase()}: ${progress.count} rapoarte colectate`, "success");
      } else if (progress.status === "error") {
        this.log(`${progress.agentId.toUpperCase()}: Eroare — ${progress.message}`, "error");
      }
    });

    // Run analysis in parallel with breaking news
    this.log("Analiză strategică în curs...", "system");
    const [analysis, breaking] = await Promise.allSettled([
      runAnalysis(this.apiKey, results),
      fetchBreakingNews(this.apiKey),
    ]);

    const analysisResult = analysis.status === "fulfilled" ? analysis.value : null;
    const breakingResult = breaking.status === "fulfilled" ? breaking.value : [];

    if (analysisResult) this.log("Analiză completă", "success");
    if (breakingResult.length) this.log(`${breakingResult.length} alerte breaking`, "alert");

    this.onUpdate?.({
      intel: results,
      analysis: analysisResult,
      breaking: breakingResult,
      timestamp: Date.now(),
      cycle: this.cycleCount,
    });

    this.log(`Ciclul #${this.cycleCount} complet — ${Object.values(results).flat().length} total rapoarte`, "success");
  }

  start(intervalSec = 60) {
    if (this.running) return;
    this.running = true;
    this.log("Sistem pornit — Agenți activați", "system");

    // Initial fetch immediately
    this.runFullCycle();

    // Set up recurring cycle
    const timer = setInterval(() => {
      if (this.running) this.runFullCycle();
    }, intervalSec * 1000);
    this.timers.push(timer);
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.log("Sistem oprit", "system");
  }

  async manualRefresh() {
    this.log("Refresh manual inițiat", "system");
    await this.runFullCycle();
  }
}
