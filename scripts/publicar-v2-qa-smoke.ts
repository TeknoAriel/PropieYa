/**
 * QA smoke Publicar v2 (backend, sin UI).
 * Requiere: Postgres en localhost:5433 + MinIO (docker compose) y apps/web/.env.
 * Uso: pnpm exec tsx scripts/publicar-v2-qa-smoke.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { and, desc, eq } from 'drizzle-orm'

import {
  db,
  listingMedia,
  listings,
  organizationMemberships,
  organizations,
  users,
} from '@propieya/database'
import {
  assessListingPublishability,
  getListingPublishConfigFromEnv,
  listingRowToPublishabilityInput,
  LISTING_VALIDITY,
} from '@propieya/shared'

config({ path: resolve(__dirname, '../apps/web/.env') })

const MARKER = `QA-PUBLICAR-V2-${new Date().toISOString().slice(0, 10)}`

function log(step: string, detail?: string) {
  console.log(detail ? `[${step}] ${detail}` : `[${step}]`)
}

function s3Ok(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
  )
}

function s3ForcePathStyle(): boolean {
  if (process.env.S3_FORCE_PATH_STYLE === '1') return true
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? ''
  return /localhost|127\.0\.0\.1/.test(endpoint)
}

async function findPublisher(): Promise<{ userId: string; orgId: string; email: string }> {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      orgId: organizations.id,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(organizationMemberships.userId, users.id))
    .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMemberships.isActive, true),
        eq(organizations.status, 'active'),
        eq(users.isActive, true)
      )
    )
    .limit(1)

  const row = rows[0]
  if (!row) throw new Error('No hay usuario publicador activo en DB')
  return { userId: row.userId, orgId: row.orgId, email: row.email }
}

async function uploadTestImage(listingId: string, isPrimary: boolean): Promise<string> {
  if (!s3Ok()) throw new Error('S3 no configurado')

  const key = `listings/${listingId}/${randomUUID()}-qa.png`
  const contentType = 'image/png'
  const client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    ...(process.env.S3_ENDPOINT
      ? {
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: s3ForcePathStyle(),
        }
      : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  })
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  )
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: png1x1,
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) throw new Error(`PUT S3 falló: ${res.status}`)

  const base = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '')
  if (!base) throw new Error('S3_PUBLIC_URL no configurada')
  const fileUrl = `${base}/${key.replace(/^\//, '')}`

  const existingMedia = await db.query.listingMedia.findMany({
    where: eq(listingMedia.listingId, listingId),
  })
  if (isPrimary) {
    await db
      .update(listingMedia)
      .set({ isPrimary: false })
      .where(eq(listingMedia.listingId, listingId))
  }
  await db.insert(listingMedia).values({
    listingId,
    type: 'image',
    url: fileUrl,
    order: existingMedia.length,
    isPrimary,
    alt: null,
  })
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1)
  await db
    .update(listings)
    .set({
      primaryImageUrl: isPrimary ? fileUrl : listing?.primaryImageUrl ?? fileUrl,
      mediaCount: (listing?.mediaCount ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId))

  return fileUrl
}

async function reorderMedia(listingId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(listingMedia)
        .set({ order: i })
        .where(and(eq(listingMedia.id, orderedIds[i]!), eq(listingMedia.listingId, listingId)))
    }
  })
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL ausente')
    process.exit(1)
  }

  const pub = await findPublisher()
  log('publisher', pub.email)

  const title = `${MARKER} Depto QA`
  const description =
    'Prueba técnica Publicar v2. Ignorar comercialmente. Texto largo para validar publicación con mínimo de cincuenta caracteres en Propieya.'

  const [created] = await db
    .insert(listings)
    .values({
      organizationId: pub.orgId,
      publisherId: pub.userId,
      propertyType: 'apartment',
      operationType: 'sale',
      status: 'draft',
      source: 'manual',
      address: {
        street: 'Av. QA',
        number: '100',
        floor: null,
        unit: null,
        neighborhood: 'Palermo',
        city: 'Buenos Aires',
        state: 'Buenos Aires',
        country: 'Argentina',
        postalCode: null,
      },
      hideExactAddress: true,
      title,
      description,
      priceAmount: 185000,
      priceCurrency: 'USD',
      showPrice: true,
      expenses: null,
      surfaceTotal: 100,
      surfaceCovered: 85,
      bedrooms: 2,
      bathrooms: 1,
      garages: 1,
      totalRooms: 3,
      features: { amenities: ['pool'], extras: {} },
      updatedAt: new Date(),
    })
    .returning({ id: listings.id })

  if (!created) throw new Error('create failed')
  log('create', `OK ${created.id}`)

  await uploadTestImage(created.id, true)
  await uploadTestImage(created.id, false)
  await uploadTestImage(created.id, false)
  log('media', 'OK x3')

  let mediaRows = await db.query.listingMedia.findMany({
    where: eq(listingMedia.listingId, created.id),
    orderBy: [desc(listingMedia.isPrimary), listingMedia.order],
  })
  await reorderMedia(created.id, [...mediaRows].reverse().map((m) => m.id))
  log('reorder', 'OK')

  mediaRows = await db.query.listingMedia.findMany({
    where: eq(listingMedia.listingId, created.id),
  })
  const [row] = await db.select().from(listings).where(eq(listings.id, created.id)).limit(1)
  const assessment = assessListingPublishability(
    listingRowToPublishabilityInput(
      {
        operationType: row!.operationType,
        propertyType: row!.propertyType,
        priceAmount: row!.priceAmount,
        priceCurrency: row!.priceCurrency,
        title: row!.title,
        description: row!.description,
        address: row!.address as { city?: string; state?: string; neighborhood?: string },
      },
      mediaRows.length,
      getListingPublishConfigFromEnv()
    )
  )
  if (!assessment.ok) {
    log('publish', `BLOCKED ${assessment.primaryIssue?.code}`)
    process.exit(3)
  }

  const now = new Date()
  await db
    .update(listings)
    .set({
      status: 'active',
      publishedAt: now,
      lastValidatedAt: now,
      expiresAt: new Date(now.getTime() + LISTING_VALIDITY.MANUAL_VALIDITY_DAYS * 86400000),
      lastContentUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(listings.id, created.id))

  log('publish', 'OK active')
  console.log('listingId:', created.id)
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
