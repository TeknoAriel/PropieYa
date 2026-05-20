/**
 * Auditoría de endpoints Kiteprop para emprendimientos (REST).
 *
 * Uso:
 *   KITEPROP_API_KEY=kp_... pnpm probe:kiteprop-developments
 *
 * Sin key: solo sondeo público (404/401). Con key: prueba rutas candidatas y
 * muestrea tipos en GET /properties.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(__dirname, '../apps/web/.env') })

const BASE = (process.env.KITEPROP_API_BASE_URL?.trim() || 'https://www.kiteprop.com/api/v1').replace(
  /\/$/,
  ''
)
const KEY =
  process.env.KITEPROP_API_KEY?.trim() || process.env.KITEPROP_API_TOKEN?.trim() || ''

const CANDIDATE_PATHS = [
  'developments',
  'emprendimientos',
  'real-estate-developments',
  'development-projects',
  'projects',
  'buildings',
  'properties',
] as const

type ProbeResult = {
  path: string
  status: number
  itemCount: number | null
  sampleTypes: string[]
  errorMessage: string
}

async function fetchJson(path: string, query?: Record<string, string>): Promise<ProbeResult> {
  const url = new URL(`${BASE}/${path.replace(/^\//, '')}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (KEY) headers['X-API-Key'] = KEY

  const res = await fetch(url.toString(), { headers })
  const text = await res.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return {
      path,
      status: res.status,
      itemCount: null,
      sampleTypes: [],
      errorMessage: `non-json: ${text.slice(0, 80)}`,
    }
  }
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const err = typeof o.errorMessage === 'string' ? o.errorMessage : ''
  const data = o.data
  let items: unknown[] = []
  if (Array.isArray(data)) items = data
  else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const arr = d.data ?? d.properties ?? d.developments ?? d.items
    if (Array.isArray(arr)) items = arr
  }

  const sampleTypes: string[] = []
  for (const it of items.slice(0, 20)) {
    if (!it || typeof it !== 'object') continue
    const row = it as Record<string, unknown>
    const t =
      row.type ??
      row.property_type ??
      row.property_type_old ??
      row.kind ??
      row.category
    if (t != null) sampleTypes.push(String(t))
  }

  return {
    path,
    status: res.status,
    itemCount: res.ok ? items.length : null,
    sampleTypes: [...new Set(sampleTypes)].slice(0, 12),
    errorMessage: err,
  }
}

async function main() {
  console.log('=== Kiteprop emprendimientos — probe ===')
  console.log('BASE:', BASE)
  console.log('API key:', KEY ? `${KEY.slice(0, 6)}…` : '(ausente — solo rutas públicas)')

  if (!KEY) {
    console.log('\n--- Sin autenticación (referencia) ---')
    for (const path of ['developments', 'properties']) {
      const r = await fetchJson(path, { per_page: '1' })
      console.log(`${path}: HTTP ${r.status} ${r.errorMessage || ''}`)
    }
    console.log('\nDefiní KITEPROP_API_KEY para auditar rutas con credenciales.')
    process.exit(0)
  }

  console.log('\n--- Rutas candidatas ---')
  for (const path of CANDIDATE_PATHS) {
    const r = await fetchJson(path, { per_page: '5', page: '1' })
    console.log(
      `${path.padEnd(28)} HTTP ${String(r.status).padStart(3)}  items=${r.itemCount ?? '-'}  types=${r.sampleTypes.join(', ') || '-'}  ${r.errorMessage}`
    )
  }

  console.log('\n--- GET /properties filtros tipo emprendimiento ---')
  for (const q of [
    { type: 'emprendimiento' },
    { type: 'developments' },
    { property_type: 'emprendimiento' },
    { search: 'emprendimiento' },
  ]) {
    const r = await fetchJson('properties', { per_page: '5', page: '1', ...q })
    const label = Object.entries(q)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    console.log(
      `${label.padEnd(40)} HTTP ${r.status}  items=${r.itemCount ?? '-'}  types=${r.sampleTypes.join(', ') || '-'}`
    )
  }

  console.log('\nListo. Si solo /properties devuelve ítems con type emprendimiento, la ingesta actual (mapFeedPropertyType) ya alcanza.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
