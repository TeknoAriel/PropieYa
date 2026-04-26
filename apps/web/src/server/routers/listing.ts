import { randomUUID } from 'node:crypto'

import { z } from 'zod'
import {
  eq,
  and,
  desc,
  ilike,
  or,
  gte,
  lte,
  sql,
  count,
  ne,
  inArray,
  notInArray,
  type SQL,
} from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

import type { Database } from '@propieya/database'
import {
  listings,
  listingMedia,
  listingsSelectPublic,
  listingLifecycleEvents,
  organizations,
  organizationMemberships,
  recordListingTransitionForKiteprop,
  searchHistory,
} from '@propieya/database'
import {
  assessListingPublishability,
  createListingSchema,
  getListingPublishConfigFromEnv,
  listingRowToPublishabilityInput,
  updateListingSchema,
  LISTING_VALIDITY,
  mergePublicSearchFromQuery,
  inferListingMatchProfile,
  residualPublicSearchText,
  FACETS_CATALOG,
  SEARCH_FILTER_AMENITIES,
  withMatchReasons,
  PORTAL_SEARCH_UX_COPY,
  PORTAL_STATS_TERMINALS,
  listingSearchV2InputSchema,
  SEARCH_V2_BUCKET_LABELS,
  isSearchV2ElasticsearchUnreachable,
  effectiveListingLimit,
  isPublisherOrganizationStatusBlocked,
  resolvePortalVisibilityOperationalStatus,
  type PortalVisibilityOperationalStatus,
  type ExplainMatchFilters,
  type ExplainMatchListing,
  type ListingSearchV2Result,
  type LocalityCatalogEntry,
  type SearchSessionMVP,
} from '@propieya/shared'

import {
  getPresignedPutUrl,
  isS3Configured,
  publicMediaUrl,
  sanitizeUploadFilename,
} from '../s3-presign'
import {
  syncListingToSearch,
  removeListingFromSearch,
} from '../../lib/search/sync'
import {
  searchListingsLayered,
  type ListingSearchUX,
} from '../../lib/search/search-layered'
import { resolveAssignedContactForListing } from '../../lib/integrations/kiteprop-listing-contact'
import {
  runListingSearchV2,
  searchV2StrongListingSearchFilters,
} from '../../lib/search/search-v2-executor'
import {
  getListingSearchSortKeyCount,
  shouldApplyLocalityProximitySort,
} from '../../lib/search/query'
import type { SearchFilters } from '../../lib/search/types'
import { decodeListingSearchCursor } from '../../lib/search/search-cursor'
import { sqlPointInPolygonLngLat } from '../../lib/search/point-in-polygon-sql'
import { type ConversationPrior } from '../../lib/llm'
import { runConversationalSearchOrchestrator } from '../../lib/conversational-search'
import { getListingLocalityCatalog } from '../../lib/listing-locality-catalog'
import { recordPortalStatsEvent } from '../../lib/analytics/record-portal-stats-event'
import { checkRateLimit } from '../../lib/rate-limit'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'
import {
  listingSearchInputSchema,
  type ListingSearchInput,
} from './listing-search-input'

function listingManualContentPatchDefined(
  data: z.infer<typeof updateListingSchema>
): boolean {
  const keys: (keyof z.infer<typeof updateListingSchema>)[] = [
    'propertyType',
    'operationType',
    'address',
    'location',
    'hideExactAddress',
    'title',
    'description',
    'internalNotes',
    'price',
    'surface',
    'rooms',
    'features',
  ]
  return keys.some((k) => data[k] !== undefined)
}

const conversationalPriorFiltersSchema = z.object({
  q: z.string().max(200).optional(),
  operationType: z.enum(['sale', 'rent', 'temporary_rent']).optional(),
  propertyType: z.string().max(50).optional(),
  city: z.string().max(120).optional(),
  neighborhood: z.string().max(120).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  minBedrooms: z.number().int().min(0).max(50).optional(),
  minSurface: z.number().nonnegative().optional(),
  amenities: z.array(z.string().max(80)).max(25).optional(),
})

const searchConversationalInputSchema = z.object({
  message: z.string().min(1).max(500),
  /** SuperJSON puede enviar `null` en el wire aunque en cliente fuera `undefined`; sin meta, Zod fallaba. */
  previousContext: z
    .object({
      userMessage: z.string().max(500),
      filters: conversationalPriorFiltersSchema,
    })
    .nullish(),
})

function conversationPriorFromInput(
  previous: z.infer<typeof searchConversationalInputSchema>['previousContext']
): ConversationPrior | null {
  if (!previous?.filters) return null
  const f = previous.filters
  return {
    userMessage: previous.userMessage,
    intention: {
      q: f.q,
      operationType: f.operationType,
      propertyType: f.propertyType,
      city: f.city,
      neighborhood: f.neighborhood,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      minBedrooms: f.minBedrooms,
      minSurface: f.minSurface,
      amenities: f.amenities,
    },
  }
}

/** Errores de red / DB que no deben mostrarse crudos al usuario (p. ej. postgres.js en serverless). */
function isLikelyDbOrNetworkFailure(message: string): boolean {
  return /CONNECT_TIMEOUT|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|UND_ERR_CONNECT|undefined:undefined|Connection terminated unexpectedly/i.test(
    message
  )
}

/** Evita que el usuario inyecte comodines ILIKE (%, _). */
function sanitizeIlikeFragment(raw: string): string {
  return raw.trim().slice(0, 120).replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ')
}

function sqlAddressFieldText(field: 'city' | 'neighborhood' | 'state'): SQL {
  return sql`COALESCE(
    CASE
      WHEN jsonb_typeof(${listings.address}) = 'object' THEN ${listings.address}->>${field}
      WHEN jsonb_typeof(${listings.address}) = 'string' THEN (${listings.address} #>> '{}')::jsonb->>${field}
      ELSE NULL
    END,
    ''
  )`
}

/** Ciudad/barrio: misma semántica amplia que ES (query.ts), para no quedar en 0 si el feed no llenó `address.city`. */
function buildSqlLocalityPlaceOrCondition(placeRaw: string | undefined): SQL | null {
  const frag = sanitizeIlikeFragment(placeRaw ?? '')
  if (frag.length === 0) return null
  const pat = `%${frag}%`
  return or(
    sql`${sqlAddressFieldText('city')} ILIKE ${pat}`,
    sql`${sqlAddressFieldText('neighborhood')} ILIKE ${pat}`,
    ilike(listings.title, pat),
    ilike(listings.description, pat)
  )!
}

/** Catálogo SQL: ciudad y barrio como AND (un bloque ILIKE por dimensión). */
function appendSqlLocalityFiltersCatalog(
  conditions: SQL[],
  city: string | undefined,
  neighborhood: string | undefined
): void {
  const citySql = buildSqlLocalityPlaceOrCondition(city)
  const nbSql = buildSqlLocalityPlaceOrCondition(neighborhood)
  if (citySql) conditions.push(citySql)
  if (nbSql) conditions.push(nbSql)
}

function searchFiltersToListingInputOverlay(
  base: ListingSearchInput,
  f: SearchFilters
): ListingSearchInput {
  return {
    ...base,
    q: f.q,
    operationType: f.operationType as ListingSearchInput['operationType'],
    propertyType: f.propertyType,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minSurface: f.minSurface,
    maxSurface: f.maxSurface,
    minBedrooms: f.minBedrooms,
    minBathrooms: f.minBathrooms,
    minGarages: f.minGarages,
    floorMin: f.floorMin,
    floorMax: f.floorMax,
    escalera: f.escalera,
    orientation: f.orientation as ListingSearchInput['orientation'],
    minSurfaceCovered: f.minSurfaceCovered,
    maxSurfaceCovered: f.maxSurfaceCovered,
    minTotalRooms: f.minTotalRooms,
    city: f.city,
    neighborhood: f.neighborhood,
    publicListingCode: f.publicListingCode,
    amenities: f.amenities,
    facets: f.facets,
    geoPoint: f.geoPoint,
    geoRadius: f.geoRadius,
    sortNearLat: f.sortNearLat,
    sortNearLng: f.sortNearLng,
    bbox: f.bbox,
    polygon: f.polygon,
    amenitiesMatchMode: f.amenitiesMatchMode ?? 'preferred',
    matchProfile: f.matchProfile ?? base.matchProfile,
  }
}

function defaultSqlSearchUx(sqlTotal: number): ListingSearchUX {
  return {
    tier: 'exact',
    primaryTotal: sqlTotal,
    strictMatchCount: sqlTotal,
    mergedSupplement: false,
    nearAreaSupplement: false,
    messages: [],
    relaxationStepIds: [],
    disableDeepPagination: false,
  }
}

function assessListingRowPublishability(
  row: {
    operationType: string
    propertyType: string
    priceAmount: number
    priceCurrency: string
    title: string
    description: string
    address: unknown
  },
  mediaCount: number
) {
  const publishConfig = getListingPublishConfigFromEnv()
  return assessListingPublishability(
    listingRowToPublishabilityInput(row, mediaCount, publishConfig)
  )
}

