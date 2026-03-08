// ============================================================
// INTEL LIVE — Configuration (TypeScript)
// All OSINT sources, news channels, webcams, agent definitions
// ============================================================

import type { OSINTSource, NewsChannel, Agent, AIModel, AgentId } from './types'

export const OSINT_SOURCES: OSINTSource[] = [
  // ── TIER 0: OFFICIAL MILITARY & GOVERNMENT ──
  { handle: "CENTCOM", name: "US CENTCOM", tier: 0, focus: "US Central Command — official operations" },
  { handle: "DeptofDefense", name: "US DoD", tier: 0, focus: "US Department of Defense official" },
  { handle: "USNavy", name: "US Navy", tier: 0, focus: "US Navy operations & fleet movements" },
  { handle: "IDF", name: "IDF", tier: 0, focus: "Israel Defense Forces official" },
  { handle: "IDFSpokesperson", name: "IDF Spokesman", tier: 0, focus: "IDF official spokesperson" },
  { handle: "IsraeliPM", name: "Israeli PM", tier: 0, focus: "Israeli Prime Minister office" },
  { handle: "Israel", name: "State of Israel", tier: 0, focus: "State of Israel official" },
  { handle: "IranIntl_En", name: "Iran Intl", tier: 0, focus: "Iran International — Persian diaspora news" },
  { handle: "PressTV", name: "Press TV", tier: 0, focus: "Iranian state English media" },
  { handle: "SepahNews", name: "Sepah News", tier: 0, focus: "IRGC official news service" },
  { handle: "NATO", name: "NATO", tier: 0, focus: "NATO official alliance communications" },
  { handle: "UN", name: "United Nations", tier: 0, focus: "UN official statements & resolutions" },
  { handle: "iaeaorg", name: "IAEA", tier: 0, focus: "International Atomic Energy Agency" },
  // ── TIER 1: Primary OSINT Accounts ──
  { handle: "sentdefender", name: "OSINTdefender", tier: 1, focus: "Military movements & global conflicts" },
  { handle: "Osinttechnical", name: "OSINT Technical", tier: 1, focus: "Military hardware & satellite imagery" },
  { handle: "Osint613", name: "OSINT 613", tier: 1, focus: "Middle East verified footage & reports" },
  { handle: "criticalthreats", name: "Critical Threats", tier: 1, focus: "Iranian military capabilities" },
  { handle: "spectatorindex", name: "Spectator Index", tier: 1, focus: "Neutral global news & data" },
  { handle: "nexta_tv", name: "Nexta", tier: 1, focus: "Breaking international conflicts" },
  { handle: "IntelCrab", name: "Intel Crab", tier: 1, focus: "Geopolitical events & intel leaks" },
  { handle: "AuroraIntel", name: "Aurora Intel", tier: 1, focus: "Middle East troop movements" },
  { handle: "ELINTNews", name: "ELINT News", tier: 1, focus: "Electronic intelligence & missile tech" },
  { handle: "IntelSky", name: "Intel Sky", tier: 1, focus: "Aviation & airspace tracking" },
  { handle: "Faytuks", name: "Faytuks News", tier: 1, focus: "Verified conflict sources" },
  { handle: "TheStudyofWar", name: "ISW", tier: 1, focus: "Military campaign maps & analysis" },
  { handle: "oryxspioenkop", name: "Oryx", tier: 1, focus: "Verified equipment losses" },
  { handle: "QalaatAlMudiq", name: "Qalaat Al Mudiq", tier: 1, focus: "Syria-Iran OSINT" },
  { handle: "clashreport", name: "Clash Report", tier: 1, focus: "Factual military OSINT" },
  { handle: "OSINTWarfare", name: "OSINT Warfare", tier: 1, focus: "Real-time US-Iran escalations" },
  { handle: "osint1117", name: "OSINT Spectator", tier: 1, focus: "Missile launch alerts" },
  { handle: "IntelCrusader", name: "Intel Crusader", tier: 1, focus: "Iranian military activities" },
  { handle: "MENA_Analyst", name: "MENA Analyst", tier: 1, focus: "Middle East & North Africa affairs" },
  // ── TIER 2: Extended OSINT Network ──
  { handle: "bellingcat", name: "Bellingcat", tier: 2, focus: "Investigative OSINT journalism" },
  { handle: "sector035", name: "Sector 035", tier: 2, focus: "Military hardware breakdowns" },
  { handle: "henkvaness", name: "Henk van Ess", tier: 2, focus: "Real-time global conflict intel" },
  { handle: "nixintel", name: "Nixintel", tier: 2, focus: "Security & geopolitics OSINT" },
  { handle: "IntelWalrus", name: "Intel Walrus", tier: 2, focus: "Aviation & naval movements" },
  { handle: "RALee85", name: "Rob Lee", tier: 2, focus: "Military analysis (Iran/Russia)" },
  { handle: "ianbremmer", name: "Ian Bremmer", tier: 2, focus: "Geopolitical risk insights" },
  { handle: "AlMonitor", name: "Al-Monitor", tier: 2, focus: "Independent Middle East news" },
  { handle: "TreyYingst", name: "Trey Yingst", tier: 2, focus: "On-ground conflict journalism" },
  { handle: "visegrad24", name: "Visegrad 24", tier: 2, focus: "CE/ME open source news" },
  { handle: "Conflict_Radar", name: "Conflict Radar", tier: 2, focus: "Real-time military news" },
  { handle: "RichGoldbergDC", name: "Rich Goldberg", tier: 2, focus: "Iran policy analysis" },
  { handle: "tparsi", name: "Trita Parsi", tier: 2, focus: "US-Iran diplomatic analysis" },
  { handle: "dandrezner", name: "Dan Drezner", tier: 2, focus: "International relations" },
  { handle: "Defence_Index", name: "Defence Index", tier: 2, focus: "Defense & geopolitics OSINT" },
  { handle: "C4ADS", name: "C4ADS", tier: 2, focus: "Nonprofit security OSINT" },
  { handle: "WarMonitors", name: "War Monitors", tier: 2, focus: "Geopolitics & breaking news" },
  { handle: "cyb_detective", name: "Cyber Detective", tier: 2, focus: "Cyber & geopolitical OSINT" },
  { handle: "GossiTheDog", name: "GossiTheDog", tier: 2, focus: "Security & intel feeds" },
  { handle: "campuscodi", name: "Campuscodi", tier: 2, focus: "Cyber-geopolitical threats" },
  { handle: "IranianWatchdog", name: "Iranian Watchdog", tier: 2, focus: "Iran politics & military" },
  { handle: "IntelDoge", name: "Intel Doge", tier: 2, focus: "US-Iran-Israel updates" },
]

