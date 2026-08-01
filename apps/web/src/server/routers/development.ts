import { z } from 'zod'
import { and, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'

import { listings } from '@propieya/database'
import type { Context } from '../trpc'
import {
  buildDevelopmentProjectDetail,
  developmentDeliveryFilterMatchPhrases,
  developmentHorizonMatchesFilter,
  findDevelopmentProjectBySlug,
  groupListingsIntoDevelopmentProjects,
  readDevelopmentProjectFromFeatures,
  type DevelopmentDeliveryFilter,
  type DevelopmentListingRow,
} from '@propieya/shared'

import { createTRPCRouter, publicProcedure } from '../trpc'

const listInput = z.object({
  ciudad: z.string().max(120).optional(),
  operationType: z.enum(['sale', 'rent', 'temp_rent']).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minBedrooms: z.number().int().min(0).optional(),
  /** pozo = en obra; proxima = a estrenar / entrega cercana */
  entrega: z.enum(['pozo', 'proxima']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(24).default(12),
})

function rowFromDb(row: Record<string, unknown>): DevelopmentListingRow {
  const address = (row.address ?? {}) as DevelopmentListingRow['address']
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    propertyType: 'development_unit',
    operationType: row.operationType as DevelopmentListingRow['operationType'],
    priceAmount: Number(row.priceAmount),
    priceCurrency: String(row.priceCurrency ?? 'USD'),
    surfaceTotal: Number(row.surfaceTotal),
    surfaceCovered: row.surfaceCovered != null ? Number(row.surfaceCovered) : null,
    bedrooms: row.bedrooms != null ? Number(row.bedrooms) : null,
    bathrooms: row.bathrooms != null ? Number(row.bathrooms) : null,
    address,
    features: row.features,
    primaryImageUrl: row.primaryImageUrl != null ? String(row.primaryImageUrl) : null,
    externalId: row.externalId != null ? String(row.externalId) : null,
  }
}

type DevelopmentFilters = {
  ciudad?: string
  operationType?: 'sale' | 'rent' | 'temp_rent'
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  /** Prefiltro SQL por frases de horizonte (reduce payload antes del agrupado). */
  entrega?: DevelopmentDeliveryFilter
}

/** Columnas mínimas para agrupar proyectos (evita SELECT * público pesado). */
const developmentListSelect = {
  id: listings.id,
  title: listings.title,
  description: listings.description,
  operationType: listings.operationType,
  priceAmount: listings.priceAmount,
  priceCurrency: listings.priceCurrency,
  surfaceTotal: listings.surfaceTotal,
  surfaceCovered: listings.surfaceCovered,
  bedrooms: listings.bedrooms,
  bathrooms: listings.bathrooms,
  address: listings.address,
  features: listings.features,
  primaryImageUrl: listings.primaryImageUrl,
  externalId: listings.externalId,
} as const

function sanitizeIlikeFragment(raw: string): string {
  return raw.trim().slice(0, 80).replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ')
}

async function fetchDevelopmentUnitRows(
  db: Context['db'],
  filters: DevelopmentFilters
): Promise<DevelopmentListingRow[]> {
  const conditions = [
    eq(listings.status, 'active'),
    eq(listings.propertyType, 'development_unit'),
  ]

  if (filters.operationType) {
    conditions.push(eq(listings.operationType, filters.operationType))
  }
  if (filters.minPrice != null) {
    conditions.push(gte(listings.priceAmount, filters.minPrice))
  }
  if (filters.maxPrice != null) {
    conditions.push(lte(listings.priceAmount, filters.maxPrice))
  }
  if (filters.minBedrooms != null) {
    conditions.push(gte(listings.bedrooms, filters.minBedrooms))
  }
  if (filters.ciudad?.trim()) {
    const city = filters.ciudad.trim()
    conditions.push(sql`lower(${listings.address}->>'city') = lower(${city})`)
  }
  if (filters.entrega === 'pozo' || filters.entrega === 'proxima') {
    const phraseOrs = developmentDeliveryFilterMatchPhrases(filters.entrega).flatMap(
      (phrase) => {
        const pat = `%${sanitizeIlikeFragment(phrase)}%`
        return [ilike(listings.title, pat), ilike(listings.description, pat)]
      }
    )
    if (phraseOrs.length > 0) {
      conditions.push(or(...phraseOrs)!)
    }
  }

  const rows = await db
    .select(developmentListSelect)
    .from(listings)
    .where(and(...conditions))
    .limit(2000)

  return rows.map((r) => rowFromDb(r as Record<string, unknown>))
}

function rowsForProject(
  rows: DevelopmentListingRow[],
  projectKey: string
): DevelopmentListingRow[] {
  return rows.filter((r) => {
    const city = String(r.address?.city ?? '').trim() || 'Argentina'
    const neighborhood = r.address?.neighborhood
      ? String(r.address.neighborhood).trim()
      : null
    const { projectKey: rowKey } = readDevelopmentProjectFromFeatures(
      r.features,
      r.title,
      city,
      neighborhood
    )
    return rowKey === projectKey
  })
}

export const developmentRouter = createTRPCRouter({
  listProjects: publicProcedure.input(listInput).query(async ({ ctx, input }) => {
    const { entrega, page, pageSize, ...rowFilters } = input
    const rows = await fetchDevelopmentUnitRows(ctx.db, {
      ...rowFilters,
      entrega,
    })
    let all = groupListingsIntoDevelopmentProjects(rows)
    if (entrega) {
      const filter = entrega as DevelopmentDeliveryFilter
      all = all.filter((p) => developmentHorizonMatchesFilter(p.deliveryHorizon, filter))
    }
    const start = (page - 1) * pageSize
    const items = all.slice(start, start + pageSize)
    const unitCountInProjects = all.reduce((acc, p) => acc + p.unitCount, 0)
    return {
      items,
      totalProjects: all.length,
      totalUnits: entrega ? unitCountInProjects : rows.length,
      page,
      pageSize,
      hasMore: start + pageSize < all.length,
    }
  }),

  getProjectBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const rows = await fetchDevelopmentUnitRows(ctx.db, {})
      const projects = groupListingsIntoDevelopmentProjects(rows)
      const summary = findDevelopmentProjectBySlug(projects, input.slug)
      if (!summary) {
        return { project: null }
      }
      const projectRows = rowsForProject(rows, summary.projectKey)
      const project = buildDevelopmentProjectDetail(summary, projectRows)
      return { project }
    }),
})
