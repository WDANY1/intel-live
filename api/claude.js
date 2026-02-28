// Vercel Serverless Function — Proxy to Anthropic API
// Using ESM (export default) because package.json has "type": "module"

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

    if (req.method === "OPTIONS") return res.status(200).end();

    // GET = health check
    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        runtime: process.version,
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const apiKey = process.env.ANTHROPIC_API_KEY || req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({
        error: "No API key",
        hint: "Set ANTHROPIC_API_KEY in Vercel > Settings > Environment Variables",
      });
    }

    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Function error", details: String(err) });
  }
}