// ── News Channels & Wire Services ──
export const NEWS_CHANNELS: NewsChannel[] = [
  { name: "Reuters", type: "wire", region: "global", url: "reuters.com" },
  { name: "Associated Press", type: "wire", region: "global", url: "apnews.com" },
  { name: "AFP", type: "wire", region: "global", url: "france24.com/en/afp" },
  { name: "Bloomberg", type: "wire", region: "global", url: "bloomberg.com" },
  { name: "BBC World News", type: "tv", region: "global", url: "bbc.com/news/world" },
  { name: "CNN International", type: "tv", region: "global", url: "cnn.com/world" },
  { name: "Sky News", type: "tv", region: "global", url: "news.sky.com" },
  { name: "France 24", type: "tv", region: "global", url: "france24.com/en" },
  { name: "DW News", type: "tv", region: "global", url: "dw.com/en" },
  { name: "Euronews", type: "tv", region: "europe", url: "euronews.com" },
  { name: "Al Jazeera", type: "tv", region: "me", url: "aljazeera.com" },
  { name: "Al Arabiya", type: "tv", region: "me", url: "alarabiya.net/en" },
  { name: "Iran International", type: "tv", region: "me", url: "iranintl.com" },
  { name: "Press TV", type: "tv", region: "iran", url: "presstv.ir" },
  { name: "Times of Israel", type: "news", region: "israel", url: "timesofisrael.com" },
  { name: "Jerusalem Post", type: "news", region: "israel", url: "jpost.com" },
  { name: "Haaretz", type: "news", region: "israel", url: "haaretz.com" },
  { name: "Middle East Eye", type: "news", region: "me", url: "middleeasteye.net" },
  { name: "Al-Monitor", type: "news", region: "me", url: "al-monitor.com" },
  { name: "The War Zone", type: "defense", region: "global", url: "thedrive.com/the-war-zone" },
  { name: "Defense One", type: "defense", region: "us", url: "defenseone.com" },
  { name: "Breaking Defense", type: "defense", region: "us", url: "breakingdefense.com" },
  { name: "Janes Defence", type: "defense", region: "global", url: "janes.com" },
  { name: "Naval News", type: "defense", region: "global", url: "navalnews.com" },
  { name: "The New York Times", type: "news", region: "us", url: "nytimes.com" },
  { name: "Washington Post", type: "news", region: "us", url: "washingtonpost.com" },
  { name: "The Guardian", type: "news", region: "uk", url: "theguardian.com/world" },
  { name: "Financial Times", type: "news", region: "uk", url: "ft.com" },
]

