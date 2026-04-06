/**
 * Simula la ruta sin LLM de `extractIntentionFromMessage` (apps/web `llm.ts` → `fallbackExtract` + `q`).
 * Sirve para pruebas de matriz UX sin OPENAI_API_KEY.
 */

import type { ConversationalFlatIntent } from './conversational-search-pipeline'
import { inferLocalityFromUserMessage } from './locality-catalog-resolver'
import {
  matchOperationTypeFromText,
  matchPropertyTypeFromText,
} from './search-semantics'
import { extractFiltersFromQuery } from './search-term-extractor'

/** Réplica de `fallbackExtract` en apps/web/src/lib/llm.ts (sin dependencia de OpenAI). */
export function simulateFallbackPreliminary(message: string): ConversationalFlatIntent {
  const extracted = extractFiltersFromQuery(message)
  const lower = message.toLowerCase().trim()
  const out: ConversationalFlatIntent = {}

  if (extracted.operationType) out.operationType = extracted.operationType
  if (extracted.propertyType) out.propertyType = extracted.propertyType

  out.minPrice = extracted.minPrice
  out.maxPrice = extracted.maxPrice
  out.minBedrooms = extracted.minBedrooms
  out.minSurface = extracted.minSurface
  if (extracted.amenities?.length) {
    out.amenities = extracted.amenities as string[]
  }

  const inferredPlace = inferLocalityFromUserMessage(message)
  if (inferredPlace) {
    if (inferredPlace.kind === 'city') out.city = inferredPlace.canonical
    else out.neighborhood = inferredPlace.canonical
  } else {
    const tail = lower.match(/\ben\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*$/i)
    if (tail) {
      const place = tail[1]!.trim()
      if (place.length >= 2 && place.length <= 80) {
        const placeNorm = place.toLowerCase()
        const looksLikeOpOrType =
          matchOperationTypeFromText(placeNorm) != null ||
          matchPropertyTypeFromText(placeNorm) != null
        if (!looksLikeOpOrType) {
          if (place.split(/\s+/).length === 1 && place.length <= 20) {
            out.neighborhood = place
          } else {
            out.city = place
          }
        }
      }
    }
  }

  out.q = message.trim().slice(0, 200)
  return out
}
