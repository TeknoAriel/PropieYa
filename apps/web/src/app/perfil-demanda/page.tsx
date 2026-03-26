'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button, Card, Skeleton } from '@propieya/ui'

import { getAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

export default function PerfilDemandaPage() {
  const [canAuth, setCanAuth] = useState(false)

  useEffect(() => {
    setCanAuth(!!getAccessToken())
  }, [])

  const { data: profile, isLoading, error } = trpc.demand.getMyProfile.useQuery(
    undefined,
    {
      enabled: canAuth,
      retry: false,
    }
  )

  if (!canAuth) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="p-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Perfil de demanda
          </h1>
          <p className="mt-3 text-text-secondary">
            Iniciá sesión para guardar tus preferencias de búsqueda y ver el
            resumen de lo que buscás.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="p-8">
          <p className="text-text-secondary">
            No se pudo cargar el perfil. Si tu sesión expiró, volvé a iniciar
            sesión.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Perfil de demanda
          </h1>
          <p className="mt-2 text-text-secondary">
            Resumen de lo que guardaste desde la búsqueda. Podés actualizarlo
            en cualquier momento desde{' '}
            <Link href="/buscar" className="text-brand-primary hover:underline">
              Buscar
            </Link>
            .
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/buscar">Ir a buscar</Link>
        </Button>
      </div>

      {!profile ? (
        <Card className="p-6">
          <p className="text-text-secondary">
            Todavía no guardaste un perfil. Usá los filtros en Buscar y elegí
            &quot;Guardar filtros en mi perfil&quot;.
          </p>
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-text-tertiary">
              Resumen
            </h2>
            <p className="mt-1 text-text-primary">
              {profile.naturalLanguageSummary ??
                'Sin resumen (guardá de nuevo desde Buscar).'}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-text-tertiary">Completitud</span>
              <p className="font-medium text-text-primary">
                {profile.completeness}%
              </p>
            </div>
            {profile.lastSearchAt ? (
              <div>
                <span className="text-text-tertiary">Última actualización</span>
                <p className="font-medium text-text-primary">
                  {new Date(profile.lastSearchAt).toLocaleString('es-AR')}
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  )
}
