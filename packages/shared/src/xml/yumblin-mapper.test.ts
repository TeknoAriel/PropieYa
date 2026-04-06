import { describe, expect, it } from 'vitest'

import { mapYumblinItem } from './yumblin-mapper'

const baseInput = { organizationId: 'org-1', publisherId: 'pub-1' }

describe('mapYumblinItem property type', () => {
  it('prioriza property_type de raíz sobre propertyType anidado (p. ej. agency)', () => {
    const row = mapYumblinItem(
      {
        title: 'Casa amplia en barrio cerrado',
        content: 'Descripción',
        public_code: 'KP1',
        for_sale: true,
        price: 200_000,
        total_meters: 200,
        property_type: 'houses',
        agency: { propertyType: 'apartments', name: 'X' },
      },
      baseInput
    )
    expect(row).not.toBeNull()
    expect(row!.propertyType).toBe('house')
  })

  it('usa property_type_old cuando no hay property_type', () => {
    const row = mapYumblinItem(
      {
        title: 'Terreno en zona de desarrollo',
        content: '',
        public_code: 'KP2',
        for_sale: true,
        price: 50_000,
        total_meters: 500,
        property_type_old: 'terrenos_o_lotes',
      },
      baseInput
    )
    expect(row).not.toBeNull()
    expect(row!.propertyType).toBe('land')
  })
})
