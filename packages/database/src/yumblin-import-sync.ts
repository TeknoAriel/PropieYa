import {
  computeImportContentHash,
  extractListingsFromFeed,
  fetchYumblinFeedConditional,
  mapYumblinItem,
  parseFeedItemSourceUpdatedAt,
  peekFeedExternalId,
  sha256HexFromString,
} from '@propieya/shared'
import { and, eq, inArray, isNull, isNotNull, ne, notInArray, or } from 'drizzle-orm'

import { db } from './client'
import {
  importFeedSources,
  listingMedia,
  listings,
  organizationMemberships,
  organizations,
} from './schema'

const DEFAULT_FEED_URL =
  'https://static.kiteprop.com/kp/difusions/f89cbd8ca785fc34317df63d29ab8ea9d68a7b1c/properstar.json'

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
}

function resolveWithdrawOrgWideExplicit(options: YumblinImportSyncOptions): boolean {
  if (options.withdrawOrgWide !== undefined) return options.withdrawOrgWide
  const s = (process.env.IMPORT_WITHDRAW_SCOPE ?? 'org').toLowerCase().trim()
  return s !== 'source' && s !== 'feed'
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

export async function runYumblinImportSync(
  options: YumblinImportSyncOptions = {}
): Promise<YumblinImportSyncResult> {
  const feedUrl =
    options.feedUrl ??
    (options.rawData !== undefined ? 'file://default-import' : undefined) ??
    process.env.YUMBLIN_JSON_URL ??
    DEFAULT_FEED_URL

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
      }
    }
  }

  const withdrawOrgWide = resolveWithdrawOrgWideExplicit(options)

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
      }
    }
  } else {
    const fetchOpts =
      options.forceFullFetch === true
        ? {}
        : { etag: source.lastEtag, lastModified: source.lastModified }

    const fetched = await fetchYumblinFeedConditional(feedUrl, fetchOpts)

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
    if (extEarly) {
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
          address: mapped.address,
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
          status: 'draft',
        })
        .returning()

      if (inserted && mapped.imageUrls.length > 0) {
        await replaceListingMedia(inserted.id, mapped.imageUrls)
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
          address: mapped.address,
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
          status: 'draft',
        })
        .returning()

      if (inserted) {
        if (mapped.externalId) byExternal.set(mapped.externalId, inserted)
        if (mapped.imageUrls.length > 0) {
          await replaceListingMedia(inserted.id, mapped.imageUrls)
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

    await db
      .update(listings)
      .set({
        publisherId: mapped.publisherId,
        importFeedSourceId: source.id,
        importContentHash: hash,
        importSourceUpdatedAt: feedUpdated ?? null,
        propertyType: mapped.propertyType,
        operationType: mapped.operationType,
        address: mapped.address,
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
      })
      .where(eq(listings.id, existing.id))

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

  if (!isPartialImport && fullFeedLength > 0 && feedExternalIds.size > 0) {
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
      .select({ id: listings.id })
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
      withdrawnListingIds = toWithdraw.map((r) => r.id)
      await db
        .update(listings)
        .set({ status: 'withdrawn', updatedAt: now })
        .where(inArray(listings.id, withdrawnListingIds))
      counts.withdrawn = toWithdraw.length
    }
  }

  await db
    .update(importFeedSources)
    .set({
      lastEtag: etag ?? source.lastEtag,
      lastModified: lastModified ?? source.lastModified,
      lastBodySha256: bodySha256 ?? source.lastBodySha256,
      lastSuccessfulSyncAt: now,
      updatedAt: now,
    })
    .where(eq(importFeedSources.id, source.id))

  return {
    feedUrl,
    organizationId,
    publisherId,
    skipped: false,
    counts,
    withdrawnListingIds,
  }
}

export interface YumblinImportSyncAllSourcesOptions {
  enforceInterval?: boolean
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

  const feedUrlsUnique = [...new Set(candidates)]

  const fallbackDefault =
    process.env.YUMBLIN_JSON_URL ?? DEFAULT_FEED_URL

  const finalFeedUrls = feedUrlsUnique.length > 0 ? feedUrlsUnique : [fallbackDefault]

  const results: YumblinImportSyncResult[] = []
  for (const feedUrl of finalFeedUrls) {
    const r = await runYumblinImportSync({
      feedUrl,
      organizationId,
      publisherId,
      enforceInterval: options.enforceInterval ?? true,
      assumeUnassignedBelongsToThisSource: finalFeedUrls.length === 1,
      withdrawOrgWide:
        finalFeedUrls.length === 1 && resolveWithdrawOrgWideExplicit({}),
    })
    results.push(r)
  }

  return { results }
}
