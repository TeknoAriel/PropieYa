import type { Metadata } from 'next'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description:
    'Propieya: descubrimiento, decisión y confianza en la búsqueda inmobiliaria, con el mismo motor detrás de la conversación y los filtros.',
}

export default function NosotrosPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Sobre Propieya</h1>
        <p className="leading-relaxed text-text-secondary">
          Un portal moderno ya no compite solo por cantidad de publicaciones: compite por{' '}
          <strong className="font-semibold text-text-primary">descubrimiento</strong>,{' '}
          <strong className="font-semibold text-text-primary">decisión</strong>,{' '}
          <strong className="font-semibold text-text-primary">confianza</strong> y{' '}
          <strong className="font-semibold text-text-primary">mejora del inventario</strong>.
          Ahí es donde Propieya busca ser más fuerte que un portal clásico y más sólido que un
          simple “buscador con IA”.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Podés arrancar con una frase en la home o ir directo al mapa y los filtros: detrás está el
          mismo motor de búsqueda. Queremos que entiendas por qué encaja cada aviso antes de
          escribirle al publicador.
        </p>
      </article>
    </MarketingShell>
  )
}
