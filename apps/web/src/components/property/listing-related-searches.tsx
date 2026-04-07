'use client'

import Link from 'next/link'

import { Card } from '@propieya/ui'
import {
  PORTAL_LISTING_RELATED_SEARCH_LABELS as RS,
  PORTAL_LISTING_UX_COPY as L,
  buildPortalBuscarUrl,
  OPERATION_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type OperationType,
  type PropertyType,
} from '@propieya/shared'

type ListingRelatedSearchesProps = {
  operationType: OperationType
  propertyType: PropertyType
  city?: string | null
  neighborhood?: string | null
  /** Si es `false`, no se sugiere enlace por rango de precio. */
  showPrice?: boolean
  priceAmount?: number | null
}

function buildLinks(props: ListingRelatedSearchesProps) {
  const { operationType, propertyType, city, neighborhood, priceAmount, showPrice } = props
  const typeLabel = PROPERTY_TYPE_LABELS[propertyType] ?? propertyType
  const opLabel = OPERATION_TYPE_LABELS[operationType] ?? operationType
  const opLower = opLabel.toLowerCase()
  const items: { href: string; label: string }[] = []
  const seen = new Set<string>()

  const add = (
    filters: Parameters<typeof buildPortalBuscarUrl>[0],
    label: string
  ) => {
    const href = buildPortalBuscarUrl(filters)
    if (seen.has(href)) return
    seen.add(href)
    items.push({ href, label })
  }

  add({ operationType, propertyType }, `${typeLabel} — ${opLower}`)

  const c = city?.trim()
  const b = neighborhood?.trim()
  if (c) {
    add({ operationType, propertyType, city: c }, `${typeLabel} en ${c}`)
    add({ operationType, city: c }, RS.allTypesInCity(c, opLower))
    if (b) {
      add(
        { operationType, propertyType, city: c, neighborhood: b },
        `Más en ${b}`
      )
      add(
        { operationType, city: c, neighborhood: b },
        RS.allTypesInNeighborhood(b, opLower)
      )
    }
  }

  if (
    c &&
    showPrice !== false &&
    priceAmount != null &&
    Number.isFinite(priceAmount) &&
    priceAmount > 0
  ) {
    const low = Math.max(0, Math.floor(priceAmount * 0.75))
    const high = Math.ceil(priceAmount * 1.25)
    if (high > low) {
      add(
        {
          operationType,
          propertyType,
          city: c,
          minPrice: low,
          maxPrice: high,
        },
        RS.similarPriceInCity(opLower, c)
      )
    }
  }

  return items.slice(0, 6)
}

export function ListingRelatedSearches(props: ListingRelatedSearchesProps) {
  const links = buildLinks(props)

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        {L.relatedSearchesTitle}
      </h2>
      <ul className="flex flex-col gap-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
