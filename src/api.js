// ============================================================
// INTEL LIVE — API Layer & Agent System
// ============================================================

import { AGENTS, NEWS_SOURCES, ITEMS_PER_AGENT_QUERY } from "./config";

const API_PATH = "/api/claude";

// ── Delay helper ──
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const textBlocks = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return textBlocks || "";
}

function parseJSON(raw) {
  if (!raw) return null;
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}
    return null;
  }
}

// ── Single Agent: ONE combined query (not multiple) ──
async function runAgentQuery(apiKey, agent) {
  const allQueries = agent.queries.join(" OR ");
  const sourceMentions = agent.sources.map((s) => `@${s}`).join(", ");

  const prompt = `Search for the very latest breaking news about: "${allQueries}".
Today is February 28, 2026. Focus on the most recent updates.
Credible OSINT sources: ${sourceMentions}. Also check: ${NEWS_SOURCES.slice(0, 4).join(", ")}

Return ONLY a valid JSON array of ${ITEMS_PER_AGENT_QUERY} most important recent updates.
Each item: {"headline":"<title>","summary":"<2-3 sentences>","source":"<outlet>","time":"<e.g. 2 hours ago>","severity":<1-5>,"verified":<boolean>,"location":"<place>"}
ONLY the JSON array. No markdown.`;

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

// ── Run one agent ──
async function runAgent(apiKey, agent, onProgress) {
  onProgress?.({ agentId: agent.id, status: "running", message: "Scanare..." });
  try {
    const items = await runAgentQuery(apiKey, agent);
    onProgress?.({ agentId: agent.id, status: "done", count: items.length, message: `${items.length} rapoarte` });
    return items;
  } catch (err) {
    onProgress?.({ agentId: agent.id, status: "error", message: err.message?.slice(0, 100) });
    return [];
  }
}

// ── Run agents in BATCHES of 2 (avoid rate limits) ──
export async function runAllAgents(apiKey, onAgentProgress) {
  const allResults = {};
  const batchSize = 2;

  for (let i = 0; i < AGENTS.length; i += batchSize) {
    const batch = AGENTS.slice(i, i + batchSize);
    const promises = batch.map(async (agent) => {
      const items = await runAgent(apiKey, agent, onAgentProgress);
      allResults[agent.id] = items;
    });
    await Promise.allSettled(promises);
    // Small delay between batches to avoid rate limits
    if (i + batchSize < AGENTS.length) await delay(1000);
  }
  return allResults;
}

// ── Deep Analysis ──
export async function runAnalysis(apiKey, allIntel) {
  const summaryParts = Object.entries(allIntel)
    .filter(([, items]) => items.length > 0)
    .map(([agentId, items]) => {
      const agent = AGENTS.find((a) => a.id === agentId);
      const label = agent ? `${agent.icon} ${agent.fullName}` : agentId;
      const bullets = items
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 4)
        .map((i) => `  - [S${i.severity}] ${i.headline}: ${i.summary}`)
        .join("\n");
      return `${label}:\n${bullets}`;
    })
    .join("\n\n");

  if (!summaryParts) return null;

  const total = Object.values(allIntel).flat().length;
  const critical = Object.values(allIntel).flat().filter((i) => i.severity >= 4).length;

  const prompt = `You are an elite military intelligence analyst.
Based on these ${total} reports (${critical} critical) about the Iran-Israel-US conflict, Feb 28 2026:

${summaryParts}

Return ONLY valid JSON (no markdown):
{"threat_level":<1-10>,"threat_label":"<DEFCON label>","situation_summary":"<3 sentences in Romanian>","timeline_last_24h":["<4 events in Romanian>"],"next_hours_prediction":"<3 sentences Romanian>","next_days_prediction":"<3 sentences Romanian>","key_risks":["<5 risks Romanian>"],"escalation_probability":<0-100>,"nuclear_risk":<0-100>,"oil_impact":"<2 sentences Romanian>","proxy_status":"<2 sentences Romanian>","diplomatic_status":"<2 sentences Romanian>","civilian_impact":"<2 sentences Romanian>","breaking_alerts":["<3 breaking headlines Romanian>"],"recommendation":"<2 sentences Romanian>"}`;

  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], false, 2000);
  return parseJSON(text);
}

// ── Verify item ──
export async function verifyIntel(apiKey, item) {
  const prompt = `Verify this intel: "${item.headline}" - ${item.summary} (Source: ${item.source})
Search for corroboration. Return ONLY JSON: {"verified":<bool>,"confidence":<0-100>,"corroborating_sources":["<sources>"],"notes":"<note in Romanian>"}`;
  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 600);
  return parseJSON(text);
}

// ── Breaking news for ticker ──
export async function fetchBreakingNews(apiKey) {
  const prompt = `Search for absolute latest breaking news about Iran-Israel-US war, February 28 2026.
Check Reuters, AP, Al Jazeera, BBC, @sentdefender, @IntelCrab on X.
Return ONLY JSON array: [{"text":"<headline Romanian max 20 words>","severity":<1-5>,"time":"<when>"}] (6 items)`;
  const text = await callClaude(apiKey, [{ role: "user", content: prompt }], true, 800);
  const items = parseJSON(text);
  return Array.isArray(items) ? items : [];
}

// ── Agent Manager ──
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
    this.log(`Ciclul #${this.cycleCount} — Lansare agenți (batch x2)...`, "system");

    try {
      const results = await runAllAgents(this.apiKey, (progress) => {
        this.onAgentStatus?.(progress);
        if (progress.status === "done") {
          this.log(`${progress.agentId.toUpperCase()}: ${progress.count} rapoarte`, "success");
        } else if (progress.status === "error") {
          this.log(`${progress.agentId.toUpperCase()}: EROARE — ${progress.message}`, "error");
        }
      });

      const totalItems = Object.values(results).flat().length;

      // Only run analysis if we got data
      let analysisResult = null;
      let breakingResult = [];

      if (totalItems > 0) {
        this.log("Analiză strategică + breaking news...", "system");
        const [analysis, breaking] = await Promise.allSettled([
          runAnalysis(this.apiKey, results),
          fetchBreakingNews(this.apiKey),
        ]);
        analysisResult = analysis.status === "fulfilled" ? analysis.value : null;
        breakingResult = breaking.status === "fulfilled" ? breaking.value : [];
        if (analysisResult) this.log("Analiză completă", "success");
        else if (analysis.status === "rejected") this.log(`Analiză eșuată: ${analysis.reason?.message?.slice(0, 80)}`, "error");
      } else {
        this.log("Niciun raport colectat — verifică API key și creditul", "error");
      }

      this.onUpdate?.({
        intel: results,
        analysis: analysisResult,
        breaking: breakingResult,
        timestamp: Date.now(),
        cycle: this.cycleCount,
      });

      this.log(`Ciclu #${this.cycleCount} complet — ${totalItems} rapoarte`, totalItems > 0 ? "success" : "error");
    } catch (err) {
      this.log(`Eroare ciclul #${this.cycleCount}: ${err.message}`, "error");
    }
  }

  start(intervalSec = 60) {
    if (this.running) return;
    this.running = true;
    this.log("Sistem pornit — Agenți activați", "system");
    this.runFullCycle();
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
    this.log("Refresh manual", "system");
    await this.runFullCycle();
  }
}
