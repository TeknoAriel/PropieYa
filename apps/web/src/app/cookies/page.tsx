import type { Metadata } from 'next'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Uso de cookies en Propieya.',
}

export default function CookiesPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Cookies</h1>
        <p className="text-sm text-text-tertiary">Versión preliminar — marzo 2026</p>
        <p className="leading-relaxed text-text-secondary">
          Usamos cookies y almacenamiento local necesarios para la sesión, preferencias (por ejemplo
          tema claro/oscuro) y el funcionamiento del mapa. Podemos incorporar analítica agregada en
          el futuro; si eso cambia el alcance, actualizamos esta página.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Podés limitar cookies desde tu navegador; algunas funciones pueden dejar de funcionar.
        </p>
      </article>
    </MarketingShell>
  )
}
