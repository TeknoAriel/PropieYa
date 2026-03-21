import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import '@propieya/ui/styles'
import './globals.css'
import { CopyPackBanner } from '@/components/layout/copy-pack-banner'

import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Propieya - Encontrá tu propiedad ideal',
    template: '%s | Propieya',
  },
  description:
    'Plataforma inmobiliaria conversacional. Buscá propiedades hablando en lenguaje natural.',
  keywords: ['inmobiliaria', 'propiedades', 'departamentos', 'casas', 'alquiler', 'venta'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <CopyPackBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
