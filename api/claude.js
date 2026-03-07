// Vercel Serverless — Multi-Provider AI Proxy (Free Models)
// Supports: OpenRouter, Groq, Cerebras, Mistral, Google Gemini, HuggingFace
// All providers have free tiers — no credit card required

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const HF_URL = "https://api-inference.huggingface.co/models";

// OpenRouter free models (March 2026) — all :free suffix = no cost
const OPENROUTER_MODELS = [
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-4-scout:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwq-32b:free",
  "nvidia/llama-3.1-nemotron-ultra-253b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "deepseek/deepseek-r1-zero:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

// Groq free tier models (fastest inference)
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
];

// Cerebras free tier models (ultra-fast inference)
const CEREBRAS_MODELS = [
  "llama-3.3-70b",
  "llama-3.1-8b",
];

// Mistral free tier models (Experiment plan — phone verified, no card)
const MISTRAL_MODELS = [
  "mistral-small-latest",
  "open-mistral-nemo",
];

// HuggingFace free inference models
const HF_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.3",
  "meta-llama/Meta-Llama-3-8B-Instruct",
];

const RETRY_CODES = [400, 404, 429, 502, 503];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── OpenRouter (OpenAI-compatible, many free models) ──
async function callOpenRouter(apiKey, messages, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://intel-live.vercel.app",
        "X-Title": "Intel Live Dashboard",
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Groq (fastest LPU inference, free tier) ──
async function callGroq(apiKey, messages, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Cerebras (ultra-fast inference, free tier, no card) ──
async function callCerebras(apiKey, messages, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Mistral AI (free Experiment plan, OpenAI-compatible) ──
async function callMistral(apiKey, messages, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(MISTRAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Google Gemini (free, generous limits via AI Studio) ──
async function callGemini(apiKey, prompt, model = "gemini-2.0-flash") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${GEMINI_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
      }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ── HuggingFace Inference API (free tier, many models) ──
async function callHuggingFace(apiKey, messages, model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  try {
    const res = await fetch(`${HF_URL}/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 4000, temperature: 0.7, return_full_text: false },
      }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Helper: extract text from OpenAI-compatible response
function extractOpenAIText(data) {
  return data?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        providers: ["openrouter", "groq", "cerebras", "mistral", "gemini", "huggingface"],
        hasKeys: {
          openrouter: !!process.env.OPENROUTER_API_KEY,
          groq: !!process.env.GROQ_API_KEY,
          cerebras: !!process.env.CEREBRAS_API_KEY,
          mistral: !!process.env.MISTRAL_API_KEY,
          gemini: !!process.env.GEMINI_API_KEY,
          huggingface: !!process.env.HF_API_KEY,
        },
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { prompt, model: requestedModel } = req.body;
    const systemPrompt = "You are an elite military intelligence analyst specializing in Middle East geopolitics (Iran-Israel-US conflict). Provide detailed, structured intelligence reports. Always respond with valid JSON when asked. Use the most recent knowledge available. Respond based on real events and verified information. Cross-reference information from BOTH Western and Iranian/regional sources for balanced reporting.";

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    // Collect all available API keys
    const userKey = req.headers["x-api-key"];
    // Ignore placeholder "server-side" key from frontend
    const realUserKey = userKey && userKey !== "server-side" ? userKey : null;
    const openrouterKey = realUserKey || process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const hfKey = process.env.HF_API_KEY;

    let text = "", usedModel = "", lastError = "";

    // ═══ Strategy 1: Groq (fastest, free tier) ═══
    if (!text && groqKey) {
      for (const model of GROQ_MODELS) {
        try {
          const response = await callGroq(groqKey, messages, model);
          const data = await response.json();
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data);
            usedModel = `groq/${model}`;
            break;
          }
          lastError = data.error?.message || `Groq ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    // ═══ Strategy 2: Cerebras (ultra-fast, free tier) ═══
    if (!text && cerebrasKey) {
      for (const model of CEREBRAS_MODELS) {
        try {
          const response = await callCerebras(cerebrasKey, messages, model);
          const data = await response.json();
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data);
            usedModel = `cerebras/${model}`;
            break;
          }
          lastError = data.error?.message || `Cerebras ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    // ═══ Strategy 3: Mistral AI (free Experiment plan) ═══
    if (!text && mistralKey) {
      for (const model of MISTRAL_MODELS) {
        try {
          const response = await callMistral(mistralKey, messages, model);
          const data = await response.json();
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data);
            usedModel = `mistral/${model}`;
            break;
          }
          lastError = data.error?.message || `Mistral ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    // ═══ Strategy 4: Google Gemini (free via AI Studio) ═══
    if (!text && geminiKey) {
      try {
        const response = await callGemini(geminiKey, `${systemPrompt}\n\n${prompt}`);
        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = data.candidates[0].content.parts[0].text;
          usedModel = "gemini-2.0-flash";
        } else {
          lastError = data.error?.message || `Gemini ${response.status}`;
        }
      } catch (e) { lastError = e.message; }
    }

    // ═══ Strategy 5: OpenRouter (many free models, fallback) ═══
    if (!text && openrouterKey) {
      const model = OPENROUTER_MODELS.includes(requestedModel) ? requestedModel : OPENROUTER_MODELS[0];
      const tryOrder = [model, ...OPENROUTER_MODELS.filter((m) => m !== model)];

      for (let i = 0; i < tryOrder.length; i++) {
        try {
          const response = await callOpenRouter(openrouterKey, messages, tryOrder[i]);
          const data = await response.json();
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data);
            usedModel = tryOrder[i];
            break;
          }
          lastError = data.error?.message || `OpenRouter ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    // ═══ Strategy 6: HuggingFace Inference (free tier, last resort) ═══
    if (!text && hfKey) {
      for (const model of HF_MODELS) {
        try {
          const response = await callHuggingFace(hfKey, messages, model);
          const data = await response.json();
          if (response.ok) {
            const hfText = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            if (hfText) {
              text = hfText;
              usedModel = `hf/${model.split("/").pop()}`;
              break;
            }
          }
          lastError = data.error || `HuggingFace ${response.status}`;
          if (response.status === 503) { await sleep(1000); continue; } // model loading
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    if (!text) {
      return res.status(503).json({
        error: lastError || "All AI providers failed",
        providers_checked: [
          groqKey ? "groq" : null,
          cerebrasKey ? "cerebras" : null,
          mistralKey ? "mistral" : null,
          geminiKey ? "gemini" : null,
          openrouterKey ? "openrouter" : null,
          hfKey ? "huggingface" : null,
        ].filter(Boolean),
        hint: "Set at least one API key in Vercel env vars: OPENROUTER_API_KEY (easiest — free, no card), GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, GEMINI_API_KEY, HF_API_KEY",
      });
    }

    return res.status(200).json({ text, model: usedModel, sources: [] });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
