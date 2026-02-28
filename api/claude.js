// Vercel Serverless Function — Proxy to Anthropic API
// Avoids CORS issues by routing through same-origin server

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API key: prefer server env var, fallback to client header
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "No API key provided" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward status and data
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy request failed", details: err.message });
  }
}
