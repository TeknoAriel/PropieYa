import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { PORTAL_SITE_DESCRIPTION } from '@propieya/shared'

import '@propieya/ui/styles'
import './globals.css'
import { CopyPackBanner } from '@/components/layout/copy-pack-banner'
import { ProductionStatusBanner } from '@/components/layout/production-status-banner'

import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Propieya — encontrá tu próximo lugar',
    template: '%s | Propieya',
  },
  description: PORTAL_SITE_DESCRIPTION,
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
          <ProductionStatusBanner />
          <CopyPackBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
