export const KEYWORDS = [
  // Actors & organizations
  'iran','irgc','israel','idf','mossad','hezbollah','hamas','houthi','houthis',
  'pentagon','centcom','quds','quds force','iaf',
  // Military actions
  'strike','airstrike','air strike','missile','rocket','drone','uav','ballistic',
  'explosion','blast','attack','intercept','shoot down','shot down','artillery',
  'bombardment','bombing','shelling','raid','assassination','warhead','projectile',
  'mortar','salvo','volley','sortie','naval strike','hypersonic',
  // Locations - Iran
  'tehran','isfahan','natanz','arak','bushehr','fordow','khuzestan','tabriz',
  'mashhad','shiraz','ahvaz','bandar abbas','chabahar',
  // Locations - Israel
  'tel aviv','haifa','jerusalem','eilat','ashkelon','beer sheva','netanya',
  'ashdod','herzliya','dimona',
  // Locations - Lebanon/Syria/Iraq
  'beirut','damascus','baghdad','erbil','mosul','basra','aleppo','deir ez-zor',
  'fallujah','kirkuk',
  // Strategic waterways
  'strait of hormuz','persian gulf','red sea','gulf of aden','gulf of oman',
  'bab el-mandeb','suez','arabian sea',
  // Conflict zones
  'west bank','gaza','golan','sinai','rafah','khan younis','jenin','nablus',
  'ramallah','tulkarm',
  // Countries
  'yemen','syria','iraq','lebanon','bahrain','qatar','oman','saudi','uae',
  'jordan','egypt','turkey','russia','china',
  // Escalation terms
  'war','conflict','escalation','nuclear','uranium','enrichment','centrifuge',
  'jcpoa','sanctions','dead','killed','wounded','casualties','hostage',
  'airspace','military base','warship','carrier group','submarine','frigate',
  // Weapons systems
  'f-35','f-16','su-35','s-300','s-400','s-300pmU','iron dome','david\'s sling',
  'arrow','patriot','thaad','qassam','kornet','shahed','mohajer',
]

export function passesKeywordFilter(text: string): boolean {
  const lower = text.toLowerCase()
  return KEYWORDS.some(kw => lower.includes(kw))
}
