/**
 * Matriz de pruebas estilo UX (sin LLM): mismo pipeline que producción cuando no hay OPENAI_API_KEY.
 * Objetivo: detectar cuellos de botella (localidad caída a q, amenities fuera de catálogo, etc.).
 */

import { describe, expect, it } from 'vitest'

import {
  validateConversationalPipeline,
  type ConversationalFlatIntent,
} from './conversational-search-pipeline'
import { simulateFallbackPreliminary } from './conversational-ux-simulate'
import { residualPublicSearchText } from './search-query-merge'

function runPipeline(message: string) {
  const preliminary = simulateFallbackPreliminary(message)
  return validateConversationalPipeline(message, preliminary)
}

/** Genera ≥200 consultas de complejidad creciente (variaciones habituales en AR). */
function buildUxMatrixMessages(): string[] {
  const out: string[] = []

  const tier1 = [
    'quiero comprar casa',
    'busco casa',
    'casa en venta',
    'casas en venta',
    'casa en alquiler',
    'departamento en alquiler',
    'alquiler temporal',
    'monoambiente venta',
    'terreno en venta',
    'local comercial',
    'cochera cubierta',
    'ph en venta',
    'quiero alquilar',
    'vendo mi casa',
    'compro urgente',
  ]
  out.push(...tier1)

  const verbs = ['quiero comprar', 'busco', 'necesito', 'estoy buscando']
  const types = ['casa', 'un departamento', 'un ph', 'un terreno', 'un local']
  const zones = [
    'en Rosario',
    'en Córdoba',
    'en Funes',
    'en Buenos Aires',
    'en Palermo',
    'en Nueva Córdoba',
  ]
  for (const v of verbs) {
    for (const t of types) {
      for (const z of zones) {
        out.push(`${v} ${t} ${z}`)
      }
    }
  }

  const extras = [
    'depto 2 dormitorios Rosario',
    'casa 3 dormitorios con pileta Funes',
    'departamento balcon Palermo',
    'alquiler 4 ambientes Belgrano',
    'venta monoambiente sin expensas',
    'ph en venta con terraza',
    'local a la calle Mendoza',
    'galpón en alquiler',
    'oficina en alquiler Córdoba',
    'emprendimiento en pozo',
    'casa quinta weekend',
    'duplex en venta',
    'loft Palermo Soho',
    'semipiso recoleta',
    'penthouse Puerto Madero',
    'casa con jardin y parrilla',
    'depto amenities seguridad 24hs',
    'busco más barato',
    'más económico',
    'otro barrio',
    'sin tope de precio',
    'hasta 150000 usd',
    'entre 100000 y 200000',
    '3 dormitorios 2 baños',
    'frente al rio',
    'contrafrente luminoso',
    'a estrenar',
    'para inversión',
    'con renta',
    'acepta permuta',
  ]
  out.push(...extras)

  const tierComplex = [
    'estoy buscando en cordoba capital un departamento con balcon al frente 3 dormitorios bien ubicado, con cochera y que permitan mascotas, ademas me gustaria saber el costo de las expensas y mi señora quiere cocina grande. el departamento tiene que ser grande porque tengo 3 hijos adolescentes.',
    'quiero comprar en zona norte rosario casa 4 dorm pileta cochera para 2 autos',
    'alquiler corporativo 2 años departamento amoblado seguridad sum laundry',
    'depto nueva cordoba 2 dorm balcon vista al parque sin expensas altas',
    'casa barrio cerrado seguridad 24 pileta jardin mascotas',
  ]
  out.push(...tierComplex)

  const typosNoise = [
    'depto en alquieler palermo',
    'casas en vneta funes',
    'bs as caba deptos',
    'rent apartment palermo',
    'buy house rosario',
  ]
  out.push(...typosNoise)

  for (let i = 1; i <= 40; i++) {
    out.push(
      `variante ${i}: depto alquiler 2 ambientes zona norte`,
      `consulta ${i} casa venta con financiación`
    )
  }

  return [...new Set(out.map((s) => s.trim()).filter(Boolean))]
}

