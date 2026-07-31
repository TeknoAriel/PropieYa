'use client'

import Image from 'next/image'
import Link from 'next/link'

import { Badge, Button, Card } from '@propieya/ui'
import {
  DEVELOPMENT_DELIVERY_HORIZON_LABELS,
  OPERATION_TYPE_LABELS,
  type DevelopmentProjectSummary,
} from '@propieya/shared'

import {
  formatDevelopmentPriceRange,
  formatDevelopmentSurfaceRange,
} from './development-format'
import { DevelopmentUnitsList } from './development-units-list'

type DevelopmentProjectCardProps = {
  project: DevelopmentProjectSummary
}

export function DevelopmentProjectCard({ project }: DevelopmentProjectCardProps) {
  const surfaceRange = formatDevelopmentSurfaceRange(project)
  const href = `/emprendimientos/${project.slug}`

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/45 shadow-none">
      <div className="grid gap-0 md:grid-cols-[minmax(0,280px)_1fr]">
        <Link href={href} className="relative block min-h-[200px] bg-surface-secondary md:min-h-full">
          <Image
            src={
              project.heroImageUrl ||
              'https://placehold.co/600x400/e0ddd8/666660?text=Emprendimiento'
            }
            alt={project.name}
            fill
            sizes="(max-width: 768px) 100vw, 280px"
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r" />
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-xs font-medium uppercase tracking-wide opacity-90">Proyecto</p>
            <h2 className="text-lg font-semibold leading-tight md:text-xl">{project.name}</h2>
          </div>
        </Link>

        <div className="flex flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {project.addressSummary ? (
                <p className="text-sm text-text-secondary">{project.addressSummary}</p>
              ) : null}
              {project.advertiserName ? (
                <p className="text-xs text-text-tertiary">{project.advertiserName}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
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
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-brand-primary">
                {formatDevelopmentPriceRange(project)}
              </p>
              {surfaceRange ? (
                <p className="text-sm text-text-secondary">{surfaceRange}</p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Unidades en este desarrollo
            </p>
            <DevelopmentUnitsList
              units={project.unitsPreview}
              projectName={project.name}
              compact
            />
            {project.unitCount > project.unitsPreview.length ? (
              <p className="mt-2 text-xs text-text-tertiary">
                +{project.unitCount - project.unitsPreview.length} unidad
                {project.unitCount - project.unitsPreview.length === 1 ? '' : 'es'} más en la ficha
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button asChild>
              <Link href={href}>Ver emprendimiento</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
