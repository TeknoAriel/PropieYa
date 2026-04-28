'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PORTAL_SEARCH_UX_COPY as S, PORTAL_VOICE_CTA } from '@propieya/shared'
import { Button, Card, Skeleton } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { getAccessToken } from '@/lib/auth-storage'
import { portalLoginHref, portalRegistroHref } from '@/lib/portal-auth-return'
import { trpc } from '@/lib/trpc'

const RETURN_PATH = '/perfil-demanda'

export default function PerfilDemandaPage() {
  const [canAuth, setCanAuth] = useState(false)

  useEffect(() => {
    setCanAuth(!!getAccessToken())
  }, [])

  const utils = trpc.useUtils()
  const { data: profile, isLoading, error } = trpc.demand.getMyProfile.useQuery(undefined, {
    enabled: canAuth,
    retry: false,
  })

  const clearProfile = trpc.demand.clearMyProfile.useMutation({
    onSuccess: () => void utils.demand.getMyProfile.invalidate(),
  })

  const loginHref = portalLoginHref(RETURN_PATH, '')
  const registroHref = portalRegistroHref(RETURN_PATH, '')

  if (!canAuth) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-text-primary">Tu búsqueda guardada</h1>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Acá vas a ver el resumen de los filtros que guardaste desde el buscador. Iniciá sesión
              para verlo y actualizarlo cuando quieras.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={loginHref}>{PORTAL_VOICE_CTA.login}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={registroHref}>Crear cuenta</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-text-tertiary">
              Si venías de otra pantalla, volvé al buscador y guardá de nuevo después de entrar.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-2xl flex-1 space-y-4 px-4 py-12">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <Card className="p-8">
            <p className="text-text-secondary">
              No pudimos cargar tu perfil. Si tu sesión expiró, volvé a iniciar sesión.
            </p>
            <Button asChild className="mt-4">
              <Link href={loginHref}>{PORTAL_VOICE_CTA.login}</Link>
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
      <main className="container mx-auto max-w-2xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Tu búsqueda guardada</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Es el mismo criterio que guardaste desde el buscador: lo podés actualizar cuando
              quieras volviendo a filtrar y tocando &quot;{S.saveProfile}&quot; en el menú{' '}
              <span className="font-medium text-text-primary">Más</span> del buscador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/mis-alertas">{S.accountMenuAlerts}</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/buscar">Ir a buscar</Link>
            </Button>
          </div>
        </div>

        {!profile ? (
          <Card className="p-6">
            <p className="text-sm leading-relaxed text-text-secondary">
              Todavía no guardaste filtros. Andá a{' '}
              <Link href="/buscar" className="font-medium text-brand-primary hover:underline">
                Buscar
              </Link>
              , ajustá lo que te interesa y elegí &quot;{S.saveProfile}&quot; en el menú Más (arriba a
              la derecha en la página de resultados).
            </p>
          </Card>
        ) : (
          <Card className="space-y-4 p-6">
            <div>
              <h2 className="text-sm font-medium text-text-tertiary">Qué quedó guardado</h2>
              <p className="mt-1 text-text-primary">
                {profile.naturalLanguageSummary ??
                  'Sin resumen legible. Volvé a guardar desde Buscar para actualizarlo.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-text-tertiary">Completitud</span>
                <p className="font-medium text-text-primary">{profile.completeness}%</p>
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
            <div className="border-t border-border/25 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-semantic-error/35 text-semantic-error hover:bg-semantic-error/5"
                disabled={clearProfile.isPending}
                onClick={() => {
                  if (
                    typeof window !== 'undefined' &&
                    window.confirm(
                      '¿Querés borrar lo que guardaste? Después podés volver a guardar filtros desde Buscar.'
                    )
                  ) {
                    clearProfile.mutate()
                  }
                }}
              >
                {clearProfile.isPending ? S.profileClearPending : S.profileClearCta}
              </Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}
