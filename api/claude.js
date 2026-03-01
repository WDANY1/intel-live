// Vercel Serverless Function — Proxy to Groq API (Free, no billing required)

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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
        hasApiKey: !!process.env.GROQ_API_KEY,
        runtime: process.version,
        engine: MODEL,
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.GROQ_API_KEY || req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({
        error: "No API key",
        hint: "Set GROQ_API_KEY in Vercel > Settings > Environment Variables",
      });
    }

    const { prompt } = req.body;

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
        error: data.error?.message || `Groq API error ${response.status}`,
        details: data,
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ text, sources: [], raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
