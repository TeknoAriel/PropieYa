import {
  assessListingPublishability,
  computeImportContentHash,
  extractListingsFromFeed,
  fetchYumblinFeedConditional,
  getListingPublishConfigFromEnv,
  LISTING_REASON_MESSAGES_ES,
  LISTING_VALIDITY,
  listingRowToPublishabilityInput,
  mapYumblinItem,
  parseFeedItemSourceUpdatedAt,
  peekFeedExternalId,
  sha256HexFromString,
} from '@propieya/shared'
import { and, count, eq, inArray, isNull, isNotNull, ne, notInArray, or } from 'drizzle-orm'

import { db } from './client'
import {
  buildKitepropPropertiesListUrl,
  fetchKitepropPropertiesAllPages,
  resolveKitepropIngestMode,
  useKitepropPagedApiIngest,
} from './kiteprop-api-ingest-fetch'
import { recordListingTransitionForKiteprop } from './listing-lifecycle-record'
import {
  importFeedSources,
  listingMedia,
  listings,
  organizationMemberships,
  organizations,
} from './schema'

const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json'

/** Por defecto el catálogo importado se publica como `active` (visible en portal). `IMPORT_INGEST_AS_DRAFT=true` restaura el comportamiento anterior (solo borrador). */
function resolveIngestAsDraft(): boolean {
  const v = (process.env.IMPORT_INGEST_AS_DRAFT ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

const LIFECYCLE_PREVIOUS_UNLISTED = 'unlisted'

function importPublicationSet(
  now: Date,
  ingestAsDraft: boolean,
  assessment: ReturnType<typeof assessListingPublishability>
): {
  status: 'draft' | 'active' | 'rejected'
  publishedAt: Date | null
  lastValidatedAt: Date | null
  expiresAt: Date | null
  lastContentUpdatedAt: Date | null
} {
  if (!assessment.ok) {
    if (ingestAsDraft) {
      return {
        status: 'draft',
        publishedAt: null,
        lastValidatedAt: null,
        expiresAt: null,
        lastContentUpdatedAt: null,
      }
    }
    return {
      status: 'rejected',
      publishedAt: null,
      lastValidatedAt: null,
      expiresAt: null,
      lastContentUpdatedAt: null,
    }
  }
  if (ingestAsDraft) {
    return {
      status: 'draft',
      publishedAt: null,
      lastValidatedAt: null,
      expiresAt: null,
      lastContentUpdatedAt: null,
    }
  }
  const expiresAt = new Date(
    now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )
  return {
    status: 'active',
    publishedAt: now,
    lastValidatedAt: now,
    expiresAt,
    lastContentUpdatedAt: now,
  }
}

function assessMappedImport(
  mapped: {
    operationType: string
    propertyType: string
    priceAmount: number
    priceCurrency: string
    title: string
    description: string
    address: unknown
    imageUrls: string[]
  },
  config: ReturnType<typeof getListingPublishConfigFromEnv>
) {
  return assessListingPublishability(
    listingRowToPublishabilityInput(
      {
        operationType: mapped.operationType,
        propertyType: mapped.propertyType,
        priceAmount: mapped.priceAmount,
        priceCurrency: mapped.priceCurrency,
        title: mapped.title,
        description: mapped.description,
        address: mapped.address,
      },
      mapped.imageUrls.length,
      config
    )
  )
}

export interface YumblinImportSyncOptions {
  feedUrl?: string
  organizationId?: string
  publisherId?: string
  limit?: number
  /** Cron: respeta IMPORT_SYNC_INTERVAL_HOURS. Script: false. */
  enforceInterval?: boolean
  /** No envía If-None-Match (útil para depuración). */
  forceFullFetch?: boolean
  /** JSON ya parseado (p. ej. archivo local); no hace GET al feed. */
  rawData?: unknown
  /**
   * Para datos históricos (insertados sin importFeedSourceId) permite tratar los avisos sin
   * importFeedSourceId como si pertenecieran a este feed source. Recomendado solo cuando
   * se sabe que hay un único feed activo.
   */
  assumeUnassignedBelongsToThisSource?: boolean
  /**
   * Si true: los avisos `source=import` de la org cuyo `external_id` no está en el feed pasan a
   * `withdrawn`, aunque apunten a otro `import_feed_sources` (cambio de URL de feed).
   * Solo usar con **un** feed activo por org. Env: `IMPORT_WITHDRAW_SCOPE` (`org` | `source`).
   */
  withdrawOrgWide?: boolean
  /**
   * Si true: no omitir ítems aunque `import_source_updated_at` coincida con `last_update` del feed.
   * Necesario tras corregir `mapYumblinItem` / tipos para reescribir filas sin cambiar el JSON remoto.
   * Env: `IMPORT_BYPASS_SOURCE_UPDATED_AT=1`.
   */
  bypassSourceUpdatedAt?: boolean
}

export interface YumblinImportSyncResult {
  feedUrl: string
  organizationId: string
  publisherId: string
  skipped:
    | false
    | 'interval'
    | 'not_modified_http'
    | 'body_unchanged'
  counts: {
    imported: number
    updated: number
    unchanged: number
    skippedInvalid: number
    skippedUnchangedBySourceTime: number
    withdrawn: number
  }
  /** IDs dados de baja en este sync (para quitar de Elasticsearch). */
  withdrawnListingIds: string[]
  /** Avisos que dejaron de estar publicados por validación en este sync (quitar de ES en pipeline). */
  deactivatedListingIds: string[]
  /**
   * Si true, se omitió el retiro masivo porque el feed tenía muy pocos ítems respecto al histórico
   * (evita marcar miles como `withdrawn` ante un JSON truncado).
   */
  withdrawSkippedDueToShrinkGuard?: boolean
  /** Contexto opcional para logs / telemetría cuando actúa la guarda. */
  shrinkGuardDetails?: {
    baseline: number
    threshold: number
    feedItemCount: number
    fraction: number
    reason?: 'feed_size' | 'invalid_ratio'
    /** Conteos usados para `invalid_ratio` cuando aplica. */
    skippedInvalid?: number
  }
  /**
   * GET cron omitió bajas (`IMPORT_CRON_SKIP_WITHDRAW`); el feed igual se procesó (altas/updates).
   * Las bajas quedan para el webhook o una corrida sin esta política.
   */
  withdrawSkippedDueToCronPolicy?: boolean
  /** Retiros desactivados por política global de estabilidad. */
  withdrawSkippedDueToPolicy?: boolean
}

function resolveWithdrawOrgWideExplicit(options: YumblinImportSyncOptions): boolean {
  if (options.withdrawOrgWide !== undefined) return options.withdrawOrgWide
  const s = (process.env.IMPORT_WITHDRAW_SCOPE ?? 'org').toLowerCase().trim()
  return s !== 'source' && s !== 'feed'
}

/** Si el feed parseado tiene muchos menos ítems que el histórico, no ejecutar bajas masivas (JSON truncado / URL incorrecta). */
function resolveWithdrawShrinkGuardDisabled(): boolean {
  const v = (process.env.IMPORT_WITHDRAW_SHRINK_GUARD_DISABLE ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Fracción mínima del baseline bajo la cual no se aplica retiro (default 0.2 = 20%). */
function resolveWithdrawShrinkGuardFraction(): number {
  const raw = (process.env.IMPORT_WITHDRAW_SHRINK_GUARD_FRACTION ?? '0.2').trim()
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.2
  return n
}

/** Solo aplica la guarda si el baseline (DB + último feed confiable) es al menos este valor. */
function resolveWithdrawShrinkGuardMinBaseline(): number {
  const raw = (process.env.IMPORT_WITHDRAW_SHRINK_GUARD_MIN_BASELINE ?? '150').trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 150
}

/**
 * Si el baseline supera este valor, el umbral de retiro no puede ser menor que `absFloor`
 * (evita que un catálogo enorme acepte un feed ridículamente pequeño solo por el % relativo).
 */
function resolveWithdrawShrinkGuardLargeBaseline(): number {
  const raw = (process.env.IMPORT_WITHDRAW_SHRINK_GUARD_LARGE_BASELINE ?? '4000').trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 4000
}

function resolveWithdrawShrinkGuardAbsFloor(): number {
  const raw = (process.env.IMPORT_WITHDRAW_SHRINK_GUARD_ABS_FLOOR ?? '800').trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 800
}

/** Mínimo de ítems en el feed para evaluar ratio de inválidos (mapeo roto / esquema cambiado). */
function resolveWithdrawInvalidRatioMinFeed(): number {
  const raw = (process.env.IMPORT_WITHDRAW_INVALID_RATIO_MIN_FEED ?? '40').trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 40
}

/** Si más de esta fracción de ítems fallan el map, no retirar masivamente (0.75 = 75%). */
function resolveWithdrawInvalidRatioMax(): number {
  const raw = (process.env.IMPORT_WITHDRAW_INVALID_RATIO_MAX ?? '0.75').trim()
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.75
  return n
}

/** GET `/api/cron/import-yumblin` con `enforceInterval`: no ejecutar bajas por feed (solo webhook u operador). */
function resolveCronSkipWithdraw(): boolean {
  const v = (process.env.IMPORT_CRON_SKIP_WITHDRAW ?? '').trim().toLowerCase()
  if (!v) return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

/** Modo estabilidad: desactiva retiros por feed (cron/webhook/manual) hasta consolidar ingest. */
function resolveWithdrawDisabled(): boolean {
  const v = (process.env.IMPORT_WITHDRAW_DISABLE ?? '').trim().toLowerCase()
  if (!v) return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

/** En fase posterior: no permitir retiros > X% del catálogo importado en una corrida. */
function resolveWithdrawMaxPercentOfCatalog(): number {
  const raw = (process.env.IMPORT_WITHDRAW_MAX_PERCENT_OF_CATALOG ?? '0.05').trim()
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.05
  return n
}

/** Modo lanzamiento: para import no baja publicación por reglas blandas de calidad. */
function resolveImportPublishSafeMode(): boolean {
  const v = (process.env.IMPORT_PUBLISH_SAFE_MODE ?? '').trim().toLowerCase()
  if (!v) return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

function isNonEmptyText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

function assessMappedImportForSafeMode(
  mapped: {
    externalId: string | null
    operationType: string
    propertyType: string
    title: string
    description: string
    address: unknown
    locationLat: number | null
    locationLng: number | null
  }
): ReturnType<typeof assessListingPublishability> {
  type PublishabilityIssue = ReturnType<typeof assessListingPublishability>['issues'][number]
  const issues: PublishabilityIssue[] = []

  if (!isNonEmptyText(mapped.externalId)) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'El aviso no tiene identificador externo.',
      details: { field: 'externalId' },
    })
  }
  if (!isNonEmptyText(mapped.operationType) || !isNonEmptyText(mapped.propertyType)) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'Faltan tipo de operación o tipo de propiedad.',
      details: { field: 'operationType/propertyType' },
    })
  }
  if (!isNonEmptyText(mapped.title) || !isNonEmptyText(mapped.description)) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'Faltan datos mínimos de contenido (título o descripción).',
      details: { field: 'title/description' },
    })
  }

  const addr = mapped.address as Record<string, unknown> | null
  const hasLocality =
    addr != null &&
    (isNonEmptyText(addr.city) ||
      isNonEmptyText(addr.neighborhood) ||
      isNonEmptyText(addr.state))
  const hasGeo =
    mapped.locationLat != null &&
    mapped.locationLng != null &&
    Number.isFinite(mapped.locationLat) &&
    Number.isFinite(mapped.locationLng)
  if (!hasLocality && !hasGeo) {
    issues.push({
      code: 'INVALID_LOCATION',
      message: 'Falta ubicación mínima para publicar el aviso.',
      details: {},
    })
  }

  const primaryIssue: PublishabilityIssue | null = issues.length > 0 ? issues[0]! : null
  return { ok: issues.length === 0, issues, primaryIssue }
}

