'use client'

import Link from 'next/link'

import { Button, Card } from '@propieya/ui'

import { getAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

const PANEL_URL =
  process.env.NEXT_PUBLIC_PANEL_URL ?? 'https://propieya-panel.vercel.app'

const LOGIN_WITH_RETURN = '/login?next=%2Fpublicar'
const REGISTER_OWNER_WITH_RETURN = '/registro?intent=owner_publisher&next=%2Fpublicar'
const REGISTER_AGENCY_WITH_RETURN = '/registro?intent=agency_publisher&next=%2Fpublicar'

export function PublicarEntry() {
  const hasToken = Boolean(getAccessToken())
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken,
    retry: false,
  })

  const me = meQuery.data
  const canPublish = Boolean(me?.organizationId)

  if (meQuery.isLoading) {
    return (
      <Card className="w-full max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold text-text-primary">Publicar propiedad</h1>
        <p className="text-sm text-text-secondary">Validando tu acceso…</p>
      </Card>
    )
  }

  if (canPublish) {
    return (
      <Card className="w-full max-w-3xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Ya podés publicar en Propieya
          </h1>
          <p className="mt-2 text-text-secondary">
            Tu cuenta está habilitada para cargar avisos desde el panel.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Flujo de publicación</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Creá un aviso y guardalo como borrador.</li>
            <li>Completá datos, imágenes y ubicación.</li>
            <li>Publicalo y seguí su estado desde el panel.</li>
          </ol>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <a href={`${PANEL_URL}/propiedades/nueva`}>Crear nuevo aviso</a>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={`${PANEL_URL}/propiedades`}>Ver mis avisos</a>
          </Button>
        </div>
      </Card>
    )
  }

  if (hasToken && !canPublish) {
    return (
      <Card className="w-full max-w-3xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Tu cuenta todavía no está lista para publicar
          </h1>
          <p className="mt-2 text-text-secondary">
            Para cargar avisos necesitás una cuenta publicadora (inmobiliaria o dueño
            directo).
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Cómo seguir</p>
          <p className="mt-1">
            Registrá una cuenta publicadora para empezar a cargar propiedades en el
            panel.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={REGISTER_OWNER_WITH_RETURN}>Crear cuenta de dueño directo</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={REGISTER_AGENCY_WITH_RETURN}>Crear cuenta de inmobiliaria</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Publicar propiedades en Propieya
        </h1>
        <p className="mt-2 text-text-secondary">
          Elegí tu perfil y seguí el flujo para crear y publicar avisos desde el panel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Inmobiliaria</p>
          <p className="mt-1">
            Para equipos o marcas que publican varios avisos.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Creá cuenta de inmobiliaria.</li>
            <li>Ingresá al panel.</li>
            <li>Cargá, revisá y publicá tus avisos.</li>
          </ol>
          <Button asChild className="mt-4 w-full" size="sm">
            <Link href={REGISTER_AGENCY_WITH_RETURN}>Empezar como inmobiliaria</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Dueño directo</p>
          <p className="mt-1">
            Para particulares que quieren publicar su propiedad.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Creá cuenta de dueño directo.</li>
            <li>Ingresá al panel.</li>
            <li>Completá el aviso y publicalo.</li>
          </ol>
          <Button asChild className="mt-4 w-full" size="sm">
            <Link href={REGISTER_OWNER_WITH_RETURN}>Empezar como dueño directo</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={LOGIN_WITH_RETURN}>Ya tengo cuenta</Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/buscar">Solo quiero buscar propiedades</Link>
        </Button>
      </div>
    </Card>
  )
}
