// ============================================================
// INTEL LIVE — Multi-Model API Layer & Agent System
// 5 AI Models: Gemini 2.5 Pro, DeepSeek V3, Llama 4 Scout,
//              Qwen 2.5 72B, Mistral Small 3.1
// Cross-verification across multiple models
// ============================================================

import {
  AGENTS,
  NEWS_SOURCES,
  ITEMS_PER_AGENT_QUERY,
  AI_MODELS,
  AGENT_MODEL_MAP,
  VERIFICATION_MODELS,
} from "./config";

const API_PATH = "/api/claude";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Get model display name ──
function getModelName(modelId) {
  const m = AI_MODELS.find((ai) => ai.id === modelId);
  return m ? `${m.icon} ${m.name}` : modelId;
}

// ── Core LLM Call (OpenRouter — with model selection) ──
async function callLLM(apiKey, prompt, model) {
  const res = await fetch(API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey.replace(/[^\x20-\x7E]/g, "").trim(),
    },
    body: JSON.stringify({ prompt, model }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`API ${res.status}: ${errData.error || "Unknown error"}`);
  }

  const data = await res.json();
  return { text: data.text || "", usedModel: data.model || model };
}

function parseJSON(raw) {
  if (!raw) return null;
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const arrMatch = clean.match(/\[[\s\S]*?\]/);
    if (arrMatch)
      try {
        return JSON.parse(arrMatch[0]);
      } catch {}
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch)
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    return null;
  }
}

// ── Single Agent Query (with assigned model) ──
async function runAgentQuery(apiKey, agent) {
  const model = AGENT_MODEL_MAP[agent.id] || AI_MODELS[0].id;
  const allQueries = agent.queries.join(" OR ");
  const sourceMentions = agent.sources.map((s) => `@${s}`).join(", ");
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const prompt = `You are an intelligence analyst. Report on the very latest developments about: "${allQueries}".
Today is ${today}. Focus ONLY on the most recent events from the last 24-48 hours.
Key OSINT accounts to reference: ${sourceMentions}
Key news outlets to reference: ${NEWS_SOURCES.slice(0, 12).join(", ")}

Return ONLY a valid JSON array of exactly ${ITEMS_PER_AGENT_QUERY} intelligence items about real, verified events.
Each item: {"headline":"<concise title>","summary":"<2-3 detailed sentences about what happened>","source":"<news outlet or OSINT account>","time":"<e.g. 3 hours ago>","severity":<1-5>,"verified":<true or false>,"location":"<city/country>"}
Severity guide: 1=routine, 2=notable, 3=significant, 4=high-impact, 5=critical/emergency.
Return ONLY the JSON array, no markdown, no backticks, no explanation.`;

  const { text, usedModel } = await callLLM(apiKey, prompt, model);
  const items = parseJSON(text);
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    agentId: agent.id,
    category: agent.name,
    categoryFull: agent.fullName,
    fetchedAt: Date.now(),
    severity: Math.min(5, Math.max(1, Number(item.severity) || 3)),
    aiModel: usedModel,
    aiModelName: getModelName(usedModel),
  }));
}

// ── Run one agent ──
async function runAgent(apiKey, agent, onProgress) {
  const modelName = getModelName(AGENT_MODEL_MAP[agent.id] || AI_MODELS[0].id);
  onProgress?.({
    agentId: agent.id,
    status: "running",
    message: `Scanare via ${modelName}...`,
  });
  try {
    const items = await runAgentQuery(apiKey, agent);
    onProgress?.({
      agentId: agent.id,
      status: "done",
      count: items.length,
      message: `${items.length} rapoarte (${modelName})`,
    });
    return items;
  } catch (err) {
    onProgress?.({
      agentId: agent.id,
      status: "error",
      message: err.message?.slice(0, 100),
    });
    return [];
  }
}

// ── Run agents in BATCHES of 2 ──
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
    if (i + batchSize < AGENTS.length) await delay(800);
  }
  return allResults;
}

// ── Deep Analysis (uses best model: Gemini 2.5 Pro) ──
export async function runAnalysis(apiKey, allIntel) {
  const analysisModel = AI_MODELS[0].id; // Gemini 2.5 Pro — best reasoning

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
  const critical = Object.values(allIntel)
    .flat()
    .filter((i) => i.severity >= 4).length;

  // Show which models contributed
  const modelsUsed = [
    ...new Set(
      Object.values(allIntel)
        .flat()
        .map((i) => i.aiModelName)
        .filter(Boolean)
    ),
  ];

  const prompt = `You are an elite military intelligence analyst.
Based on these ${total} reports (${critical} critical) about the Iran-Israel-US conflict, gathered from ${modelsUsed.length} AI models (${modelsUsed.join(", ")}):

${summaryParts}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{"threat_level":<1-10>,"threat_label":"<DEFCON label>","situation_summary":"<3 sentences in Romanian>","timeline_last_24h":["<4 events in Romanian>"],"next_hours_prediction":"<3 sentences Romanian>","next_days_prediction":"<3 sentences Romanian>","key_risks":["<5 risks Romanian>"],"escalation_probability":<0-100>,"nuclear_risk":<0-100>,"oil_impact":"<2 sentences Romanian>","proxy_status":"<2 sentences Romanian>","diplomatic_status":"<2 sentences Romanian>","civilian_impact":"<2 sentences Romanian>","breaking_alerts":["<3 breaking headlines Romanian>"],"recommendation":"<2 sentences Romanian>"}`;

  const { text } = await callLLM(apiKey, prompt, analysisModel);
  const result = parseJSON(text);
  if (result) result._analysisModel = getModelName(analysisModel);
  return result;
}