/** Tamaño mínimo del feed parseado para permitir retiros masivos cuando el baseline es grande (ver `LARGE_BASELINE` + `ABS_FLOOR`). */
function computeShrinkGuardMinFeedSize(baseline: number, fraction: number): number {
  const rel = Math.floor(baseline * fraction)
  const large = resolveWithdrawShrinkGuardLargeBaseline()
  const absFloor = resolveWithdrawShrinkGuardAbsFloor()
  if (baseline >= large) {
    return Math.max(rel, absFloor)
  }
  return rel
}

function sourceTimesMatch(
  dbVal: Date | string | null | undefined,
  feedVal: Date | null
): boolean {
  if (!feedVal) return false
  if (dbVal == null) return false
  const a = dbVal instanceof Date ? dbVal.getTime() : new Date(dbVal).getTime()
  return Number.isFinite(a) && a === feedVal.getTime()
}

function getIntervalMs(): number {
  const testMode =
    process.env.IMPORT_SYNC_TEST_MODE === 'true' ||
    process.env.IMPORT_SYNC_TEST_MODE === '1'

  if (testMode) {
    const daysRaw = parseInt(process.env.IMPORT_SYNC_TEST_INTERVAL_DAYS ?? '10', 10)
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 10
    return days * 24 * 60 * 60 * 1000
  }

  const raw = (process.env.IMPORT_SYNC_INTERVAL_HOURS ?? '1').trim()
  const hours = parseFloat(raw)
  /** `0` o negativo: cada invocación del cron/webhook puede correr (sin umbral temporal). */
  if (!Number.isFinite(hours) || hours <= 0) {
    return 0
  }
  const clamped = Math.max(1 / 60, hours)
  return clamped * 3600 * 1000
}

