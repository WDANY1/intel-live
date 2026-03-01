// Vercel Serverless Function — Multi-Model Proxy to OpenRouter API (Free Models)

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-3-27b-it:free";

const ALLOWED_MODELS = [
  "google/gemma-3-27b-it:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-4-scout:free",
  "qwen/qwq-32b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "deepseek/deepseek-r1-0528:free",
];

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

    if (req.method === "OPTIONS") return res.status(200).end();

    // GET = health check
    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        hasApiKey: !!process.env.OPENROUTER_API_KEY,
        runtime: process.version,
        engine: "Multi-Model (5 AI — Gemma, DeepSeek, QwQ, Mistral)",
        models: ALLOWED_MODELS,
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.OPENROUTER_API_KEY || req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({
        error: "No API key",
        hint: "Set OPENROUTER_API_KEY in Vercel > Settings > Environment Variables (get free key from openrouter.ai)",
      });
    }

    const { prompt, model: requestedModel } = req.body;

    // Validate model — only allow whitelisted free models
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;

    const messages = [
      {
        role: "system",
        content:
          "You are an elite military intelligence analyst specializing in Middle East geopolitics (Iran-Israel-US conflict). Provide detailed, structured intelligence reports. Always respond with valid JSON when asked. Use the most recent knowledge available. Respond based on real events and verified information.",
      },
      { role: "user", content: prompt },
    ];

    const makeRequest = async (useModel) => {
      return fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://intel-live.vercel.app",
          "X-Title": "Intel Live Dashboard",
        },
        body: JSON.stringify({
          model: useModel,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
    };

    // Try requested model, then fallback through other models on 404/429/503
    const RETRY_CODES = [404, 429, 503];
    const tryOrder = [model, ...ALLOWED_MODELS.filter((m) => m !== model)];
    let response, data, usedModel;

    for (const tryModel of tryOrder) {
      response = await makeRequest(tryModel);
      data = await response.json();
      usedModel = tryModel;
      if (response.ok || !RETRY_CODES.includes(response.status)) break;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `OpenRouter API error ${response.status}`,
        model: usedModel,
        details: data,
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ text, model: usedModel, sources: [], raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
