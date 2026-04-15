import { NextResponse } from 'next/server'

import { searchSessionHasAnchor } from '@propieya/shared'

import { classifyAssistantPrompt } from '../../../../lib/integrations/assistant-query-router'
import { queryLeadsFromMCP, queryPropertiesFromMCP } from '../../../../lib/integrations/kiteprop-mcp'
import {
  promptToSearchSessionMVP,
  shouldRunPortalSearchWithPrompt,
} from '../../../../lib/integrations/prompt-to-search-session-mvp'
import { runListingSearchV2 } from '../../../../lib/search/search-v2-executor'
import { checkAssistantQueryRateLimit } from '../../../../lib/rate-limit-assistant-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_PROMPT = 2000

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

function sanitizePrompt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.replace(/\0/g, '').trim().slice(0, MAX_PROMPT)
  if (s.length < 2) return null
  return s
}

function assertAuthorized(request: Request): NextResponse | null {
  const secret = process.env.KITEPROP_ASSISTANT_QUERY_SECRET?.trim()
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error:
            'Consulta de asistente deshabilitada: definí KITEPROP_ASSISTANT_QUERY_SECRET en Vercel.',
        },
        { status: 503 }
      )
    }
    return null
  }
  const h = request.headers.get('x-assistant-query-secret')?.trim()
  if (h !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

/**
 * POST /api/assistant/query
 * Combina KiteProp (MCP/REST) con el buscador v2 del portal sin reemplazarlo.
 *
 * Seguridad: en producción exige `KITEPROP_ASSISTANT_QUERY_SECRET` y header
 * `x-assistant-query-secret` con el mismo valor.
 */
export async function POST(request: Request) {
  const authErr = assertAuthorized(request)
  if (authErr) return authErr

  const ip = getClientIp(request)
  if (!checkAssistantQueryRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Probá en un minuto.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const rawPrompt =
    typeof body === 'object' && body !== null && 'prompt' in body
      ? (body as { prompt: unknown }).prompt
      : null
  const prompt = sanitizePrompt(rawPrompt)
  if (!prompt) {
    return NextResponse.json(
      { error: 'Falta prompt válido (2–2000 caracteres).' },
      { status: 400 }
    )
  }

  const flags = classifyAssistantPrompt(prompt)
  const slices: {
    kitepropProperties?: Awaited<ReturnType<typeof queryPropertiesFromMCP>>
    kitepropLeads?: Awaited<ReturnType<typeof queryLeadsFromMCP>>
    portalSearch?: Awaited<ReturnType<typeof runListingSearchV2>>
  } = {}

  if (flags.useKitepropProperties) {
    slices.kitepropProperties = await queryPropertiesFromMCP(prompt)
  }
  if (flags.useKitepropLeads) {
    slices.kitepropLeads = await queryLeadsFromMCP(prompt)
  }

  const sessionSuggestion = promptToSearchSessionMVP(prompt)

  if (flags.usePortalSearch && shouldRunPortalSearchWithPrompt(prompt)) {
    if (searchSessionHasAnchor(sessionSuggestion)) {
      slices.portalSearch = await runListingSearchV2({
        session: sessionSuggestion,
        limitPerBucket: 12,
      })
    }
  }

  const parts: string[] = []
  if (slices.kitepropProperties) {
    parts.push(slices.kitepropProperties.summary)
  }
  if (slices.kitepropLeads) {
    parts.push(slices.kitepropLeads.summary)
  }
  if (slices.portalSearch) {
    const t = slices.portalSearch.totalsByBucket
    parts.push(
      `Portal Propieya (búsqueda complementaria): fuertes ${t.strong}, cercanos ${t.near}, ampliados ${t.widened}.`
    )
  }

  return NextResponse.json({
    prompt,
    summary: parts.join(' ') || 'Sin resultados estructurados para esta consulta.',
    slices,
    searchSessionSuggestion: sessionSuggestion,
  })
}
