'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PORTAL_SEARCH_UX_COPY, PORTAL_VOICE_CTA } from '@propieya/shared'
import { Button, Card, Skeleton } from '@propieya/ui'

import { AlertFeedCard } from '@/components/alertas/feed-card'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { getAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

export default function MisAlertasPage() {
  const [canAuth, setCanAuth] = useState(false)

  useEffect(() => {
    setCanAuth(!!getAccessToken())
  }, [])

  const utils = trpc.useUtils()
  const feedQuery = trpc.searchAlert.getMyFeed.useQuery(undefined, {
    enabled: canAuth,
    retry: false,
  })

  const setActive = trpc.searchAlert.setActive.useMutation({
    onSuccess: () => void utils.searchAlert.getMyFeed.invalidate(),
  })
  const remove = trpc.searchAlert.remove.useMutation({
    onSuccess: () => void utils.searchAlert.getMyFeed.invalidate(),
  })

  const actionsBusy = setActive.isPending || remove.isPending

  if (!canAuth) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
        <Card className="p-8">
          <h1 className="text-2xl font-bold text-text-primary">Mis alertas</h1>
          <p className="mt-3 text-text-secondary">
            {PORTAL_SEARCH_UX_COPY.misAlertasGuestLead} Iniciá sesión para ver alertas y
            coincidencias.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">{PORTAL_VOICE_CTA.login}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </div>
        </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (feedQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        </main>
        <Footer />
      </div>
    )
  }

  if (feedQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
        <Card className="p-8">
          <p className="text-text-secondary">
            No se pudieron cargar las alertas. Intentá de nuevo más tarde.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const items = feedQuery.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto max-w-lg flex-1 space-y-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Mis alertas
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {PORTAL_SEARCH_UX_COPY.misAlertasPageSubtitle}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/buscar">Buscar</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-6">
          <p className="text-text-secondary">
            {PORTAL_SEARCH_UX_COPY.misAlertasEmptyBody}{' '}
            <Link href="/buscar" className="font-medium text-brand-primary hover:underline">
              Ir al buscador
            </Link>
            .
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <AlertFeedCard
                item={item}
                actionsDisabled={actionsBusy}
                onToggleAlert={(id, isActive) => setActive.mutate({ id, isActive })}
                onDeleteAlert={(id) => {
                  if (typeof window !== 'undefined' && window.confirm('¿Eliminar esta alerta?')) {
                    remove.mutate({ id })
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
      </main>
      <Footer />
    </div>
  )
}
