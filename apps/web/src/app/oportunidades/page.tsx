import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@propieya/ui'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Oportunidades',
  description:
    'Alquileres y ofertas activas en Propieya: listado claro con mapa y filtros sin ruido.',
}

export default function OportunidadesPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Oportunidades</h1>
        <p className="leading-relaxed text-text-secondary">
          Encontrá alquileres tradicionales o temporarios, y combiná con mapa y filtros para ver
          solo lo que encaja con tu timing y presupuesto.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/alquiler">Ver alquileres</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/buscar">Buscador completo</Link>
          </Button>
        </div>
      </article>
    </MarketingShell>
  )
}