// ── Cross-Verify item using MULTIPLE models ──
export async function verifyIntel(apiKey, item) {
  const verifyPrompt = `Verify this intelligence report: "${item.headline}" - ${item.summary} (Source: ${item.source})
Search for corroboration from major news sources (Reuters, AP, BBC, Al Jazeera, Times of Israel, Iran International, etc).
Return ONLY JSON: {"verified":<bool>,"confidence":<0-100>,"corroborating_sources":["<sources>"],"notes":"<note in Romanian>"}`;

  // Query 3 different models in parallel for cross-verification
  const verificationPromises = VERIFICATION_MODELS.map(async (model) => {
    try {
      const { text, usedModel } = await callLLM(apiKey, verifyPrompt, model);
      const result = parseJSON(text);
      if (result) result._model = getModelName(usedModel);
      return result;
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(verificationPromises);
  const validResults = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);

  if (validResults.length === 0) return null;

  // Aggregate cross-verification results
  const verifiedCount = validResults.filter((r) => r.verified).length;
  const avgConfidence = Math.round(
    validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) /
      validResults.length
  );
  const allSources = [
    ...new Set(validResults.flatMap((r) => r.corroborating_sources || [])),
  ];
  const allNotes = validResults
    .map((r) => r.notes)
    .filter(Boolean);
  const modelNames = validResults
    .map((r) => r._model)
    .filter(Boolean);

  return {
    verified: verifiedCount >= Math.ceil(validResults.length / 2), // majority vote
    confidence: avgConfidence,
    corroborating_sources: allSources,
    notes: allNotes[0] || "",
    crossVerification: {
      modelsQueried: VERIFICATION_MODELS.length,
      modelsResponded: validResults.length,
      modelsConfirmed: verifiedCount,
      modelNames,
      consensus:
        verifiedCount === validResults.length
          ? "UNANIM CONFIRMAT"
          : verifiedCount > 0
            ? "PARȚIAL CONFIRMAT"
            : "NECONFIRMAT",
    },
  };
}

// ── Breaking news for ticker (uses DeepSeek V3) ──
export async function fetchBreakingNews(apiKey) {
  const breakingModel = AI_MODELS[1].id; // DeepSeek V3
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const prompt = `Today is ${today}. Report the absolute latest breaking news about the Iran-Israel-US conflict.
Check Reuters, AP, Al Jazeera, BBC, CNN, Times of Israel, Iran International.
Return ONLY a JSON array (no markdown, no backticks): [{"text":"<headline in Romanian max 20 words>","severity":<1-5>,"time":"<when>"}] — exactly 6 items.`;
  const { text } = await callLLM(apiKey, prompt, breakingModel);
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
    this.onLog?.({
      time: new Date().toLocaleTimeString("ro-RO"),
      message: msg,
      type,
    });
  }

  async runFullCycle() {
    this.cycleCount++;
    const modelList = AI_MODELS.map((m) => m.name).join(", ");
    this.log(
      `Ciclul #${this.cycleCount} — ${AI_MODELS.length} modele AI active: ${modelList}`,
      "system"
    );

    try {
      const results = await runAllAgents(this.apiKey, (progress) => {
        this.onAgentStatus?.(progress);
        if (progress.status === "done") {
          this.log(
            `${progress.agentId.toUpperCase()}: ${progress.count} rapoarte — ${progress.message}`,
            "success"
          );
        } else if (progress.status === "error") {
          this.log(
            `${progress.agentId.toUpperCase()}: EROARE — ${progress.message}`,
            "error"
          );
        }
      });

      const totalItems = Object.values(results).flat().length;
      let analysisResult = null;
      let breakingResult = [];

      if (totalItems > 0) {
        this.log(
          `Analiză strategică via ${getModelName(AI_MODELS[0].id)} + breaking news via ${getModelName(AI_MODELS[1].id)}...`,
          "system"
        );
        const [analysis, breaking] = await Promise.allSettled([
          runAnalysis(this.apiKey, results),
          fetchBreakingNews(this.apiKey),
        ]);
        analysisResult =
          analysis.status === "fulfilled" ? analysis.value : null;
        breakingResult =
          breaking.status === "fulfilled" ? breaking.value : [];
        if (analysisResult) this.log("Analiză completă", "success");
        else if (analysis.status === "rejected")
          this.log(
            `Analiză eșuată: ${analysis.reason?.message?.slice(0, 80)}`,
            "error"
          );
      } else {
        this.log(
          "Niciun raport colectat — verifică API key",
          "error"
        );
      }

      // Count models used
      const modelsUsed = [
        ...new Set(
          Object.values(results)
            .flat()
            .map((i) => i.aiModel)
            .filter(Boolean)
        ),
      ];

      this.onUpdate?.({
        intel: results,
        analysis: analysisResult,
        breaking: breakingResult,
        timestamp: Date.now(),
        cycle: this.cycleCount,
        modelsUsed,
      });

      this.log(
        `Ciclu #${this.cycleCount} complet — ${totalItems} rapoarte din ${modelsUsed.length} modele AI`,
        totalItems > 0 ? "success" : "error"
      );
    } catch (err) {
      this.log(
        `Eroare ciclu #${this.cycleCount}: ${err.message}`,
        "error"
      );
    }
  }

  start(intervalSec = 300) {
    if (this.running) return;
    this.running = true;
    this.log(
      `Sistem pornit — ${AI_MODELS.length} modele AI: ${AI_MODELS.map((m) => `${m.icon} ${m.name}`).join(" | ")}`,
      "system"
    );
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
