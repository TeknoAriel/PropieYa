import { NextResponse } from 'next/server'

import { getPublicInventoryStats } from '@/lib/inventory-stats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Totales de inventario en DB (manual vs import) y puntero al cron de ingest.
 * Público: solo agregados, sin listados ni PII.
 */
export async function GET() {
  try {
    const stats = await getPublicInventoryStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[inventory-stats]', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'No se pudieron calcular los totales',
      },
      { status: 500 }
    )
  }
}
