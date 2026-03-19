import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import '@propieya/ui/styles'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Panel | Propieya',
    template: '%s | Panel Propieya',
  },
  description: 'Panel de gestión para inmobiliarias y desarrolladoras',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
