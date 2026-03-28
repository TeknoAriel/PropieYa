import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Propiedades en venta',
  description:
    'Encontrá casas, departamentos y más en venta en Propieya. Filtrá por zona y precio.',
}

export default function VentaLayout({ children }: { children: React.ReactNode }) {
  return children
}
