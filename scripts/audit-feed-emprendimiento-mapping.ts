/**
 * Audita feed Yumblin: tipos feed vs mapYumblinItem y avisos "en pozo" mal clasificados.
 *
 * Uso:
 *   YUMBLIN_JSON_URL=https://... pnpm exec tsx scripts/audit-feed-emprendimiento-mapping.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import {
  extractListingsFromFeed,
  mapFeedPropertyTypeWithListingText,
} from '@propieya/shared'
import { mapYumblinItem } from '../packages/shared/src/xml/yumblin-mapper'

const envFile = process.env.ENV_FILE ?? 'apps/web/.env'
config({ path: resolve(process.cwd(), envFile) })

const FEED_URL =
  process.env.YUMBLIN_JSON_URL?.trim() ||
  'https://static.kiteprop.com/kp/difusions/23705a4a85ab8f1d301c73aae5359a81a8b5c1ca/yumblin.json'

const DUMMY_ORG = '00000000-0000-4000-8000-000000000001'
const DUMMY_PUB = '00000000-0000-4000-8000-000000000002'

function feedTypeOf(item: Record<string, unknown>): string {
  const t = item.property_type ?? item.property_type_old ?? item.type
  return t != null ? String(t) : 'null'
}

async function main() {
  console.log('GET', FEED_URL)
  const res = await fetch(FEED_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    console.error('HTTP', res.status)
    process.exit(1)
  }
  const data = await res.json()
  const items = extractListingsFromFeed(data) as Record<string, unknown>[]
  console.log('Ítems en feed:', items.length)

  const feedTypes = new Map<string, number>()
  const mappedTypes = new Map<string, number>()
  let feedEmprendimiento = 0
  let mappedDev = 0
  let misclassified = 0

  for (const item of items) {
    const ft = feedTypeOf(item)
    feedTypes.set(ft, (feedTypes.get(ft) ?? 0) + 1)
    if (/emprend|development/i.test(ft)) feedEmprendimiento++

    const mapped = mapYumblinItem(item, {
      organizationId: DUMMY_ORG,
      publisherId: DUMMY_PUB,
    })
    if (!mapped) continue

    mappedTypes.set(mapped.propertyType, (mappedTypes.get(mapped.propertyType) ?? 0) + 1)
    if (mapped.propertyType === 'development_unit') mappedDev++

    const title = mapped.title
    const desc = mapped.description ?? ''
    const blob = `${title} ${desc}`.toLowerCase()
    const hasPozo =
      /\ben\s+pozo\b/.test(blob) ||
      /\bemprendimiento\s+en\s+pozo\b/.test(blob) ||
      /\bventa\s+emprendimiento\b/.test(blob)

    if (hasPozo && mapped.propertyType !== 'development_unit') {
      misclassified++
      if (misclassified <= 12) {
        console.log(
          `  MAL  feed=${ft} → ${mapped.propertyType} | ${title.slice(0, 80)}`
        )
      }
    }
  }

  console.log('\nproperty_type en feed (top 15):')
  for (const [k, n] of [...feedTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${k}: ${n}`)
  }
  console.log('\nTras mapYumblinItem:')
  for (const [k, n] of [...mappedTypes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`)
  }
  console.log('\nFeed con emprendimiento/development en tipo:', feedEmprendimiento)
  console.log('Mapeados development_unit:', mappedDev)
  console.log('Con señal pozo/emprendimiento pero NO development_unit:', misclassified)

  // Simulación post-fix
  let fixedDev = 0
  for (const item of items) {
    const ft = feedTypeOf(item)
    const title = String(item.title ?? item.content ?? '')
    const desc = String(item.description ?? '')
    const after = mapFeedPropertyTypeWithListingText(ft, { title, description: desc })
    if (after === 'development_unit') fixedDev++
  }
  console.log('\nSi aplicamos mapper mejorado (solo texto+feed): development_unit =', fixedDev)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
