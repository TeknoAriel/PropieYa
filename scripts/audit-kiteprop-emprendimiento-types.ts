/**
 * Cuenta property_type en API Kiteprop y compara con mapeo portal.
 *
 * Uso: ENV_FILE=apps/web/.env.prod.audit pnpm exec tsx scripts/audit-kiteprop-emprendimiento-types.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { mapFeedPropertyTypeWithListingText } from '@propieya/shared'

const envFile = process.env.ENV_FILE ?? 'apps/web/.env'
config({ path: resolve(process.cwd(), envFile) })

const BASE = (process.env.KITEPROP_API_BASE_URL?.trim() || 'https://www.kiteprop.com/api/v1').replace(
  /\/$/,
  ''
)
const KEY =
  process.env.KITEPROP_API_KEY?.trim() || process.env.KITEPROP_API_TOKEN?.trim() || ''

async function fetchPage(page: number, perPage: number) {
  const u = new URL(`${BASE}/properties`)
  u.searchParams.set('page', String(page))
  u.searchParams.set('per_page', String(perPage))
  const res = await fetch(u.toString(), {
    headers: { 'X-API-Key': KEY, Accept: 'application/json' },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text) as {
    data?: unknown[]
    meta?: { last_page?: number }
  }
}

async function main() {
  if (!KEY) {
    console.error('KITEPROP_API_KEY ausente')
    process.exit(1)
  }

  const perPage = 100
  const maxPages = parseInt(process.env.MAX_PAGES ?? '50', 10) || 50
  const typeCounts = new Map<string, number>()
  const mappedCounts = new Map<string, number>()
  let wouldBeDev = 0
  let feedEmprendimiento = 0
  let apartmentPozoMisclassified = 0
  let total = 0

  let lastPage = 1
  for (let page = 1; page <= maxPages && page <= lastPage; page++) {
    const json = await fetchPage(page, perPage)
    lastPage = json.meta?.last_page ?? page
    const data = Array.isArray(json.data) ? json.data : []
    if (data.length === 0) break

    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue
      const it = raw as Record<string, unknown>
      total++
      const feedType = String(it.property_type ?? it.property_type_old ?? 'null')
      typeCounts.set(feedType, (typeCounts.get(feedType) ?? 0) + 1)

      const title = String(it.title ?? it.content ?? '')
      const desc = String(it.description ?? '')
      const mapped = mapFeedPropertyTypeWithListingText(feedType, { title, description: desc })
      mappedCounts.set(mapped, (mappedCounts.get(mapped) ?? 0) + 1)

      const feedKey = feedType.toLowerCase()
      if (feedKey.includes('emprend') || feedKey.includes('development')) feedEmprendimiento++

      const blob = `${title} ${desc}`.toLowerCase()
      const hasPozo = /\ben\s+pozo\b/.test(blob) || /\bemprendimiento\b/.test(blob)
      if (mapped === 'development_unit') wouldBeDev++
      if (feedType === 'apartments' && hasPozo && mapped !== 'development_unit') {
        apartmentPozoMisclassified++
        if (apartmentPozoMisclassified <= 8) {
          console.log('MAL MAPEO:', title.slice(0, 85))
        }
      }
    }
  }

  console.log('\n=== API Kiteprop /properties ===')
  console.log('Total ítems:', total, '| páginas:', lastPage)
  console.log('\nproperty_type (feed):')
  for (const [k, n] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${k}: ${n}`)
  }
  console.log('\nMapeo actual (mapFeedPropertyTypeWithListingText):')
  for (const [k, n] of [...mappedCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`)
  }
  console.log('\nFeed type emprendimiento/development:', feedEmprendimiento)
  console.log('Mapeados a development_unit:', wouldBeDev)
  console.log('apartments+pozo que NO mapean a development_unit:', apartmentPozoMisclassified)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
