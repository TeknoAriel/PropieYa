import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos de uso del portal Propieya.',
}

export default function TerminosPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Términos y condiciones</h1>
        <p className="text-sm text-text-tertiary">Versión preliminar — marzo 2026</p>
        <p className="leading-relaxed text-text-secondary">
          El uso del sitio implica aceptar reglas razonables de uso: respeto a la propiedad
          intelectual de las fichas, veracidad de los datos que cargás como usuario o publicador, y
          uso del servicio conforme a la ley aplicable. Podemos actualizar estos términos; la fecha
          arriba indica la última revisión publicada.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Para consultas específicas, usá la página de{' '}
          <Link href="/contacto" className="font-medium text-brand-primary underline">
            Contacto
          </Link>{' '}
          cuando el canal esté habilitado.
        </p>
      </article>
    </MarketingShell>
  )
}
