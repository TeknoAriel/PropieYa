/**
 * Abstracción LLM para extracción de intención conversacional.
 * Usa OpenAI si OPENAI_API_KEY está configurada; fallback a extractFiltersFromQuery.
 */

import OpenAI from 'openai'
import { extractFiltersFromQuery } from '@propieya/shared'

export interface ExtractedIntention {
  operationType?: 'sale' | 'rent' | 'temporary_rent'
  propertyType?: string
  city?: string
  neighborhood?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minSurface?: number
  amenities?: string[]
  /** Texto de búsqueda libre residual (ej. "luminoso", "cerca del subte") */
  q?: string
}

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) return null
  return new OpenAI({ apiKey: key })
}

/**
 * Extrae filtros estructurados del mensaje usando LLM (si disponible) o regex.
 */
export async function extractIntentionFromMessage(
  message: string
): Promise<ExtractedIntention> {
  const client = getOpenAIClient()
  if (client) {
    try {
      const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que extrae filtros de búsqueda inmobiliaria del texto del usuario.
Responde SOLO con un JSON válido, sin markdown ni texto adicional.
Campos posibles: operationType (sale|rent|temporary_rent), propertyType (apartment|house|ph|land|office|commercial|warehouse|parking), city, neighborhood, minPrice, maxPrice, minBedrooms, minSurface, amenities (array de strings: balcony, terrace, parking, pool, etc.), q (texto libre residual).
Usa null para campos no detectados. Precios en números (sin puntos de miles). Ejemplo: {"operationType":"rent","propertyType":"apartment","city":"Buenos Aires","neighborhood":"Palermo","minPrice":null,"maxPrice":200000,"minBedrooms":2,"minSurface":null,"amenities":["balcony"],"q":"luminoso"}`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
      })
      const content = response.choices[0]?.message?.content?.trim()
      if (content) {
        const parsed = JSON.parse(content) as Record<string, unknown>
        return normalizeIntention(parsed)
      }
    } catch (err) {
      console.warn('[llm] OpenAI error, falling back to regex:', err)
    }
  }

  return fallbackExtract(message)
}

function normalizeIntention(raw: Record<string, unknown>): ExtractedIntention {
  const out: ExtractedIntention = {}
  const op = raw.operationType
  if (op === 'sale' || op === 'rent' || op === 'temporary_rent') {
    out.operationType = op
  }
  if (typeof raw.propertyType === 'string' && raw.propertyType) {
    out.propertyType = raw.propertyType
  }
  if (typeof raw.city === 'string' && raw.city.trim()) {
    out.city = raw.city.trim()
  }
  if (typeof raw.neighborhood === 'string' && raw.neighborhood.trim()) {
    out.neighborhood = raw.neighborhood.trim()
  }
  const minP = Number(raw.minPrice)
  if (Number.isFinite(minP) && minP >= 0) out.minPrice = minP
  const maxP = Number(raw.maxPrice)
  if (Number.isFinite(maxP) && maxP >= 0) out.maxPrice = maxP
  const beds = Number(raw.minBedrooms)
  if (Number.isFinite(beds) && beds >= 0) out.minBedrooms = Math.floor(beds)
  const surf = Number(raw.minSurface)
  if (Number.isFinite(surf) && surf >= 0) out.minSurface = surf
  if (Array.isArray(raw.amenities)) {
    out.amenities = raw.amenities.filter(
      (a): a is string => typeof a === 'string' && a.length > 0
    )
  }
  if (typeof raw.q === 'string' && raw.q.trim()) {
    out.q = raw.q.trim()
  }
  return out
}

function fallbackExtract(message: string): ExtractedIntention {
  const extracted = extractFiltersFromQuery(message)
  const lower = message.toLowerCase().trim()
  const out: ExtractedIntention = {}

  if (extracted.operationType) out.operationType = extracted.operationType
  if (extracted.propertyType) out.propertyType = extracted.propertyType

  out.minPrice = extracted.minPrice
  out.maxPrice = extracted.maxPrice
  out.minBedrooms = extracted.minBedrooms
  out.minSurface = extracted.minSurface
  if (extracted.amenities?.length) {
    out.amenities = extracted.amenities
  }

  // city/neighborhood: intentar detectar con patrones comunes (ej. "en Palermo", "en Buenos Aires")
  const inMatch = lower.match(/\ben\s+([a-záéíóúñ\s]+?)(?:\s+con|\s+cerca|\s+hasta|$|,)/i)
  if (inMatch) {
    const place = inMatch[1]!.trim()
    if (place.length >= 2 && place.length <= 80) {
      // Asumir barrio si es una palabra corta, ciudad si es más larga
      if (place.split(/\s+/).length === 1 && place.length <= 20) {
        out.neighborhood = place
      } else {
        out.city = place
      }
    }
  }

  out.q = message.trim().slice(0, 200)
  return out
}
