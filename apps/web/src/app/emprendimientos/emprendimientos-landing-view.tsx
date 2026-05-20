'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  PORTAL_LANDING_QUICK_CITIES_ARGENTINA,
  PORTAL_SEARCH_UX_COPY,
  portalEmprendimientosLandingH1,
  portalEmprendimientosLandingLead,
} from '@propieya/shared'

import { BuscarContent } from '@/components/buscar/buscar-content'

export function EmprendimientosLandingView() {
  const searchParams = useSearchParams()
  const ciudad = (searchParams.get('ciudad') ?? '').trim()
  const pageTitle = portalEmprendimientosLandingH1(ciudad)
  const pageSubtitle = portalEmprendimientosLandingLead(ciudad)
  const showQuick = !ciudad

  return (
    <>
      {showQuick ? (
        <div className="container mx-auto px-4 pt-3 md:pt-4">
          <nav
            className="flex flex-col gap-2 border-b border-border/15 pb-3"
            aria-label={PORTAL_SEARCH_UX_COPY.landingQuickCitiesAriaLabel}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {PORTAL_SEARCH_UX_COPY.landingQuickCitiesLead}
            </p>
            <div className="flex flex-wrap gap-2">
              {PORTAL_LANDING_QUICK_CITIES_ARGENTINA.map((city) => (
                <Link
                  key={city}
                  href={`/emprendimientos?ciudad=${encodeURIComponent(city)}`}
                  className="rounded-full border border-border/40 bg-surface-secondary/60 px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:border-brand-primary/35 hover:bg-surface-secondary"
                >
                  {city}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      ) : null}
      <BuscarContent
        forcedPropertyType="development_unit"
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      />
    </>
  )
}
