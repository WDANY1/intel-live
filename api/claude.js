// Vercel Serverless Function — Proxy to Anthropic API

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET = health check
  if (req.method === "GET") {
    const hasEnvKey = !!process.env.ANTHROPIC_API_KEY;
    return res.status(200).json({
      status: "ok",
      hasApiKey: hasEnvKey,
      message: hasEnvKey
        ? "Serverless function OK. ANTHROPIC_API_KEY is set."
        : "Serverless function OK but ANTHROPIC_API_KEY env var is NOT set. Set it in Vercel Settings > Environment Variables.",
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // API key: prefer server env var, fallback to client header
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({
      error: "No API key available",
      hint: "Set ANTHROPIC_API_KEY in Vercel > Settings > Environment Variables, then redeploy.",
    });
  }

  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).json({ error: "Non-JSON response from Anthropic", body: text.slice(0, 500) });
    }
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({
      error: "Proxy request failed",
      details: err.message,
      hint: "Check Vercel function logs for more details.",
    });
  }
};
