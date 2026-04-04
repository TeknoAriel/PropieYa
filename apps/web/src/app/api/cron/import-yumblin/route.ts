/**
 * Cron: sincroniza propiedades desde feed JSON Kiteprop (Properstar / Yumblin).
 * - HTTP condicional (ETag / 304) y hash del body para evitar trabajo si no hubo cambios.
 * - Por ítem: `import_source_updated_at` vs `last_update` del feed para saltar map+DB si no cambió.
 * - Si cambia solo la marca temporal de origen, se refrescan igualmente las imágenes (política doc 48).
 * - Altas, actualizaciones (hash por ítem) y bajas (withdrawn si ya no está en el feed; scope `IMPORT_WITHDRAW_SCOPE`).
 * - Tras bajas: elimina documentos en Elasticsearch (`removeListingFromSearch`).
 *
 * Cadencia: ingesta principal **a pedido** (webhook §48). En `vercel.json` hay cron de
 * respaldo ~cada 15 días (`0 6 1,16 * *`, UTC). Entre ejecuciones: `IMPORT_SYNC_INTERVAL_HOURS`
 * (`0` = sin mínimo; admite decimales, p. ej. `0.5` = 30 min).
 *
 * Ingesta puntual sin intervalo: POST `/api/webhooks/kiteprop-ingest` (Bearer secret).
 *
 * Requiere: CRON_SECRET (header Authorization: Bearer <secret>) si está definido.
 */

import { NextResponse, type NextRequest } from 'next/server'

import { runYumblinImportPipeline } from '@/lib/cron/run-yumblin-import-pipeline'

export const runtime = 'nodejs'
/** Sync masivo: Vercel Pro permite hasta 300s; ajustar según plan. */
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const enforceInterval =
    process.env.IMPORT_SYNC_ENFORCE_INTERVAL !== 'false'

  try {
    const result = await runYumblinImportPipeline({ enforceInterval })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Cron import-yumblin:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
