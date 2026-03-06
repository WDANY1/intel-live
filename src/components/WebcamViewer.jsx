import { useState } from "react";
import { LIVE_WEBCAMS, WEBCAM_REGIONS } from "../config";

// YouTube cameras with verified thumbnail IDs + channel live links
const WEBCAM_FEEDS = [
  // Israel
  {
    id: "jNZM_H6q1rY", name: "Western Wall Live", city: "Jerusalem", country: "Israel", flag: "🇮🇱",
    region: "israel", source: "Jerusalem Municipality",
    liveUrl: "https://www.youtube.com/watch?v=jNZM_H6q1rY",
    channelUrl: "https://www.youtube.com/@jerusalemunited/live",
  },
  {
    id: "LMM0FN5jJaE", name: "Tel Aviv Beach & Skyline", city: "Tel Aviv", country: "Israel", flag: "🇮🇱",
    region: "israel", source: "TLV City Cam",
    liveUrl: "https://www.youtube.com/watch?v=LMM0FN5jJaE",
    channelUrl: "https://www.youtube.com/@telavivlive/live",
  },
  {
    id: "uEMKGCKBKdQ", name: "Haifa Port", city: "Haifa", country: "Israel", flag: "🇮🇱",
    region: "israel", source: "Port of Haifa",
    liveUrl: "https://www.youtube.com/watch?v=uEMKGCKBKdQ",
    channelUrl: "https://www.youtube.com/watch?v=uEMKGCKBKdQ",
  },
  // Gulf
  {
    id: "4K_-EhKjYjs", name: "Dubai Skyline 24/7", city: "Dubai", country: "UAE", flag: "🇦🇪",
    region: "gulf", source: "Dubai Tourism",
    liveUrl: "https://www.youtube.com/watch?v=4K_-EhKjYjs",
    channelUrl: "https://www.youtube.com/@visitdubai/live",
  },
  {
    id: "9eN4Jbxvbyg", name: "Mecca - Masjid al-Haram", city: "Mecca", country: "Arabia Saudită", flag: "🇸🇦",
    region: "gulf", source: "Haramain",
    liveUrl: "https://www.youtube.com/watch?v=9eN4Jbxvbyg",
    channelUrl: "https://www.youtube.com/@haramainlive/live",
  },
  {
    id: "C6GKe0skDDE", name: "Doha West Bay", city: "Doha", country: "Qatar", flag: "🇶🇦",
    region: "gulf", source: "Qatar City Cam",
    liveUrl: "https://www.youtube.com/watch?v=C6GKe0skDDE",
    channelUrl: "https://www.youtube.com/watch?v=C6GKe0skDDE",
  },
  // Levant
  {
    id: "KJGASBMieBo", name: "Beirut City View", city: "Beirut", country: "Liban", flag: "🇱🇧",
    region: "levant", source: "Beirut Cam",
    liveUrl: "https://www.youtube.com/watch?v=KJGASBMieBo",
    channelUrl: "https://www.youtube.com/watch?v=KJGASBMieBo",
  },
  {
    id: "wDkHBAdYXD0", name: "Istanbul Bosphorus", city: "Istanbul", country: "Turcia", flag: "🇹🇷",
    region: "levant", source: "Istanbul Cam",
    liveUrl: "https://www.youtube.com/watch?v=wDkHBAdYXD0",
    channelUrl: "https://www.youtube.com/@istanbullive/live",
  },
];

// Live 24/7 news streams - always work
const NEWS_LIVE_STREAMS = [
  {
    name: "Al Jazeera English", short: "Al Jazeera", color: "#06b6d4", icon: "📡",
    embedId: "nSon3dyDgV0",
    channelUrl: "https://www.youtube.com/@AlJazeeraEnglish/live",
    description: "Middle East & Global News",
  },
  {
    name: "France 24 English", short: "France 24", color: "#3b82f6", icon: "📺",
    embedId: "l8pmfNyEoAE",
    channelUrl: "https://www.youtube.com/@FRANCE24English/live",
    description: "International News 24/7",
  },
  {
    name: "DW News English", short: "DW News", color: "#8b5cf6", icon: "📺",
    embedId: "7cHsY5Xyv1w",
    channelUrl: "https://www.youtube.com/@dwnews/live",
    description: "Deutsche Welle International",
  },
  {
    name: "Sky News Live", short: "Sky News", color: "#f97316", icon: "📺",
    embedId: "9Auq9mYxFEE",
    channelUrl: "https://www.youtube.com/@SkyNews/live",
    description: "UK & World Breaking News",
  },
  {
    name: "BBC World News", short: "BBC World", color: "#ef4444", icon: "📺",
    embedId: "w_Ma8oQLmSM",
    channelUrl: "https://www.youtube.com/@BBCNews/live",
    description: "BBC International News",
  },
  {
    name: "Euronews", short: "Euronews", color: "#22c55e", icon: "📺",
    embedId: "wgMJMQTQEuY",
    channelUrl: "https://www.youtube.com/@euronews/live",
    description: "European & World News",
  },
];

