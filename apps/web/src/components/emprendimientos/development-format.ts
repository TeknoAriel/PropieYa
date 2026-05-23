import {
  formatPrice,
  type Currency,
  type DevelopmentProjectSummary,
} from '@propieya/shared'

export function formatDevelopmentPriceRange(project: {
  priceMin: number
  priceMax: number
  priceCurrency: string
}): string {
  const cur = project.priceCurrency as Currency
  if (project.priceMin <= 0 && project.priceMax <= 0) return 'Consultar precio'
  if (project.priceMin === project.priceMax) {
    return formatPrice(project.priceMin, cur)
  }
  return `${formatPrice(project.priceMin, cur, { compact: true })} – ${formatPrice(project.priceMax, cur, { compact: true })}`
}

export function formatDevelopmentSurfaceRange(project: DevelopmentProjectSummary): string | null {
  if (project.surfaceMin <= 0 && project.surfaceMax <= 0) return null
  if (project.surfaceMin === project.surfaceMax) return `${project.surfaceMin} m²`
  return `${project.surfaceMin} – ${project.surfaceMax} m²`
}
