// Next.js App Router — RSS Feed Proxy
// Fetches and parses RSS/Atom feeds, returns JSON articles

import { NextRequest, NextResponse } from 'next/server'

const RSS_FEEDS: Record<string, string> = {
  aljazeera: 'https://www.aljazeera.com/xml/rss/all.xml',
  aljazeera_me: 'https://www.aljazeera.com/xml/rss/all.xml',
  bbc_world: 'http://feeds.bbci.co.uk/news/world/rss.xml',
  bbc_me: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
  reuters_world: 'https://www.reutersagency.com/feed/?best-topics=world',
  ap_top: 'https://rsshub.app/apnews/topics/apf-topnews',
  cnn_world: 'http://rss.cnn.com/rss/edition_world.rss',
  guardian_world: 'https://www.theguardian.com/world/rss',
  france24: 'https://www.france24.com/en/rss',
  dw_world: 'https://rss.dw.com/rdf/rss-en-world',
  middleeasteye: 'https://www.middleeasteye.net/rss',
  times_israel: 'https://www.timesofisrael.com/feed/',
  jpost: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx',
  iran_intl: 'https://www.iranintl.com/en/feed',
  al_monitor: 'https://www.al-monitor.com/rss',
  alarabiya: 'https://english.alarabiya.net/tools/rss',
  presstv: 'https://www.presstv.ir/rss',
  defense_one: 'https://www.defenseone.com/rss/',
  war_zone: 'https://www.thedrive.com/the-war-zone/feed',
  breaking_defense: 'https://breakingdefense.com/feed/',
  military_times: 'https://www.militarytimes.com/arc/outboundfeeds/rss/category/news/?outputType=xml',
  naval_news: 'https://www.navalnews.com/feed/',
  sky_news: 'https://feeds.skynews.com/feeds/rss/world.xml',
  euronews: 'https://www.euronews.com/rss',
  nyt_world: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  wapo: 'https://feeds.washingtonpost.com/rss/world',
}

function getTagContent(xml: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
    'i'
  )
  const match = xml.match(regex)
  if (!match) return ''
  return (match[1] || match[2] || '').trim()
}

function extractImage(itemXml: string): string | null {
  const mediaMatch = itemXml.match(/(?:media:content|media:thumbnail|enclosure)[^>]*url=["']([^"']+)["']/i)
  if (mediaMatch) return mediaMatch[1]
  const imgMatch = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i)
  if (imgMatch) return imgMatch[1]
  const imageMatch = itemXml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i)
  if (imageMatch) return imageMatch[1]
  return null
}

function decodeEntities(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function parseRSSItems(xml: string, source: string) {
  const items: any[] = []
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1] || match[2]
    const title = decodeEntities(getTagContent(itemXml, 'title'))
    const description = decodeEntities(getTagContent(itemXml, 'description')).slice(0, 300)
    const link =
      getTagContent(itemXml, 'link') ||
      (itemXml.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      ''
    const pubDate =
      getTagContent(itemXml, 'pubDate') ||
      getTagContent(itemXml, 'published') ||
      getTagContent(itemXml, 'updated') ||
      ''
    const image = extractImage(itemXml)

    if (title) {
      items.push({ title, description, link, pubDate, image, source })
    }
  }
  return items
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedFeeds = searchParams.get('feeds')
  const limit = parseInt(searchParams.get('limit') || '30')

  const feedKeys = requestedFeeds
    ? requestedFeeds.split(',').filter((k) => RSS_FEEDS[k])
    : Object.keys(RSS_FEEDS)

  const feedsToFetch = feedKeys.slice(0, 20)

  try {
    const results = await Promise.allSettled(
      feedsToFetch.map(async (key) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
          const response = await fetch(RSS_FEEDS[key], {
            signal: controller.signal,
            headers: { 'User-Agent': 'IntelLive/9.0 RSS Reader' },
          })
          const xml = await response.text()
          return parseRSSItems(xml, key)
        } finally {
          clearTimeout(timeout)
        }
      })
    )

    const allArticles = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value)
      .sort((a, b) => {
        const da = new Date(a.pubDate || 0).getTime()
        const db = new Date(b.pubDate || 0).getTime()
        return db - da
      })
      .slice(0, limit)

    const successCount = results.filter((r) => r.status === 'fulfilled').length

    return NextResponse.json(
      {
        articles: allArticles,
        meta: {
          feedsRequested: feedsToFetch.length,
          feedsSucceeded: successCount,
          totalArticles: allArticles.length,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 's-maxage=120, stale-while-revalidate=300',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json({ error: 'RSS fetch failed', details: String(err) }, { status: 500 })
  }
}

export const maxDuration = 15
