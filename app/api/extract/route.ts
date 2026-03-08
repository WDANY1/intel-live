// ============================================================
// API Route: /api/extract — RSS to structured intel extraction
// Fetches RSS feeds and extracts structured intelligence items
// ============================================================

import { NextResponse } from 'next/server'
import { extractIntelFromRSS, deduplicateIntel } from '@/lib/extraction'
import { cache, eventStore } from '@/lib/cache'
import type { RSSArticle } from '@/lib/types'

export const maxDuration = 30

const CACHE_KEY = 'extracted_intel'
const CACHE_TTL = 180_000 // 3 minutes

export async function GET() {
  try {
    // Check cache
    const cached = cache.get(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=180' },
      })
    }

    // Fetch RSS articles from our own RSS endpoint
    const rssRes = await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/rss?feeds=bbc_me,aljazeera,times_israel,iran_intl,reuters_world,al_monitor,war_zone,breaking_defense,defense_one,jpost,alarabiya&limit=60`,
      { next: { revalidate: 120 } }
    )

    let articles: RSSArticle[] = []
    if (rssRes.ok) {
      const data = await rssRes.json()
      articles = data.articles || []
    }

    // Extract structured intel
    const rawIntel = extractIntelFromRSS(articles)
    const dedupedIntel = deduplicateIntel(rawIntel)

    const result = {
      count: dedupedIntel.length,
      rawCount: rawIntel.length,
      articlesProcessed: articles.length,
      timestamp: Date.now(),
      intel: dedupedIntel,
    }

    cache.set(CACHE_KEY, result, CACHE_TTL)

    // Publish high-severity items to SSE
    const critical = dedupedIntel.filter(i => i.severity >= 4)
    if (critical.length > 0) {
      eventStore.push('intel_update', {
        count: critical.length,
        items: critical.slice(0, 3).map(i => ({
          headline: i.headline,
          severity: i.severity,
          location: i.location,
          source: i.source,
        })),
      })
    }

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=180' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Extraction failed', details: err.message },
      { status: 500 }
    )
  }
}
