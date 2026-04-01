import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Publicá tu aviso',
  description:
    'Los avisos se gestionan desde el panel Propieya con tu cuenta de publicador.',
}

export default function PublicarLayout({ children }: { children: React.ReactNode }) {
  return children
}
