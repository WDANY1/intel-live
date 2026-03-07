// Vercel Serverless — Multi-Provider AI Proxy (Free Models)
// Supports: OpenRouter, Groq, Google Gemini

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const OPENROUTER_MODELS = [
  "google/gemma-3-27b-it:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwq-32b:free",
  "meta-llama/llama-4-scout:free",
  "openrouter/free",
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
];

const RETRY_CODES = [400, 404, 429, 502, 503];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        providers: ["openrouter", "groq", "gemini"],
        hasKeys: {
          openrouter: !!process.env.OPENROUTER_API_KEY,
          groq: !!process.env.GROQ_API_KEY,
          gemini: !!process.env.GEMINI_API_KEY,
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

    // Try API key from headers (user-provided) or env vars (server-side)
    const userKey = req.headers["x-api-key"];
    const openrouterKey = userKey || process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let text = "", usedModel = "", lastError = "";

    // Strategy 1: Try Groq first (fastest, free tier)
    if (groqKey) {
      for (const model of GROQ_MODELS) {
        try {
          const response = await callGroq(groqKey, messages, model);
          const data = await response.json();
          if (response.ok && data.choices?.[0]?.message?.content) {
            text = data.choices[0].message.content;
            usedModel = `groq/${model}`;
            break;
          }
          lastError = data.error?.message || `Groq ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    // Strategy 2: Try Gemini (free, generous limits)
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

    // Strategy 3: Try OpenRouter (many free models)
    if (!text && openrouterKey) {
      const model = OPENROUTER_MODELS.includes(requestedModel) ? requestedModel : OPENROUTER_MODELS[0];
      const tryOrder = [model, ...OPENROUTER_MODELS.filter((m) => m !== model)];

      for (let i = 0; i < tryOrder.length; i++) {
        try {
          const response = await callOpenRouter(openrouterKey, messages, tryOrder[i]);
          const data = await response.json();
          if (response.ok && data.choices?.[0]?.message?.content) {
            text = data.choices[0].message.content;
            usedModel = tryOrder[i];
            break;
          }
          lastError = data.error?.message || `OpenRouter ${response.status}`;
          if (response.status === 429) { await sleep(300); continue; }
          if (!RETRY_CODES.includes(response.status)) break;
        } catch (e) { lastError = e.message; }
      }
    }

    if (!text) {
      return res.status(503).json({
        error: lastError || "All AI providers failed",
        hint: "Set OPENROUTER_API_KEY and/or GROQ_API_KEY and/or GEMINI_API_KEY in Vercel environment variables",
      });
    }

    return res.status(200).json({ text, model: usedModel, sources: [] });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
