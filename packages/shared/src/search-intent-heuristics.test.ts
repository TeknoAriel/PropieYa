import { describe, expect, it } from 'vitest'

import { enrichOperationTypeFromMessage, inferOperationTypeFromSignals } from './search-intent-heuristics'

describe('inferOperationTypeFromSignals', () => {
  it('varias señales de alquiler sin compra → rent', () => {
    expect(inferOperationTypeFromSignals('depto alquiler 3 dorm barrio norte')).toBe('rent')
  })

  it('compra sola → sale', () => {
    expect(inferOperationTypeFromSignals('quiero comprar en rosario')).toBe('sale')
  })
})

describe('enrichOperationTypeFromMessage', () => {
  it('usa reglas lexicas (para alquilar)', () => {
    expect(enrichOperationTypeFromMessage('casa para alquilar en funes')).toBe('rent')
  })

  it('para comprar → sale', () => {
    expect(enrichOperationTypeFromMessage('depto para comprar palermo')).toBe('sale')
  })
})