function PulsingDot({ color = "#ef4444", size = 5 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, opacity: 0.4, animation: "pulseRing 2s ease-in-out infinite" }} />
    </span>
  );
}

function ThumbnailCard({ cam, onClick, compact = false }) {
  const [imgError, setImgError] = useState(false);
  const height = compact ? 54 : 120;
  const thumbUrl = `https://img.youtube.com/vi/${cam.id}/mqdefault.jpg`;

  return (
    <div
      onClick={() => onClick(cam)}
      style={{
        borderRadius: 6, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)", background: "#0a0e14",
        cursor: "pointer", transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.transform = "scale(1.01)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ position: "relative", height, background: "#0d1117", overflow: "hidden" }}>
        {!imgError ? (
          <img
            src={thumbUrl}
            alt={cam.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: "#0d1117" }}>
            <span style={{ fontSize: compact ? "1.2rem" : "2rem" }}>{cam.flag}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "rgba(255,255,255,0.3)" }}>{cam.city}</span>
          </div>
        )}
        {/* LIVE badge */}
        <div style={{
          position: "absolute", top: 5, left: 5, display: "flex", alignItems: "center", gap: 3,
          padding: "2px 5px", borderRadius: 3,
          background: "rgba(0,0,0,0.75)", border: "1px solid rgba(239,68,68,0.35)",
        }}>
          <PulsingDot color="#ef4444" size={4} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: "#ef4444", fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
        </div>
        {/* Flag */}
        <div style={{ position: "absolute", top: 5, right: 5, fontSize: compact ? "0.7rem" : "0.9rem" }}>{cam.flag}</div>
        {/* Play overlay */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0)", transition: "background 0.2s",
          opacity: 0,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "rgba(0,0,0,0.5)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; e.currentTarget.style.background = "rgba(0,0,0,0)"; }}
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "0.9rem", marginLeft: 2 }}>▶</span>
          </div>
        </div>
      </div>
      {!compact && (
        <div style={{ padding: "7px 9px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", fontWeight: 600, color: "#e2e8f0" }}>{cam.flag} {cam.name}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{cam.city}, {cam.country} · {cam.source}</div>
        </div>
      )}
    </div>
  );
}

