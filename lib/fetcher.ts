import { RawArticle, Source } from './types'
import { SOURCES, NITTER_INSTANCES, getRssSources, getNitterSources } from './sources'
import { passesKeywordFilter } from './keywords'

// ─── Simple hash for deduplication ───────────────────────────────────────────
function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).padStart(8, '0')
}

// ─── XML RSS Parser (no external deps) ───────────────────────────────────────
function parseRSSXml(xml: string, source: Source): RawArticle[] {
  const now = new Date().toISOString()
  const items: RawArticle[] = []

  // Extract <item> or <entry> blocks
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const get = (tag: string): string => {
      const r = new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
        'i'
      )
      const m = block.match(r)
      if (!m) return ''
      return ((m[1] || m[2]) ?? '').replace(/<[^>]+>/g, '').trim()
    }

    const title = get('title')
    const description = get('description') || get('summary') || get('content')
    const link = get('link') || get('guid') || ''
    const pubDate = get('pubDate') || get('published') || get('updated') || now
    const content = `${title} ${description}`.slice(0, 600)

    if (!title || title.length < 10) continue

    const id = `${source.handle}_${simpleHash(title)}`

    items.push({
      id,
      title,
      content,
      url: link,
      publishedAt: new Date(pubDate).toISOString(),
      sourceHandle: source.handle,
      sourceTier: source.tier,
      fetchedAt: now,
    })
  }

  return items
}

// ─── Fetch a single RSS feed ──────────────────────────────────────────────────
async function fetchRSSFeed(source: Source): Promise<RawArticle[]> {
  if (!source.rssUrl) return []
  try {
    const res = await fetch(source.rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 OSINT-Monitor/1.0' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSSXml(xml, source)
  } catch {
    return []
  }
}

// ─── Fetch Nitter RSS (Twitter without API) ───────────────────────────────────
async function fetchNitterFeed(source: Source): Promise<RawArticle[]> {
  if (!source.nitterBase) return []

  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${source.nitterBase}/rss`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 OSINT-Monitor/1.0' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 0 },
      })
      if (!res.ok) continue
      const xml = await res.text()
      if (!xml.includes('<rss') && !xml.includes('<feed')) continue
      return parseRSSXml(xml, source)
    } catch {
      continue // try next instance
    }
  }
  return []
}

// ─── Fetch GDELT Project (free global news API) ───────────────────────────────
async function fetchGDELT(): Promise<RawArticle[]> {
  const gdeltSource: Source = {
    handle: '@GDELT', name: 'GDELT', tier: 2,
    rssUrl: 'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent('iran OR israel OR idf OR irgc OR hezbollah OR houthi OR missile OR airstrike') +
      '&mode=artlist&maxrecords=40&format=rss&timespan=20min&sort=DateDesc&LANGUAGE=eng',
  }
  return fetchRSSFeed(gdeltSource)
}

// ─── Keyword filter & deduplication ──────────────────────────────────────────
const seenIds = new Set<string>()

function filterAndDeduplicate(articles: RawArticle[]): RawArticle[] {
  return articles.filter(a => {
    if (seenIds.has(a.id)) return false
    if (!passesKeywordFilter(a.title + ' ' + a.content)) return false
    seenIds.add(a.id)
    // Keep seen IDs cache bounded
    if (seenIds.size > 2000) {
      const iter = seenIds.values()
      for (let i = 0; i < 500; i++) seenIds.delete(iter.next().value)
    }
    return true
  })
}

// ─── Master fetcher ───────────────────────────────────────────────────────────
export async function fetchAllSources(): Promise<{ articles: RawArticle[]; fetched: number }> {
  const rssSources   = getRssSources()
  const nitterSources = getNitterSources()

  // Run all fetches in parallel (Promise.allSettled — one failure doesn't kill all)
  const rssPromises    = rssSources.map(s => fetchRSSFeed(s))
  const nitterPromises = nitterSources.map(s => fetchNitterFeed(s))
  const gdeltPromise   = fetchGDELT()

  const allResults = await Promise.allSettled([
    ...rssPromises,
    ...nitterPromises,
    gdeltPromise,
  ])

  let fetched = 0
  const allArticles: RawArticle[] = []

  for (const result of allResults) {
    if (result.status === 'fulfilled') {
      fetched += result.value.length
      allArticles.push(...result.value)
    }
  }

  const filtered = filterAndDeduplicate(allArticles)

  return { articles: filtered, fetched }
}
