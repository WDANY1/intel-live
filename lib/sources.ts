import { Source } from './types'

export const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.net',
  'https://nitter.1d4.us',
]

export const SOURCES: Source[] = [
  // ─── TIER 1: Global Wire Services & Major News ───────────────────────────
  { handle: '@Reuters',       name: 'Reuters',           tier: 1, rssUrl: 'https://feeds.reuters.com/reuters/topNews' },
  { handle: '@BBCWorld',      name: 'BBC World News',    tier: 1, rssUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { handle: '@BBCMiddleEast', name: 'BBC Middle East',   tier: 1, rssUrl: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { handle: '@AJEnglish',     name: 'Al Jazeera',        tier: 1, rssUrl: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { handle: '@France24',      name: 'France 24',         tier: 1, rssUrl: 'https://www.france24.com/en/rss' },
  { handle: '@Guardian',      name: 'The Guardian',      tier: 1, rssUrl: 'https://www.theguardian.com/world/rss' },
  { handle: '@DWNews',        name: 'DW News',           tier: 1, rssUrl: 'https://rss.dw.com/rdf/rss-en-world' },
  { handle: '@SkyNews',       name: 'Sky News',          tier: 1, rssUrl: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { handle: '@Euronews',      name: 'Euronews',          tier: 1, rssUrl: 'https://www.euronews.com/rss' },
  { handle: '@APNews',        name: 'AP News',           tier: 1, rssUrl: 'https://rsshub.app/apnews/topics/apf-topnews' },

  // ─── TIER 2: Regional News & Institutional OSINT ─────────────────────────
  { handle: '@TimesofIsrael', name: 'Times of Israel',   tier: 2, rssUrl: 'https://www.timesofisrael.com/feed/' },
  { handle: '@JPost',         name: 'Jerusalem Post',    tier: 2, rssUrl: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx' },
  { handle: '@AlMonitor',     name: 'Al-Monitor',        tier: 2, rssUrl: 'https://www.al-monitor.com/rss' },
  { handle: '@MiddleEastEye', name: 'Middle East Eye',   tier: 2, rssUrl: 'https://www.middleeasteye.net/rss' },
  { handle: '@IranIntl',      name: 'Iran International',tier: 2, rssUrl: 'https://www.iranintl.com/en/feed' },
  { handle: '@DefenseOne',    name: 'Defense One',       tier: 2, rssUrl: 'https://www.defenseone.com/rss/' },
  { handle: '@TheWarZone',    name: 'The War Zone',      tier: 2, rssUrl: 'https://www.thedrive.com/the-war-zone/feed' },
  { handle: '@BreakingDefense',name:'Breaking Defense',  tier: 2, rssUrl: 'https://breakingdefense.com/feed/' },
  { handle: '@Haaretz',       name: 'Haaretz',           tier: 2, rssUrl: 'https://www.haaretz.com/cmlink/1.628752' },
  // Nitter sources (Twitter/X without paid API)
  { handle: '@TheStudyofWar', name: 'ISW',               tier: 2, nitterBase: 'TheStudyofWar' },
  { handle: '@bellingcat',    name: 'Bellingcat',        tier: 2, nitterBase: 'bellingcat' },
  { handle: '@oryxspioenkop', name: 'Oryx',              tier: 2, nitterBase: 'oryxspioenkop' },
  { handle: '@TreyYingst',    name: 'Trey Yingst',      tier: 2, nitterBase: 'TreyYingst' },
  { handle: '@ianbremmer',    name: 'Ian Bremmer',       tier: 2, nitterBase: 'ianbremmer' },
  { handle: '@RALee85',       name: 'Rob Lee',           tier: 2, nitterBase: 'RALee85' },

  // ─── TIER 3: OSINT Twitter Accounts (Tactical Scanners) ──────────────────
  { handle: '@sentdefender',   name: 'OSINTdefender',    tier: 3, nitterBase: 'sentdefender' },
  { handle: '@Osinttechnical', name: 'OSINT Technical',  tier: 3, nitterBase: 'Osinttechnical' },
  { handle: '@Osint613',       name: 'OSINT 613',        tier: 3, nitterBase: 'Osint613' },
  { handle: '@AuroraIntel',    name: 'Aurora Intel',     tier: 3, nitterBase: 'AuroraIntel' },
  { handle: '@ELINTNews',      name: 'ELINT News',       tier: 3, nitterBase: 'ELINTNews' },
  { handle: '@IntelSky',       name: 'Intel Sky',        tier: 3, nitterBase: 'IntelSky' },
  { handle: '@Faytuks',        name: 'Faytuks',          tier: 3, nitterBase: 'Faytuks' },
  { handle: '@QalaatAlMudiq',  name: 'Qalaat Al Mudiq',  tier: 3, nitterBase: 'QalaatAlMudiq' },
  { handle: '@clashreport',    name: 'Clash Report',     tier: 3, nitterBase: 'clashreport' },
  { handle: '@OSINTWarfare',   name: 'OSINT Warfare',    tier: 3, nitterBase: 'OSINTWarfare' },
  { handle: '@IntelCrusader',  name: 'Intel Crusader',   tier: 3, nitterBase: 'IntelCrusader' },
  { handle: '@MENA_Analyst',   name: 'MENA Analyst',     tier: 3, nitterBase: 'MENA_Analyst' },
  { handle: '@OsintWWIII',     name: 'OSINT WWIII',      tier: 3, nitterBase: 'OsintWWIII' },
  { handle: '@nexta_tv',       name: 'Nexta',            tier: 3, nitterBase: 'nexta_tv' },
  { handle: '@IntelCrab',      name: 'Intel Crab',       tier: 3, nitterBase: 'IntelCrab' },
  { handle: '@WarMonitors',    name: 'War Monitors',     tier: 3, nitterBase: 'WarMonitors' },
  { handle: '@lebintel',       name: 'Leb Intel',        tier: 3, nitterBase: 'lebintel' },
  { handle: '@IranianWatchdog',name: 'Iranian Watchdog', tier: 3, nitterBase: 'IranianWatchdog' },
  { handle: '@Defence_Index',  name: 'Defence Index',    tier: 3, nitterBase: 'Defence_Index' },
  { handle: '@Conflict_Radar', name: 'Conflict Radar',   tier: 3, nitterBase: 'Conflict_Radar' },
  { handle: '@visegrad24',     name: 'Visegrad 24',      tier: 3, nitterBase: 'visegrad24' },
  { handle: '@MiddleEastMnt',  name: 'ME Monitor',       tier: 3, nitterBase: 'MiddleEastMnt' },
  { handle: '@criticalthreats',name: 'Critical Threats',  tier: 3, nitterBase: 'criticalthreats' },
  { handle: '@spectatorindex', name: 'Spectator Index',  tier: 3, nitterBase: 'spectatorindex' },
  { handle: '@MiddleEastBuka', name: 'ME Visual Intel',  tier: 3, nitterBase: 'MiddleEastBuka' },
  { handle: '@osint1117',      name: 'OSINT Spectator',  tier: 3, nitterBase: 'osint1117' },
]

export const getRssSources   = () => SOURCES.filter(s => s.rssUrl)
export const getNitterSources = () => SOURCES.filter(s => s.nitterBase)
export const getSourceByHandle = (h: string) =>
  SOURCES.find(s => s.handle.toLowerCase() === h.toLowerCase())