/** Listados públicos: más reciente arriba (publicación + desempate). */
const ORDER_PUBLIC_RECENCY = [
  desc(listings.publishedAt),
  desc(listings.updatedAt),
  desc(listings.createdAt),
]

type ListingSearchSqlPrep = {
  merged: ReturnType<typeof mergePublicSearchFromQuery>
  residualTextQuery: string
  sqlInput: ListingSearchInput
  amenityStrict: boolean
  whereClause: ReturnType<typeof and>
}

function buildListingSearchSqlFromSeed(
  sqlInputSeed: ListingSearchInput
): ListingSearchSqlPrep {
  const merged = mergePublicSearchFromQuery(sqlInputSeed)
  const { residualTextQuery, ...sqlInputBase } = merged
  const sqlInput: ListingSearchInput = {
    ...sqlInputBase,
    facets: sqlInputSeed.facets,
    polygon: sqlInputSeed.polygon,
  }
  const amenityStrict = sqlInputSeed.amenitiesMatchMode === 'strict'
  const intentSql =
    inferListingMatchProfile({
      q: sqlInputSeed.q,
      explicit: sqlInputSeed.matchProfile,
    }) === 'intent'

  const conditions = [eq(listings.status, 'active')]
  const pubCode = sqlInputSeed.publicListingCode?.trim()
  if (pubCode) {
    const pat = `%${sanitizeIlikeFragment(pubCode)}%`
    conditions.push(
      or(
        ilike(listings.externalId, pat),
        ilike(listings.title, pat),
        ilike(listings.description, pat)
      )!
    )
  }
  if (residualTextQuery.trim()) {
    const frag = sanitizeIlikeFragment(residualTextQuery)
    if (frag.length > 0) {
      const pat = `%${frag}%`
      conditions.push(
        or(
          ilike(listings.title, pat),
          ilike(listings.description, pat)
        )!
      )
    }
  }
  if (sqlInput.operationType) {
    conditions.push(eq(listings.operationType, sqlInput.operationType))
  }
  if (sqlInput.propertyType) {
    conditions.push(eq(listings.propertyType, sqlInput.propertyType))
  }
  const minP = sqlInput.minPrice
  const maxP = sqlInput.maxPrice
  if (intentSql) {
    if (minP !== undefined && maxP !== undefined) {
      const lo = Math.max(0, Math.floor(minP * 0.82))
      const hi = Math.ceil(maxP * 1.22)
      conditions.push(gte(listings.priceAmount, lo))
      conditions.push(lte(listings.priceAmount, hi))
    } else if (maxP !== undefined) {
      conditions.push(lte(listings.priceAmount, Math.ceil(maxP * 1.22)))
    } else if (minP !== undefined) {
      conditions.push(gte(listings.priceAmount, Math.max(0, Math.floor(minP * 0.85))))
    }
  } else {
    if (minP !== undefined) {
      conditions.push(gte(listings.priceAmount, minP))
    }
    if (maxP !== undefined) {
      conditions.push(lte(listings.priceAmount, maxP))
    }
  }

  const minS = sqlInput.minSurface
  const maxS = sqlInput.maxSurface
  if (intentSql) {
    if (minS !== undefined && maxS !== undefined) {
      const lo = Math.max(0, Math.floor(minS * 0.88))
      const hi = Math.ceil(maxS * 1.15)
      conditions.push(gte(listings.surfaceTotal, lo))
      conditions.push(lte(listings.surfaceTotal, hi))
    } else if (minS !== undefined) {
      conditions.push(
        gte(listings.surfaceTotal, Math.max(0, Math.floor(minS * 0.85)))
      )
    } else if (maxS !== undefined) {
      conditions.push(lte(listings.surfaceTotal, Math.ceil(maxS * 1.15)))
    }
  } else {
    if (minS !== undefined) {
      conditions.push(gte(listings.surfaceTotal, minS))
    }
    if (maxS !== undefined) {
      conditions.push(lte(listings.surfaceTotal, maxS))
    }
  }

  if (sqlInput.minBedrooms !== undefined) {
    const v = intentSql
      ? Math.max(0, sqlInput.minBedrooms - 1)
      : sqlInput.minBedrooms
    conditions.push(gte(listings.bedrooms, v))
  }
  if (sqlInput.minBathrooms !== undefined) {
    const v = intentSql
      ? Math.max(0, sqlInput.minBathrooms - 1)
      : sqlInput.minBathrooms
    conditions.push(gte(listings.bathrooms, v))
  }
  if (sqlInput.minGarages !== undefined) {
    const v = intentSql
      ? Math.max(0, sqlInput.minGarages - 1)
      : sqlInput.minGarages
    conditions.push(gte(listings.garages, v))
  }

  if (!intentSql) {
    if (sqlInput.floorMin !== undefined) {
      conditions.push(
        sql`(${listings.features}->>'floor') IS NULL OR ((${listings.features}->>'floor')::int) >= ${sqlInput.floorMin}`
      )
    }
    if (sqlInput.floorMax !== undefined) {
      conditions.push(
        sql`(${listings.features}->>'floor') IS NULL OR ((${listings.features}->>'floor')::int) <= ${sqlInput.floorMax}`
      )
    }
    if (sqlInput.escalera?.trim()) {
      conditions.push(
        sql`(${listings.features}->>'escalera') = ${sqlInput.escalera.trim().toUpperCase()}`
      )
    }
    if (sqlInput.orientation) {
      conditions.push(
        sql`(${listings.features}->>'orientation') = ${sqlInput.orientation}`
      )
    }
    if (sqlInput.minSurfaceCovered !== undefined) {
      conditions.push(
        sql`${listings.surfaceCovered} IS NOT NULL AND ${listings.surfaceCovered} >= ${sqlInput.minSurfaceCovered}`
      )
    }
    if (sqlInput.maxSurfaceCovered !== undefined) {
      conditions.push(
        sql`${listings.surfaceCovered} IS NOT NULL AND ${listings.surfaceCovered} <= ${sqlInput.maxSurfaceCovered}`
      )
    }
    if (sqlInput.minTotalRooms !== undefined) {
      conditions.push(
        sql`${listings.totalRooms} IS NOT NULL AND ${listings.totalRooms} >= ${sqlInput.minTotalRooms}`
      )
    }
  }

  // `intent`: localidad solo rankea en ES (`should`); no filtrar en SQL fallback.
  if (!intentSql) {
    appendSqlLocalityFiltersCatalog(
      conditions,
      sqlInput.city,
      sqlInput.neighborhood
    )
  }
  if (amenityStrict && sqlInput.amenities && sqlInput.amenities.length > 0) {
    const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
    for (const a of sqlInput.amenities) {
      if (allowed.includes(a)) {
        conditions.push(
          sql`(${listings.features}->'amenities') @> to_jsonb(ARRAY[${a}]::text[])`
        )
      }
    }
  }
  if (
    amenityStrict &&
    sqlInput.facets?.flags &&
    sqlInput.facets.flags.length > 0
  ) {
    const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
    for (const f of sqlInput.facets.flags) {
      if (allowed.includes(f)) {
        conditions.push(
          sql`(${listings.features}->'amenities') @> to_jsonb(ARRAY[${f}]::text[])`
        )
      }
    }
  }
  if (sqlInput.facets?.excludeFlags && sqlInput.facets.excludeFlags.length > 0) {
    const allowed = SEARCH_FILTER_AMENITIES as readonly string[]
    for (const f of sqlInput.facets.excludeFlags) {
      if (allowed.includes(f)) {
        conditions.push(
          sql`NOT ((${listings.features}->'amenities') @> to_jsonb(ARRAY[${f}]::text[]) )`
        )
      }
    }
  }
  if (sqlInput.bbox) {
    const { south, north, west, east } = sqlInput.bbox
    conditions.push(sql`${listings.locationLat} IS NOT NULL`)
    conditions.push(sql`${listings.locationLng} IS NOT NULL`)
    conditions.push(gte(listings.locationLat, south))
    conditions.push(lte(listings.locationLat, north))
    conditions.push(gte(listings.locationLng, west))
    conditions.push(lte(listings.locationLng, east))
  }
  if (sqlInput.geoPoint && sqlInput.geoRadius) {
    const { lat, lng } = sqlInput.geoPoint
    const rMeters = sqlInput.geoRadius
    const rKm = rMeters / 1000
    const latDelta = rKm / 111
    const lngDelta = rKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
    conditions.push(sql`${listings.locationLat} IS NOT NULL`)
    conditions.push(sql`${listings.locationLng} IS NOT NULL`)
    conditions.push(gte(listings.locationLat, lat - latDelta))
    conditions.push(lte(listings.locationLat, lat + latDelta))
    conditions.push(gte(listings.locationLng, lng - lngDelta))
    conditions.push(lte(listings.locationLng, lng + lngDelta))
  }
  if (sqlInput.polygon && sqlInput.polygon.length >= 3) {
    conditions.push(sql`${listings.locationLat} IS NOT NULL`)
    conditions.push(sql`${listings.locationLng} IS NOT NULL`)
    conditions.push(
      sqlPointInPolygonLngLat(
        listings.locationLng,
        listings.locationLat,
        sqlInput.polygon
      )
    )
  }

  return {
    merged,
    residualTextQuery,
    sqlInput,
    amenityStrict,
    whereClause: and(...conditions)!,
  }
}

