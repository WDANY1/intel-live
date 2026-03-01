// Vercel Serverless Function — Multi-Model Proxy to OpenRouter API (Free Models)

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-pro-exp-03-25:free";

const ALLOWED_MODELS = [
  "google/gemini-2.5-pro-exp-03-25:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-4-scout:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
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
        engine: "Multi-Model (5 AI)",
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

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://intel-live.vercel.app",
        "X-Title": "Intel Live Dashboard",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an elite military intelligence analyst specializing in Middle East geopolitics (Iran-Israel-US conflict). Provide detailed, structured intelligence reports. Always respond with valid JSON when asked. Use the most recent knowledge available. Respond based on real events and verified information.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `OpenRouter API error ${response.status}`,
        model,
        details: data,
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ text, model, sources: [], raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
