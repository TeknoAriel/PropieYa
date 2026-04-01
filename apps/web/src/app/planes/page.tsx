import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@propieya/ui'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Planes y precios',
  description: 'Planes para publicadores e inmobiliarias en Propieya.',
}

export default function PlanesPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Planes y precios</h1>
        <p className="leading-relaxed text-text-secondary">
          Estamos definiendo planes claros para inmobiliarias y publicadores, alineados a valor
          (visibilidad, calidad de datos y herramientas), no solo a listados sueltos.
        </p>
        <p className="text-text-secondary">
          Si querés anticiparte o una propuesta para tu equipo, escribinos desde{' '}
          <Link href="/contacto" className="font-medium text-brand-primary underline">
            Contacto
          </Link>
          .
        </p>
        <Button asChild variant="outline">
          <Link href="/publicar">Cómo publicar hoy</Link>
        </Button>
      </article>
    </MarketingShell>
  )
}
