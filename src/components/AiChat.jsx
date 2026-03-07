import { useState, useRef, useEffect } from "react";

export default function AiChat({ apiKey, allItems, analysis }) {
  const [messages, setMessages] = useState([
    { role: "system", text: "Intel Analyst AI ready. Ask me about the current situation, threats, predictions, or any intelligence query.", time: new Date().toLocaleTimeString("ro-RO") }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !apiKey || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg, time: new Date().toLocaleTimeString("ro-RO") }]);
    setLoading(true);

    try {
      // Build context from current intel
      const topItems = allItems
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, 10)
        .map((i) => `[S${i.severity}] ${i.headline}: ${i.summary} (${i.source})`)
        .join("\n");

      const analysisCtx = analysis
        ? `Current threat level: ${analysis.threat_level}/10 (${analysis.threat_label}). Escalation: ${analysis.escalation_probability}%. Summary: ${analysis.situation_summary}`
        : "No analysis available yet.";

      const prompt = `You are an elite intelligence analyst AI assistant embedded in a real-time OSINT dashboard.
Current intelligence context:
${analysisCtx}

Top signals:
${topItems || "No signals collected yet."}

The user asks: "${userMsg}"

Provide a concise, analytical response in 2-4 sentences. Be direct, use intelligence terminology. If relevant, reference specific signals or threat levels. Respond in the same language as the question.`;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey.replace(/[^\x20-\x7E]/g, "").trim() },
        body: JSON.stringify({ prompt, model: "google/gemma-3-27b-it:free" }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "ai",
        text: data.text || "Unable to process query.",
        time: new Date().toLocaleTimeString("ro-RO"),
        model: data.model,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", text: `Error: ${err.message}`, time: new Date().toLocaleTimeString("ro-RO") }]);
    }
    setLoading(false);
  };

  const quickQueries = [
    "What's the current threat assessment?",
    "Which regions are most at risk?",
    "Predict next 24h escalation",
    "Summarize all critical signals",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            padding: "10px 14px",
            borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
            background: msg.role === "user" ? "rgba(0,229,255,0.1)" : msg.role === "error" ? "rgba(255,59,48,0.1)" : "var(--bg-card)",
            border: `1px solid ${msg.role === "user" ? "rgba(0,229,255,0.2)" : msg.role === "error" ? "rgba(255,59,48,0.2)" : "var(--border)"}`,
            animation: "fadeInUp 0.3s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: "0.7rem" }}>
                {msg.role === "user" ? "👤" : msg.role === "error" ? "⚠️" : msg.role === "system" ? "🤖" : "🧠"}
              </span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: 1,
                color: msg.role === "user" ? "var(--accent)" : msg.role === "error" ? "#FF3B30" : msg.role === "system" ? "var(--purple)" : "#30D158",
              }}>
                {msg.role === "user" ? "YOU" : msg.role === "system" ? "SYSTEM" : "ANALYST AI"}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>{msg.time}</span>
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {msg.text}
            </div>
            {msg.model && (
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginTop: 4 }}>via {msg.model}</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "var(--bg-card)", borderRadius: "12px 12px 12px 4px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 14, height: 14, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--accent)" }}>Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick queries */}
      {messages.length <= 2 && (
        <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid var(--border)" }}>
          {quickQueries.map((q) => (
            <button key={q} onClick={() => { setInput(q); }} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: "0.7rem", fontFamily: "var(--mono)",
              background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder={apiKey ? "Ask the AI analyst..." : "API key required"}
          disabled={!apiKey || loading}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontFamily: "var(--sans)", fontSize: "0.85rem",
          }}
        />
        <button onClick={handleSend} disabled={!apiKey || loading || !input.trim()} style={{
          padding: "10px 16px", borderRadius: "var(--radius-sm)",
          background: input.trim() && apiKey ? "var(--accent)" : "var(--bg-card)",
          color: input.trim() && apiKey ? "#0B0F14" : "var(--text-muted)",
          fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700,
          border: `1px solid ${input.trim() && apiKey ? "var(--accent)" : "var(--border)"}`,
          cursor: input.trim() && apiKey ? "pointer" : "default",
        }}>SEND</button>
      </div>
    </div>
  );
}
