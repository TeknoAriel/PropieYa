import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@propieya/ui'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Inversiones',
  description:
    'Propiedades en venta para inversión o vivienda en Propieya: buscador con mapa, filtros y resultados claros.',
}

export default function InversionesPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Inversiones</h1>
        <p className="leading-relaxed text-text-secondary">
          Explorá propiedades en venta con el mismo criterio técnico del portal: mapa, filtros y
          resultados ordenados para comparar con tranquilidad.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/venta">Ver propiedades en venta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/buscar?op=sale">Buscador completo</Link>
          </Button>
        </div>
      </article>
    </MarketingShell>
  )
}