describe('conversational UX matrix (sin LLM)', () => {
  const messages = buildUxMatrixMessages()

  it('genera al menos 200 consultas distintas', () => {
    expect(messages.length).toBeGreaterThanOrEqual(200)
  })

  it('ejemplos simples: operación y sin colapsar a house genérico sin localidad', () => {
    const r = runPipeline('quiero comprar casa')
    expect(r.extracted.operationType).toBe('sale')
    expect(r.extracted.propertyType).toBeUndefined()
  })

  it('ejemplo largo Córdoba: tipo, ciudad, dormitorios y amenities catalogadas; resto va a texto / unknown (sin LLM)', () => {
    const long =
      'estoy buscando en cordoba capital un departamento con balcon al frente 3 dormitorios bien ubicado, con cochera y que permitan mascotas, ademas me gustaria saber el costo de las expensas y mi señora quiere cocina grande. el departamento tiene que ser grande porque tengo 3 hijos adolescentes.'
    const r = runPipeline(long)
    expect(r.extracted.propertyType).toBe('apartment')
    expect(r.extracted.city).toMatch(/córdoba/i)
    expect(r.extracted.minBedrooms).toBeGreaterThanOrEqual(3)
    const am = r.extracted.amenities ?? []
    expect(am).toContain('balcony')
    expect(am).toContain('parking')
    const blob = (
      r.debug.unknownTerms.join(' ') + (r.extracted.q ?? '')
    ).toLowerCase()
    expect(blob).toMatch(/mascota|expensa|cocina|grande|adolescente/i)
    // Cuello de botella documentado: sin LLM «estoy buscando» no fija venta/alquiler si no hay palabra clave.
    if (r.extracted.operationType == null) {
      expect(r.extracted.q?.toLowerCase()).toMatch(/buscando|departamento/)
    }
  })

  it('matriz completa: todas las consultas pasan validación sin lanzar', () => {
    for (const msg of messages) {
      expect(() => runPipeline(msg)).not.toThrow()
    }
  })

  it('métricas agregadas y lista de fricción (cuellos de botella)', () => {
    let withOp = 0
    let withType = 0
    let withCity = 0
    let withNeighborhood = 0
    let droppedLoc = 0
    let droppedAmenity = 0
    let highUnknown = 0
    const friction: string[] = []

    for (const msg of messages) {
      const r = runPipeline(msg)
      const e = r.extracted
      if (e.operationType) withOp++
      if (e.propertyType) withType++
      if (e.city) withCity++
      if (e.neighborhood) withNeighborhood++
      if (r.debug.droppedLocations.length > 0) droppedLoc++
      if (r.debug.droppedAmenities.length > 0) droppedAmenity++
      if (r.debug.unknownTerms.length >= 4) {
        highUnknown++
        if (friction.length < 25) {
          friction.push(
            `[unknown≥4] ${msg.slice(0, 72)}… → terms: ${r.debug.unknownTerms.slice(0, 6).join('; ')}`
          )
        }
      }
    }

    const n = messages.length
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify(
        {
          n,
          withOperationPct: Math.round((withOp / n) * 100),
          withPropertyTypePct: Math.round((withType / n) * 100),
          withCityPct: Math.round((withCity / n) * 100),
          withNeighborhoodPct: Math.round((withNeighborhood / n) * 100),
          queriesWithDroppedLocationPct: Math.round((droppedLoc / n) * 100),
          queriesWithDroppedAmenityPct: Math.round((droppedAmenity / n) * 100),
          queriesWithManyUnknownTermsPct: Math.round((highUnknown / n) * 100),
        },
        null,
        2
      )
    )
    // eslint-disable-next-line no-console
    console.info('Muestra fricción (unknownTerms largos):\n' + friction.join('\n'))

    expect(withOp).toBeGreaterThan(n * 0.35)
    expect(n).toBeGreaterThanOrEqual(200)
  })

  it('residual URL no repite sinónimos de tipo cuando ya está filtrado', () => {
    const merged: ConversationalFlatIntent = {
      operationType: 'sale',
      propertyType: 'house',
      city: 'Funes',
      q: 'casa',
    }
    const r = validateConversationalPipeline('casa en funes', merged)
    const q = residualPublicSearchText({
      q: r.extracted.q,
      operationType: r.extracted.operationType,
      propertyType: r.extracted.propertyType,
      city: r.extracted.city,
      amenities: r.extracted.amenities,
      minBedrooms: r.extracted.minBedrooms,
      minSurface: r.extracted.minSurface,
    })
    expect(q.toLowerCase()).not.toMatch(/\bcasa\b/)
  })
})
