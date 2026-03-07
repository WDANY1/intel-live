// ============================================================
// INTEL LIVE — Configuration
// All OSINT sources, news channels, webcams, agent definitions
// ============================================================

export const OSINT_SOURCES = [
  // ── TIER 0: OFFICIAL MILITARY & GOVERNMENT ──
  { handle: "ABORAMAN", name: "US CENTCOM", tier: 0, focus: "US Central Command — official operations" },
  { handle: "DeptofDefense", name: "US DoD", tier: 0, focus: "US Department of Defense official" },
  { handle: "USNavy", name: "US Navy", tier: 0, focus: "US Navy operations & fleet movements" },
  { handle: "ABORAMAN", name: "CENTCOM Spokesman", tier: 0, focus: "CENTCOM official spokesperson" },
  { handle: "IDF", name: "IDF", tier: 0, focus: "Israel Defense Forces official" },
  { handle: "IDFSpokesperson", name: "IDF Spokesman", tier: 0, focus: "IDF official spokesperson" },
  { handle: "IsraeliPM", name: "Israeli PM", tier: 0, focus: "Israeli Prime Minister office" },
  { handle: "Israel", name: "State of Israel", tier: 0, focus: "State of Israel official" },
  { handle: "IranIntl_En", name: "Iran Intl", tier: 0, focus: "Iran International — Persian diaspora news" },
  { handle: "PressTV", name: "Press TV", tier: 0, focus: "Iranian state English media" },
  { handle: "khaboronline", name: "Khabar Online", tier: 0, focus: "Iranian news agency" },
  { handle: "IrijOfficial", name: "IRNA English", tier: 0, focus: "Islamic Republic News Agency" },
  { handle: "Aboraman1", name: "IRGC News", tier: 0, focus: "IRGC-affiliated news" },
  { handle: "SepahNews", name: "Sepah News", tier: 0, focus: "IRGC official news service" },
  { handle: "ABORAMAN", name: "Tasnim News", tier: 0, focus: "Iranian news close to IRGC" },
  { handle: "NATO", name: "NATO", tier: 0, focus: "NATO official alliance communications" },
  { handle: "UN", name: "United Nations", tier: 0, focus: "UN official statements & resolutions" },
  { handle: "ABORAMAN", name: "IAEA", tier: 0, focus: "International Atomic Energy Agency" },
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

// ── News Channels & Wire Services ──
export const NEWS_CHANNELS = [
  // Wire Services
  { name: "Reuters", type: "wire", region: "global", url: "reuters.com" },
  { name: "Associated Press", type: "wire", region: "global", url: "apnews.com" },
  { name: "AFP", type: "wire", region: "global", url: "france24.com/en/afp" },
  { name: "Bloomberg", type: "wire", region: "global", url: "bloomberg.com" },
  // International TV News
  { name: "BBC World News", type: "tv", region: "global", url: "bbc.com/news/world" },
  { name: "CNN International", type: "tv", region: "global", url: "cnn.com/world" },
  { name: "Sky News", type: "tv", region: "global", url: "news.sky.com" },
  { name: "France 24", type: "tv", region: "global", url: "france24.com/en" },
  { name: "DW News", type: "tv", region: "global", url: "dw.com/en" },
  { name: "Euronews", type: "tv", region: "europe", url: "euronews.com" },
  { name: "ABC News", type: "tv", region: "us", url: "abcnews.go.com" },
  { name: "NBC News", type: "tv", region: "us", url: "nbcnews.com" },
  { name: "CBS News", type: "tv", region: "us", url: "cbsnews.com" },
  { name: "Fox News", type: "tv", region: "us", url: "foxnews.com" },
  { name: "MSNBC", type: "tv", region: "us", url: "msnbc.com" },
  { name: "PBS NewsHour", type: "tv", region: "us", url: "pbs.org/newshour" },
  // Middle East TV & News
  { name: "Al Jazeera", type: "tv", region: "me", url: "aljazeera.com" },
  { name: "Al Jazeera Arabic", type: "tv", region: "me", url: "aljazeera.net" },
  { name: "Al Arabiya", type: "tv", region: "me", url: "alarabiya.net/en" },
  { name: "Iran International", type: "tv", region: "me", url: "iranintl.com" },
  { name: "Press TV", type: "tv", region: "iran", url: "presstv.ir" },
  { name: "IRNA", type: "wire", region: "iran", url: "irna.ir/en" },
  { name: "Fars News", type: "wire", region: "iran", url: "farsnews.ir" },
  { name: "Tasnim News", type: "wire", region: "iran", url: "tasnimnews.com" },
  { name: "Mehr News", type: "wire", region: "iran", url: "mehrnews.com" },
  // Israeli Media
  { name: "Times of Israel", type: "news", region: "israel", url: "timesofisrael.com" },
  { name: "Jerusalem Post", type: "news", region: "israel", url: "jpost.com" },
  { name: "Haaretz", type: "news", region: "israel", url: "haaretz.com" },
  { name: "Ynet News", type: "news", region: "israel", url: "ynetnews.com" },
  { name: "i24 News", type: "tv", region: "israel", url: "i24news.tv" },
  { name: "Kan News", type: "tv", region: "israel", url: "kan.org.il" },
  { name: "Channel 12 (Mako)", type: "tv", region: "israel", url: "mako.co.il" },
  // Gulf Media
  { name: "The National (UAE)", type: "news", region: "gulf", url: "thenationalnews.com" },
  { name: "Gulf News", type: "news", region: "gulf", url: "gulfnews.com" },
  { name: "Khaleej Times", type: "news", region: "gulf", url: "khaleejtimes.com" },
  { name: "Arab News", type: "news", region: "gulf", url: "arabnews.com" },
  { name: "Qatar News Agency", type: "wire", region: "gulf", url: "qna.org.qa" },
  { name: "Bahrain News Agency", type: "wire", region: "gulf", url: "bna.bh" },
  { name: "Kuwait News Agency", type: "wire", region: "gulf", url: "kuna.net.kw" },
  // Regional / Specialty
  { name: "Middle East Eye", type: "news", region: "me", url: "middleeasteye.net" },
  { name: "Middle East Monitor", type: "news", region: "me", url: "middleeastmonitor.com" },
  { name: "The New Arab", type: "news", region: "me", url: "newarab.com" },
  { name: "Al-Monitor", type: "news", region: "me", url: "al-monitor.com" },
  { name: "Rudaw", type: "news", region: "me", url: "rudaw.net/english" },
  // Defense & Military
  { name: "The War Zone", type: "defense", region: "global", url: "thedrive.com/the-war-zone" },
  { name: "Defense One", type: "defense", region: "us", url: "defenseone.com" },
  { name: "Breaking Defense", type: "defense", region: "us", url: "breakingdefense.com" },
  { name: "Janes Defence", type: "defense", region: "global", url: "janes.com" },
  { name: "Military Times", type: "defense", region: "us", url: "militarytimes.com" },
  { name: "Defense News", type: "defense", region: "global", url: "defensenews.com" },
  { name: "Naval News", type: "defense", region: "global", url: "navalnews.com" },
  // Major Newspapers
  { name: "The New York Times", type: "news", region: "us", url: "nytimes.com" },
  { name: "Washington Post", type: "news", region: "us", url: "washingtonpost.com" },
  { name: "The Guardian", type: "news", region: "uk", url: "theguardian.com/world" },
  { name: "Financial Times", type: "news", region: "uk", url: "ft.com" },
  { name: "Wall Street Journal", type: "news", region: "us", url: "wsj.com" },
  { name: "The Telegraph", type: "news", region: "uk", url: "telegraph.co.uk" },
];

// ── Live Webcams — Iran, Israel, Gulf Countries ──
export const LIVE_WEBCAMS = [
  // ── ISRAEL ──
  {
    city: "Jerusalem",
    country: "Israel",
    flag: "🇮🇱",
    region: "israel",
    cameras: [
      { name: "Western Wall (Kotel)", url: "https://www.skylinewebcams.com/en/webcam/israel/jerusalem-district/jerusalem/western-wall.html", embed: "https://www.skylinewebcams.com/webcam.html?id=israel/jerusalem-district/jerusalem/western-wall", source: "SkylineWebcams" },
      { name: "Temple Mount", url: "https://www.skylinewebcams.com/en/webcam/israel/jerusalem-district/jerusalem/temple-mount.html", embed: "https://www.skylinewebcams.com/webcam.html?id=israel/jerusalem-district/jerusalem/temple-mount", source: "SkylineWebcams" },
      { name: "Mount of Olives", url: "https://www.skylinewebcams.com/en/webcam/israel/jerusalem-district/jerusalem/mount-of-olives.html", embed: "https://www.skylinewebcams.com/webcam.html?id=israel/jerusalem-district/jerusalem/mount-of-olives", source: "SkylineWebcams" },
      { name: "Old City 24/7", url: "https://www.tv7israelnews.com/jerusalem-live-feed/", source: "TV7 Israel" },
      { name: "Kotel Official", url: "https://thekotel.org/en/western-wall/western-wall-cameras/", source: "Western Wall Heritage" },
    ],
  },
  {
    city: "Tel Aviv",
    country: "Israel",
    flag: "🇮🇱",
    region: "israel",
    cameras: [
      { name: "City Panorama", url: "https://www.skylinewebcams.com/en/webcam/israel/tel-aviv/tel-aviv/tel-aviv.html", embed: "https://www.skylinewebcams.com/webcam.html?id=israel/tel-aviv/tel-aviv/tel-aviv", source: "SkylineWebcams" },
      { name: "Beach & Marina", url: "https://www.webcamtaxi.com/en/israel/tel-aviv.html", source: "WebcamTaxi" },
      { name: "EarthCam Skyline", url: "https://www.earthcam.com/world/israel/telaviv/", source: "EarthCam" },
    ],
  },
  {
    city: "Haifa",
    country: "Israel",
    flag: "🇮🇱",
    region: "israel",
    cameras: [
      { name: "Haifa Bay", url: "https://www.skylinewebcams.com/en/webcam/israel/haifa.html", source: "SkylineWebcams" },
      { name: "Port & City View", url: "https://www.webcamtaxi.com/en/israel/haifa-district.html", source: "WebcamTaxi" },
    ],
  },
  // ── IRAN ──
  {
    city: "Tehran",
    country: "Iran",
    flag: "🇮🇷",
    region: "iran",
    cameras: [
      { name: "Tehran Skyline", url: "https://liveworldwebcams.com/tehran-webcam-iran/", source: "LiveWorldWebcams" },
      { name: "City Overview", url: "https://worldviewstream.com/category/iran/tehran/", source: "WorldViewStream" },
      { name: "Tehran Streets", url: "https://www.pictimo.com/country/iran", source: "Pictimo" },
      { name: "Tehran Cameras", url: "https://webcam.scs.com.ua/en/asia/iran/tehran/", source: "SCS Webcam" },
    ],
  },
  {
    city: "Isfahan",
    country: "Iran",
    flag: "🇮🇷",
    region: "iran",
    cameras: [
      { name: "City Cam", url: "https://www.iplivecams.com/live-cams-countries/iran/", source: "IpLiveCams" },
    ],
  },
  // ── UAE ──
  {
    city: "Dubai",
    country: "UAE",
    flag: "🇦🇪",
    region: "gulf",
    cameras: [
      { name: "Princess Tower Panorama", url: "https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/dubai.html", embed: "https://www.skylinewebcams.com/webcam.html?id=united-arab-emirates/dubai/dubai/dubai", source: "SkylineWebcams" },
      { name: "Palm Jumeirah", url: "https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/fairmont-the-palm.html", embed: "https://www.skylinewebcams.com/webcam.html?id=united-arab-emirates/dubai/dubai/fairmont-the-palm", source: "SkylineWebcams" },
      { name: "Dubai Marina", url: "https://www.webcamgalore.com/webcam/United-Arab-Emirates/Dubai/23639.html", source: "WebcamGalore" },
      { name: "Burj Khalifa Area", url: "https://www.webcamtaxi.com/en/united-arab-emirates/dubai.html", source: "WebcamTaxi" },
    ],
  },
  {
    city: "Abu Dhabi",
    country: "UAE",
    flag: "🇦🇪",
    region: "gulf",
    cameras: [
      { name: "Yas Marina Circuit", url: "https://www.earthtv.com/en/webcam/abu-dhabi-yas-marina-circuit", source: "EarthTV" },
      { name: "City Skyline", url: "https://www.see.cam/ae/01/abu-dhabi", source: "SeeCam" },
      { name: "Panoramic View", url: "https://en.youwebcams.org/location/uae/", source: "YouWebcams" },
    ],
  },
  // ── QATAR ──
  {
    city: "Doha",
    country: "Qatar",
    flag: "🇶🇦",
    region: "gulf",
    cameras: [
      { name: "West Bay Waterfront", url: "https://www.earthtv.com/en/webcam/doha-beach", source: "EarthTV" },
      { name: "Katara Cultural Village", url: "https://www.earthtv.com/en/webcam/doha-cultural-village-katara", source: "EarthTV" },
      { name: "City Skyline", url: "https://www.webcamgalore.com/webcam/Qatar/Doha/14449.html", source: "WebcamGalore" },
      { name: "Port of Doha", url: "https://www.cruisingearth.com/port-webcams/middle-east/doha-qatar/", source: "CruisingEarth" },
    ],
  },
  // ── BAHRAIN ──
  {
    city: "Manama",
    country: "Bahrain",
    flag: "🇧🇭",
    region: "gulf",
    cameras: [
      { name: "Bahrain Skyline", url: "https://www.skylinewebcams.com/en/webcam/bahrain.html", source: "SkylineWebcams" },
      { name: "City View", url: "https://www.webcamtaxi.com/en/bahrain.html", source: "WebcamTaxi" },
    ],
  },
  // ── KUWAIT ──
  {
    city: "Kuwait City",
    country: "Kuwait",
    flag: "🇰🇼",
    region: "gulf",
    cameras: [
      { name: "Kuwait Towers", url: "https://www.skylinewebcams.com/en/webcam/kuwait.html", source: "SkylineWebcams" },
      { name: "City Panorama", url: "https://www.iplivecams.com/live-cams-countries/kuwait/", source: "IpLiveCams" },
    ],
  },
  // ── SAUDI ARABIA ──
  {
    city: "Riyadh",
    country: "Arabia Saudită",
    flag: "🇸🇦",
    region: "gulf",
    cameras: [
      { name: "City Overview", url: "https://www.skylinewebcams.com/en/webcam/saudi-arabia.html", source: "SkylineWebcams" },
      { name: "Riyadh Cam", url: "https://www.iplivecams.com/live-cams-countries/saudi-arabia/", source: "IpLiveCams" },
    ],
  },
  {
    city: "Mecca",
    country: "Arabia Saudită",
    flag: "🇸🇦",
    region: "gulf",
    cameras: [
      { name: "Masjid al-Haram", url: "https://www.skylinewebcams.com/en/webcam/saudi-arabia/makkah/mecca/mecca.html", embed: "https://www.skylinewebcams.com/webcam.html?id=saudi-arabia/makkah/mecca/mecca", source: "SkylineWebcams" },
    ],
  },
  // ── LEBANON ──
  {
    city: "Beirut",
    country: "Liban",
    flag: "🇱🇧",
    region: "levant",
    cameras: [
      { name: "Beirut Skyline", url: "https://www.skylinewebcams.com/en/webcam/lebanon.html", source: "SkylineWebcams" },
      { name: "City View", url: "https://www.webcamtaxi.com/en/lebanon.html", source: "WebcamTaxi" },
      { name: "Port & Downtown", url: "https://www.iplivecams.com/live-cams-countries/lebanon/", source: "IpLiveCams" },
    ],
  },
  // ── IRAQ ──
  {
    city: "Baghdad",
    country: "Irak",
    flag: "🇮🇶",
    region: "levant",
    cameras: [
      { name: "Baghdad City", url: "https://www.iplivecams.com/live-cams-countries/iraq/", source: "IpLiveCams" },
      { name: "City Overview", url: "https://www.pictimo.com/country/iraq", source: "Pictimo" },
    ],
  },
  // ── SYRIA ──
  {
    city: "Damascus",
    country: "Siria",
    flag: "🇸🇾",
    region: "levant",
    cameras: [
      { name: "Damascus Cam", url: "https://www.iplivecams.com/live-cams-countries/syria/", source: "IpLiveCams" },
    ],
  },
  // ── OMAN ──
  {
    city: "Muscat",
    country: "Oman",
    flag: "🇴🇲",
    region: "gulf",
    cameras: [
      { name: "Muscat Port", url: "https://www.skylinewebcams.com/en/webcam/oman.html", source: "SkylineWebcams" },
    ],
  },
  // ── YEMEN ──
  {
    city: "Aden / Sanaa",
    country: "Yemen",
    flag: "🇾🇪",
    region: "gulf",
    cameras: [
      { name: "Yemen Cams", url: "https://www.iplivecams.com/live-cams-countries/yemen/", source: "IpLiveCams" },
    ],
  },
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
      "Iran Israel military strikes airstrikes latest today March 2026",
      "US military operations Iran Gulf strikes March 2026",
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
      "Iran Israel war OSINT update March 2026",
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
      "Iran war casualties civilian damage report March 2026",
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
      "Iran military bases damage satellite assessment March 2026",
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
      "global markets oil price Iran Israel conflict March 2026",
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
      "Houthis Hezbollah Iran proxy attacks Red Sea March 2026",
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
      "UN Security Council Iran Israel war response March 2026",
      "NATO response Iran conflict diplomatic channels today",
    ],
    interval: 120,
    sources: ["tparsi", "ianbremmer", "dandrezner", "RichGoldbergDC", "NATO", "UN", "IsraeliPM"],
  },
];

