import { describe, expect, it } from 'vitest'

import {
  buildDevelopmentProjectKey,
  extractDevelopmentProjectName,
  groupListingsIntoDevelopmentProjects,
  type DevelopmentListingRow,
} from './development-project'

function row(partial: Partial<DevelopmentListingRow> & Pick<DevelopmentListingRow, 'id' | 'title'>): DevelopmentListingRow {
  return {
    id: partial.id,
    title: partial.title,
    description: partial.description ?? '',
    propertyType: 'development_unit',
    operationType: partial.operationType ?? 'sale',
    priceAmount: partial.priceAmount ?? 100_000,
    priceCurrency: partial.priceCurrency ?? 'USD',
    surfaceTotal: partial.surfaceTotal ?? 45,
    surfaceCovered: partial.surfaceCovered ?? null,
    bedrooms: partial.bedrooms ?? 2,
    bathrooms: partial.bathrooms ?? 1,
    address: partial.address ?? { city: 'Rosario', neighborhood: 'Centro' },
    features: partial.features ?? {},
    primaryImageUrl: partial.primaryImageUrl ?? null,
    externalId: partial.externalId ?? null,
  }
}

describe('development-project', () => {
  it('extrae nombre de proyecto antes del guión de unidad', () => {
    expect(
      extractDevelopmentProjectName('Edificio KILLARY – Departamentos en pozo en Costa Azul')
    ).toBe('Edificio KILLARY')
  })

  it('agrupa unidades con el mismo título como un proyecto', () => {
    const grouped = groupListingsIntoDevelopmentProjects([
      row({ id: '1', title: 'Complejo El Colonial', priceAmount: 80_000 }),
      row({ id: '2', title: 'Complejo El Colonial', priceAmount: 95_000 }),
    ])
    expect(grouped).toHaveLength(1)
    expect(grouped[0]!.unitCount).toBe(2)
    expect(grouped[0]!.priceMin).toBe(80_000)
    expect(grouped[0]!.priceMax).toBe(95_000)
  })

  it('separa proyectos por ciudad', () => {
    const keyA = buildDevelopmentProjectKey('Torre X', 'Córdoba')
    const keyB = buildDevelopmentProjectKey('Torre X', 'Rosario')
    expect(keyA).not.toBe(keyB)
  })
})