// ── Live YouTube Webcam Feeds ──
export const WEBCAM_FEEDS = [
  { id: "jNZM_H6q1rY", name: "Western Wall Live", city: "Jerusalem", country: "Israel", flag: "🇮🇱", region: "israel" },
  { id: "LMM0FN5jJaE", name: "Tel Aviv Beach", city: "Tel Aviv", country: "Israel", flag: "🇮🇱", region: "israel" },
  { id: "4K_-EhKjYjs", name: "Dubai Skyline 24/7", city: "Dubai", country: "UAE", flag: "🇦🇪", region: "gulf" },
  { id: "9eN4Jbxvbyg", name: "Mecca - Masjid al-Haram", city: "Mecca", country: "Saudi", flag: "🇸🇦", region: "gulf" },
  { id: "C6GKe0skDDE", name: "Doha West Bay", city: "Doha", country: "Qatar", flag: "🇶🇦", region: "gulf" },
  { id: "KJGASBMieBo", name: "Beirut City", city: "Beirut", country: "Lebanon", flag: "🇱🇧", region: "levant" },
  { id: "wDkHBAdYXD0", name: "Istanbul Bosphorus", city: "Istanbul", country: "Turkey", flag: "🇹🇷", region: "levant" },
]

export const NEWS_STREAMS = [
  { id: "nSon3dyDgV0", name: "Al Jazeera", color: "#06b6d4" },
  { id: "l8pmfNyEoAE", name: "France 24", color: "#3b82f6" },
  { id: "9Auq9mYxFEE", name: "Sky News", color: "#f97316" },
  { id: "w_Ma8oQLmSM", name: "BBC World", color: "#ef4444" },
  { id: "7cHsY5Xyv1w", name: "DW News", color: "#8b5cf6" },
  { id: "wgMJMQTQEuY", name: "Euronews", color: "#22c55e" },
]

