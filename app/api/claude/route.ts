// Next.js App Router — AI Proxy Endpoint
// Supports: OpenRouter, Groq, Cerebras, Mistral, Google Gemini, HuggingFace
// All providers have free tiers

import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const HF_URL = 'https://api-inference.huggingface.co/models'

const OPENROUTER_MODELS = [
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-4-scout:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwq-32b:free',
  'nvidia/llama-3.1-nemotron-ultra-253b:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'deepseek/deepseek-r1-zero:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
]

const CEREBRAS_MODELS = ['llama-3.3-70b', 'llama-3.1-8b']
const MISTRAL_MODELS = ['mistral-small-latest', 'open-mistral-nemo']
const HF_MODELS = [
  'mistralai/Mistral-7B-Instruct-v0.3',
  'meta-llama/Meta-Llama-3-8B-Instruct',
]

const RETRY_CODES = [400, 404, 429, 502, 503]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callOpenRouter(apiKey: string, messages: Message[], model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)
  try {
    return await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://intel-live.vercel.app',
        'X-Title': 'Intel Live Dashboard',
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function callGroq(apiKey: string, messages: Message[], model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function callCerebras(apiKey: string, messages: Message[], model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetch(CEREBRAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function callMistral(apiKey: string, messages: Message[], model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4000 }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(apiKey: string, prompt: string, model = 'gemini-2.0-flash') {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    return await fetch(`${GEMINI_URL}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function callHuggingFace(apiKey: string, messages: Message[], model: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')
  try {
    return await fetch(`${HF_URL}/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 4000, temperature: 0.7, return_full_text: false },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function extractOpenAIText(data: any): string {
  return data?.choices?.[0]?.message?.content || ''
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    providers: ['openrouter', 'groq', 'cerebras', 'mistral', 'gemini', 'huggingface'],
    hasKeys: {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      cerebras: !!process.env.CEREBRAS_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      huggingface: !!process.env.HF_API_KEY,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, model: requestedModel } = body

    const systemPrompt =
      'You are an elite military intelligence analyst specializing in Middle East geopolitics (Iran-Israel-US conflict). Provide detailed, structured intelligence reports. Always respond with valid JSON when asked. Use the most recent knowledge available. Respond based on real events and verified information. Cross-reference information from BOTH Western and Iranian/regional sources for balanced reporting.'

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]

    const userKey = request.headers.get('x-api-key')
    const realUserKey = userKey && userKey !== 'server-side' ? userKey : null
    const openrouterKey = realUserKey || process.env.OPENROUTER_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const cerebrasKey = process.env.CEREBRAS_API_KEY
    const mistralKey = process.env.MISTRAL_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY
    const hfKey = process.env.HF_API_KEY

    let text = '', usedModel = '', lastError = ''

    // ═══ Strategy 1: Groq (fastest, free tier) ═══
    if (!text && groqKey) {
      for (const model of GROQ_MODELS) {
        try {
          const response = await callGroq(groqKey, messages, model)
          const data = await response.json()
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data)
            usedModel = `groq/${model}`
            break
          }
          lastError = data.error?.message || `Groq ${response.status}`
          if (response.status === 429) { await sleep(300); continue }
          if (!RETRY_CODES.includes(response.status)) break
        } catch (e: any) { lastError = e.message }
      }
    }

    // ═══ Strategy 2: Cerebras (ultra-fast, free tier) ═══
    if (!text && cerebrasKey) {
      for (const model of CEREBRAS_MODELS) {
        try {
          const response = await callCerebras(cerebrasKey, messages, model)
          const data = await response.json()
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data)
            usedModel = `cerebras/${model}`
            break
          }
          lastError = data.error?.message || `Cerebras ${response.status}`
          if (response.status === 429) { await sleep(300); continue }
          if (!RETRY_CODES.includes(response.status)) break
        } catch (e: any) { lastError = e.message }
      }
    }

    // ═══ Strategy 3: Mistral AI ═══
    if (!text && mistralKey) {
      for (const model of MISTRAL_MODELS) {
        try {
          const response = await callMistral(mistralKey, messages, model)
          const data = await response.json()
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data)
            usedModel = `mistral/${model}`
            break
          }
          lastError = data.error?.message || `Mistral ${response.status}`
          if (response.status === 429) { await sleep(300); continue }
          if (!RETRY_CODES.includes(response.status)) break
        } catch (e: any) { lastError = e.message }
      }
    }

    // ═══ Strategy 4: Google Gemini ═══
    if (!text && geminiKey) {
      try {
        const response = await callGemini(geminiKey, `${systemPrompt}\n\n${prompt}`)
        const data = await response.json()
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = data.candidates[0].content.parts[0].text
          usedModel = 'gemini-2.0-flash'
        } else {
          lastError = data.error?.message || `Gemini ${response.status}`
        }
      } catch (e: any) { lastError = e.message }
    }

    // ═══ Strategy 5: OpenRouter (many free models, fallback) ═══
    if (!text && openrouterKey) {
      const model = OPENROUTER_MODELS.includes(requestedModel) ? requestedModel : OPENROUTER_MODELS[0]
      const tryOrder = [model, ...OPENROUTER_MODELS.filter((m) => m !== model)]

      for (const tryModel of tryOrder) {
        try {
          const response = await callOpenRouter(openrouterKey, messages, tryModel)
          const data = await response.json()
          if (response.ok && extractOpenAIText(data)) {
            text = extractOpenAIText(data)
            usedModel = tryModel
            break
          }
          lastError = data.error?.message || `OpenRouter ${response.status}`
          if (response.status === 429) { await sleep(300); continue }
          if (!RETRY_CODES.includes(response.status)) break
        } catch (e: any) { lastError = e.message }
      }
    }

    // ═══ Strategy 6: HuggingFace (last resort) ═══
    if (!text && hfKey) {
      for (const model of HF_MODELS) {
        try {
          const response = await callHuggingFace(hfKey, messages, model)
          const data = await response.json()
          if (response.ok) {
            const hfText = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text
            if (hfText) {
              text = hfText
              usedModel = `hf/${model.split('/').pop()}`
              break
            }
          }
          lastError = data.error || `HuggingFace ${response.status}`
          if (response.status === 503) { await sleep(1000); continue }
          if (!RETRY_CODES.includes(response.status)) break
        } catch (e: any) { lastError = e.message }
      }
    }

    if (!text) {
      return NextResponse.json(
        {
          error: lastError || 'All AI providers failed',
          providers_checked: [
            groqKey ? 'groq' : null,
            cerebrasKey ? 'cerebras' : null,
            mistralKey ? 'mistral' : null,
            geminiKey ? 'gemini' : null,
            openrouterKey ? 'openrouter' : null,
            hfKey ? 'huggingface' : null,
          ].filter(Boolean),
          hint: 'Set at least one API key in Vercel env vars: OPENROUTER_API_KEY (easiest), GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, GEMINI_API_KEY, HF_API_KEY',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ text, model: usedModel, sources: [] })
  } catch (err: any) {
    return NextResponse.json({ error: 'Function error', details: String(err) }, { status: 500 })
  }
}

export const maxDuration = 60
