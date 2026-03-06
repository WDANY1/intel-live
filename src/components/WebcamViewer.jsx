import { useState, useRef } from "react";
import { LIVE_WEBCAMS, WEBCAM_REGIONS } from "../config";

// YouTube Live embed IDs for conflict zone cameras
const YOUTUBE_LIVE_CAMS = [
  { id: "jNZM_H6q1rY", name: "Jerusalem - Western Wall", city: "Jerusalem", region: "israel", flag: "🇮🇱" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv - Beach Promenade", city: "Tel Aviv", region: "israel", flag: "🇮🇱" },
  { id: "uEMKGCKBKdQ", name: "Haifa Port & Bay", city: "Haifa", region: "israel", flag: "🇮🇱" },
  { id: "9eN4Jbxvbyg", name: "Mecca - Masjid al-Haram", city: "Mecca", region: "gulf", flag: "🇸🇦" },
  { id: "4K_-EhKjYjs", name: "Dubai - City Skyline", city: "Dubai", region: "gulf", flag: "🇦🇪" },
  { id: "KJGASBMieBo", name: "Beirut - City View", city: "Beirut", region: "levant", flag: "🇱🇧" },
  { id: "wDkHBAdYXD0", name: "Istanbul - Bosphorus", city: "Istanbul", region: "levant", flag: "🇹🇷" },
  { id: "C6GKe0skDDE", name: "Doha - West Bay", city: "Doha", region: "gulf", flag: "🇶🇦" },
];

// Skyline webcams that can be embedded
const SKYLINE_EMBEDS = [
  { embed: "https://www.skylinewebcams.com/webcam.html?id=israel/jerusalem-district/jerusalem/western-wall", name: "Western Wall Live", city: "Jerusalem", region: "israel", flag: "🇮🇱" },
  { embed: "https://www.skylinewebcams.com/webcam.html?id=israel/tel-aviv/tel-aviv/tel-aviv", name: "Tel Aviv Panorama", city: "Tel Aviv", region: "israel", flag: "🇮🇱" },
  { embed: "https://www.skylinewebcams.com/webcam.html?id=united-arab-emirates/dubai/dubai/dubai", name: "Dubai Princess Tower", city: "Dubai", region: "gulf", flag: "🇦🇪" },
  { embed: "https://www.skylinewebcams.com/webcam.html?id=united-arab-emirates/dubai/dubai/fairmont-the-palm", name: "Palm Jumeirah", city: "Dubai", region: "gulf", flag: "🇦🇪" },
  { embed: "https://www.skylinewebcams.com/webcam.html?id=saudi-arabia/makkah/mecca/mecca", name: "Masjid al-Haram", city: "Mecca", region: "gulf", flag: "🇸🇦" },
];

function PulsingDot({ color = "#ff3b3b", size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "pulse 2s ease-in-out infinite" }} />
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, opacity: 0.4, animation: "pulseRing 2s ease-in-out infinite" }} />
    </span>
  );
}

