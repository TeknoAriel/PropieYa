/**
 * CORS para `/api/trpc`: el panel (otro origen) llama al web con Bearer en header.
 *
 * Vercel (proyecto **web**): `TRUSTED_PANEL_ORIGINS=https://tu-panel.vercel.app`
 * Varios orígenes separados por coma (preview + producción).
 */

export function getTrustedPanelOrigins(): string[] {
  const raw = process.env.TRUSTED_PANEL_ORIGINS?.trim() ?? ''
  if (raw.length > 0) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return ['http://localhost:3011', 'http://127.0.0.1:3011']
}

export function corsHeadersForRequest(request: Request): Headers {
  const origin = request.headers.get('origin')
  const headers = new Headers()
  if (!origin) return headers

  const allowed = getTrustedPanelOrigins()
  if (!allowed.includes(origin)) return headers

  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Vary', 'Origin')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set(
    'Access-Control-Allow-Headers',
    [
      'content-type',
      'authorization',
      'x-trpc-source',
      'trpc-accept',
      'x-trpc-batch-mode',
    ].join(', ')
  )
  return headers
}

export function withPanelCors(request: Request, response: Response): Response {
  const extra = corsHeadersForRequest(request)
  if ([...extra.keys()].length === 0) {
    return response
  }
  const merged = new Headers(response.headers)
  extra.forEach((value, key) => merged.set(key, value))
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  })
}
