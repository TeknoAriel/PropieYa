/**
 * Capa MCP remota KiteProp (https://mcp.kiteprop.com/mcp) + fallback REST.
 * Documentación: https://mcp.kiteprop.com — herramientas `search_properties`, `search_messages`.
 */

import { getLeads, getProperties } from './kiteprop-client'

/** Por defecto 10s; override con `KITEPROP_MCP_FETCH_TIMEOUT_MS` (1000–120000). */
const DEFAULT_MCP_FETCH_TIMEOUT_MS = 10_000

function mcpFetchTimeoutMs(): number {
  const raw = process.env.KITEPROP_MCP_FETCH_TIMEOUT_MS?.trim()
  if (!raw) return DEFAULT_MCP_FETCH_TIMEOUT_MS
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1000 || n > 120_000) {
    return DEFAULT_MCP_FETCH_TIMEOUT_MS
  }
  return n
}

export type KitepropMcpQueryResult = {
  results: unknown[]
  summary: string
  source: 'mcp' | 'rest_fallback' | 'disabled'
}

function mcpUrl(): string {
  return process.env.KITEPROP_MCP_URL?.trim() || 'https://mcp.kiteprop.com/mcp'
}

function apiKey(): string | null {
  return (
    process.env.KITEPROP_API_KEY?.trim() ||
    process.env.KITEPROP_API_TOKEN?.trim() ||
    null
  )
}

function tryParseJsonRpcResult(body: string): unknown {
  const lines = body.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const raw = t.slice(5).trim()
    if (raw === '[DONE]') continue
    try {
      const j = JSON.parse(raw) as { result?: unknown; error?: { message?: string } }
      if (j.error?.message) {
        return { __rpcError: j.error.message }
      }
      if (j.result !== undefined) return j.result
    } catch {
      /* seguir */
    }
  }
  try {
    const j = JSON.parse(body) as { result?: unknown; error?: { message?: string } }
    if (j.error?.message) return { __rpcError: j.error.message }
    if (j.result !== undefined) return j.result
  } catch {
    /* no JSON único */
  }
  return null
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError'
}

async function mcpToolsCall(
  tool: string,
  args: Record<string, unknown>
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const key = apiKey()
  if (!key) {
    return { ok: false, error: 'Sin KITEPROP_API_KEY' }
  }

  const endpoint = mcpUrl()
  const timeoutMs = mcpFetchTimeoutMs()
  const controller = new AbortController()
  const startedAt = Date.now()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/x-ndjson, text/event-stream',
        'X-API-Key': key,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: tool, arguments: args },
        id: globalThis.crypto?.randomUUID?.() ?? `kp-${Date.now()}`,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('[kiteprop-mcp] tools/call HTTP', tool, res.status, text.slice(0, 500))
      return { ok: false, error: `MCP HTTP ${res.status}` }
    }

    const parsed = tryParseJsonRpcResult(text)
    if (parsed && typeof parsed === 'object' && '__rpcError' in parsed) {
      return { ok: false, error: String((parsed as { __rpcError: string }).__rpcError) }
    }
    if (parsed != null) {
      return { ok: true, result: parsed }
    }

    return { ok: true, result: text }
  } catch (e) {
    if (isAbortError(e)) {
      const elapsedMs = Date.now() - startedAt
      console.warn(
        '[kiteprop-mcp] tools/call MCP timeout',
        JSON.stringify({ tool, endpoint, timeoutMs, elapsedMs })
      )
      return { ok: false, error: `MCP timeout (${timeoutMs}ms)` }
    }
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[kiteprop-mcp] tools/call error', tool, msg)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timeoutId)
  }
}

export function normalizeToolResultToRows(raw: unknown): unknown[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const k of ['data', 'items', 'results', 'properties', 'messages', 'leads']) {
      const v = o[k]
      if (Array.isArray(v)) return v
    }
    const content = o.content
    if (Array.isArray(content)) {
      return content.map((c) => {
        if (c && typeof c === 'object' && 'text' in c) {
          return (c as { text: string }).text
        }
        return c
      })
    }
    const structured = o.structuredContent
    if (structured != null) return [structured]
  }

  return [raw]
}

function buildSummary(kind: 'properties' | 'leads', rows: unknown[], source: string): string {
  const n = rows.length
  if (kind === 'properties') {
    return `${source}: ${n} resultado(s) de propiedades para la consulta.`
  }
  return `${source}: ${n} resultado(s) de leads/mensajes para la consulta.`
}

/**
 * Propiedades vía MCP `search_properties` o REST `getProperties`.
 */
export async function queryPropertiesFromMCP(prompt: string): Promise<KitepropMcpQueryResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return { results: [], summary: 'Consulta vacía.', source: 'disabled' }
  }

  const mcp = await mcpToolsCall('search_properties', {
    query: trimmed,
    natural_language: trimmed,
  })

  if (mcp.ok) {
    const rows = normalizeToolResultToRows(mcp.result)
    const nonEmpty =
      rows.length > 0 ||
      (typeof mcp.result === 'string' && mcp.result.trim().length > 0)
    if (nonEmpty) {
      return {
        results: rows.length > 0 ? rows : [mcp.result],
        summary: buildSummary(
          'properties',
          rows.length > 0 ? rows : [mcp.result],
          'KiteProp MCP'
        ),
        source: 'mcp',
      }
    }
  } else {
    console.warn('[kiteprop-mcp] search_properties fallback REST:', mcp.error)
  }

  const rest = await getProperties({
    q: trimmed,
    search: trimmed,
  })

  if (!rest.ok) {
    return {
      results: [],
      summary: `No se pudo consultar propiedades (${rest.message}).`,
      source: 'rest_fallback',
    }
  }

  const rows = normalizeToolResultToRows(rest.data)
  return {
    results: rows,
    summary: buildSummary('properties', rows, 'KiteProp REST'),
    source: 'rest_fallback',
  }
}

/**
 * Leads / mensajes vía MCP `search_messages` o REST `getLeads`.
 */
export async function queryLeadsFromMCP(prompt: string): Promise<KitepropMcpQueryResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return { results: [], summary: 'Consulta vacía.', source: 'disabled' }
  }

  const mcp = await mcpToolsCall('search_messages', {
    query: trimmed,
    natural_language: trimmed,
  })

  if (mcp.ok) {
    const rows = normalizeToolResultToRows(mcp.result)
    const nonEmpty =
      rows.length > 0 ||
      (typeof mcp.result === 'string' && mcp.result.trim().length > 0)
    if (nonEmpty) {
      const out = rows.length > 0 ? rows : [mcp.result]
      return {
        results: out,
        summary: buildSummary('leads', out, 'KiteProp MCP'),
        source: 'mcp',
      }
    }
  } else {
    console.warn('[kiteprop-mcp] search_messages fallback REST:', mcp.error)
  }

  const rest = await getLeads({
    q: trimmed,
    search: trimmed,
  })

  if (!rest.ok) {
    return {
      results: [],
      summary: `No se pudo consultar leads (${rest.message}).`,
      source: 'rest_fallback',
    }
  }

  const rows = normalizeToolResultToRows(rest.data)
  return {
    results: rows,
    summary: buildSummary('leads', rows, 'KiteProp REST'),
    source: 'rest_fallback',
  }
}