// ── Agent Definitions ──
export const AGENTS: Agent[] = [
  {
    id: "sigint",
    name: "SIGINT",
    fullName: "Signal Intelligence",
    icon: "📡",
    color: "#ff3b3b",
    description: "Operațiuni militare, lovituri aeriene, apărare antiaeriană",
    queries: [
      "Iran Israel military strikes airstrikes latest today 2026",
      "US military operations Iran Gulf strikes 2026",
      "Iran air defense missile launches Israel attack today",
    ],
    interval: 60,
    sources: ["sentdefender", "Osinttechnical", "ELINTNews", "IntelSky", "clashreport", "CENTCOM", "IDF", "SepahNews"],
  },
  {
    id: "osint",
    name: "OSINT",
    fullName: "Open Source Intelligence",
    icon: "🔍",
    color: "#4fc3f7",
    description: "Informații din surse deschise, rapoarte verificate",
    queries: [
      "Iran Israel war OSINT update 2026",
      "Middle East conflict latest verified reports today",
    ],
    interval: 60,
    sources: ["Osint613", "AuroraIntel", "OSINTWarfare", "bellingcat", "IntelCrab", "IDF", "PressTV", "IranIntl_En"],
  },
  {
    id: "humint",
    name: "HUMINT",
    fullName: "Human Intelligence",
    icon: "👤",
    color: "#e040fb",
    description: "Victime, rapoarte de teren, impact civil",
    queries: [
      "Iran war casualties civilian damage report 2026",
      "Iran Israel conflict ground reports humanitarian impact today",
    ],
    interval: 90,
    sources: ["TreyYingst", "QalaatAlMudiq", "Faytuks", "AlMonitor"],
  },
  {
    id: "geoint",
    name: "GEOINT",
    fullName: "Geospatial Intelligence",
    icon: "🛰️",
    color: "#69f0ae",
    description: "Imagini satelitare, hărți de operațiuni, desfășurări",
    queries: [
      "Iran Israel satellite imagery military deployment map 2026",
      "Iran military bases damage satellite assessment 2026",
    ],
    interval: 120,
    sources: ["oryxspioenkop", "TheStudyofWar", "bellingcat", "sector035"],
  },
  {
    id: "econint",
    name: "ECONINT",
    fullName: "Economic Intelligence",
    icon: "📊",
    color: "#ffd740",
    description: "Prețuri petrol, sancțiuni, impact piețe financiare",
    queries: [
      "Strait of Hormuz oil prices Iran war economic impact 2026",
      "global markets oil price Iran Israel conflict 2026",
      "Iran sanctions economic warfare impact today",
    ],
    interval: 90,
    sources: ["spectatorindex", "ianbremmer", "AlMonitor"],
  },
  {
    id: "proxy",
    name: "PROXY",
    fullName: "Proxy Forces Monitor",
    icon: "🎯",
    color: "#ff6b35",
    description: "Houthis, Hezbollah, miliții pro-Iran",
    queries: [
      "Houthis Hezbollah Iran proxy attacks Red Sea 2026",
      "Iran proxy forces Iraq Syria Lebanon attacks today 2026",
    ],
    interval: 60,
    sources: ["criticalthreats", "MENA_Analyst", "IntelCrab", "nexta_tv", "SepahNews", "PressTV"],
  },
  {
    id: "diplo",
    name: "DIPLO",
    fullName: "Diplomatic Intelligence",
    icon: "🏛️",
    color: "#b388ff",
    description: "Negocieri, reacții internaționale, ONU, NATO",
    queries: [
      "Iran Israel ceasefire negotiations diplomatic efforts 2026",
      "UN Security Council Iran Israel war response 2026",
      "NATO response Iran conflict diplomatic channels today",
    ],
    interval: 120,
    sources: ["tparsi", "ianbremmer", "dandrezner", "RichGoldbergDC", "NATO", "UN", "IsraeliPM"],
  },
]

// ── Categories derived from agents ──
export const CATEGORIES = Object.fromEntries(
  AGENTS.map((a) => [a.id, { name: a.name, fullName: a.fullName, icon: a.icon, color: a.color }])
)

// ── News Sources for agent prompts ──
export const NEWS_SOURCES: string[] = [
  "Reuters", "Associated Press", "AFP", "Bloomberg",
  "BBC World News", "CNN", "Al Jazeera", "Al Arabiya",
  "Sky News", "France 24", "DW News",
  "Times of Israel", "Jerusalem Post", "Haaretz", "Ynet News", "i24 News",
  "Iran International", "Press TV", "IRNA", "Fars News", "Tasnim News",
  "The National UAE", "Gulf News", "Arab News",
  "Middle East Eye", "Al-Monitor", "The New Arab",
  "The War Zone", "Defense One", "Breaking Defense", "Janes Defence",
  "New York Times", "Washington Post", "The Guardian", "Financial Times",
]