async function getOrCreateFeedSource(organizationId: string, feedUrl: string) {
  const [existing] = await db
    .select()
    .from(importFeedSources)
    .where(
      and(
        eq(importFeedSources.organizationId, organizationId),
        eq(importFeedSources.feedUrl, feedUrl)
      )
    )
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(importFeedSources)
    .values({ organizationId, feedUrl })
    .returning()

  if (!created) throw new Error('No se pudo crear import_feed_sources')
  return created
}

async function replaceListingMedia(listingId: string, urls: string[]) {
  await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId))
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (!url) continue
    await db.insert(listingMedia).values({
      listingId,
      type: 'image',
      url,
      order: i,
      isPrimary: i === 0,
    })
  }
}

function normalizeMappedAddress(address: unknown): unknown {
  if (typeof address !== 'string') return address
  const trimmed = address.trim()
  if (!trimmed) return address
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return address
    }
  }
  return address
}

export async function runYumblinImportSync(
  options: YumblinImportSyncOptions = {}
): Promise<YumblinImportSyncResult> {
  const ingestMode = resolveKitepropIngestMode()

  let feedUrl =
    options.feedUrl ??
    (options.rawData !== undefined ? 'file://default-import' : undefined) ??
    process.env.YUMBLIN_JSON_URL ??
    DEFAULT_FEED_URL

  if (ingestMode === 'api' && options.rawData === undefined) {
    feedUrl = buildKitepropPropertiesListUrl()
  }

  let organizationId = options.organizationId ?? process.env.IMPORT_ORGANIZATION_ID
  let publisherId = options.publisherId ?? process.env.IMPORT_PUBLISHER_ID

  if (!organizationId || !publisherId) {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    if (!org) {
      throw new Error('No hay organizaciones en la DB.')
    }
    organizationId = org.id

    const [membership] = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, org.id))
      .limit(1)

    if (!membership) {
      throw new Error('No hay miembros en la organización.')
    }
    publisherId = membership.userId
  }

  const enforceInterval = options.enforceInterval === true
  const source = await getOrCreateFeedSource(organizationId, feedUrl)
  const includeUnassigned = options.assumeUnassignedBelongsToThisSource === true
  const now = new Date()
  const ingestAsDraft = resolveIngestAsDraft()
  const importPublishSafeMode = resolveImportPublishSafeMode()
  const publishConfig = getListingPublishConfigFromEnv()
  const deactivatedListingIds: string[] = []

  if (enforceInterval && source.lastSuccessfulSyncAt) {
    const intervalMs = getIntervalMs()
    const elapsed = now.getTime() - source.lastSuccessfulSyncAt.getTime()
    if (intervalMs > 0 && elapsed < intervalMs) {
      return {
        feedUrl,
        organizationId,
        publisherId,
        skipped: 'interval',
        counts: {
          imported: 0,
          updated: 0,
          unchanged: 0,
          skippedInvalid: 0,
          skippedUnchangedBySourceTime: 0,
          withdrawn: 0,
        },
        withdrawnListingIds: [],
        deactivatedListingIds: [],
      }
    }
  }

  const withdrawOrgWide = resolveWithdrawOrgWideExplicit(options)
  const bypassSourceUpdatedAt =
    options.bypassSourceUpdatedAt === true ||
    (() => {
      const v = (process.env.IMPORT_BYPASS_SOURCE_UPDATED_AT ?? '').trim().toLowerCase()
      return v === '1' || v === 'true' || v === 'yes'
    })()

  let raw: unknown
  let etag: string | undefined
  let lastModified: string | undefined
  let bodySha256: string | undefined

  if (options.rawData !== undefined) {
    raw = options.rawData
    bodySha256 = sha256HexFromString(JSON.stringify(raw))
    if (
      source.lastBodySha256 &&
      bodySha256 === source.lastBodySha256 &&
      options.forceFullFetch !== true
    ) {
      await db
        .update(importFeedSources)
        .set({
          lastSuccessfulSyncAt: now,
          updatedAt: now,
        })
        .where(eq(importFeedSources.id, source.id))

      return {
        feedUrl,
        organizationId,
        publisherId,
        skipped: 'body_unchanged',
        counts: {
          imported: 0,
          updated: 0,
          unchanged: 0,
          skippedInvalid: 0,
          skippedUnchangedBySourceTime: 0,
          withdrawn: 0,
        },
        withdrawnListingIds: [],
        deactivatedListingIds: [],
      }
    }
  } else {
    const useApi = useKitepropPagedApiIngest(feedUrl, ingestMode, false)

    const fetchOpts =
      options.forceFullFetch === true
        ? {}
        : { etag: source.lastEtag, lastModified: source.lastModified }

    const fetched = useApi
      ? await fetchKitepropPropertiesAllPages(feedUrl)
      : await fetchYumblinFeedConditional(feedUrl, fetchOpts)

    if (fetched.kind === 'not_modified') {
      await db
        .update(importFeedSources)
        .set({
          lastSuccessfulSyncAt: now,
          updatedAt: now,
        })
        .where(eq(importFeedSources.id, source.id))

      return {
        feedUrl,
        organizationId,
        publisherId,
        skipped: 'not_modified_http',
        counts: {
          imported: 0,
          updated: 0,
          unchanged: 0,
          skippedInvalid: 0,
          skippedUnchangedBySourceTime: 0,
          withdrawn: 0,
        },
        withdrawnListingIds: [],
        deactivatedListingIds: [],
      }
    }

    if (fetched.kind !== 'ok') {
      throw new Error('Respuesta de feed inválida')
    }

    if (
      source.lastBodySha256 &&
      fetched.bodySha256 === source.lastBodySha256 &&
      options.forceFullFetch !== true
    ) {
      await db
        .update(importFeedSources)
        .set({
          lastSuccessfulSyncAt: now,
          updatedAt: now,
        })
        .where(eq(importFeedSources.id, source.id))

      return {
        feedUrl,
        organizationId,
        publisherId,
        skipped: 'body_unchanged',
        counts: {
          imported: 0,
          updated: 0,
          unchanged: 0,
          skippedInvalid: 0,
          skippedUnchangedBySourceTime: 0,
          withdrawn: 0,
        },
        withdrawnListingIds: [],
        deactivatedListingIds: [],
      }
    }

    raw = fetched.data
    etag = fetched.etag
    lastModified = fetched.lastModified
    bodySha256 = fetched.bodySha256
  }

  const fullFeed = extractListingsFromFeed(raw)
  const fullFeedLength = fullFeed.length
  let allItems = fullFeed
  const isPartialImport =
    options.limit != null && options.limit > 0
  if (isPartialImport) {
    allItems = allItems.slice(0, options.limit)
  }

  const input = { organizationId, publisherId }
  const counts = {
    imported: 0,
    updated: 0,
    unchanged: 0,
    skippedInvalid: 0,
    skippedUnchangedBySourceTime: 0,
    withdrawn: 0,
  }

  const feedExternalIds = new Set<string>()
  for (const item of allItems) {
    const ext = peekFeedExternalId(item as Record<string, unknown>)
    if (ext) feedExternalIds.add(ext)
  }
  const extIdsForQuery = [...feedExternalIds]

  const existingRows =
    extIdsForQuery.length > 0
      ? await db
          .select()
          .from(listings)
          .where(
            and(
              eq(listings.organizationId, organizationId),
                inArray(listings.externalId, extIdsForQuery),
                includeUnassigned
                  ? or(
                      eq(listings.importFeedSourceId, source.id),
                      isNull(listings.importFeedSourceId)
                    )
                  : eq(listings.importFeedSourceId, source.id)
            )
          )
      : []

  const byExternal = new Map<string, (typeof existingRows)[0]>()
  for (const row of existingRows) {
    if (row.externalId) byExternal.set(row.externalId, row)
  }

  for (const item of allItems) {
    const feedUpdated = parseFeedItemSourceUpdatedAt(item as Record<string, unknown>)
    const extEarly = peekFeedExternalId(item as Record<string, unknown>)
    if (extEarly && !bypassSourceUpdatedAt) {
      const rowEarly = byExternal.get(extEarly)
      if (rowEarly && sourceTimesMatch(rowEarly.importSourceUpdatedAt, feedUpdated)) {
        counts.skippedUnchangedBySourceTime++
        continue
      }
    }

    const mapped = mapYumblinItem(item as Record<string, unknown>, input)
    if (!mapped) {
      counts.skippedInvalid++
      continue
    }

    const hash = computeImportContentHash(mapped)
    const assessment = importPublishSafeMode
      ? assessMappedImportForSafeMode(mapped)
      : assessMappedImport(mapped, publishConfig)
    const pub = importPublicationSet(now, ingestAsDraft, assessment)

    if (!mapped.externalId) {
      const [inserted] = await db
        .insert(listings)
        .values({
          organizationId: mapped.organizationId,
          publisherId: mapped.publisherId,
          externalId: mapped.externalId,
          importFeedSourceId: source.id,
          importContentHash: hash,
          importSourceUpdatedAt: feedUpdated ?? null,
          propertyType: mapped.propertyType,
          operationType: mapped.operationType,
          source: 'import',
          address: normalizeMappedAddress(mapped.address),
          title: mapped.title,
          description: mapped.description,
          priceAmount: mapped.priceAmount,
          priceCurrency: mapped.priceCurrency,
          surfaceTotal: mapped.surfaceTotal,
          surfaceCovered: mapped.surfaceCovered ?? null,
          surfaceSemicovered: mapped.surfaceSemicovered ?? null,
          surfaceLand: mapped.surfaceLand ?? null,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          garages: mapped.garages ?? null,
          totalRooms: mapped.totalRooms ?? null,
          locationLat: mapped.locationLat,
          locationLng: mapped.locationLng,
          primaryImageUrl: mapped.primaryImageUrl,
          mediaCount: mapped.imageUrls.length,
          features: mapped.features ?? { amenities: mapped.amenities ?? [] },
          status: pub.status,
          publishedAt: pub.publishedAt,
          lastValidatedAt: pub.lastValidatedAt,
          expiresAt: pub.expiresAt,
          lastContentUpdatedAt: pub.lastContentUpdatedAt,
        })
        .returning()

      if (inserted && mapped.imageUrls.length > 0) {
        await replaceListingMedia(inserted.id, mapped.imageUrls)
      }
      if (inserted && !ingestAsDraft && !assessment.ok) {
        const primary = assessment.primaryIssue
        if (primary) {
          await recordListingTransitionForKiteprop({
            listingId: inserted.id,
            externalId: mapped.externalId,
            previousStatus: LIFECYCLE_PREVIOUS_UNLISTED,
            newStatus: 'rejected',
            source: 'sync',
            reasonCode: primary.code,
            reasonMessage: primary.message,
            details: {
              issues: assessment.issues.map((i) => ({
                code: i.code,
                message: i.message,
                details: i.details,
              })),
            },
          })
        }
      }
      counts.imported++
      continue
    }

    const existing = byExternal.get(mapped.externalId)
    if (!existing) {
      const [inserted] = await db
        .insert(listings)
        .values({
          organizationId: mapped.organizationId,
          publisherId: mapped.publisherId,
          externalId: mapped.externalId,
          importFeedSourceId: source.id,
          importContentHash: hash,
          importSourceUpdatedAt: feedUpdated ?? null,
          propertyType: mapped.propertyType,
          operationType: mapped.operationType,
          source: 'import',
          address: normalizeMappedAddress(mapped.address),
          title: mapped.title,
          description: mapped.description,
          priceAmount: mapped.priceAmount,
          priceCurrency: mapped.priceCurrency,
          surfaceTotal: mapped.surfaceTotal,
          surfaceCovered: mapped.surfaceCovered ?? null,
          surfaceSemicovered: mapped.surfaceSemicovered ?? null,
          surfaceLand: mapped.surfaceLand ?? null,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          garages: mapped.garages ?? null,
          totalRooms: mapped.totalRooms ?? null,
          locationLat: mapped.locationLat,
          locationLng: mapped.locationLng,
          primaryImageUrl: mapped.primaryImageUrl,
          mediaCount: mapped.imageUrls.length,
          features: mapped.features ?? { amenities: mapped.amenities ?? [] },
          status: pub.status,
          publishedAt: pub.publishedAt,
          lastValidatedAt: pub.lastValidatedAt,
          expiresAt: pub.expiresAt,
          lastContentUpdatedAt: pub.lastContentUpdatedAt,
        })
        .returning()

      if (inserted) {
        if (mapped.externalId) byExternal.set(mapped.externalId, inserted)
        if (mapped.imageUrls.length > 0) {
          await replaceListingMedia(inserted.id, mapped.imageUrls)
        }
        if (!ingestAsDraft && !assessment.ok) {
          const primary = assessment.primaryIssue
          if (primary) {
            await recordListingTransitionForKiteprop({
              listingId: inserted.id,
              externalId: mapped.externalId,
              previousStatus: LIFECYCLE_PREVIOUS_UNLISTED,
              newStatus: 'rejected',
              source: 'sync',
              reasonCode: primary.code,
              reasonMessage: primary.message,
              details: {
                issues: assessment.issues.map((i) => ({
                  code: i.code,
                  message: i.message,
                  details: i.details,
                })),
              },
            })
          }
        }
      }
      counts.imported++
      continue
    }

    if (existing.importContentHash === hash) {
      const sourceTimeChanged =
        feedUpdated != null &&
        !sourceTimesMatch(existing.importSourceUpdatedAt, feedUpdated)
      if (sourceTimeChanged) {
        await db
          .update(listings)
          .set({ importSourceUpdatedAt: feedUpdated, updatedAt: now })
          .where(eq(listings.id, existing.id))
        await replaceListingMedia(existing.id, mapped.imageUrls)
        byExternal.set(mapped.externalId, {
          ...existing,
          importSourceUpdatedAt: feedUpdated,
          importContentHash: hash,
          updatedAt: now,
        })
        counts.updated++
      } else {
        counts.unchanged++
      }
      continue
    }

    const wasLive =
      existing.status === 'active' || existing.status === 'expiring_soon'

    const baseUpdate = {
      publisherId: mapped.publisherId,
      importFeedSourceId: source.id,
      importContentHash: hash,
      importSourceUpdatedAt: feedUpdated ?? null,
      propertyType: mapped.propertyType,
      operationType: mapped.operationType,
      address: normalizeMappedAddress(mapped.address),
      title: mapped.title,
      description: mapped.description,
      priceAmount: mapped.priceAmount,
      priceCurrency: mapped.priceCurrency,
      surfaceTotal: mapped.surfaceTotal,
      surfaceCovered: mapped.surfaceCovered ?? null,
      surfaceSemicovered: mapped.surfaceSemicovered ?? null,
      surfaceLand: mapped.surfaceLand ?? null,
      bedrooms: mapped.bedrooms,
      bathrooms: mapped.bathrooms,
      garages: mapped.garages ?? null,
      totalRooms: mapped.totalRooms ?? null,
      locationLat: mapped.locationLat,
      locationLng: mapped.locationLng,
      primaryImageUrl: mapped.primaryImageUrl,
      mediaCount: mapped.imageUrls.length,
      features: mapped.features ?? { amenities: mapped.amenities ?? [] },
      updatedAt: now,
    }

    if (wasLive && !assessment.ok) {
      await db
        .update(listings)
        .set({
          ...baseUpdate,
          status: 'draft',
          publishedAt: null,
          lastValidatedAt: null,
          expiresAt: null,
          lastContentUpdatedAt: null,
        })
        .where(eq(listings.id, existing.id))
      deactivatedListingIds.push(existing.id)
      const primary = assessment.primaryIssue
      if (primary) {
        await recordListingTransitionForKiteprop({
          listingId: existing.id,
          externalId: mapped.externalId,
          previousStatus: existing.status,
          newStatus: 'draft',
          source: 'sync',
          reasonCode: primary.code,
          reasonMessage: primary.message,
          details: {
            issues: assessment.issues.map((i) => ({
              code: i.code,
              message: i.message,
              details: i.details,
            })),
          },
        })
      }
    } else if (wasLive && assessment.ok) {
      await db
        .update(listings)
        .set({
          ...baseUpdate,
          lastContentUpdatedAt: now,
        })
        .where(eq(listings.id, existing.id))
    } else {
      await db
        .update(listings)
        .set({
          ...baseUpdate,
          status: pub.status,
          publishedAt: pub.publishedAt,
          lastValidatedAt: pub.lastValidatedAt,
          expiresAt: pub.expiresAt,
          lastContentUpdatedAt: pub.lastContentUpdatedAt,
        })
        .where(eq(listings.id, existing.id))

      if (!ingestAsDraft && !assessment.ok && pub.status === 'rejected') {
        const primary = assessment.primaryIssue
        if (primary) {
          await recordListingTransitionForKiteprop({
            listingId: existing.id,
            externalId: mapped.externalId,
            previousStatus: existing.status,
            newStatus: 'rejected',
            source: 'sync',
            reasonCode: primary.code,
            reasonMessage: primary.message,
            details: {
              issues: assessment.issues.map((i) => ({
                code: i.code,
                message: i.message,
                details: i.details,
              })),
            },
          })
        }
      }
    }

    await replaceListingMedia(existing.id, mapped.imageUrls)
    byExternal.set(mapped.externalId, {
      ...existing,
      importContentHash: hash,
      importSourceUpdatedAt: feedUpdated ?? existing.importSourceUpdatedAt,
      updatedAt: now,
    })
    counts.updated++
  }

  let withdrawnListingIds: string[] = []
  let withdrawSkippedDueToShrinkGuard = false
  let withdrawSkippedDueToCronPolicy = false
  let withdrawSkippedDueToPolicy = false
  let shrinkGuardDetails: YumblinImportSyncResult['shrinkGuardDetails']

  if (!isPartialImport && fullFeedLength > 0 && feedExternalIds.size > 0) {
    const fraction = resolveWithdrawShrinkGuardFraction()
    const minBaseline = resolveWithdrawShrinkGuardMinBaseline()
    let runWithdraw = true

    if (resolveWithdrawDisabled()) {
      runWithdraw = false
      withdrawSkippedDueToPolicy = true
    } else if (resolveCronSkipWithdraw() && enforceInterval) {
      runWithdraw = false
      withdrawSkippedDueToCronPolicy = true
    } else if (!resolveWithdrawShrinkGuardDisabled()) {
      const [importCountRow] = await db
        .select({ n: count() })
        .from(listings)
        .where(
          and(
            eq(listings.organizationId, organizationId),
            eq(listings.source, 'import'),
            isNotNull(listings.externalId)
          )
        )
      const dbImportTotal = Number(importCountRow?.n ?? 0)
      const baseline = Math.max(source.lastTrustedFullFeedItemCount ?? 0, dbImportTotal)
      const guardApplies = baseline >= minBaseline
      const threshold = computeShrinkGuardMinFeedSize(baseline, fraction)
      const minFeedForInvalid = resolveWithdrawInvalidRatioMinFeed()
      const maxInvalidRatio = resolveWithdrawInvalidRatioMax()
      const invalidRatioSuspicious =
        fullFeedLength >= minFeedForInvalid &&
        counts.skippedInvalid > fullFeedLength * maxInvalidRatio

      if (invalidRatioSuspicious) {
        runWithdraw = false
        withdrawSkippedDueToShrinkGuard = true
        shrinkGuardDetails = {
          baseline,
          threshold,
          feedItemCount: fullFeedLength,
          fraction: maxInvalidRatio,
          reason: 'invalid_ratio',
          skippedInvalid: counts.skippedInvalid,
        }
      } else if (guardApplies && fullFeedLength < threshold) {
        runWithdraw = false
        withdrawSkippedDueToShrinkGuard = true
        shrinkGuardDetails = {
          baseline,
          threshold,
          feedItemCount: fullFeedLength,
          fraction,
          reason: 'feed_size',
        }
      }
    }

    if (runWithdraw) {
      const idList = [...feedExternalIds]
      const sourceScope =
        withdrawOrgWide
          ? null
          : includeUnassigned
            ? or(
                eq(listings.importFeedSourceId, source.id),
                isNull(listings.importFeedSourceId)
              )
            : eq(listings.importFeedSourceId, source.id)

      const toWithdraw = await db
        .select({
          id: listings.id,
          externalId: listings.externalId,
          status: listings.status,
        })
        .from(listings)
        .where(
          and(
            eq(listings.organizationId, organizationId),
            eq(listings.source, 'import'),
            isNotNull(listings.externalId),
            notInArray(listings.externalId, idList),
            ne(listings.status, 'withdrawn'),
            ...(sourceScope ? [sourceScope] : [])
          )
        )

      if (toWithdraw.length > 0) {
        const [importCountRowForCap] = await db
          .select({ n: count() })
          .from(listings)
          .where(
            and(
              eq(listings.organizationId, organizationId),
              eq(listings.source, 'import'),
              isNotNull(listings.externalId)
            )
          )
        const importBaseline = Number(importCountRowForCap?.n ?? 0)
        const maxWithdrawAllowed = Math.floor(
          importBaseline * resolveWithdrawMaxPercentOfCatalog()
        )
        if (importBaseline > 0 && toWithdraw.length > maxWithdrawAllowed) {
          withdrawSkippedDueToPolicy = true
        } else {
          withdrawnListingIds = toWithdraw.map((r) => r.id)
          for (const row of toWithdraw) {
            await recordListingTransitionForKiteprop({
              listingId: row.id,
              externalId: row.externalId,
              previousStatus: row.status,
              newStatus: 'withdrawn',
              source: 'import_withdraw',
              reasonCode: 'IMPORT_FEED_WITHDRAWN',
              reasonMessage: LISTING_REASON_MESSAGES_ES.IMPORT_FEED_WITHDRAWN,
              details: {},
            })
          }
          await db
            .update(listings)
            .set({ status: 'withdrawn', updatedAt: now })
            .where(inArray(listings.id, withdrawnListingIds))
          counts.withdrawn = toWithdraw.length
        }
      }
    }
  }

  /**
   * Promoción controlada: solo borradores import que pasan validación de publicabilidad.
   */
  if (!ingestAsDraft) {
    const promoteScope = includeUnassigned
      ? or(eq(listings.importFeedSourceId, source.id), isNull(listings.importFeedSourceId))
      : eq(listings.importFeedSourceId, source.id)

    const expiresAtBulk = new Date(
      now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    )

    const promoteBase = and(
      eq(listings.organizationId, organizationId),
      eq(listings.source, 'import'),
      eq(listings.status, 'draft'),
      promoteScope
    )

    const partialFilter =
      isPartialImport && extIdsForQuery.length > 0
        ? inArray(listings.externalId, extIdsForQuery)
        : undefined

    const draftCandidates = await db
      .select()
      .from(listings)
      .where(partialFilter ? and(promoteBase, partialFilter) : promoteBase)

    for (const row of draftCandidates) {
      const rowAssessment = assessListingPublishability(
        listingRowToPublishabilityInput(
          {
            operationType: row.operationType,
            propertyType: row.propertyType,
            priceAmount: row.priceAmount,
            priceCurrency: row.priceCurrency,
            title: row.title,
            description: row.description,
            address: row.address,
          },
          row.mediaCount,
          publishConfig
        )
      )
      if (!rowAssessment.ok) continue

      await db
        .update(listings)
        .set({
          status: 'active',
          publishedAt: now,
          lastValidatedAt: now,
          expiresAt: expiresAtBulk,
          lastContentUpdatedAt: now,
          updatedAt: now,
        })
        .where(eq(listings.id, row.id))
    }
  }

  const trustedFeedSnapshot =
    !isPartialImport &&
    !withdrawSkippedDueToShrinkGuard &&
    fullFeedLength > 0 &&
    feedExternalIds.size > 0

  await db
    .update(importFeedSources)
    .set({
      lastEtag: etag ?? source.lastEtag,
      lastModified: lastModified ?? source.lastModified,
      lastBodySha256: bodySha256 ?? source.lastBodySha256,
      lastSuccessfulSyncAt: now,
      updatedAt: now,
      ...(trustedFeedSnapshot ? { lastTrustedFullFeedItemCount: fullFeedLength } : {}),
    })
    .where(eq(importFeedSources.id, source.id))

  return {
    feedUrl,
    organizationId,
    publisherId,
    skipped: false,
    counts,
    withdrawnListingIds,
    deactivatedListingIds,
    ...(withdrawSkippedDueToShrinkGuard
      ? { withdrawSkippedDueToShrinkGuard: true, shrinkGuardDetails }
      : {}),
    ...(withdrawSkippedDueToPolicy ? { withdrawSkippedDueToPolicy: true } : {}),
    ...(withdrawSkippedDueToCronPolicy ? { withdrawSkippedDueToCronPolicy: true } : {}),
  }
}

