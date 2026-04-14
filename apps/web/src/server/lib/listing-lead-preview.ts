import type { Address } from '@propieya/shared'

const MS_RECENT_LEAD = 36 * 60 * 60 * 1000

const PROPERTY_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  ph: 'PH',
  lot: 'Lote',
  office: 'Oficina',
  commercial: 'Local / comercial',
  garage: 'Cochera',
  farm: 'Campo',
  warehouse: 'Depósito',
  other: 'Otro',
}

const OPERATION_LABELS: Record<string, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  temporary_rent: 'Alquiler temporario',
}

export type ListingSnapshotForLead = {
  address: unknown
  propertyType: string
  operationType: string
  priceAmount: number
  priceCurrency: string
  showPrice: boolean
}

export function buildListingPreviewForLead(
  listing: ListingSnapshotForLead,
  leadCreatedAt: Date
): {
  zoneLabel: string
  propertyTypeLabel: string
  operationLabel: string
  budgetLabel: string
  isRecentLead: boolean
} {
  const addr = listing.address as Partial<Address> | null
  const zoneParts = [addr?.neighborhood, addr?.city].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  )
  const zoneLabel =
    zoneParts.length > 0 ? zoneParts.join(' · ') : (addr?.formatted?.trim() || 'Zona no indicada')

  const propertyTypeLabel =
    PROPERTY_LABELS[listing.propertyType] ?? listing.propertyType.replace(/_/g, ' ')
  const operationLabel =
    OPERATION_LABELS[listing.operationType] ?? listing.operationType.replace(/_/g, ' ')

  let budgetLabel = 'Consultar precio'
  if (listing.showPrice && Number.isFinite(listing.priceAmount)) {
    try {
      budgetLabel = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: listing.priceCurrency || 'USD',
        maximumFractionDigits: 0,
      }).format(listing.priceAmount)
    } catch {
      budgetLabel = `${listing.priceAmount} ${listing.priceCurrency}`
    }
  }

  const isRecentLead = Date.now() - leadCreatedAt.getTime() < MS_RECENT_LEAD

  return {
    zoneLabel,
    propertyTypeLabel,
    operationLabel,
    budgetLabel,
    isRecentLead,
  }
}

export function isLeadRecent(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < MS_RECENT_LEAD
}