// ── Categories derived from agents ──
export const CATEGORIES = Object.fromEntries(
  AGENTS.map((a) => [a.id, { name: a.name, fullName: a.fullName, icon: a.icon, color: a.color }])
);

// ── News Sources (combined list for agent prompts) ──
export const NEWS_SOURCES = [
  "Reuters", "Associated Press", "AFP", "Bloomberg",
  "BBC World News", "CNN", "Al Jazeera", "Al Arabiya",
  "Sky News", "France 24", "DW News",
  "Times of Israel", "Jerusalem Post", "Haaretz", "Ynet News", "i24 News",
  "Iran International", "Press TV", "IRNA", "Fars News", "Tasnim News",
  "The National UAE", "Gulf News", "Arab News",
  "Middle East Eye", "Al-Monitor", "The New Arab",
  "The War Zone", "Defense One", "Breaking Defense", "Janes Defence",
  "New York Times", "Washington Post", "The Guardian", "Financial Times",
];

// ── Webcam regions for filtering ──
export const WEBCAM_REGIONS = [
  { id: "all", label: "TOATE", color: "#fff" },
  { id: "israel", label: "ISRAEL", color: "#4fc3f7", flag: "🇮🇱" },
  { id: "iran", label: "IRAN", color: "#ff3b3b", flag: "🇮🇷" },
  { id: "gulf", label: "GOLF", color: "#ffd740", flag: "🌊" },
  { id: "levant", label: "LEVANT", color: "#e040fb", flag: "🗺️" },
];