export interface YumblinImportSyncAllSourcesOptions {
  enforceInterval?: boolean
  /** Igual que en `runYumblinImportSync`; también `IMPORT_FORCE_FULL_FETCH=1`. */
  forceFullFetch?: boolean
  /** Igual que en `runYumblinImportSync`; también `IMPORT_BYPASS_SOURCE_UPDATED_AT=1`. */
  bypassSourceUpdatedAt?: boolean
  /**
   * Si se pasa, se usa como lista de URLs a sincronizar (en lugar de la env).
   * Si está vacío/undefined, se combinan:
   * - YUMBLIN_JSON_URLS (comma-separated)
   * - registros existentes en import_feed_sources
   * - fallback al YUMBLIN_JSON_URL o DEFAULT_FEED_URL
   */
  feedUrls?: string[]
}

export async function runYumblinImportSyncAllSources(
  options: YumblinImportSyncAllSourcesOptions = {}
): Promise<{
  results: YumblinImportSyncResult[]
}> {
  const ingestMode = resolveKitepropIngestMode()

  let organizationId =
    process.env.IMPORT_ORGANIZATION_ID ??
    (undefined as unknown as string | undefined)
  let publisherId =
    process.env.IMPORT_PUBLISHER_ID ??
    (undefined as unknown as string | undefined)

  // Resolución perezosa para no duplicar lógica: reutilizamos el caso “sin env”
  if (!organizationId || !publisherId) {
    const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1)
    if (!org) throw new Error('No hay organizaciones en la DB.')
    organizationId = org.id

    const [membership] = await db
      .select({ userId: organizationMemberships.userId })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, org.id))
      .limit(1)
    if (!membership) throw new Error('No hay miembros en la organización.')
    publisherId = membership.userId
  }

  const envUrls = (process.env.YUMBLIN_JSON_URLS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const feedUrlsFromDb = await db
    .select({ feedUrl: importFeedSources.feedUrl })
    .from(importFeedSources)
    .where(eq(importFeedSources.organizationId, organizationId))

  const candidates = [
    ...(options.feedUrls ?? []),
    ...envUrls,
    ...feedUrlsFromDb.map((r) => r.feedUrl),
  ]

  let feedUrlsUnique = [...new Set(candidates)]

  if (ingestMode === 'api') {
    feedUrlsUnique = [buildKitepropPropertiesListUrl()]
  } else if (ingestMode === 'both') {
    const canon = buildKitepropPropertiesListUrl()
    feedUrlsUnique = [...new Set([canon, ...feedUrlsUnique])]
  }

  const fallbackDefault =
    ingestMode === 'api'
      ? buildKitepropPropertiesListUrl()
      : process.env.YUMBLIN_JSON_URL ?? DEFAULT_FEED_URL

  const finalFeedUrls = feedUrlsUnique.length > 0 ? feedUrlsUnique : [fallbackDefault]

  const envForceFull = (() => {
    const v = (process.env.IMPORT_FORCE_FULL_FETCH ?? '').trim().toLowerCase()
    return v === '1' || v === 'true' || v === 'yes'
  })()
  const envBypassSource = (() => {
    const v = (process.env.IMPORT_BYPASS_SOURCE_UPDATED_AT ?? '').trim().toLowerCase()
    return v === '1' || v === 'true' || v === 'yes'
  })()

  const results: YumblinImportSyncResult[] = []
  for (const feedUrl of finalFeedUrls) {
    const r = await runYumblinImportSync({
      feedUrl,
      organizationId,
      publisherId,
      enforceInterval: options.enforceInterval ?? true,
      forceFullFetch: options.forceFullFetch ?? envForceFull,
      bypassSourceUpdatedAt: options.bypassSourceUpdatedAt ?? envBypassSource,
      assumeUnassignedBelongsToThisSource: finalFeedUrls.length === 1,
      withdrawOrgWide:
        finalFeedUrls.length === 1 && resolveWithdrawOrgWideExplicit({}),
    })
    results.push(r)
  }

  return { results }
}