export default function WebcamViewer() {
  const [regionFilter, setRegionFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | single | links
  const [selectedCam, setSelectedCam] = useState(null);
  const [selectedSource, setSelectedSource] = useState("youtube"); // youtube | skyline | links

  const filteredYT = regionFilter === "all"
    ? YOUTUBE_LIVE_CAMS
    : YOUTUBE_LIVE_CAMS.filter((c) => c.region === regionFilter);

  const filteredSkyline = regionFilter === "all"
    ? SKYLINE_EMBEDS
    : SKYLINE_EMBEDS.filter((c) => c.region === regionFilter);

  const filteredLinks = regionFilter === "all"
    ? LIVE_WEBCAMS
    : LIVE_WEBCAMS.filter((w) => w.region === regionFilter);

  const totalCameras = LIVE_WEBCAMS.reduce((a, c) => a + c.cameras.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", background: "rgba(255,59,59,0.05)",
        border: "1px solid rgba(255,59,59,0.15)", borderRadius: "var(--radius)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PulsingDot color="#ff3b3b" size={8} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
            CAMERE LIVE
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>
            {LIVE_WEBCAMS.length} locații • {totalCameras} camere • {YOUTUBE_LIVE_CAMS.length} embedded
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "youtube", label: "EMBEDDED", icon: "▶" },
            { id: "skyline", label: "SKYLINE", icon: "🌐" },
            { id: "links", label: "TOATE LINK-URI", icon: "🔗" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSource(s.id)}
              style={{
                padding: "4px 10px", borderRadius: 4,
                fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 0.5,
                background: selectedSource === s.id ? "rgba(255,59,59,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selectedSource === s.id ? "rgba(255,59,59,0.3)" : "var(--border)"}`,
                color: selectedSource === s.id ? "#ff3b3b" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Region Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", letterSpacing: 2, color: "var(--text-muted)", marginRight: 6 }}>
          REGIUNE:
        </span>
        {WEBCAM_REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegionFilter(r.id)}
            style={{
              padding: "4px 12px", borderRadius: 14,
              fontFamily: "var(--mono)", fontSize: "0.55rem",
              background: regionFilter === r.id ? `${r.color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${regionFilter === r.id ? `${r.color}44` : "var(--border)"}`,
              color: regionFilter === r.id ? r.color : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {r.flag || ""} {r.label}
          </button>
        ))}
        {/* View mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[
            { id: "grid", label: "2x2" },
            { id: "single", label: "1x1" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              style={{
                padding: "4px 10px", borderRadius: 4,
                fontFamily: "var(--mono)", fontSize: "0.5rem",
                background: viewMode === v.id ? "rgba(255,255,255,0.08)" : "transparent",
                border: "1px solid var(--border)",
                color: viewMode === v.id ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* YouTube Embedded Cams */}
      {selectedSource === "youtube" && (
        <>
          {selectedCam ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setSelectedCam(null)} style={{
                  padding: "4px 10px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: "0.55rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-muted)",
                }}>
                  ← ÎNAPOI
                </button>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  {selectedCam.flag} {selectedCam.name}
                </span>
                <PulsingDot color="#ff3b3b" size={6} />
              </div>
              <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "16/9" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${selectedCam.id}?autoplay=1&mute=1`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: viewMode === "grid" ? "1fr 1fr" : "1fr",
              gap: 10,
            }}>
              {filteredYT.map((cam) => (
                <div
                  key={cam.id}
                  style={{
                    borderRadius: "var(--radius)", overflow: "hidden",
                    border: "1px solid var(--border)", background: "var(--bg-card)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onClick={() => setSelectedCam(cam)}
                >
                  {/* Cam preview / embed */}
                  <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${cam.id}?autoplay=0&mute=1&controls=0`}
                      style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
                      allow="encrypted-media"
                      loading="lazy"
                    />
                    {/* Live overlay */}
                    <div style={{
                      position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 8px", borderRadius: 4,
                      background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,59,59,0.4)",
                    }}>
                      <PulsingDot color="#ff3b3b" size={5} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
                        LIVE
                      </span>
                    </div>
                    {/* Click to expand overlay */}
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.3)", opacity: 0, transition: "opacity 0.2s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      <span style={{
                        padding: "8px 16px", borderRadius: 6,
                        background: "rgba(255,59,59,0.9)", fontFamily: "var(--mono)",
                        fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1, color: "#fff",
                      }}>
                        ▶ FULL VIEW
                      </span>
                    </div>
                  </div>
                  {/* Cam info */}
                  <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {cam.flag} {cam.name}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>
                        {cam.city} • YouTube Live
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "#ff3b3b" }}>📹</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Skyline Webcams */}
      {selectedSource === "skyline" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: viewMode === "grid" ? "1fr 1fr" : "1fr",
          gap: 10,
        }}>
          {filteredSkyline.map((cam, i) => (
            <div key={i} style={{
              borderRadius: "var(--radius)", overflow: "hidden",
              border: "1px solid var(--border)", background: "var(--bg-card)",
            }}>
              <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
                <iframe
                  src={cam.embed}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="autoplay"
                  loading="lazy"
                />
                <div style={{
                  position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 8px", borderRadius: 4,
                  background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,59,59,0.4)",
                }}>
                  <PulsingDot color="#ff3b3b" size={5} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
                    LIVE
                  </span>
                </div>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {cam.flag} {cam.name}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "0.5rem", color: "var(--text-muted)" }}>
                  {cam.city} • SkylineWebcams
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All webcam links (original) */}
      {selectedSource === "links" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
          {filteredLinks.map((location) => (
            <div key={`${location.city}-${location.country}`} style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 14px", borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.1rem" }}>{location.flag}</span>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", fontWeight: 700 }}>{location.city}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>{location.country}</div>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 10,
                  background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.2)",
                }}>
                  <PulsingDot color="#ff3b3b" size={5} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "#ff3b3b", fontWeight: 700, letterSpacing: 1 }}>
                    {location.cameras.length} CAM
                  </span>
                </div>
              </div>
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                {location.cameras.map((cam, ci) => (
                  <a
                    key={ci}
                    href={cam.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 10px", borderRadius: "var(--radius-sm)",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                      textDecoration: "none", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(79,195,247,0.08)"; e.currentTarget.style.borderColor = "rgba(79,195,247,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.65rem" }}>📹</span>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "#4fc3f7", fontWeight: 600 }}>{cam.name}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "0.45rem", color: "var(--text-dim)" }}>{cam.source}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "0.55rem", color: "var(--text-muted)" }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