// ── AI Models — Top Free Models (2026) ──
export const AI_MODELS: AIModel[] = [
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick",
    provider: "Meta (OpenRouter)",
    color: "#1877F2",
    icon: "🦙",
    strength: "Strongest free model for tool-calling & analysis",
    contextWindow: 131072,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    provider: "DeepSeek (OpenRouter)",
    color: "#00d4aa",
    icon: "🧠",
    strength: "Top-tier reasoning — chain-of-thought for complex intel analysis",
    contextWindow: 131072,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3",
    provider: "DeepSeek (OpenRouter)",
    color: "#00b894",
    icon: "🟢",
    strength: "Strong analysis & multilingual reasoning",
    contextWindow: 131072,
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "Google (OpenRouter)",
    color: "#4285f4",
    icon: "🔵",
    strength: "Reliable instruction-following & structured JSON output",
    contextWindow: 131072,
  },
  {
    id: "qwen/qwq-32b:free",
    name: "QwQ 32B",
    provider: "Alibaba (OpenRouter)",
    color: "#ff6a00",
    icon: "🟠",
    strength: "Advanced reasoning & complex analysis",
    contextWindow: 131072,
  },
  {
    id: "nvidia/llama-3.1-nemotron-ultra-253b:free",
    name: "Nemotron Ultra 253B",
    provider: "NVIDIA (OpenRouter)",
    color: "#76B900",
    icon: "💚",
    strength: "253B parameters — largest free model",
    contextWindow: 131072,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    provider: "Mistral (OpenRouter)",
    color: "#ff4500",
    icon: "🔴",
    strength: "Fast structured output & JSON generation",
    contextWindow: 131072,
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout",
    provider: "Meta (OpenRouter)",
    color: "#5B7FFF",
    icon: "🔭",
    strength: "Fast scouting & initial intelligence gathering",
    contextWindow: 131072,
  },
]

// ── Agent-to-Model mapping ──
export const AGENT_MODEL_MAP: Record<AgentId, string> = {
  sigint: "meta-llama/llama-4-maverick:free",
  osint: "deepseek/deepseek-chat-v3-0324:free",
  humint: "deepseek/deepseek-r1:free",
  geoint: "mistralai/mistral-small-3.1-24b-instruct:free",
  econint: "nvidia/llama-3.1-nemotron-ultra-253b:free",
  proxy: "qwen/qwq-32b:free",
  diplo: "google/gemma-3-27b-it:free",
}

// ── Verification models (3 different providers for cross-check) ──
export const VERIFICATION_MODELS: string[] = [
  "meta-llama/llama-4-maverick:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
]

// ── Webcam regions ──
export const WEBCAM_REGIONS = [
  { id: "all", label: "TOATE", color: "#fff" },
  { id: "israel", label: "ISRAEL", color: "#4fc3f7", flag: "🇮🇱" },
  { id: "gulf", label: "GOLF", color: "#ffd740", flag: "🌊" },
  { id: "levant", label: "LEVANT", color: "#e040fb", flag: "🗺️" },
]

// ── Constants ──
export const REFRESH_INTERVAL = 300
export const MAX_LOG_ENTRIES = 50
export const MAX_TICKER_ITEMS = 30
export const ITEMS_PER_AGENT_QUERY = 5

export const SEVERITY_CONFIG = {
  5: { color: "#FF3B30", label: "CRITICAL", bg: "rgba(255,59,48,0.12)" },
  4: { color: "#FFB020", label: "HIGH", bg: "rgba(255,176,32,0.12)" },
  3: { color: "#FFD60A", label: "MEDIUM", bg: "rgba(255,214,10,0.12)" },
  2: { color: "#30D158", label: "LOW", bg: "rgba(48,209,88,0.12)" },
  1: { color: "#30D158", label: "LOW", bg: "rgba(48,209,88,0.12)" },
} as const
