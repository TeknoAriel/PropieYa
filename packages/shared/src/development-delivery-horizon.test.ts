import { describe, expect, it } from 'vitest'

import {
  developmentHorizonMatchesFilter,
  inferDevelopmentDeliveryHorizon,
  parseDevelopmentDeliveryDate,
  pickProjectDeliveryHorizon,
} from './development-delivery-horizon'

describe('development delivery horizon', () => {
  const now = new Date(2026, 6, 30) // jul 2026

  it('parsea JUNIO 2027 y años ISO', () => {
    expect(parseDevelopmentDeliveryDate('JUNIO 2027', now)?.getFullYear()).toBe(2027)
    expect(parseDevelopmentDeliveryDate('2027-06', now)?.getMonth()).toBe(5)
    expect(parseDevelopmentDeliveryDate('06/2028', now)?.getFullYear()).toBe(2028)
  })

  it('marca en pozo / obra', () => {
    expect(
      inferDevelopmentDeliveryHorizon({
        title: 'Depto en pozo Edificio Xuum',
        now,
      })
    ).toBe('under_construction')
    expect(
      inferDevelopmentDeliveryHorizon({
        deliveryDate: 'Junio 2028',
        title: 'Unidad 2 ambientes',
        now,
      })
    ).toBe('under_construction')
  })

  it('marca entrega próxima / a estrenar', () => {
    expect(
      inferDevelopmentDeliveryHorizon({
        title: 'Departamento a estrenar con amenities',
        now,
      })
    ).toBe('near_term')
    expect(
      inferDevelopmentDeliveryHorizon({
        deliveryDate: '2026-08',
        title: 'Unidad',
        now,
      })
    ).toBe('near_term')
  })

  it('filtra y agrega horizontes de proyecto', () => {
    expect(developmentHorizonMatchesFilter('under_construction', 'pozo')).toBe(true)
    expect(developmentHorizonMatchesFilter('near_term', 'proxima')).toBe(true)
    expect(developmentHorizonMatchesFilter('unknown', 'pozo')).toBe(false)
    expect(
      pickProjectDeliveryHorizon(['unknown', 'near_term', 'under_construction'])
    ).toBe('under_construction')
  })
})
