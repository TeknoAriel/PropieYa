'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@propieya/ui'
import {
  formatPrice,
  OPERATION_TYPE_LABELS,
  type Currency,
  type DevelopmentProjectUnit,
} from '@propieya/shared'

import { ContactModal } from '@/components/contact-modal'

type DevelopmentUnitsListProps = {
  units: DevelopmentProjectUnit[]
  projectName: string
  compact?: boolean
  showConsult?: boolean
}

export function DevelopmentUnitsList({
  units,
  projectName,
  compact = false,
  showConsult = true,
}: DevelopmentUnitsListProps) {
  const [contactUnit, setContactUnit] = useState<DevelopmentProjectUnit | null>(null)

  if (units.length === 0) {
    return (
      <p className="text-sm text-text-secondary">Sin unidades publicadas en este momento.</p>
    )
  }

  return (
    <>
      <div
        className={
          compact
            ? 'divide-y divide-border/30 rounded-lg border border-border/40'
            : 'overflow-hidden rounded-xl border border-border/45'
        }
      >
        <div
          className={
            compact
              ? 'hidden'
              : 'grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 bg-surface-secondary/80 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary'
          }
        >
          <span>Unidad</span>
          <span className="text-right">Superficie</span>
          <span className="text-right">Amb.</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Acción</span>
        </div>
        {units.map((unit) => (
          <div
            key={unit.id}
            className={
              compact
                ? 'flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'
                : 'grid grid-cols-1 gap-2 border-t border-border/30 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-3'
            }
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {unit.title.replace(projectName, '').replace(/^[\s–-]+/, '').trim() ||
                  unit.title}
              </p>
              <p className="text-xs text-text-tertiary">
                {OPERATION_TYPE_LABELS[unit.operationType]}
                {unit.floor != null ? ` · Piso ${unit.floor}` : ''}
              </p>
            </div>
            <p className={`text-sm text-text-secondary ${compact ? '' : 'sm:text-right'}`}>
              {unit.surfaceTotal > 0 ? `${unit.surfaceTotal} m²` : '—'}
            </p>
            <p className={`text-sm text-text-secondary ${compact ? '' : 'sm:text-right'}`}>
              {unit.bedrooms != null && unit.bedrooms > 0 ? `${unit.bedrooms} amb.` : '—'}
            </p>
            <p className="text-sm font-semibold text-brand-primary sm:text-right">
              {formatPrice(unit.priceAmount, unit.priceCurrency as Currency)}
            </p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/propiedad/${unit.id}`}>Ver unidad</Link>
              </Button>
              {showConsult ? (
                <Button size="sm" variant="secondary" onClick={() => setContactUnit(unit)}>
                  Consultar
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {contactUnit ? (
        <ContactModal
          listingId={contactUnit.id}
          listingTitle={contactUnit.title}
          listingExternalId={contactUnit.externalId}
          open={!!contactUnit}
          onOpenChange={(open) => {
            if (!open) setContactUnit(null)
          }}
        />
      ) : null}
    </>
  )
}
