import Link from 'next/link'

import { Button, Card } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

const PANEL_URL =
  process.env.NEXT_PUBLIC_PANEL_URL ?? 'https://propieya-panel.vercel.app'

export default function PublicarPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg space-y-4 p-8">
          <h1 className="text-2xl font-bold text-text-primary">Publicar propiedad</h1>
          <p className="text-text-secondary">
            La publicación de avisos se gestiona desde el panel de Propieya (cuenta
            inmobiliaria o publicador).
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={`${PANEL_URL}/login`}>Ir al panel</a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
