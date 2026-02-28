// Vercel Serverless Function — Proxy to Gemini API with Grounding (Web Search)

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
        hasApiKey: !!process.env.GEMINI_API_KEY,
        runtime: process.version,
        engine: "gemini-2.0-flash",
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.GEMINI_API_KEY || req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({
        error: "No API key",
        hint: "Set GEMINI_API_KEY in Vercel > Settings > Environment Variables",
      });
    }

    const { prompt, useGrounding } = req.body;

    // Build Gemini request
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    // Add Google Search grounding when requested
    if (useGrounding !== false) {
      geminiBody.tools = [{ google_search: {} }];
    }

    const url = `${GEMINI_URL}?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API error",
        details: data,
      });
    }

    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n") || "";

    // Extract grounding sources if available
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map((c) => ({
      title: c.web?.title || "",
      url: c.web?.uri || "",
    })) || [];

    return res.status(200).json({ text, sources, raw: data });
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
