'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { Badge, Button, Skeleton } from '@propieya/ui'
import {
  DEVELOPMENT_DELIVERY_HORIZON_LABELS,
  OPERATION_TYPE_LABELS,
  type DevelopmentProjectUnit,
} from '@propieya/shared'

import { ContactModal } from '@/components/contact-modal'
import {
  formatDevelopmentPriceRange,
  formatDevelopmentSurfaceRange,
} from '@/components/emprendimientos/development-format'
import { DevelopmentUnitsList } from '@/components/emprendimientos/development-units-list'
import { trpc } from '@/lib/trpc'

export function DevelopmentProjectDetailView() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null)
  const [projectContactOpen, setProjectContactOpen] = useState(false)

  const { data, isLoading, isError } = trpc.development.getProjectBySlug.useQuery(
    { slug },
    { enabled: slug.length > 0 }
  )

  const project = data?.project ?? null

  const bedroomOptions = useMemo(() => {
    if (!project) return []
    const set = new Set<number>()
    for (const u of project.units) {
      if (u.bedrooms != null && u.bedrooms > 0) set.add(u.bedrooms)
    }
    return [...set].sort((a, b) => a - b)
  }, [project])

  const filteredUnits: DevelopmentProjectUnit[] = useMemo(() => {
    if (!project) return []
    if (bedroomFilter == null) return project.units
    return project.units.filter((u) => u.bedrooms === bedroomFilter)
  }, [project, bedroomFilter])

  const primaryUnit = project?.units[0] ?? null

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Emprendimiento no encontrado</h1>
        <p className="mt-2 text-text-secondary">
          El enlace puede estar desactualizado o el proyecto ya no tiene unidades activas.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/emprendimientos">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  const surfaceRange = formatDevelopmentSurfaceRange(project)

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-4 text-sm text-text-tertiary">
        <Link href="/emprendimientos" className="hover:text-text-primary">
          Emprendimientos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text-secondary">{project.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-2xl border border-border/45">
            <div className="relative aspect-[16/7] bg-surface-secondary">
              <Image
                src={
                  project.heroImageUrl ||
                  'https://placehold.co/1200x500/e0ddd8/666660?text=Emprendimiento'
                }
                alt={project.name}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
            <div className="space-y-4 p-5 md:p-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Proyecto
                </p>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {project.name}
                </h1>
                {project.addressSummary ? (
                  <p className="mt-1 text-text-secondary">{project.addressSummary}</p>
                ) : null}
                {project.advertiserName ? (
                  <p className="mt-1 text-sm text-text-tertiary">{project.advertiserName}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {project.operationTypes.map((op) => (
                  <Badge key={op} variant="secondary">
                    {OPERATION_TYPE_LABELS[op]}
                  </Badge>
                ))}
                {project.deliveryDate ? (
                  <Badge variant="outline">Entrega: {project.deliveryDate}</Badge>
                ) : (
                  <Badge variant="outline">
                    {DEVELOPMENT_DELIVERY_HORIZON_LABELS[project.deliveryHorizon]}
                  </Badge>
                )}
                <Badge variant="outline">
                  {project.unitCount} unidad{project.unitCount === 1 ? '' : 'es'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-text-tertiary">Rango de precios</p>
                  <p className="text-lg font-semibold text-brand-primary">
                    {formatDevelopmentPriceRange(project)}
                  </p>
                </div>
                {surfaceRange ? (
                  <div>
                    <p className="text-text-tertiary">Superficies</p>
                    <p className="font-medium">{surfaceRange}</p>
                  </div>
                ) : null}
              </div>

              {project.description ? (
                <div className="prose prose-sm max-w-none text-text-secondary">
                  <h2 className="text-base font-semibold text-text-primary">Descripción</h2>
                  <p className="whitespace-pre-line">{project.description}</p>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Unidades disponibles</h2>
                <p className="text-sm text-text-secondary">
                  Compará tipologías, metros y precios dentro del mismo desarrollo.
                </p>
              </div>
              {bedroomOptions.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={bedroomFilter == null ? 'default' : 'outline'}
                    onClick={() => setBedroomFilter(null)}
                  >
                    Todas
                  </Button>
                  {bedroomOptions.map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={bedroomFilter === n ? 'default' : 'outline'}
                      onClick={() => setBedroomFilter(n)}
                    >
                      {n} amb.
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            <DevelopmentUnitsList
              units={filteredUnits}
              projectName={project.name}
              showConsult
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-2xl border border-border/45 p-5">
            <h3 className="font-semibold">Consultá por este emprendimiento</h3>
            <p className="text-sm text-text-secondary">
              Te contactamos por el proyecto o por una unidad específica.
            </p>
            <Button className="w-full" onClick={() => setProjectContactOpen(true)}>
              Consultar emprendimiento
            </Button>
            {primaryUnit ? (
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/propiedad/${primaryUnit.id}`}>Ver ficha de unidad</Link>
              </Button>
            ) : null}
          </div>
        </aside>
      </div>

      {primaryUnit ? (
        <ContactModal
          listingId={primaryUnit.id}
          listingTitle={`${project.name} — consulta general`}
          listingExternalId={primaryUnit.externalId}
          open={projectContactOpen}
          onOpenChange={setProjectContactOpen}
        />
      ) : null}
    </div>
  )
}
