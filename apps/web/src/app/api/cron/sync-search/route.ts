/**
 * Cron: sincroniza listings activos al índice de búsqueda (Elasticsearch u OpenSearch/Bonsai).
 * Crea índice si no existe, hace bulk index de activos.
 *
 * Requiere: CRON_SECRET
 */

import { NextResponse, type NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { db, listings } from '@propieya/database'
import {
  ensureIndex,
  bulkIndexListings,
  type ListingRow,
} from '@/lib/search'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ok = await ensureIndex()
    if (!ok) {
      return NextResponse.json(
        { error: 'Motor de búsqueda no configurado o no disponible (ES/OpenSearch)' },
        { status: 503 }
      )
    }

    const rows = await db
      .select()
      .from(listings)
      .where(eq(listings.status, 'active'))

    const docs: ListingRow[] = rows.map((r) => {
      const features = (r.features ?? {}) as {
        amenities?: string[]
        floor?: number | null
        totalFloors?: number | null
        escalera?: string | null
        orientation?: string | null
      }
      return {
        id: r.id,
        organizationId: r.organizationId,
        publisherId: r.publisherId,
        propertyType: r.propertyType,
        operationType: r.operationType,
        status: r.status,
        title: r.title,
        description: r.description,
        address: r.address,
        locationLat: r.locationLat,
        locationLng: r.locationLng,
        priceAmount: r.priceAmount ?? 0,
        priceCurrency: r.priceCurrency ?? 'USD',
        surfaceTotal: r.surfaceTotal ?? 0,
        surfaceCovered: r.surfaceCovered ?? null,
        surfaceSemicovered: r.surfaceSemicovered ?? null,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        garages: r.garages ?? null,
        totalRooms: r.totalRooms ?? null,
        floor: features.floor ?? null,
        totalFloors: features.totalFloors ?? null,
        escalera: features.escalera ?? null,
        orientation: features.orientation ?? null,
        primaryImageUrl: r.primaryImageUrl,
        publishedAt: r.publishedAt,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
        amenities: features.amenities ?? [],
      }
    })

    const { indexed, errors } = await bulkIndexListings(docs)

    return NextResponse.json({
      total: docs.length,
      indexed,
      errors,
    })
  } catch (err) {
    console.error('Cron sync-search:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
