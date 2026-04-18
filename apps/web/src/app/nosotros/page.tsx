import type { Metadata } from 'next'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description:
    'Propieya es un portal inmobiliario pensado para buscar con claridad, comparar con calma y avanzar cuando estés listo.',
}

export default function NosotrosPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Sobre Propieya</h1>
        <p className="leading-relaxed text-text-secondary">
          Trabajamos para que encontrar propiedades sea{' '}
          <strong className="font-semibold text-text-primary">simple al inicio</strong> y{' '}
          <strong className="font-semibold text-text-primary">potente cuando lo necesités</strong>:
          una primera capa clara para arrancar, y mapa, filtros o asistente disponibles para afinar
          sin perder el hilo.
        </p>
        <p className="leading-relaxed text-text-secondary">
          Priorizamos que entiendas cada aviso antes de escribir al publicador: información ordenada,
          lenguaje cercano y foco en la decisión inmobiliaria, sin ruido de producto.
        </p>
      </article>
    </MarketingShell>
  )
}
