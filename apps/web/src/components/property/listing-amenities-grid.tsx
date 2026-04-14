'use client'

import { Badge } from '@propieya/ui'
import { FACETS_CATALOG } from '@propieya/shared'

function labelForAmenityId(id: string): string {
  const def = FACETS_CATALOG.find((d) => d.type === 'flag' && d.id === id)
  return def?.type === 'flag' ? def.label : id.replace(/_/g, ' ')
}

export function ListingAmenitiesGrid({
  amenityIds,
}: {
  amenityIds: string[]
}) {
  const unique = [...new Set(amenityIds.filter(Boolean))]
  if (unique.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">Comodidades</h2>
      <ul className="flex flex-wrap gap-2" aria-label="Comodidades del aviso">
        {unique.map((id) => (
          <li key={id}>
            <Badge variant="secondary" className="font-normal">
              {labelForAmenityId(id)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
