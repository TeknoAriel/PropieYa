/**
 * Cron: sincroniza listings activos al índice de búsqueda (Elasticsearch u OpenSearch/Bonsai).
 * Crea índice si no existe, hace bulk index de activos.
 *
 * Requiere: CRON_SECRET
 */

import { NextResponse, type NextRequest } from 'next/server'

import { heartbeatImportCatalogValidity } from '@propieya/database'

import { reindexActiveListings } from '@/lib/search/reindex-active-listings'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const importValidity = await heartbeatImportCatalogValidity()
    const result = await reindexActiveListings()
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            'Motor de búsqueda no configurado o no disponible (ES/OpenSearch)',
          importValidity,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      total: result.total,
      indexed: result.indexed,
      errors: result.errors,
      importValidity,
    })
  } catch (err) {
    console.error('Cron sync-search:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
