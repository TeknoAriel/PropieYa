import { mapFeedPropertyTypeWithListingText } from '@propieya/shared'
import { and, eq, ne, sql } from 'drizzle-orm'


import type { getDb } from './client'
import { listings } from './schema/listings'

const PAGE = 500

const CANDIDATE_WHERE = and(
  eq(listings.status, 'active'),
  ne(listings.propertyType, 'development_unit'),
  // No promover terreno/lote/cochera solo por la palabra «emprendimiento» en el copy.
  sql`${listings.propertyType} not in ('land', 'parking', 'warehouse', 'commercial', 'office')`,
  sql`(
    lower(${listings.title}) ~* 'en[[:space:]]+pozo'
    OR lower(${listings.title}) ~* 'emprendimiento[[:space:]]+en[[:space:]]+pozo'
    OR lower(${listings.title}) ~* 'complejo[[:space:]]+habitacional'
    OR lower(${listings.description}) ~* 'en[[:space:]]+pozo'
    OR lower(${listings.description}) ~* 'emprendimiento[[:space:]]+en[[:space:]]+pozo'
    OR lower(${listings.description}) ~* 'complejo[[:space:]]+habitacional'
    OR (
      lower(${listings.title}) ~* 'emprendimiento'
      AND lower(${listings.title} || ' ' || coalesce(${listings.description}, '')) ~* '(proyecto|obra|entrega|torre|en[[:space:]]+desarrollo)'
    )
    OR (
      lower(${listings.description}) ~* 'emprendimiento'
      AND lower(${listings.title} || ' ' || coalesce(${listings.description}, '')) ~* '(proyecto|obra|entrega|torre|en[[:space:]]+desarrollo)'
    )
  )`
)

export type ReclassifyDevelopmentUnitsResult = {
  candidateCount: number
  examined: number
  wouldChange: number
  updated: number
  samples: string[]
  apply: boolean
}

export async function runReclassifyDevelopmentUnits(
  db: ReturnType<typeof getDb>,
  options: { apply: boolean }
): Promise<ReclassifyDevelopmentUnitsResult> {
  const apply = options.apply

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(CANDIDATE_WHERE)

  const candidateCount = countRow?.count ?? 0
  let examined = 0
  let wouldChange = 0
  let updated = 0
  const samples: string[] = []
  let offset = 0

  for (;;) {
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        propertyType: listings.propertyType,
      })
      .from(listings)
      .where(CANDIDATE_WHERE)
      .orderBy(listings.id)
      .limit(PAGE)
      .offset(offset)

    if (rows.length === 0) break

    for (const r of rows) {
      examined++
      const suggested = mapFeedPropertyTypeWithListingText('', {
        title: r.title,
        description: r.description,
      })
      if (suggested !== 'development_unit') continue

      wouldChange++
      if (samples.length < 12) {
        samples.push(
          `${r.propertyType} → development_unit | ${r.title.slice(0, 80)}`
        )
      }

      if (apply) {
        await db
          .update(listings)
          .set({ propertyType: 'development_unit' })
          .where(eq(listings.id, r.id))
        updated++
      }
    }

    offset += rows.length
    if (rows.length < PAGE) break
  }

  return {
    candidateCount,
    examined,
    wouldChange,
    updated,
    samples,
    apply,
  }
}
