'use client'

import { useSearchParams } from 'next/navigation'

import { portalBuscarLandingH1, portalBuscarLandingLead } from '@propieya/shared'

import { BuscarContent } from '@/components/buscar/buscar-content'

export function BuscarLandingView() {
  const searchParams = useSearchParams()
  const ciudad = (searchParams.get('ciudad') ?? '').trim()
  const pageTitle = portalBuscarLandingH1(ciudad)
  const pageSubtitle = portalBuscarLandingLead(ciudad)

  return (
    <BuscarContent pageTitle={pageTitle} pageSubtitle={pageSubtitle} />
  )
}