async function countListingSearchSql(
  db: Database,
  prep: ListingSearchSqlPrep
): Promise<number> {
  const [totalRow] = await db
    .select({ c: count() })
    .from(listings)
    .where(prep.whereClause)
  return Number(totalRow?.c ?? 0)
}

async function selectListingSearchSqlPage(
  db: Database,
  prep: ListingSearchSqlPrep,
  limit: number,
  offset: number
) {
  const proximitySqlOrder =
    shouldApplyLocalityProximitySort(prep.merged as SearchFilters) &&
    prep.merged.sortNearLat != null &&
    prep.merged.sortNearLng != null
      ? sql`(CASE WHEN ${listings.locationLat} IS NOT NULL AND ${listings.locationLng} IS NOT NULL THEN ((${listings.locationLat}::double precision - ${prep.merged.sortNearLat}) * (${listings.locationLat}::double precision - ${prep.merged.sortNearLat}) + (${listings.locationLng}::double precision - ${prep.merged.sortNearLng}) * (${listings.locationLng}::double precision - ${prep.merged.sortNearLng})) ELSE 1e30::double precision END)`
      : null

  return db
    .select(listingsSelectPublic)
    .from(listings)
    .where(prep.whereClause)
    .orderBy(
      ...(proximitySqlOrder ? [proximitySqlOrder] : []),
      ...ORDER_PUBLIC_RECENCY
    )
    .limit(limit)
    .offset(offset)
}

/** Historial de búsqueda (usuarios logueados). No bloquea la respuesta si falla el insert. */
function persistSearchHistoryRow(
  db: Database,
  opts: {
    userId: string
    filters: Record<string, unknown>
    resultCount: number
    startedAt: number
  }
): void {
  void (async () => {
    try {
      await db.insert(searchHistory).values({
        userId: opts.userId,
        sessionId: randomUUID(),
        conversationId: null,
        filters: opts.filters,
        sort: null,
        resultCount: opts.resultCount,
        processingTimeMs: Date.now() - opts.startedAt,
      })
    } catch {
      // no bloquear búsqueda
    }
  })()
}

const ORDER_PANEL_RECENCY = [
  desc(listings.updatedAt),
  desc(listings.createdAt),
]

/**
 * Si ES no responde, alineamos v2 con `listing.search`: listado «strong» desde SQL
 * (near/widened quedan vacíos en este fallback). Sesión vacía = catálogo activo.
 */
async function trySearchV2SqlFallback(
  db: Database,
  session: SearchSessionMVP,
  pageSize: number,
  exactEsOffset: number,
  esOut: ListingSearchV2Result
): Promise<ListingSearchV2Result | null> {
  if (!isSearchV2ElasticsearchUnreachable(esOut)) return null

  const f = searchV2StrongListingSearchFilters(session)
  const lim = Math.min(50, Math.max(12, pageSize))
  const off = Math.max(0, exactEsOffset)
  const seed = searchFiltersToListingInputOverlay(
    { limit: lim, offset: off } as ListingSearchInput,
    f
  )
  const prep = buildListingSearchSqlFromSeed(seed)
  const sqlTotal = await countListingSearchSql(db, prep)
  const rows = await selectListingSearchSqlPage(db, prep, lim, off)
  const explainFilters = seed as unknown as ExplainMatchFilters
  const decorated = withMatchReasons(
    explainFilters,
    rows as ExplainMatchListing[]
  )
  const strongSlice = decorated
  const exactEsOffsetNext =
    rows.length === lim && off + lim < sqlTotal ? off + lim : null

  return {
    sessionNormalized: esOut.sessionNormalized,
    buckets: [
      {
        id: 'strong',
        label: SEARCH_V2_BUCKET_LABELS.strong,
        items: strongSlice,
        totalInBucket: sqlTotal,
      },
      {
        id: 'near',
        label: SEARCH_V2_BUCKET_LABELS.near,
        items: [],
        totalInBucket: 0,
      },
      {
        id: 'widened',
        label: SEARCH_V2_BUCKET_LABELS.widened,
        items: [],
        totalInBucket: 0,
      },
    ],
    messages:
      sqlTotal > 0 ? [PORTAL_SEARCH_UX_COPY.searchSqlFallbackRowsNote] : [],
    emptyExplanation:
      sqlTotal === 0
        ? 'No hay avisos que encajen aún con estos criterios. Probá las acciones de abajo o flexibilizá un requisito.'
        : null,
    actions: [],
    totalsByBucket: {
      strong: strongSlice.length,
      near: 0,
      widened: 0,
    },
    strictCatalogTotal: sqlTotal,
    orderedListingIds: strongSlice.map((row) =>
      String((row as unknown as { id: string }).id)
    ),
    exactNextCursor: null,
    exactEsOffsetNext,
  }
}

type SearchV2BucketItemWithVisibility = {
  id?: string
  portalVisibilityTier?: 'standard' | 'highlight' | 'boost' | 'premium_ficha'
  portalVisibilityOperationalStatus?: PortalVisibilityOperationalStatus
}

type PortalVisibilityAnalyticsMeta = {
  tier: 'standard' | 'highlight' | 'boost' | 'premium_ficha'
  products: string[]
  operationalStatus: PortalVisibilityOperationalStatus
}

function portalVisibilityTierFromFeatures(
  features: unknown
): 'standard' | 'highlight' | 'boost' | 'premium_ficha' {
  const raw = (features as { portalVisibility?: { tier?: unknown } } | null)?.portalVisibility
    ?.tier
  if (raw === 'highlight' || raw === 'boost' || raw === 'premium_ficha') return raw
  return 'standard'
}

function portalVisibilityAnalyticsMetaFromFeatures(
  features: unknown
): PortalVisibilityAnalyticsMeta {
  const root = features as
    | { portalVisibility?: { tier?: unknown; products?: unknown; from?: unknown; until?: unknown } }
    | null
    | undefined
  const portalVisibility = root?.portalVisibility
  const tier = portalVisibilityTierFromFeatures(root)
  const rawProducts = root?.portalVisibility?.products
  const products = Array.isArray(rawProducts)
    ? rawProducts
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 20)
    : []
  const operationalStatus = resolvePortalVisibilityOperationalStatus({
    tier,
    products,
    from: typeof portalVisibility?.from === 'string' ? portalVisibility.from : null,
    until: typeof portalVisibility?.until === 'string' ? portalVisibility.until : null,
  })
  return { tier, products, operationalStatus }
}

