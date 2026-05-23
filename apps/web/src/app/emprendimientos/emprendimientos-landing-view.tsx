'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import { Button, Skeleton } from '@propieya/ui'
import {
  portalEmprendimientosLandingH1,
  portalEmprendimientosLandingLead,
} from '@propieya/shared'

import { DevelopmentFiltersBar } from '@/components/emprendimientos/development-filters-bar'
import { DevelopmentProjectCard } from '@/components/emprendimientos/development-project-card'
import { trpc } from '@/lib/trpc'

function parseOptionalNumber(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function EmprendimientosLandingView() {
  const searchParams = useSearchParams()
  const ciudad = (searchParams.get('ciudad') ?? '').trim()
  const operationType = searchParams.get('operacion') as 'sale' | 'rent' | '' | null
  const minPrice = parseOptionalNumber(searchParams.get('precioMin'))
  const maxPrice = parseOptionalNumber(searchParams.get('precioMax'))
  const minBedrooms = parseOptionalNumber(searchParams.get('ambientes'))

  const input = useMemo(
    () => ({
      ciudad: ciudad || undefined,
      operationType:
        operationType === 'sale' || operationType === 'rent' ? operationType : undefined,
      minPrice,
      maxPrice,
      minBedrooms: minBedrooms != null ? Math.floor(minBedrooms) : undefined,
      page: 1,
      pageSize: 24,
    }),
    [ciudad, operationType, minPrice, maxPrice, minBedrooms]
  )

  const { data, isLoading, isError, refetch } = trpc.development.listProjects.useQuery(input)

  const pageTitle = portalEmprendimientosLandingH1(ciudad)
  const pageSubtitle = portalEmprendimientosLandingLead(ciudad)

  return (
    <>
      <DevelopmentFiltersBar />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-text-secondary">{pageSubtitle}</p>
          {data ? (
            <p className="mt-3 text-sm text-text-tertiary">
              {data.totalProjects} emprendimiento{data.totalProjects === 1 ? '' : 's'} ·{' '}
              {data.totalUnits} unidad{data.totalUnits === 1 ? '' : 'es'} publicadas
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-text-secondary">No pudimos cargar los emprendimientos.</p>
            <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && data?.items.length === 0 ? (
          <p className="text-text-secondary">
            No hay emprendimientos con esos filtros. Probá otra ciudad o ampliá el rango de precio.
          </p>
        ) : null}

        {!isLoading && !isError && data && data.items.length > 0 ? (
          <div className="space-y-8">
            {data.items.map((project) => (
              <DevelopmentProjectCard key={project.projectKey} project={project} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
