import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Privacidad',
  description: 'Política de privacidad del portal Propieya.',
}

export default function PrivacidadPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Privacidad</h1>
        <p className="text-sm text-text-tertiary">Versión preliminar — marzo 2026</p>
        <p className="leading-relaxed text-text-secondary">
          Tratamos los datos personales que nos das (cuenta, búsquedas guardadas, alertas, contacto
          con publicadores) con fines de prestar el servicio, mejorar el producto y cumplir
          obligaciones legales. No vendemos listas de contacto.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Podés pedir acceso o corrección de tus datos según la normativa que aplique en tu país.
          Para ejercer derechos o dudas, usá{' '}
          <Link href="/contacto" className="font-medium text-brand-primary underline">
            Contacto
          </Link>{' '}
          cuando esté disponible.
        </p>
      </article>
    </MarketingShell>
  )
}