// ── AI Models — Top 8 Free Models (March 2026) ──
// Providers: OpenRouter (free), Groq (free), Cerebras (free), Mistral (free Experiment)
// All accessible without credit card
export const AI_MODELS = [
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick",
    provider: "Meta (OpenRouter)",
    color: "#1877F2",
    icon: "🦙",
    strength: "Latest Meta model — strongest free model for tool-calling & analysis",
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
    strength: "253B parameters — largest free model, deep analysis capability",
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
];

// Map agents to primary models (best fit for each task)
export const AGENT_MODEL_MAP = {
  sigint: "meta-llama/llama-4-maverick:free",               // Strongest free model for military intel
  osint: "deepseek/deepseek-chat-v3-0324:free",             // Strong analysis
  humint: "deepseek/deepseek-r1:free",                      // Deep reasoning for ground reports
  geoint: "mistralai/mistral-small-3.1-24b-instruct:free",  // Fast structured data
  econint: "nvidia/llama-3.1-nemotron-ultra-253b:free",     // Largest model for complex economic analysis
  proxy: "qwen/qwq-32b:free",                               // Advanced reasoning for proxy monitoring
  diplo: "google/gemma-3-27b-it:free",                      // Reliable for diplomacy
};

// Models used for cross-verification (query 3 different providers)
export const VERIFICATION_MODELS = [
  "meta-llama/llama-4-maverick:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
];

// ── UI Constants ──
export const REFRESH_INTERVAL = 300; // 5 min — OpenRouter free tier: 50 req/day (1000 with $10 credits)
export const MAX_LOG_ENTRIES = 50;
export const MAX_TICKER_ITEMS = 30;
export const ITEMS_PER_AGENT_QUERY = 5;

// ── Severity thresholds ──
export const SEVERITY = {
  CRITICAL: { min: 5, color: "#ff1744", label: "CRITIC" },
  HIGH: { min: 4, color: "#ff6d00", label: "RIDICAT" },
  MEDIUM: { min: 3, color: "#ffab00", label: "MEDIU" },
  LOW: { min: 1, color: "#69f0ae", label: "SCĂZUT" },
};
