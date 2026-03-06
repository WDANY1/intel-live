import { useState, useEffect, useRef } from "react";
import { AI_MODELS, OSINT_SOURCES, NEWS_CHANNELS, AGENTS } from "./config";

// Animated counter
function Counter({ end, duration = 2000, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Floating particles
function Particles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 10}s`,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", bottom: "-10px", left: p.left,
          width: p.size, height: p.size, borderRadius: "50%",
          background: i % 3 === 0 ? "#00E5FF" : i % 3 === 1 ? "#FF3B30" : "#A78BFA",
          opacity: p.opacity,
          animation: `floatParticle ${p.duration} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
    </div>
  );
}

// Radar sweep animation
function RadarSweep() {
  return (
    <div style={{ position: "absolute", width: 300, height: 300, left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", opacity: 0.12 }}>
      {/* Circles */}
      {[1, 0.7, 0.4].map((scale, i) => (
        <div key={i} style={{
          position: "absolute", inset: `${(1 - scale) * 50}%`,
          borderRadius: "50%", border: "1px solid rgba(0,229,255,0.3)",
        }} />
      ))}
      {/* Sweep */}
      <div style={{
        position: "absolute", inset: 0,
        background: "conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.15) 10%, transparent 20%)",
        borderRadius: "50%",
        animation: "radarSweep 4s linear infinite",
      }} />
      {/* Center dot */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 6, height: 6, borderRadius: "50%", background: "#00E5FF",
        boxShadow: "0 0 12px rgba(0,229,255,0.6)",
      }} />
    </div>
  );
}

export default function LandingPage({ onEnter }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const features = [
    { icon: "🗺️", title: "INTERACTIVE WAR MAP", desc: "Conflict heatmap, event markers, layer controls, timeline slider. 45+ strategic locations tracked.", color: "#00E5FF" },
    { icon: "📡", title: "7 AI AGENTS", desc: "SIGINT, OSINT, HUMINT, GEOINT, ECONINT, PROXY, DIPLO — autonomous intelligence gathering.", color: "#FF3B30" },
    { icon: "🧠", title: "MULTI-MODEL AI", desc: `${AI_MODELS.length} free AI models with cross-verification consensus. Real-time analysis.`, color: "#A78BFA" },
    { icon: "🚢", title: "MARITIME TRACKER", desc: "6 strategic chokepoints. Hormuz, Bab el-Mandeb, Suez. US Navy vessel tracking.", color: "#00E5FF" },
    { icon: "📹", title: "LIVE CAMERAS", desc: "Live feeds from Jerusalem, Tel Aviv, Dubai, Mecca, Beirut + 24/7 news streams.", color: "#FFB020" },
    { icon: "⚡", title: "REAL-TIME SIGNALS", desc: "Severity classification, source reliability, location extraction, automated alerts.", color: "#30D158" },
  ];

  return (
    <div className="landing-root" style={{ background: "#0B0F14" }}>

      {/* ═══ HERO SECTION ═══ */}
      <section style={{
        position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", overflow: "hidden",
        scrollSnapAlign: "start",
      }}>
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,229,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.02) 1px, transparent 1px)",
          backgroundSize: "50px 50px", pointerEvents: "none",
        }} />

        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          width: 800, height: 600,
          background: "radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, rgba(255,59,48,0.03) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <Particles />
        <RadarSweep />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 10, textAlign: "center", maxWidth: 900, padding: "0 24px",
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Classification badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 20,
            background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
            marginBottom: 24,
            animation: loaded ? "fadeInUp 0.6s ease 0.2s both" : "none",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF3B30", animation: "pulse 1.5s ease infinite" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: 3, color: "#FF3B30", fontWeight: 600 }}>
              CLASSIFIED · INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "var(--display)", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 800,
            lineHeight: 0.95, marginBottom: 16, letterSpacing: -2,
            animation: loaded ? "fadeInUp 0.8s ease 0.3s both" : "none",
          }}>
            <span style={{ color: "#00E5FF" }}>INTEL</span>
            <span style={{ color: "#E5E7EB" }}>LIVE</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "var(--display)", fontSize: "clamp(0.9rem, 2vw, 1.15rem)", color: "rgba(229,231,235,0.5)",
            maxWidth: 550, margin: "0 auto 32px", lineHeight: 1.6, fontWeight: 400,
            animation: loaded ? "fadeInUp 0.8s ease 0.5s both" : "none",
          }}>
            Advanced Multi-Agent AI Platform for Real-Time Conflict Monitoring, Signal Intelligence & Geopolitical Analysis
          </p>

          {/* Stats row */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 32, marginBottom: 40, flexWrap: "wrap",
            animation: loaded ? "fadeInUp 0.8s ease 0.7s both" : "none",
          }}>
            {[
              { value: 7, suffix: "", label: "AI AGENTS", color: "#FF3B30" },
              { value: AI_MODELS.length, suffix: "", label: "AI MODELS", color: "#A78BFA" },
              { value: OSINT_SOURCES.length, suffix: "+", label: "OSINT SOURCES", color: "#00E5FF" },
              { value: NEWS_CHANNELS.length, suffix: "", label: "NEWS FEEDS", color: "#FFB020" },
              { value: 45, suffix: "+", label: "LOCATIONS", color: "#30D158" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "1.8rem", fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 2, color: "rgba(229,231,235,0.3)", marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            style={{
              position: "relative", padding: "16px 48px", borderRadius: 8,
              background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))",
              border: "1px solid rgba(0,229,255,0.3)",
              color: "#00E5FF", fontFamily: "var(--mono)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: 3,
              cursor: "pointer", overflow: "hidden",
              animation: loaded ? "fadeInUp 0.8s ease 0.9s both" : "none",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,229,255,0.2)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.6)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0,229,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ENTER COMMAND CENTER →
          </button>

          {/* Scroll hint */}
          <div style={{
            marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: loaded ? "fadeIn 1s ease 1.5s both" : "none",
          }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 2, color: "rgba(229,231,235,0.2)" }}>SCROLL</span>
            <div style={{ width: 1, height: 30, background: "linear-gradient(to bottom, rgba(0,229,255,0.3), transparent)" }} />
          </div>
        </div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <section style={{
        position: "relative", minHeight: "100vh", padding: "80px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        scrollSnapAlign: "start",
      }}>
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "40px 40px", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1000, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: "0.55rem", letterSpacing: 4, color: "#00E5FF", marginBottom: 12,
            }}>CAPABILITIES</div>
            <h2 style={{
              fontFamily: "var(--display)", fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 700, color: "#E5E7EB",
              letterSpacing: -1,
            }}>
              Intelligence Grade Platform
            </h2>
            <p style={{ fontFamily: "var(--sans)", fontSize: "0.85rem", color: "rgba(229,231,235,0.4)", maxWidth: 500, margin: "8px auto 0" }}>
              Built for analysts. Powered by AI. Real-time global monitoring.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} delay={i * 0.1} />
            ))}
          </div>

          {/* Agents showcase */}
          <div style={{ marginTop: 48, padding: "24px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 3, color: "rgba(229,231,235,0.25)", marginBottom: 16, textAlign: "center" }}>AUTONOMOUS INTELLIGENCE AGENTS</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {AGENTS.map((agent) => (
                <div key={agent.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                  background: `${agent.color}08`, border: `1px solid ${agent.color}22`, borderRadius: 6,
                }}>
                  <span style={{ fontSize: "1rem" }}>{agent.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", fontWeight: 700, color: agent.color }}>{agent.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(229,231,235,0.3)" }}>{agent.fullName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Models */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {AI_MODELS.map((m) => (
              <span key={m.id} style={{
                fontFamily: "var(--mono)", fontSize: "0.48rem", color: m.color,
                padding: "3px 10px", background: `${m.color}0A`, border: `1px solid ${m.color}22`, borderRadius: 4,
              }}>
                {m.icon} {m.name}
              </span>
            ))}
          </div>

          {/* Final CTA */}
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button
              onClick={onEnter}
              style={{
                padding: "14px 40px", borderRadius: 6,
                background: "#00E5FF", color: "#0B0F14",
                fontFamily: "var(--mono)", fontSize: "0.78rem", fontWeight: 800, letterSpacing: 2,
                cursor: "pointer", transition: "all 0.3s",
                boxShadow: "0 0 20px rgba(0,229,255,0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 40px rgba(0,229,255,0.5)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(0,229,255,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              LAUNCH PLATFORM →
            </button>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "rgba(229,231,235,0.2)", marginTop: 10 }}>
              FREE · No registration · OpenRouter API Key required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ feature, delay }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        padding: "20px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${feature.color}10`, border: `1px solid ${feature.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
        }}>
          {feature.icon}
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", fontWeight: 700, color: feature.color, letterSpacing: 1 }}>
          {feature.title}
        </span>
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: "0.72rem", color: "rgba(229,231,235,0.45)", lineHeight: 1.6, margin: 0 }}>
        {feature.desc}
      </p>
    </div>
  );
}