async function attachPortalVisibilityToSearchV2Result(
  db: Database,
  out: ListingSearchV2Result
): Promise<ListingSearchV2Result> {
  const ids = Array.from(
    new Set(
      out.buckets.flatMap((bucket) =>
        bucket.items
          .map((row) => (row as SearchV2BucketItemWithVisibility).id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    )
  )
  if (ids.length === 0) return out

  const rows = await db
    .select({ id: listings.id, features: listings.features })
    .from(listings)
    .where(inArray(listings.id, ids))

  const visById = new Map(
    rows.map((row) => [row.id, portalVisibilityAnalyticsMetaFromFeatures(row.features)])
  )

  return {
    ...out,
    buckets: out.buckets.map((bucket) => ({
      ...bucket,
      items: bucket.items.map((row) => {
        const item = row as SearchV2BucketItemWithVisibility
        const vis =
          item.id && visById.has(item.id)
            ? visById.get(item.id)!
            : ({
                tier: 'standard',
                products: [],
                operationalStatus: 'none',
              } satisfies PortalVisibilityAnalyticsMeta)
        return {
          ...(row as Record<string, unknown>),
          portalVisibilityTier: vis.tier,
          portalVisibilityOperationalStatus: vis.operationalStatus,
        }
      }),
    })),
  }
}

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createListingSchema)
    .mutation(async ({ input, ctx }) => {
      let organizationId = ctx.session.organizationId

      // Bootstrap para dev: si el usuario no tiene organización, se crea una básica.
      if (!organizationId) {
        const [org] = await ctx.db
          .insert(organizations)
          .values({
            type: 'real_estate_agency',
            status: 'active',
            name: `${ctx.session.name} Propiedades`,
            email: ctx.session.email,
          })
          .returning({ id: organizations.id })

        if (!org) {
          throw new Error('No se pudo crear la organización')
        }

        organizationId = org.id

        await ctx.db.insert(organizationMemberships).values({
          userId: ctx.session.userId,
          organizationId,
          role: 'org_admin',
        })
      }

      const orgRow = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId!),
      })
      if (!orgRow) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No encontramos la cuenta publicadora. Volvé a iniciar sesión.',
        })
      }
      if (isPublisherOrganizationStatusBlocked(orgRow.status)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Tu cuenta publicadora está suspendida. No podés crear avisos nuevos por ahora.',
        })
      }
      if (orgRow.status !== 'active') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Tu cuenta publicadora aún no está activa. Si recién te registraste, esperá unos minutos o contactá soporte.',
        })
      }
      const cap = effectiveListingLimit({
        orgType: orgRow.type,
        listingLimit: orgRow.listingLimit,
      })
      if (cap != null) {
        const [quotaRow] = await ctx.db
          .select({ c: count() })
          .from(listings)
          .where(
            and(
              eq(listings.organizationId, organizationId!),
              notInArray(listings.status, ['archived', 'withdrawn'])
            )
          )
        if (Number(quotaRow?.c ?? 0) >= cap) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Alcanzaste el cupo de avisos. Archivá o dá de baja uno, o contactanos para ampliar (inmobiliarias).',
          })
        }
      }

      const pricePerM2 =
        input.surface.total > 0 ? input.price.amount / input.surface.total : null

      const [created] = await ctx.db
        .insert(listings)
        .values({
          organizationId,
          publisherId: ctx.session.userId,
          propertyType: input.propertyType,
          operationType: input.operationType,
          status: 'draft',
          address: input.address,
          locationLat: input.location?.lat ?? null,
          locationLng: input.location?.lng ?? null,
          hideExactAddress: input.hideExactAddress,
          title: input.title,
          description: input.description,
          internalNotes: input.internalNotes,
          priceAmount: input.price.amount,
          priceCurrency: input.price.currency,
          pricePerM2,
          showPrice: input.price.showPrice,
          expenses: input.price.expenses,
          expensesCurrency: input.price.expensesCurrency,
          surfaceTotal: input.surface.total,
          surfaceCovered: input.surface.covered,
          surfaceSemicovered: input.surface.semicovered,
          surfaceLand: input.surface.land,
          bedrooms: input.rooms.bedrooms,
          bathrooms: input.rooms.bathrooms,
          toilettes: input.rooms.toilettes,
          garages: input.rooms.garages,
          totalRooms: input.rooms.total,
          features: input.features,
          updatedAt: new Date(),
        })
        .returning()

      return created
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const publishConfig = getListingPublishConfigFromEnv()
      const [mediaRow] = await ctx.db
        .select({ mediaRows: count() })
        .from(listingMedia)
        .where(eq(listingMedia.listingId, input.id))
      const mediaCount = Number(mediaRow?.mediaRows ?? 0)

      const assessment = assessListingPublishability(
        listingRowToPublishabilityInput(
          {
            operationType: existing.operationType,
            propertyType: existing.propertyType,
            priceAmount: existing.priceAmount,
            priceCurrency: existing.priceCurrency,
            title: existing.title,
            description: existing.description,
            address: existing.address,
          },
          mediaCount,
          publishConfig
        )
      )

      if (!assessment.ok) {
        const primary = assessment.primaryIssue
        if (primary) {
          await recordListingTransitionForKiteprop({
            listingId: input.id,
            externalId: existing.externalId,
            previousStatus: existing.status,
            newStatus: existing.status,
            source: 'validation',
            reasonCode: primary.code,
            reasonMessage: primary.message,
            details: {
              issues: assessment.issues.map((i) => ({
                code: i.code,
                message: i.message,
                details: i.details,
              })),
            },
            actorUserId: ctx.session.userId,
          })
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: primary?.message ?? 'No se puede publicar este aviso.',
        })
      }

      const publishedAt = new Date()
      const expiresAt = new Date(
        publishedAt.getTime() +
          LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      )

      const [updated] = await ctx.db
        .update(listings)
        .set({
          status: 'active',
          publishedAt,
          lastValidatedAt: new Date(),
          expiresAt,
          lastContentUpdatedAt: publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.id))
        .returning()

      if (updated) {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated ?? null
    }),

  renew: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const allowedStatuses = ['expiring_soon', 'suspended', 'expired']
      if (!allowedStatuses.includes(existing.status)) {
        throw new Error(
          'Solo se pueden renovar propiedades por vencer, suspendidas o vencidas por contenido'
        )
      }

      const publishConfig = getListingPublishConfigFromEnv()
      const [mediaRowRenew] = await ctx.db
        .select({ mediaRows: count() })
        .from(listingMedia)
        .where(eq(listingMedia.listingId, input.id))
      const mediaCountRenew = Number(mediaRowRenew?.mediaRows ?? 0)

      const renewAssessment = assessListingPublishability(
        listingRowToPublishabilityInput(
          {
            operationType: existing.operationType,
            propertyType: existing.propertyType,
            priceAmount: existing.priceAmount,
            priceCurrency: existing.priceCurrency,
            title: existing.title,
            description: existing.description,
            address: existing.address,
          },
          mediaCountRenew,
          publishConfig
        )
      )
      if (!renewAssessment.ok) {
        const pr = renewAssessment.primaryIssue
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: pr?.message ?? 'No se puede renovar hasta corregir los datos del aviso.',
        })
      }

      const now = new Date()
      const expiresAt = new Date(
        now.getTime() +
          LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      )

      const [updated] = await ctx.db
        .update(listings)
        .set({
          status: 'active',
          lastValidatedAt: now,
          expiresAt,
          renewalCount: (existing.renewalCount ?? 0) + 1,
          updatedAt: now,
        })
        .where(eq(listings.id, input.id))
        .returning()

      if (updated && updated.status === 'active') {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated ?? null
    }),

  /** Detalle para el publicador (cualquier estado). */
  getMineById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!listing) {
        return null
      }

      const media = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.id),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })
      const assessment = assessListingRowPublishability(listing, media.length)
      const [lastLifecycleEvent] = await ctx.db
        .select({
          id: listingLifecycleEvents.id,
          source: listingLifecycleEvents.source,
          reasonCode: listingLifecycleEvents.reasonCode,
          reasonMessage: listingLifecycleEvents.reasonMessage,
          createdAt: listingLifecycleEvents.createdAt,
          newStatus: listingLifecycleEvents.newStatus,
          previousStatus: listingLifecycleEvents.previousStatus,
        })
        .from(listingLifecycleEvents)
        .where(eq(listingLifecycleEvents.listingId, input.id))
        .orderBy(desc(listingLifecycleEvents.createdAt))
        .limit(1)

      return {
        ...listing,
        media,
        publishability: assessment,
        canPublish: listing.status === 'draft' && assessment.ok,
        canRenew: ['expiring_soon', 'suspended', 'expired'].includes(listing.status),
        lastLifecycleEvent: lastLifecycleEvent ?? null,
      }
    }),

  listMine: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(listings.publisherId, ctx.session.userId)]

      if (input.status) {
        conditions.push(eq(listings.status, input.status))
      }
      if (input.search) {
        conditions.push(ilike(listings.title, `%${input.search}%`))
      }

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(and(...conditions))
        .orderBy(...ORDER_PANEL_RECENCY)
        .limit(input.limit)

      return rows.map((row) => {
        const assessment = assessListingRowPublishability(
          row,
          Number(row.mediaCount ?? 0)
        )
        return {
          ...row,
          publishability: assessment,
          canPublish: row.status === 'draft' && assessment.ok,
          canRenew: ['expiring_soon', 'suspended', 'expired'].includes(row.status),
        }
      })
    }),

  /** Conteos por estado para el dashboard del panel (avisos del publicador). */
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const publisherId = ctx.session.userId
    const rows = await ctx.db
      .select({
        status: listings.status,
        n: count(),
      })
      .from(listings)
      .where(eq(listings.publisherId, publisherId))
      .groupBy(listings.status)

    const byStatus: Record<string, number> = {}
    let totalListings = 0
    for (const r of rows) {
      const n = Number(r.n)
      byStatus[r.status] = n
      totalListings += n
    }

    const known = [
      'draft',
      'pending_review',
      'active',
      'expiring_soon',
      'suspended',
      'archived',
      'sold',
      'withdrawn',
      'rejected',
      'expired',
    ] as const
    for (const s of known) {
      if (byStatus[s] === undefined) byStatus[s] = 0
    }

    return { byStatus, totalListings }
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateListingSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const data = input.data
      const surfaceTotal = data.surface?.total ?? existing.surfaceTotal
      const priceAmount = data.price?.amount ?? existing.priceAmount
      const pricePerM2 = surfaceTotal > 0 ? priceAmount / surfaceTotal : null

      const contentPatch = listingManualContentPatchDefined(data)
      const publishConfig = getListingPublishConfigFromEnv()
      const [mediaRowUpd] = await ctx.db
        .select({ mediaRows: count() })
        .from(listingMedia)
        .where(eq(listingMedia.listingId, input.id))
      const mediaCountUpd = Number(mediaRowUpd?.mediaRows ?? 0)

      const mergedForPublishability = {
        operationType: data.operationType ?? existing.operationType,
        propertyType: data.propertyType ?? existing.propertyType,
        priceAmount,
        priceCurrency: data.price?.currency ?? existing.priceCurrency,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        address: data.address ?? existing.address,
      }

      const assessment = assessListingPublishability(
        listingRowToPublishabilityInput(
          mergedForPublishability,
          mediaCountUpd,
          publishConfig
        )
      )

      const wasLive =
        existing.status === 'active' || existing.status === 'expiring_soon'

      const patch: Record<string, unknown> = {
        propertyType: mergedForPublishability.propertyType,
        operationType: mergedForPublishability.operationType,
        address: mergedForPublishability.address,
        locationLat: data.location?.lat ?? existing.locationLat,
        locationLng: data.location?.lng ?? existing.locationLng,
        hideExactAddress: data.hideExactAddress ?? existing.hideExactAddress,
        title: mergedForPublishability.title,
        description: mergedForPublishability.description,
        internalNotes: data.internalNotes ?? existing.internalNotes,
        priceAmount,
        priceCurrency: mergedForPublishability.priceCurrency,
        pricePerM2,
        showPrice: data.price?.showPrice ?? existing.showPrice,
        expenses: data.price?.expenses ?? existing.expenses,
        expensesCurrency:
          data.price?.expensesCurrency ?? existing.expensesCurrency,
        surfaceTotal,
        surfaceCovered: data.surface?.covered ?? existing.surfaceCovered,
        surfaceSemicovered:
          data.surface?.semicovered ?? existing.surfaceSemicovered,
        surfaceLand: data.surface?.land ?? existing.surfaceLand,
        bedrooms: data.rooms?.bedrooms ?? existing.bedrooms,
        bathrooms: data.rooms?.bathrooms ?? existing.bathrooms,
        toilettes: data.rooms?.toilettes ?? existing.toilettes,
        garages: data.rooms?.garages ?? existing.garages,
        totalRooms: data.rooms?.total ?? existing.totalRooms,
        features: data.features ?? existing.features,
        updatedAt: new Date(),
      }

      if (wasLive && !assessment.ok) {
        patch.status = 'draft'
        patch.publishedAt = null
        patch.lastValidatedAt = null
        patch.expiresAt = null
        patch.lastContentUpdatedAt = null
      } else if (wasLive && assessment.ok && contentPatch) {
        patch.lastContentUpdatedAt = new Date()
      }

      const [updated] = await ctx.db
        .update(listings)
        .set(patch as typeof listings.$inferInsert)
        .where(eq(listings.id, input.id))
        .returning()

      if (wasLive && !assessment.ok) {
        await removeListingFromSearch(input.id).catch(() => {})
        const primary = assessment.primaryIssue
        if (primary) {
          await recordListingTransitionForKiteprop({
            listingId: input.id,
            externalId: existing.externalId,
            previousStatus: existing.status,
            newStatus: 'draft',
            source: 'validation',
            reasonCode: primary.code,
            reasonMessage: primary.message,
            details: {
              issues: assessment.issues.map((i) => ({
                code: i.code,
                message: i.message,
                details: i.details,
              })),
            },
            actorUserId: ctx.session.userId,
          })
        }
      } else if (updated && updated.status === 'active') {
        syncListingToSearch(ctx.db, input.id).catch(() => {})
      }
      return updated
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [archived] = await ctx.db
        .update(listings)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(listings.id, input.id),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .returning()

      if (archived) {
        removeListingFromSearch(input.id).catch(() => {})
      }
      return archived ?? null
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(eq(listings.id, input.id), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!listing) {
        return null
      }

      const media = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.id),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      const assignedContact = await resolveAssignedContactForListing({
        source: listing.source,
        externalId: listing.externalId,
        features: listing.features,
      })

      return {
        ...listing,
        media,
        assignedContact,
      }
    }),

  /**
   * Vista pública de ficha (F1 doc 49): incrementa `view_count` en DB y log estructurado opcional.
   * Llamar una vez por carga de página desde el cliente (evita duplicar con ref por Strict Mode).
   */
  recordPublicView: publicProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .update(listings)
        .set({
          viewCount: sql`${listings.viewCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .returning({
          id: listings.id,
          organizationId: listings.organizationId,
        })

      if (!row) {
        return { ok: false as const }
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: {},
      })

      if (process.env.LOG_PORTAL_STATS === '1') {
        console.log(
          JSON.stringify({
            terminal: PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW,
            listingId: row.id,
            organizationId: row.organizationId,
            userId: ctx.session?.userId ?? null,
            ts: new Date().toISOString(),
          })
        )
      }

      return { ok: true as const }
    }),

  /**
   * Clic desde resultado (lista o mapa) hacia la ficha (doc 49).
   * No incrementa vistas; solo hecho agregable para embudo / panel.
   */
  recordSearchResultClick: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        from: z.enum(['list', 'map', 'similar']).optional(),
        position: z.number().int().min(0).max(500).optional(),
        surface: z.string().max(40).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
        })
        .from(listings)
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!row) {
        return { ok: false as const }
      }

      const payload: Record<string, unknown> = {}
      if (input.from !== undefined) payload.from = input.from
      if (input.position !== undefined) payload.position = input.position
      if (input.surface !== undefined) payload.surface = input.surface

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_RESULT_CLICK,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload,
      })
      return { ok: true as const }
    }),

  /** PortalVisibility: impresión en superficies comerciales (sin alterar ranking/listado). */
  recordPortalVisibilityImpression: publicProcedure
    .input(
      z.object({
        listingIds: z.array(z.string().uuid()).min(1).max(20),
        surface: z.enum(['search_featured', 'listing_strip']),
        searchContext: z
          .object({
            city: z.string().max(120).optional(),
            neighborhood: z.string().max(120).optional(),
            operationType: z.string().max(40).optional(),
            propertyType: z.string().max(40).optional(),
            session: z.string().max(120).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const rows = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
          features: listings.features,
        })
        .from(listings)
        .where(
          and(
            inArray(listings.id, input.listingIds),
            eq(listings.status, 'active')
          )
        )

      let written = 0
      for (const row of rows) {
        const vis = portalVisibilityAnalyticsMetaFromFeatures(row.features)
        if (vis.tier === 'standard' || vis.operationalStatus !== 'active') continue
        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.LISTING_PORTAL_VISIBILITY_IMPRESSION,
          listingId: row.id,
          organizationId: row.organizationId,
          userId: ctx.session?.userId ?? null,
          payload: {
            tier: vis.tier,
            products: vis.products,
            surface: input.surface,
            ...(input.searchContext ? { searchContext: input.searchContext } : {}),
          },
        })
        written++
      }
      return { ok: true as const, written }
    }),

  /** PortalVisibility: clic relevante desde superficie comercial. */
  recordPortalVisibilityClick: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        surface: z.enum(['search_featured', 'listing_strip_cta']),
        searchContext: z
          .object({
            city: z.string().max(120).optional(),
            neighborhood: z.string().max(120).optional(),
            operationType: z.string().max(40).optional(),
            propertyType: z.string().max(40).optional(),
            session: z.string().max(120).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
          features: listings.features,
        })
        .from(listings)
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!row) return { ok: false as const }

      const vis = portalVisibilityAnalyticsMetaFromFeatures(row.features)
      if (vis.tier === 'standard' || vis.operationalStatus !== 'active') {
        return { ok: true as const, skipped: true as const }
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_PORTAL_VISIBILITY_CLICK,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: {
          tier: vis.tier,
          products: vis.products,
          surface: input.surface,
          ...(input.searchContext ? { searchContext: input.searchContext } : {}),
        },
      })

      return { ok: true as const, skipped: false as const }
    }),

  /** Usuario abrió el CTA de contacto (antes de enviar lead). */
  recordContactCtaClick: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        /** Superficie del CTA (embudo; sin PII). */
        surface: z
          .enum([
            'sidebar_primary',
            'sidebar_secondary',
            'sticky_primary',
            'sticky_secondary',
            'smart_suggestion',
          ])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
        })
        .from(listings)
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!row) {
        return { ok: false as const }
      }

      const payload: Record<string, unknown> = {}
      if (input.surface !== undefined) payload.surface = input.surface

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_CONTACT_CTA_CLICK,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload,
      })
      return { ok: true as const }
    }),

  /** Ficha: se mostró el bloque de sugerencia de contacto (embudo). */
  recordContactPromptShown: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        reason: z.enum(['views', 'return_visit', 'compare_saved']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
        })
        .from(listings)
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!row) {
        return { ok: false as const }
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_CONTACT_PROMPT_SHOWN,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: { reason: input.reason },
      })
      return { ok: true as const }
    }),

  /** Comparación pública: hasta 3 avisos activos, en el orden pedido (dedupe). */
  getComparePublic: publicProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(2).max(3),
      })
    )
    .query(async ({ input, ctx }) => {
      const seen = new Set<string>()
      const orderedIds: string[] = []
      for (const id of input.ids) {
        if (seen.has(id)) continue
        seen.add(id)
        orderedIds.push(id)
        if (orderedIds.length >= 3) break
      }
      if (orderedIds.length < 2) {
        return []
      }

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(inArray(listings.id, orderedIds), eq(listings.status, 'active'))
        )

      const byId = new Map(rows.map((r) => [r.id, r]))
      const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))

      if (ordered.length < 2) {
        return ordered
      }

      const ids = ordered.map((r) => r.id)
      const allMedia = await ctx.db.query.listingMedia.findMany({
        where: inArray(listingMedia.listingId, ids),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      const firstImageByListing = new Map<string, string>()
      for (const m of allMedia) {
        if (m.type !== 'image') continue
        if (!firstImageByListing.has(m.listingId)) {
          firstImageByListing.set(m.listingId, m.url)
        }
      }

      return ordered.map((row) => ({
        ...row,
        primaryImageUrl:
          row.primaryImageUrl ??
          firstImageByListing.get(row.id) ??
          null,
      }))
    }),

  /** Telemetría comparador (doc 49): usuario agrega un aviso a la lista local. */
  recordCompareAdd: publicProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
        })
        .from(listings)
        .where(
          and(eq(listings.id, input.listingId), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!row) {
        return { ok: false as const }
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_COMPARE_ADD,
        listingId: row.id,
        organizationId: row.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: {},
      })
      return { ok: true as const }
    }),

  /** Telemetría comparador: vista de `/comparar` con 2–3 avisos (solo activos en DB). */
  recordCompareView: publicProcedure
    .input(
      z.object({
        listingIds: z.array(z.string().uuid()).min(2).max(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const seen = new Set<string>()
      const ordered: string[] = []
      for (const id of input.listingIds) {
        if (seen.has(id)) continue
        seen.add(id)
        ordered.push(id)
        if (ordered.length >= 3) break
      }
      if (ordered.length < 2) {
        return { ok: false as const }
      }

      const rows = await ctx.db
        .select({
          id: listings.id,
          organizationId: listings.organizationId,
        })
        .from(listings)
        .where(and(inArray(listings.id, ordered), eq(listings.status, 'active')))

      if (rows.length < 2) {
        return { ok: false as const }
      }

      const byId = new Map(rows.map((r) => [r.id, r]))
      const first = byId.get(ordered[0]!)
      if (!first) {
        return { ok: false as const }
      }

      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_COMPARE_VIEW,
        listingId: first.id,
        organizationId: first.organizationId,
        userId: ctx.session?.userId ?? null,
        payload: { count: ordered.length },
      })
      return { ok: true as const }
    }),

  /** Avisos similares (misma operación y tipo, ciudad si existe, banda de precio ±30%). */
  similar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        limit: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      const [base] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(eq(listings.id, input.id), eq(listings.status, 'active'))
        )
        .limit(1)

      if (!base) {
        return []
      }

      const conditions = [
        eq(listings.status, 'active'),
        ne(listings.id, input.id),
        eq(listings.operationType, base.operationType),
        eq(listings.propertyType, base.propertyType),
      ]

      const addr = base.address as Record<string, unknown> | null | undefined
      const cityRaw = typeof addr?.city === 'string' ? addr.city : ''
      const city = sanitizeIlikeFragment(cityRaw)
      if (city.length > 0) {
        conditions.push(
          sql`COALESCE(${listings.address}->>'city', '') ILIKE ${`%${city}%`}`
        )
      }

      const price = Number(base.priceAmount)
      if (!Number.isNaN(price) && price > 0 && base.showPrice !== false) {
        const low = Math.max(0, Math.floor(price * 0.7))
        const high = Math.ceil(price * 1.3)
        conditions.push(gte(listings.priceAmount, low))
        conditions.push(lte(listings.priceAmount, high))
      }

      const rows = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(and(...conditions))
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(input.limit)

      if (rows.length === 0) {
        return []
      }

      const ids = rows.map((r) => r.id)
      const allMedia = await ctx.db.query.listingMedia.findMany({
        where: inArray(listingMedia.listingId, ids),
        orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
      })

      const primaryByListing = new Map<string, string>()
      for (const m of allMedia) {
        if (!primaryByListing.has(m.listingId)) {
          primaryByListing.set(m.listingId, m.url)
        }
      }

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        operationType: row.operationType,
        propertyType: row.propertyType,
        priceAmount: row.priceAmount,
        priceCurrency: row.priceCurrency,
        address: row.address,
        surfaceTotal: row.surfaceTotal,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        primaryImageUrl: primaryByListing.get(row.id) ?? null,
      }))
    }),

  getFeatured: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(eq(listings.status, 'active'))
        .orderBy(...ORDER_PUBLIC_RECENCY)
        .limit(input.limit)
    }),

  /** Catálogo de facets (flags/enums/ranges) para UI y clientes; alineado a `sanitizeListingSearchFacets`. */
  getSearchFacetsCatalog: publicProcedure.query(() => ({
    facets: FACETS_CATALOG,
  })),

  /**
   * Ciudades y barrios que aparecen en avisos activos (agregado).
   * Para el modal predictivo del buscador y validación conversacional.
   */
  localityCatalog: publicProcedure.query(async ({ ctx }) => {
    try {
      const entries = await getListingLocalityCatalog(ctx.db)
      return { entries: [...entries] }
    } catch (err) {
      console.error('[listing.localityCatalog]', err)
      return { entries: [] as LocalityCatalogEntry[] }
    }
  }),

  /** Búsqueda pública (solo avisos activos). Usa ES si está configurado, fallback a SQL. */
  search: publicProcedure
    .input(listingSearchInputSchema)
    .query(async ({ input, ctx }) => {
      const startedAt = Date.now()
      const perfStart = Date.now()
      const logSearchMs = process.env.LOG_SEARCH_MS === '1'
      const sessionUserId = ctx.session?.userId
      const filtersSnapshot = JSON.parse(JSON.stringify(input)) as Record<string, unknown>

      const { limit, offset, cursor, ...explainFilters } = input

      let searchAfter: unknown[] | undefined
      if (cursor?.trim()) {
        const decoded = decodeListingSearchCursor(cursor.trim())
        if (!decoded) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cursor de búsqueda inválido o expirado.',
          })
        }
        const expectedKeys = getListingSearchSortKeyCount(
          explainFilters as SearchFilters
        )
        if (decoded.length !== expectedKeys) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'La paginación no coincide con esta búsqueda. Volvé a la primera página o refrescá.',
          })
        }
        searchAfter = decoded
      }

      const esOffset = searchAfter ? 0 : offset

      try {
      const persistThisSearch =
        Boolean(sessionUserId) &&
        !cursor?.trim() &&
        input.offset === 0

      const esFilters: SearchFilters = {
        q: input.q,
        operationType: input.operationType,
        propertyType: input.propertyType,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        minSurface: input.minSurface,
        maxSurface: input.maxSurface,
        minBedrooms: input.minBedrooms,
        minBathrooms: input.minBathrooms,
        minGarages: input.minGarages,
        floorMin: input.floorMin,
        floorMax: input.floorMax,
        escalera: input.escalera,
        orientation: input.orientation,
        minSurfaceCovered: input.minSurfaceCovered,
        maxSurfaceCovered: input.maxSurfaceCovered,
        minTotalRooms: input.minTotalRooms,
        city: input.city,
        neighborhood: input.neighborhood,
        amenities: input.amenities,
        geoPoint: input.geoPoint,
        geoRadius: input.geoRadius,
        sortNearLat: input.sortNearLat,
        sortNearLng: input.sortNearLng,
        facets: input.facets,
        bbox: input.bbox,
        polygon: input.polygon,
        amenitiesMatchMode: input.amenitiesMatchMode,
        matchProfile: input.matchProfile,
        limit,
        offset: esOffset,
        searchAfter,
      }

      const layered = await searchListingsLayered(esFilters)

      // Si ES responde pero el índice está vacío o desincronizado, total=0 y antes
      // no había fallback: el buscador quedaba en silencio. SQL es fuente de verdad.
      // Paginación por cursor (search_after) no es reproducible en SQL: no mezclar.
      if (!(layered.fromEs && layered.total > 0) && searchAfter) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: PORTAL_SEARCH_UX_COPY.searchPaginationIndexSoft,
        })
      }

      if (layered.fromEs && layered.total > 0) {
        const ES_UNDERFILL_CAP = 48
        const canProbeSqlUnderfill =
          !cursor?.trim() &&
          input.offset === 0 &&
          !searchAfter &&
          layered.total <= ES_UNDERFILL_CAP

        if (canProbeSqlUnderfill) {
          const prepUnderfill = buildListingSearchSqlFromSeed(input)
          const sqlTotalProbe = await countListingSearchSql(ctx.db, prepUnderfill)
          const ratioOk = sqlTotalProbe >= layered.total * 2
          const deltaOk =
            layered.total < 15 && sqlTotalProbe - layered.total >= 15
          if (
            sqlTotalProbe > layered.total &&
            (ratioOk || deltaOk)
          ) {
            const rowsSql = await selectListingSearchSqlPage(
              ctx.db,
              prepUnderfill,
              limit,
              offset
            )
            if (logSearchMs) {
              console.info(
                '[listing.search]',
                JSON.stringify({
                  phase: 'es_underfill_sql',
                  ms: Date.now() - perfStart,
                  esTotal: layered.total,
                  sqlTotal: sqlTotalProbe,
                  hasCursor: false,
                  fromEs: true,
                  rowCount: rowsSql.length,
                })
              )
            }
            if (persistThisSearch) {
              persistSearchHistoryRow(ctx.db, {
                userId: sessionUserId!,
                filters: filtersSnapshot,
                resultCount: sqlTotalProbe,
                startedAt,
              })
            }
            recordPortalStatsEvent(ctx.db, {
              terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_EXECUTED,
              userId: ctx.session?.userId ?? null,
              payload: {
                total: sqlTotalProbe,
                source: 'sql_underfill',
              },
            })
            return {
              items: withMatchReasons(
                explainFilters as ExplainMatchFilters,
                rowsSql
              ),
              total: sqlTotalProbe,
              nextCursor: null,
              searchUX: {
                ...defaultSqlSearchUx(sqlTotalProbe),
                messages: [PORTAL_SEARCH_UX_COPY.searchEsUnderfillNote],
              },
            }
          }
        }

        if (persistThisSearch) {
          persistSearchHistoryRow(ctx.db, {
            userId: sessionUserId!,
            filters: filtersSnapshot,
            resultCount: layered.total,
            startedAt,
          })
        }
        if (!cursor?.trim() && input.offset === 0) {
          recordPortalStatsEvent(ctx.db, {
            terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_EXECUTED,
            userId: ctx.session?.userId ?? null,
            payload: {
              total: layered.total,
              source: 'es',
              tier: layered.ux.tier,
            },
          })
          if (layered.ux.primaryTotal === 0 && layered.total > 0) {
            recordPortalStatsEvent(ctx.db, {
              terminalId:
                PORTAL_STATS_TERMINALS.LISTING_SEARCH_ZERO_PRIMARY_RESOLVED,
              userId: ctx.session?.userId ?? null,
              payload: { tier: layered.ux.tier },
            })
          }
          if (
            layered.ux.relaxationStepIds.length > 0 ||
            layered.ux.mergedSupplement
          ) {
            recordPortalStatsEvent(ctx.db, {
              terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_RELAXATION_USED,
              userId: ctx.session?.userId ?? null,
              payload: {
                tier: layered.ux.tier,
                steps: layered.ux.relaxationStepIds,
                merged: layered.ux.mergedSupplement,
              },
            })
          }
        }
        const nextOut =
          layered.ux.disableDeepPagination ? null : layered.nextCursor
        if (logSearchMs) {
          console.info(
            '[listing.search]',
            JSON.stringify({
              phase: 'es_done',
              ms: Date.now() - perfStart,
              total: layered.total,
              rowCount: layered.hits.length,
              limit,
              offset: input.offset,
              hasCursor: Boolean(cursor?.trim()),
              hasNextCursor: Boolean(nextOut),
              fromEs: true,
              tier: layered.ux.tier,
              disableDeepPagination: layered.ux.disableDeepPagination,
            })
          )
        }
        return {
          items: withMatchReasons(
            explainFilters as ExplainMatchFilters,
            layered.hits
          ),
          total: layered.total,
          nextCursor: nextOut,
          searchUX: layered.ux,
        }
      }

      const sqlInputSeed =
        layered.fromEs && layered.total === 0
          ? searchFiltersToListingInputOverlay(input, layered.lastTriedFilters)
          : input

      const prep = buildListingSearchSqlFromSeed(sqlInputSeed)
      const sqlTotal = await countListingSearchSql(ctx.db, prep)
      const rows = await selectListingSearchSqlPage(ctx.db, prep, limit, offset)
      if (persistThisSearch) {
        persistSearchHistoryRow(ctx.db, {
          userId: sessionUserId!,
          filters: filtersSnapshot,
          resultCount: sqlTotal,
          startedAt,
        })
      }
      if (logSearchMs) {
        console.info(
          '[listing.search]',
          JSON.stringify({
            phase: 'sql_done',
            ms: Date.now() - perfStart,
            total: sqlTotal,
            rowCount: rows.length,
            limit,
            offset,
            hasCursor: Boolean(cursor?.trim()),
            fromEs: layered.fromEs,
            esLayerTotal: layered.fromEs ? layered.total : undefined,
          })
        )
      }

      const sqlUx: ListingSearchUX =
        layered.fromEs && layered.total === 0
          ? {
              ...layered.ux,
              messages:
                sqlTotal > 0
                  ? [
                      ...layered.ux.messages,
                      PORTAL_SEARCH_UX_COPY.searchSqlFallbackRowsNote,
                    ]
                  : layered.ux.messages,
            }
          : defaultSqlSearchUx(sqlTotal)

      if (!cursor?.trim() && input.offset === 0) {
        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_EXECUTED,
          userId: ctx.session?.userId ?? null,
          payload: {
            total: sqlTotal,
            source: 'sql',
            esEmpty: layered.fromEs && layered.total === 0,
          },
        })
        if (layered.fromEs && layered.total === 0 && sqlTotal > 0) {
          if (layered.ux.primaryTotal === 0) {
            recordPortalStatsEvent(ctx.db, {
              terminalId:
                PORTAL_STATS_TERMINALS.LISTING_SEARCH_ZERO_PRIMARY_RESOLVED,
              userId: ctx.session?.userId ?? null,
              payload: { tier: layered.ux.tier, source: 'sql_fallback' },
            })
          }
          if (layered.ux.relaxationStepIds.length > 0) {
            recordPortalStatsEvent(ctx.db, {
              terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_RELAXATION_USED,
              userId: ctx.session?.userId ?? null,
              payload: {
                tier: layered.ux.tier,
                steps: layered.ux.relaxationStepIds,
                source: 'sql_fallback',
              },
            })
          }
        }
      }

      return {
        items: withMatchReasons(explainFilters as ExplainMatchFilters, rows),
        total: sqlTotal,
        nextCursor: null,
        searchUX: sqlUx,
      }
      } catch (searchErr) {
        if (searchErr instanceof TRPCError) throw searchErr
        console.error('[listing.search] error inesperado:', searchErr)
        return {
          items: [],
          total: 0,
          nextCursor: null,
          searchUX: {
            tier: 'exact',
            primaryTotal: 0,
            strictMatchCount: 0,
            mergedSupplement: false,
            nearAreaSupplement: false,
            messages: [PORTAL_SEARCH_UX_COPY.searchUnexpectedSoft],
            relaxationStepIds: [],
            disableDeepPagination: false,
          },
        }
      }
    }),

  /**
   * Búsqueda pública v2 (MVP): `SearchSession` → buckets strong / near / widened.
   * No usa `searchListingsLayered` ni la relajación del listado legacy.
   */
  searchV2: publicProcedure
    .input(listingSearchV2InputSchema)
    .query(async ({ input, ctx }) => {
      const perfStart = Date.now()
      const limitPerBucket = input.limitPerBucket ?? 24
      let out = await runListingSearchV2({
        session: input.session,
        limitPerBucket,
        exactPageCursor: input.exactPageCursor ?? null,
        exactEsOffset: input.exactEsOffset ?? 0,
        includeAlternativeBuckets: input.includeAlternativeBuckets ?? false,
      })

      const fallback = await trySearchV2SqlFallback(
        ctx.db,
        input.session,
        limitPerBucket,
        input.exactEsOffset ?? 0,
        out
      )
      if (fallback) {
        out = fallback
      }
      out = await attachPortalVisibilityToSearchV2Result(ctx.db, out)

      if (process.env.LOG_SEARCH_MS === '1') {
        console.info(
          '[listing.searchV2]',
          JSON.stringify({
            ms: Date.now() - perfStart,
            strong: out.totalsByBucket.strong,
            near: out.totalsByBucket.near,
            widened: out.totalsByBucket.widened,
            sqlFallback: Boolean(fallback),
          })
        )
      }
      recordPortalStatsEvent(ctx.db, {
        terminalId: PORTAL_STATS_TERMINALS.LISTING_SEARCH_EXECUTED,
        userId: ctx.session?.userId ?? null,
        payload: {
          total: out.strictCatalogTotal,
          source: fallback ? 'search_v2_sql_fallback' : 'search_v2',
        },
      })
      return out
    }),

  /** Búsqueda conversacional: extrae intención del mensaje y devuelve filtros + resultados. */
  searchConversational: publicProcedure
    .input(searchConversationalInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (!checkRateLimit(ctx.ip)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: PORTAL_SEARCH_UX_COPY.conversationalRateLimitSoft,
        })
      }

      try {
        const logSearchPerf = process.env.LOG_SEARCH_MS === '1'
        const convoPerfStart = Date.now()
        const prior = conversationPriorFromInput(input.previousContext)

        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.ASSISTANT_MESSAGE_SENT,
          userId: ctx.session?.userId ?? null,
          payload: {
            lenBucket:
              input.message.length <= 60
                ? 's'
                : input.message.length <= 180
                  ? 'm'
                  : 'l',
          },
        })

        /** No bloquear el asistente si el agregado de localidades falla (timeout Neon, etc.). */
        const localityCatalog = await getListingLocalityCatalog(ctx.db)
        const { intention, amenitiesMatchMode, pipelineDebug } =
          await runConversationalSearchOrchestrator(input.message, prior ?? undefined, {
            localityCatalog,
          })

        if (process.env.LOG_CONVERSATIONAL_SEARCH === '1') {
          console.info(
            '[listing.searchConversational]',
            JSON.stringify({
              input: input.message,
              structured: pipelineDebug.structuredSnapshot,
              notes: pipelineDebug.validationNotes,
              unknownTerms: pipelineDebug.unknownTerms,
              droppedLocations: pipelineDebug.droppedLocations,
              droppedAmenities: pipelineDebug.droppedAmenities,
              amenitiesMatchMode,
            })
          )
        }

        const qForClient =
          residualPublicSearchText({
            q: intention.q,
            operationType: intention.operationType,
            propertyType: intention.propertyType,
            amenities: intention.amenities,
            minSurface: intention.minSurface,
            minBedrooms: intention.minBedrooms,
            minPrice: intention.minPrice,
            maxPrice: intention.maxPrice,
            city: intention.city,
            neighborhood: intention.neighborhood,
          }) || undefined

        const explainFilters: ExplainMatchFilters = {
          q: qForClient,
          operationType: intention.operationType,
          propertyType: intention.propertyType,
          city: intention.city,
          neighborhood: intention.neighborhood,
          minPrice: intention.minPrice,
          maxPrice: intention.maxPrice,
          minBedrooms: intention.minBedrooms,
          minSurface: intention.minSurface,
          amenities: intention.amenities,
        }
        const filters = {
          ...explainFilters,
          amenitiesMatchMode,
          matchProfile: 'intent' as const,
          limit: 24,
          offset: 0,
        } as SearchFilters

        const relaxationMsgs: string[] = []
        let effective = { ...filters }
        let layered = await searchListingsLayered(effective)

        if (layered.fromEs && layered.total === 0 && effective.amenitiesMatchMode === 'strict') {
          effective = { ...effective, amenitiesMatchMode: 'preferred' }
          relaxationMsgs.push(PORTAL_SEARCH_UX_COPY.conversationalRelaxedAmenitiesNote)
          layered = await searchListingsLayered(effective)
        }

        if (layered.fromEs && layered.total === 0 && effective.operationType) {
          effective = { ...effective, operationType: undefined }
          relaxationMsgs.push(PORTAL_SEARCH_UX_COPY.conversationalRelaxedOperationNote)
          layered = await searchListingsLayered(effective)
        }

        if (layered.fromEs && layered.total > 0) {
          if (logSearchPerf) {
            console.info(
              '[listing.searchConversational]',
              JSON.stringify({
                phase: 'conversation_search_done',
                ms: Date.now() - convoPerfStart,
                hasPrior: Boolean(prior),
                total: layered.total,
                rowCount: layered.hits.length,
                fromEs: true,
              })
            )
          }
          recordPortalStatsEvent(ctx.db, {
            terminalId: PORTAL_STATS_TERMINALS.ASSISTANT_SEARCH_TRIGGERED,
            userId: ctx.session?.userId ?? null,
            payload: {
              total: layered.total,
              fromEs: true,
              hasPrior: Boolean(prior),
            },
          })
          return {
            filters: {
              ...explainFilters,
              operationType: effective.operationType,
              amenitiesMatchMode: effective.amenitiesMatchMode,
              matchProfile: 'intent',
              limit: 24,
              offset: 0,
            },
            hits: withMatchReasons(explainFilters, layered.hits),
            total: layered.total,
            searchUX: {
              ...layered.ux,
              messages: [...relaxationMsgs, ...(layered.ux.messages ?? [])],
            },
          }
        }

        const sqlFilters: SearchFilters =
          layered.fromEs && layered.total === 0
            ? { ...effective, ...layered.lastTriedFilters }
            : effective

        const convoSqlSeed = {
          ...sqlFilters,
          limit: filters.limit ?? 24,
          offset: filters.offset ?? 0,
        } as ListingSearchInput
        const prepConvo = buildListingSearchSqlFromSeed(convoSqlSeed)
        const total = await countListingSearchSql(ctx.db, prepConvo)
        const hits = await selectListingSearchSqlPage(
          ctx.db,
          prepConvo,
          filters.limit ?? 24,
          filters.offset ?? 0
        )

        const sqlUx: ListingSearchUX =
          layered.fromEs && layered.total === 0
            ? {
                ...layered.ux,
                messages:
                  total > 0
                    ? [
                        ...layered.ux.messages,
                        PORTAL_SEARCH_UX_COPY.searchSqlFallbackCountNote,
                      ]
                    : layered.ux.messages,
              }
            : {
                tier: 'exact',
                primaryTotal: total,
                strictMatchCount: total,
                mergedSupplement: false,
                nearAreaSupplement: false,
                messages: [],
                relaxationStepIds: [],
                disableDeepPagination: false,
              }

        if (logSearchPerf) {
          console.info(
            '[listing.searchConversational]',
            JSON.stringify({
              phase: 'conversation_search_done',
              ms: Date.now() - convoPerfStart,
              hasPrior: Boolean(prior),
              total,
              rowCount: hits.length,
              fromEs: layered.fromEs,
            })
          )
        }
        recordPortalStatsEvent(ctx.db, {
          terminalId: PORTAL_STATS_TERMINALS.ASSISTANT_SEARCH_TRIGGERED,
          userId: ctx.session?.userId ?? null,
          payload: {
            total,
            fromEs: layered.fromEs,
            hasPrior: Boolean(prior),
          },
        })
        return {
          filters: {
            ...explainFilters,
            operationType: effective.operationType,
            amenitiesMatchMode: effective.amenitiesMatchMode,
            limit: 24,
            offset: 0,
          },
          hits: withMatchReasons(explainFilters, hits),
          total,
          searchUX: {
            ...sqlUx,
            messages: [...relaxationMsgs, ...(sqlUx.messages ?? [])],
          },
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[listing.searchConversational]', err)
        if (isLikelyDbOrNetworkFailure(msg)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: PORTAL_SEARCH_UX_COPY.conversationalDbSoft,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: PORTAL_SEARCH_UX_COPY.conversationalAssistantDegraded,
        })
      }
    }),

  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1).max(120),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isS3Configured()) {
        throw new Error(
          'Almacenamiento de archivos no configurado (S3/R2). Revisá variables en docs/21-s3-media.md.'
        )
      }

      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const safeName = sanitizeUploadFilename(input.filename)
      const key = `listings/${input.listingId}/${randomUUID()}-${safeName}`
      const uploadUrl = await getPresignedPutUrl({
        key,
        contentType: input.contentType,
      })
      const fileUrl = publicMediaUrl(key)

      return { uploadUrl, fileUrl, key }
    }),

  addMedia: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        url: z.string().url().max(2048),
        type: z.enum(['image', 'video', 'floor_plan', 'virtual_tour']).default('image'),
        isPrimary: z.boolean().optional(),
        alt: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, input.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new Error('Propiedad no encontrada')
      }

      const mediaRows = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, input.listingId),
      })

      const order = mediaRows.length
      const noPrimaryYet = !existing.primaryImageUrl && mediaRows.length === 0
      const isPrimary = input.isPrimary ?? noPrimaryYet

      if (isPrimary) {
        await ctx.db
          .update(listingMedia)
          .set({ isPrimary: false })
          .where(eq(listingMedia.listingId, input.listingId))
      }

      const [row] = await ctx.db
        .insert(listingMedia)
        .values({
          listingId: input.listingId,
          type: input.type,
          url: input.url,
          order,
          isPrimary,
          alt: input.alt ?? null,
        })
        .returning()

      const nextPrimary = isPrimary
        ? input.url
        : (existing.primaryImageUrl ?? input.url)

      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: nextPrimary,
          mediaCount: existing.mediaCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, input.listingId))

      return row
    }),

  removeMedia: protectedProcedure
    .input(z.object({ mediaId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const media = await ctx.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, input.mediaId),
      })
      if (!media) throw new Error('Imagen no encontrada')

      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, media.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)
      if (!listing) throw new Error('Propiedad no encontrada')

      await ctx.db.delete(listingMedia).where(eq(listingMedia.id, input.mediaId))

      const remaining = await ctx.db.query.listingMedia.findMany({
        where: eq(listingMedia.listingId, media.listingId),
        orderBy: [listingMedia.order],
      })

      const newPrimary = remaining[0]?.url ?? null
      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: newPrimary,
          mediaCount: remaining.length,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, media.listingId))

      const firstRemaining = remaining[0]
      if (firstRemaining && firstRemaining.id !== media.id) {
        await ctx.db
          .update(listingMedia)
          .set({ isPrimary: true })
          .where(eq(listingMedia.id, firstRemaining.id))
      }

      return { ok: true }
    }),

  setPrimaryMedia: protectedProcedure
    .input(z.object({ mediaId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const media = await ctx.db.query.listingMedia.findFirst({
        where: eq(listingMedia.id, input.mediaId),
      })
      if (!media) throw new Error('Imagen no encontrada')

      const [listing] = await ctx.db
        .select(listingsSelectPublic)
        .from(listings)
        .where(
          and(
            eq(listings.id, media.listingId),
            eq(listings.publisherId, ctx.session.userId)
          )
        )
        .limit(1)
      if (!listing) throw new Error('Propiedad no encontrada')

      await ctx.db
        .update(listingMedia)
        .set({ isPrimary: false })
        .where(eq(listingMedia.listingId, media.listingId))

      await ctx.db
        .update(listingMedia)
        .set({ isPrimary: true })
        .where(eq(listingMedia.id, input.mediaId))

      await ctx.db
        .update(listings)
        .set({
          primaryImageUrl: media.url,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, media.listingId))

      return { ok: true }
    }),
})
