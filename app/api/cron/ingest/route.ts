import { NextRequest, NextResponse } from 'next/server'
import { fetchAllSources } from '@/lib/fetcher'
import { runAgentPipeline } from '@/lib/agents'
import { saveEvents, recordPipelineRun } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const runAt = new Date().toISOString()

  try {
    // Stage 0: Fetch all sources
    const { articles, fetched } = await fetchAllSources()

    if (articles.length < 2) {
      return NextResponse.json({
        message: 'Too few relevant articles found',
        fetched,
        filtered: articles.length,
        runAt,
      })
    }

    // Stages 1-3: Run AI pipeline
    const { events, stats } = await runAgentPipeline(articles)

    // Save to storage
    if (events.length > 0) {
      await saveEvents(events)
    }

    const pipelineStats = {
      fetched,
      filtered: articles.length,
      clustered: stats.clustered,
      published: stats.published,
      errors: stats.errors,
      runAt,
    }

    recordPipelineRun(pipelineStats)

    return NextResponse.json({
      success: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      ...pipelineStats,
      rejected: stats.rejected,
    })
  } catch (err) {
    console.error('Cron ingest error:', err)
    return NextResponse.json(
      { error: String(err), runAt },
      { status: 500 }
    )
  }
}
