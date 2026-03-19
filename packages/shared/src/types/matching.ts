import { type UUID, type Timestamp } from './common'
import { type MatchExplanation } from './search'

/**
 * Configuración del motor de matching
 */
export interface MatchingConfig {
  // Pesos por categoría (deben sumar 100)
  weights: {
    location: number // default: 30
    price: number // default: 25
    space: number // default: 20
    features: number // default: 15
    qualitative: number // default: 10
  }

  // Umbrales
  thresholds: {
    minScore: number // Score mínimo para mostrar (default: 20)
    highMatchScore: number // Score para "alto match" (default: 80)
    perfectMatchScore: number // Score para "match perfecto" (default: 95)
  }

  // Penalizaciones
  penalties: {
    mustHaveNotMet: number // Penalización por must_have no cumplido (default: -50)
    dealBreakerMet: number // Penalización por deal_breaker cumplido (default: -100)
  }

  // Bonuses
  bonuses: {
    extraAmenity: number // Bonus por amenity extra no pedida (default: +2)
    betterLocation: number // Bonus por mejor ubicación (default: +5)
    belowBudget: number // Bonus por debajo del presupuesto (default: +5)
  }
}

/**
 * Request de matching
 */
export interface MatchingRequest {
  demandProfileId: UUID
  listingIds?: UUID[] // Si se especifica, solo evalúa estos
  limit?: number
  minScore?: number
  includeExplanation?: boolean
}

/**
 * Resultado de matching para una propiedad
 */
export interface MatchingResult {
  listingId: UUID
  score: number // 0-100
  explanation: MatchExplanation
  breakdown: MatchingBreakdown
  computedAt: Timestamp
}

/**
 * Desglose del score de matching
 */
export interface MatchingBreakdown {
  location: {
    score: number
    weight: number
    weightedScore: number
    details: string
  }
  price: {
    score: number
    weight: number
    weightedScore: number
    details: string
  }
  space: {
    score: number
    weight: number
    weightedScore: number
    details: string
  }
  features: {
    score: number
    weight: number
    weightedScore: number
    details: string
  }
  qualitative: {
    score: number
    weight: number
    weightedScore: number
    details: string
  }
  bonuses: number
  penalties: number
  finalScore: number
}

/**
 * Response de matching batch
 */
export interface MatchingResponse {
  profileId: UUID
  results: MatchingResult[]
  totalEvaluated: number
  processingTimeMs: number
}

/**
 * Generación de explicación en lenguaje natural
 */
export interface ExplanationGeneratorConfig {
  locale: string
  verbosity: 'minimal' | 'standard' | 'detailed'
  includeNegatives: boolean // Incluir qué NO cumple
  includePartials: boolean // Incluir matches parciales
  maxCriteria: number // Máximo de criterios a mencionar
}

/**
 * Templates de explicación
 */
export interface ExplanationTemplates {
  perfectMatch: string
  highMatch: string
  goodMatch: string
  partialMatch: string
  lowMatch: string

  criterionMet: string
  criterionPartial: string
  criterionNotMet: string
  criterionBonus: string

  summary: string
}

export const DEFAULT_EXPLANATION_TEMPLATES: ExplanationTemplates = {
  perfectMatch: 'Esta propiedad cumple todos tus criterios.',
  highMatch: 'Esta propiedad cumple la mayoría de lo que buscás.',
  goodMatch: 'Esta propiedad tiene varias cosas que te pueden interesar.',
  partialMatch: 'Esta propiedad cumple algunos de tus criterios.',
  lowMatch: 'Esta propiedad no cumple varios de tus criterios principales.',

  criterionMet: '✓ {criterion}: {detail}',
  criterionPartial: '◐ {criterion}: {detail}',
  criterionNotMet: '✗ {criterion}: {detail}',
  criterionBonus: '★ Bonus: {detail}',

  summary: 'Cumple {matched} de {total} criterios ({score}% compatible)',
}
