// ============================================================
// INTEL LIVE — Configuration
// All OSINT sources, agent definitions, categories, constants
// ============================================================

export const OSINT_SOURCES = [
  // ── TIER 1: Primary OSINT Accounts (20) ──
  { handle: "sentdefender", name: "OSINTdefender", tier: 1, focus: "Military movements & global conflicts" },
  { handle: "Osinttechnical", name: "OSINT Technical", tier: 1, focus: "Military hardware & satellite imagery" },
  { handle: "Osint613", name: "OSINT 613", tier: 1, focus: "Middle East verified footage & reports" },
  { handle: "criticalthreats", name: "Critical Threats", tier: 1, focus: "Iranian military capabilities" },
  { handle: "spectatorindex", name: "Spectator Index", tier: 1, focus: "Neutral global news & data" },
  { handle: "nexta_tv", name: "Nexta", tier: 1, focus: "Breaking international conflicts" },
  { handle: "IntelCrab", name: "Intel Crab / Status-6", tier: 1, focus: "Geopolitical events & intel leaks" },
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
  { handle: "osintPk", name: "OSINT Pk", tier: 1, focus: "Global risk forecasts" },
  { handle: "MENA_Analyst", name: "MENA Analyst", tier: 1, focus: "Middle East & North Africa affairs" },

  // ── TIER 2: Extended OSINT Network (50) ──
  { handle: "bellingcat", name: "Bellingcat", tier: 2, focus: "Investigative OSINT journalism" },
  { handle: "OSINTtechniques", name: "OSINT Techniques", tier: 2, focus: "OSINT methods & tools" },
  { handle: "sector035", name: "Sector 035", tier: 2, focus: "Military hardware breakdowns" },
  { handle: "henkvaness", name: "Henk van Ess", tier: 2, focus: "Real-time global conflict intel" },
  { handle: "nixintel", name: "Nixintel", tier: 2, focus: "Security & geopolitics OSINT" },
  { handle: "osintcurio", name: "OSINT Curious", tier: 2, focus: "Verified US-Iran data" },
  { handle: "IntelWalrus", name: "Intel Walrus", tier: 2, focus: "Aviation & naval movements" },
  { handle: "OSINT_Tactical", name: "OSINT Tactical", tier: 2, focus: "Tactical conflict updates" },
  { handle: "RALee85", name: "Rob Lee", tier: 2, focus: "Military analysis (Iran/Russia)" },
  { handle: "ianbremmer", name: "Ian Bremmer", tier: 2, focus: "Geopolitical risk insights" },
  { handle: "AlMonitor", name: "Al-Monitor", tier: 2, focus: "Independent Middle East news" },
  { handle: "TreyYingst", name: "Trey Yingst", tier: 2, focus: "On-ground conflict journalism" },
  { handle: "OsintWWIII", name: "OSINT WWIII", tier: 2, focus: "Global escalation monitoring" },
  { handle: "MiddleEastMnt", name: "ME Monitor", tier: 2, focus: "Verified ME reporting" },
  { handle: "visegrad24", name: "Visegrad 24", tier: 2, focus: "CE/ME open source news" },
  { handle: "MarioNawfal", name: "Mario Nawfal", tier: 2, focus: "Current events & OSINT" },
  { handle: "CChristineFair", name: "C. Christine Fair", tier: 2, focus: "Geopolitics academia" },
  { handle: "dandrezner", name: "Dan Drezner", tier: 2, focus: "International relations" },
  { handle: "MaxBoot", name: "Max Boot", tier: 2, focus: "Military strategy analysis" },
  { handle: "edwebb", name: "Ed Webb", tier: 2, focus: "ME politics & OSINT" },
  { handle: "RichGoldbergDC", name: "Rich Goldberg", tier: 2, focus: "Iran policy analysis" },
  { handle: "tparsi", name: "Trita Parsi", tier: 2, focus: "US-Iran diplomatic analysis" },
  { handle: "MiddleEastBuka", name: "ME Buka", tier: 2, focus: "Visual investigations" },
  { handle: "Defence_Index", name: "Defence Index", tier: 2, focus: "Defense & geopolitics OSINT" },
  { handle: "visionergeo", name: "Visioner Geo", tier: 2, focus: "Geopolitical security OSINT" },
  { handle: "Conflict_Radar", name: "Conflict Radar", tier: 2, focus: "Real-time military news" },
  { handle: "AhmadRasoul", name: "Ahmad Rasoul", tier: 2, focus: "ME geopolitics" },
  { handle: "india_eye_now", name: "India Eye Now", tier: 2, focus: "ME & European conflicts" },
  { handle: "InfoSiftWeekly", name: "InfoSift Weekly", tier: 2, focus: "AI-summarized conflict updates" },
  { handle: "gilshil", name: "Gil Shil", tier: 2, focus: "Cyber threats & ME intelligence" },
  { handle: "IntelOhiorion", name: "Intel Ohiorion", tier: 2, focus: "Iraq & ME OSINT" },
  { handle: "OSINT_realtime", name: "OSINT Realtime", tier: 2, focus: "Multilingual ME OSINT" },
  { handle: "Tim_Doner", name: "Tim Doner", tier: 2, focus: "ME OSINT research" },
  { handle: "IntelRogue", name: "Intel Rogue", tier: 2, focus: "Independent global affairs" },
  { handle: "MahrougSophia", name: "Sophia Mahroug", tier: 2, focus: "Academic Iran OSINT" },
  { handle: "lebintel", name: "Leb Intel", tier: 2, focus: "ME security & military" },
  { handle: "IranianWatchdog", name: "Iranian Watchdog", tier: 2, focus: "Iran politics & military" },
  { handle: "Habdulla1", name: "Habdulla", tier: 2, focus: "Iraq-focused ME research" },
  { handle: "dopaminedealers", name: "Dopamine Dealers", tier: 2, focus: "Breaking Israel-Iran OSINT" },
  { handle: "matthewjamesr", name: "Matthew James", tier: 2, focus: "Israel-Iran conflict OSINT" },
  { handle: "cyb_detective", name: "Cyber Detective", tier: 2, focus: "Cyber & geopolitical OSINT" },
  { handle: "WarMonitors", name: "War Monitors", tier: 2, focus: "Geopolitics & breaking news" },
  { handle: "rybar_mena", name: "Rybar MENA", tier: 2, focus: "MENA OSINT unit" },
  { handle: "campuscodi", name: "Campuscodi", tier: 2, focus: "Cyber-geopolitical threats" },
  { handle: "GossiTheDog", name: "GossiTheDog", tier: 2, focus: "Security & intel feeds" },
  { handle: "sans_isc", name: "SANS ISC", tier: 2, focus: "Global threat monitoring" },
  { handle: "C4ADS", name: "C4ADS", tier: 2, focus: "Nonprofit security OSINT" },
  { handle: "projectowlosint", name: "Project Owl", tier: 2, focus: "Collaborative ME OSINT" },
  { handle: "gralhix", name: "Gralhix", tier: 2, focus: "OSINT analysis" },
  { handle: "IntelDoge", name: "Intel Doge", tier: 2, focus: "US-Iran-Israel updates" },
];

