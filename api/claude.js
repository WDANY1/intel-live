// Vercel Serverless Function — Proxy to OpenRouter API (Gemini)

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Aici am pus cel mai bun model Gemini. 
// Dacă vrei varianta 100% gratuită de pe OpenRouter, modifică în: "google/gemini-2.5-flash:free"
const MODEL = "google/gemini-3-flash:free";

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
        engine: MODEL,
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Căutăm noua cheie de OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY || req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({
        error: "No API key",
        hint: "Set OPENROUTER_API_KEY in Vercel > Settings > Environment Variables",
      });
    }

    const { prompt } = req.body;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://intel-live.vercel.app", // Ajută OpenRouter să știe de unde vine cererea
        "X-Title": "Intel Live" // Numele site-ului tău
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an elite military intelligence analyst specializing in Middle East geopolitics, specifically the Iran-Israel-US conflict. Provide detailed, structured intelligence reports. Always respond with valid JSON when asked for JSON. Use your knowledge up to your training cutoff to provide the most recent and relevant analysis.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `OpenRouter API error ${response.status}`,
        details: data,
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ text, sources: [], raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