function NewsStreamCard({ stream }) {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${stream.embedId}/mqdefault.jpg`;

  return (
    <a
      href={stream.channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        borderRadius: 6, overflow: "hidden",
        border: `1px solid ${stream.color}22`, background: "#0a0e14",
        transition: "all 0.2s", cursor: "pointer",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${stream.color}55`; e.currentTarget.style.transform = "scale(1.01)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${stream.color}22`; e.currentTarget.style.transform = "scale(1)"; }}
      >
        <div style={{ position: "relative", height: 80, background: "#0d1117", overflow: "hidden" }}>
          {!imgError ? (
            <img
              src={thumbUrl}
              alt={stream.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.7 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `${stream.color}10` }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "1rem", fontWeight: 800, color: stream.color }}>{stream.short.slice(0, 6)}</span>
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, rgba(10,14,20,0.9) 0%, transparent 50%)` }} />
          <div style={{ position: "absolute", top: 5, left: 5, display: "flex", alignItems: "center", gap: 3, padding: "2px 5px", borderRadius: 3, background: "rgba(0,0,0,0.75)", border: `1px solid ${stream.color}44` }}>
            <PulsingDot color={stream.color} size={4} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.38rem", color: stream.color, fontWeight: 700 }}>24/7</span>
          </div>
          <div style={{ position: "absolute", bottom: 4, left: 7, right: 7 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.58rem", fontWeight: 700, color: "#e2e8f0" }}>{stream.short}</div>
          </div>
        </div>
        <div style={{ padding: "5px 7px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: `${stream.color}99` }}>{stream.description}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.2)", marginTop: 1 }}>
            Deschide YouTube ↗
          </div>
        </div>
      </div>
    </a>
  );
}

function CameraModal({ cam, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#0a0e14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
        maxWidth: "90vw", width: 900, maxHeight: "90vh",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PulsingDot color="#ef4444" size={7} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0" }}>
              {cam.flag} {cam.name} — {cam.city}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href={cam.channelUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: "5px 12px", borderRadius: 5, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontFamily: "var(--mono)", fontSize: "0.58rem", fontWeight: 700, textDecoration: "none",
            }}>
              ↗ YOUTUBE LIVE
            </a>
            <button onClick={onClose} style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)", padding: 4 }}>✕</button>
          </div>
        </div>
        {/* Embed attempt - with notice */}
        <div style={{ padding: 16 }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${cam.id}?autoplay=1&mute=0&controls=1&rel=0`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={cam.name}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", color: "rgba(255,255,255,0.3)" }}>
              ⚠ Dacă video-ul nu se încarcă, deschide direct pe YouTube
            </span>
            <a href={cam.channelUrl} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: "var(--mono)", fontSize: "0.55rem", color: "#06b6d4", textDecoration: "none",
            }}>
              Deschide în YouTube →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WebcamViewer() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [selectedTab, setSelectedTab] = useState("cameras"); // cameras | news | links
  const [selectedCam, setSelectedCam] = useState(null);

  const filteredCams = regionFilter === "all"
    ? WEBCAM_FEEDS
    : WEBCAM_FEEDS.filter((c) => c.region === regionFilter);

  const filteredLinks = regionFilter === "all"
    ? LIVE_WEBCAMS
    : LIVE_WEBCAMS.filter((w) => w.region === regionFilter);

  const totalCameras = LIVE_WEBCAMS.reduce((a, c) => a + c.cameras.length, 0);

  const regions = [
    { id: "all", label: "TOATE", color: "#e2e8f0" },
    { id: "israel", label: "🇮🇱 ISRAEL", color: "#3b82f6" },
    { id: "gulf", label: "🏜️ GOLF", color: "#eab308" },
    { id: "levant", label: "🌍 LEVANT", color: "#f97316" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PulsingDot color="#ef4444" size={7} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", fontWeight: 700, color: "#ef4444", letterSpacing: 1 }}>CAMERE LIVE</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.25)" }}>
            {WEBCAM_FEEDS.length} embedded · {totalCameras} link-uri · {NEWS_LIVE_STREAMS.length} news
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {[
          { id: "cameras", label: "📹 CAMERE ORASE", count: WEBCAM_FEEDS.length },
          { id: "news", label: "📺 NEWS 24/7", count: NEWS_LIVE_STREAMS.length },
          { id: "links", label: "🔗 TOATE LINK-URI", count: totalCameras },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setSelectedTab(tab.id)} style={{
            flex: 1, padding: "8px 4px",
            fontFamily: "var(--mono)", fontSize: "0.5rem", fontWeight: 600, letterSpacing: 0.5,
            background: selectedTab === tab.id ? "rgba(255,255,255,0.04)" : "transparent",
            color: selectedTab === tab.id ? "#e2e8f0" : "rgba(255,255,255,0.3)",
            borderBottom: selectedTab === tab.id ? "2px solid #ef4444" : "2px solid transparent",
            cursor: "pointer",
          }}>
            {tab.label}
            <span style={{ marginLeft: 4, fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.25)" }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Region filters (only for cameras and links) */}
      {(selectedTab === "cameras" || selectedTab === "links") && (
        <div style={{ display: "flex", gap: 4, padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, flexWrap: "wrap" }}>
          {regions.map((r) => (
            <button key={r.id} onClick={() => setRegionFilter(r.id)} style={{
              padding: "3px 9px", borderRadius: 10,
              fontFamily: "var(--mono)", fontSize: "0.48rem",
              background: regionFilter === r.id ? `${r.color}15` : "rgba(255,255,255,0.02)",
              border: `1px solid ${regionFilter === r.id ? `${r.color}44` : "rgba(255,255,255,0.06)"}`,
              color: regionFilter === r.id ? r.color : "rgba(255,255,255,0.35)",
              cursor: "pointer",
            }}>{r.label}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>

        {/* ── CAMERAS TAB ── */}
        {selectedTab === "cameras" && (
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
              ← Click pentru preview · ↗ Deschide live pe YouTube
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {filteredCams.map((cam) => (
                <ThumbnailCard key={cam.id} cam={cam} onClick={setSelectedCam} />
              ))}
            </div>
          </div>
        )}

        {/* ── NEWS 24/7 TAB ── */}
        {selectedTab === "news" && (
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
              Canale de știri internaționale cu transmisie 24/7 — deschide direct pe YouTube
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {NEWS_LIVE_STREAMS.map((stream) => (
                <NewsStreamCard key={stream.name} stream={stream} />
              ))}
            </div>
            {/* Info */}
            <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 6 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "#06b6d4", fontWeight: 700, marginBottom: 4 }}>
                ℹ NOTĂ DESPRE EMBED
              </div>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.52rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
                YouTube blochează embedding din motive de securitate (X-Frame-Options). Din această cauză, thumbnail-urile sunt previewuri statice.
                Toate camerele și canalele de știri se deschid corect direct pe YouTube prin click.
              </p>
            </div>
          </div>
        )}

        {/* ── ALL LINKS TAB ── */}
        {selectedTab === "links" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {filteredLinks.map((location) => (
              <div key={`${location.city}-${location.country}`} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6, overflow: "hidden",
              }}>
                <div style={{
                  padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: "1rem" }}>{location.flag}</span>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", fontWeight: 700, color: "#e2e8f0" }}>{location.city}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.48rem", color: "rgba(255,255,255,0.3)" }}>{location.country}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "#ef4444", padding: "2px 6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 3 }}>
                    {location.cameras.length} cam
                  </span>
                </div>
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
                  {location.cameras.map((cam, ci) => (
                    <a
                      key={ci}
                      href={cam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "5px 8px", borderRadius: 4,
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                        textDecoration: "none", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(6,182,212,0.07)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <PulsingDot color="#22c55e" size={4} />
                        <div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "#06b6d4", fontWeight: 600 }}>{cam.name}</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: "0.42rem", color: "rgba(255,255,255,0.2)" }}>{cam.source}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camera preview modal */}
      {selectedCam && <CameraModal cam={selectedCam} onClose={() => setSelectedCam(null)} />}
    </div>
  );
}