// ── Agent Definitions ──
export const AGENTS = [
  {
    id: "sigint",
    name: "SIGINT",
    fullName: "Signal Intelligence",
    icon: "📡",
    color: "#ff3b3b",
    description: "Operațiuni militare, lovituri aeriene, apărare antiaeriană",
    queries: [
      "Iran Israel military strikes airstrikes latest today 2026",
      "US military operations Iran Gulf strikes February 2026",
      "Iran air defense missile launches Israel attack today",
    ],
    interval: 60,
    sources: ["sentdefender", "Osinttechnical", "ELINTNews", "IntelSky", "clashreport"],
  },
  {
    id: "osint",
    name: "OSINT",
    fullName: "Open Source Intelligence",
    icon: "🔍",
    color: "#4fc3f7",
    description: "Informații din surse deschise, rapoarte verificate",
    queries: [
      "Iran Israel war OSINT update February 28 2026",
      "Middle East conflict latest verified reports today",
    ],
    interval: 60,
    sources: ["Osint613", "AuroraIntel", "OSINTWarfare", "bellingcat", "IntelCrab"],
  },
  {
    id: "humint",
    name: "HUMINT",
    fullName: "Human Intelligence",
    icon: "👤",
    color: "#e040fb",
    description: "Victime, rapoarte de teren, impact civil",
    queries: [
      "Iran war casualties civilian damage report February 2026",
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
      "Iran military bases damage satellite assessment February 2026",
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
      "global markets oil price Iran Israel conflict February 2026",
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
      "Houthis Hezbollah Iran proxy attacks Red Sea February 2026",
      "Iran proxy forces Iraq Syria Lebanon attacks today 2026",
    ],
    interval: 60,
    sources: ["criticalthreats", "MENA_Analyst", "IntelCrab", "nexta_tv"],
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
      "UN Security Council Iran Israel war response February 2026",
      "NATO response Iran conflict diplomatic channels today",
    ],
    interval: 120,
    sources: ["tparsi", "ianbremmer", "dandrezner", "RichGoldbergDC"],
  },
];

// ── Categories derived from agents ──
export const CATEGORIES = Object.fromEntries(
  AGENTS.map((a) => [a.id, { name: a.name, fullName: a.fullName, icon: a.icon, color: a.color }])
);

// ── News RSS Feeds (fetched via web search) ──
export const NEWS_SOURCES = [
  "Reuters", "Associated Press", "Al Jazeera", "BBC World",
  "CNN", "The Guardian", "Times of Israel", "Jerusalem Post",
  "Iran International", "Middle East Eye", "The War Zone",
  "Defense One", "Breaking Defense", "Janes Defence",
];

// ── UI Constants ──
export const REFRESH_INTERVAL = 60; // seconds between full refresh cycles
export const MAX_LOG_ENTRIES = 50;
export const MAX_TICKER_ITEMS = 30;
export const ITEMS_PER_AGENT_QUERY = 4;

// ── Severity thresholds ──
export const SEVERITY = {
  CRITICAL: { min: 5, color: "#ff1744", label: "CRITIC" },
  HIGH: { min: 4, color: "#ff6d00", label: "RIDICAT" },
  MEDIUM: { min: 3, color: "#ffab00", label: "MEDIU" },
  LOW: { min: 1, color: "#69f0ae", label: "SCĂZUT" },
};
