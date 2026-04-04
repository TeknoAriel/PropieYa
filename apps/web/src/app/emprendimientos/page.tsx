import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@propieya/ui'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Emprendimientos',
  description:
    'Emprendimientos inmobiliarios en Propieya: en preparación, con el mismo estándar de claridad que venta y alquiler.',
}

export default function EmprendimientosPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Emprendimientos</h1>
        <p className="leading-relaxed text-text-secondary">
          Hoy el foco del portal está en propiedades en venta y alquiler con mapa, filtros y matching
          explicado. La sección de emprendimientos la sumamos cuando el inventario y las fichas
          estén listos para ofrecer la misma claridad y confianza.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link href="/venta">Ver venta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/alquiler">Ver alquiler</Link>
          </Button>
        </div>
      </article>
    </MarketingShell>
  )
}
