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
        <Card className="w-full max-w-lg space-y-6 p-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Publicá tu aviso</h1>
            <p className="mt-2 text-text-secondary">
              Los avisos se cargan y publican desde el panel de Propieya (cuenta de
              publicador). El portal web es para buscar y ver fichas.
            </p>
          </div>

          <div className="space-y-4 text-sm text-text-secondary">
            <div className="rounded-lg border border-border bg-surface-secondary/50 p-4">
              <p className="font-semibold text-text-primary">Solo buscás</p>
              <p className="mt-1">
                Creá tu cuenta en{' '}
                <Link href="/registro" className="text-brand-primary hover:underline">
                  Registro
                </Link>{' '}
                como “Busco propiedad” o explorá en{' '}
                <Link href="/buscar" className="text-brand-primary hover:underline">
                  Buscar
                </Link>
                .
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-secondary/50 p-4">
              <p className="font-semibold text-text-primary">Publicás avisos</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Registrate como{' '}
                  <Link
                    href="/registro?intent=owner_publisher"
                    className="text-brand-primary hover:underline"
                  >
                    particular
                  </Link>{' '}
                  o{' '}
                  <Link
                    href="/registro?intent=agency_publisher"
                    className="text-brand-primary hover:underline"
                  >
                    inmobiliaria
                  </Link>
                  .
                </li>
                <li>
                  Iniciá sesión en el panel y andá a{' '}
                  <span className="font-medium text-text-primary">Propiedades → Nueva</span>{' '}
                  para crear el aviso.
                </li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={`${PANEL_URL}/login`}>Ir al panel</a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/registro?intent=owner_publisher">Crear cuenta publicador</Link>
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
