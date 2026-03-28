import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Publicar propiedad',
  description: 'Gestioná tus publicaciones desde el panel Propieya.',
}

export default function PublicarLayout({ children }: { children: React.ReactNode }) {
  return children
}
