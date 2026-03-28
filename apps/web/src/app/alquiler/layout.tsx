import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Propiedades en alquiler',
  description:
    'Departamentos y casas en alquiler. Buscá en tu ciudad con Propieya.',
}

export default function AlquilerLayout({ children }: { children: React.ReactNode }) {
  return children
}
