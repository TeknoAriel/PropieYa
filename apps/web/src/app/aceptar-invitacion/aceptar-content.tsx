'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button, Card } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { getAccessToken, setAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

export function AceptarInvitacionContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [hasToken, setHasToken] = useState(false)
  useEffect(() => {
    setHasToken(!!getAccessToken())
  }, [])

  const accept = trpc.organization.acceptInvite.useMutation({
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      setDone(true)
    },
  })

  const [done, setDone] = useState(false)

  const loginHref =
    token.length > 0
      ? `/login?next=${encodeURIComponent(`/aceptar-invitacion?token=${encodeURIComponent(token)}`)}`
      : '/login'

  const panelUrl = (
    process.env.NEXT_PUBLIC_PANEL_URL || 'http://localhost:3011'
  ).replace(/\/$/, '')

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-text-primary">Invitación</h1>
            <p className="mt-3 text-text-secondary">
              Falta el enlace completo. Pedile a tu administrador que te reenvíe la invitación.
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Ir al inicio</Link>
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (!hasToken) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-text-primary">Unite al equipo</h1>
            <p className="mt-3 text-text-secondary">
              Iniciá sesión con el mismo correo al que llegó la invitación para aceptarla.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={loginHref}>Iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`/registro?next=${encodeURIComponent(`/aceptar-invitacion?token=${encodeURIComponent(token)}`)}`}
                >
                  Crear cuenta
                </Link>
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-text-primary">
              ¡Listo!
            </h1>
            <p className="mt-3 text-text-secondary">
              Ya formás parte del equipo. Podés entrar al panel de gestión.
            </p>
            <Button asChild className="mt-6">
              <Link href={panelUrl}>Ir al panel</Link>
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
        <Card className="p-8 space-y-4">
          <h1 className="text-2xl font-bold text-text-primary">Confirmar invitación</h1>
          <p className="text-sm text-text-secondary">
            Vas a sumarte a la organización con el rol indicado en la invitación.
          </p>
          {accept.isError ? (
            <p className="text-sm text-semantic-error">{accept.error.message}</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={accept.isPending}
            onClick={() => accept.mutate({ token })}
          >
            {accept.isPending ? 'Procesando…' : 'Aceptar invitación'}
          </Button>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
