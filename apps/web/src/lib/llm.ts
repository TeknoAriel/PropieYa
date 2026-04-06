/**
 * Abstracción LLM para extracción de intención conversacional.
 * Usa OpenAI si OPENAI_API_KEY está configurada; heurísticas locales refuerzan y cubren huecos.
 */

import OpenAI from 'openai'
import {
  extractFiltersFromQuery,
  inferLocalityFromUserMessage,
  matchOperationTypeFromText,
  matchPropertyTypeFromText,
} from '@propieya/shared'

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
  /** Texto para el motor (típicamente el mensaje o lo que quedó libre tras estructurar). */
  q?: string
}

const CANONICAL_PROPERTY_TYPES = new Set([
  'apartment',
  'house',
  'ph',
  'land',
  'office',
  'commercial',
  'warehouse',
  'parking',
  'development_unit',
])

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) return null
  return new OpenAI({ apiKey: key })
}

export type ConversationPrior = {
  userMessage: string
  intention: ExtractedIntention
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  let s = content.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/u, '')
  }
  try {
    const parsed = JSON.parse(s) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function sanitizePropertyType(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return CANONICAL_PROPERTY_TYPES.has(t) ? t : undefined
}

/**
 * Une intención del modelo (o fallback previo) con heurísticas del mensaje y normaliza `q`
 * para el motor unificado (misma tubería que filtros clásicos).
 */
function finalizeConversationalIntention(
  message: string,
  intention: ExtractedIntention
): ExtractedIntention {
  const fb = fallbackExtract(message)
  const out: ExtractedIntention = {
    operationType: intention.operationType ?? fb.operationType,
    propertyType: sanitizePropertyType(intention.propertyType) ?? fb.propertyType,
    city: intention.city ?? fb.city,
    neighborhood: intention.neighborhood ?? fb.neighborhood,
    minPrice: intention.minPrice ?? fb.minPrice,
    maxPrice: intention.maxPrice ?? fb.maxPrice,
    minBedrooms: intention.minBedrooms ?? fb.minBedrooms,
    minSurface: intention.minSurface ?? fb.minSurface,
    amenities: [...new Set([...(intention.amenities ?? []), ...(fb.amenities ?? [])])],
    q: (intention.q?.trim() || message.trim()).slice(0, 200) || undefined,
  }
  if (out.propertyType && !CANONICAL_PROPERTY_TYPES.has(out.propertyType)) {
    delete out.propertyType
  }
  return out
}

/**
 * Extrae filtros estructurados del mensaje usando LLM (si disponible) o regex.
 * Con `previous`, interpretá el mensaje como refinamiento sobre filtros ya acordados.
 */
export async function extractIntentionFromMessage(
  message: string,
  previous?: ConversationPrior | null
): Promise<ExtractedIntention> {
  const client = getOpenAIClient()
  if (client) {
    try {
      const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
      const systemBase = `Sos el intérprete de búsqueda de Propieya (Argentina, español rioplatense). El usuario escribe en lenguaje natural; vos traducís a filtros JSON para el mismo motor que los filtros manuales y el mapa. No charlás: solo JSON.

Salida: un único objeto JSON (sin markdown, sin texto antes ni después).

Campos opcionales (omití clave o usá null si no aplica):
- operationType: "sale" | "rent" | "temporary_rent" (comprar/vendo/venta → sale; alquilar/alquiler → rent; temporal/airbnb → temporary_rent)
- propertyType: "apartment"|"house"|"ph"|"land"|"office"|"commercial"|"warehouse"|"parking"|"development_unit" (depto/monoambiente/loft → apartment; casa quinta/casa de campo → house; terreno/lote → land; local → commercial; galpón → warehouse; cochera → parking; emprendimiento/en pozo → development_unit)
- city, neighborhood: solo topónimos reales (ej. Rosario, Palermo, Córdoba). NUNCA pongas aquí "venta", "alquiler", "comprar", "departamento", "casa" como si fueran lugar.
- minPrice, maxPrice: enteros (sin puntos de miles)
- minBedrooms, minSurface: números si el usuario los da
- amenities: array de códigos en inglés permitidos en catálogo (balcony, terrace, parking, pool, garden, bbq, gym, laundry, etc.)
- q: solo matices que no entran arriba (ej. "luminoso", "frente al río", "a estrenar"). Si todo quedó en campos estructurados, q puede ser null o "".

Reglas:
- Frases como "casa en venta" → operationType sale; no inventes barrio "venta".
- "Depto en alquiler en Nueva Córdoba" → rent, apartment, neighborhood si corresponde al texto.
- Precios en pesos o USD según contexto; número entero.
- Si el mensaje es ambiguo en operación, elegí la más probable o null (el motor puede usar contexto de página).`

      const systemFollowUp = `

Modo seguimiento: ya hay una búsqueda previa (JSON en el mensaje de usuario). El nuevo texto es un refinamiento.
- Devolvé el JSON COMPLETO resultante (no un diff).
- Si contradice un campo anterior, gana el mensaje nuevo.
- "Más barato" / "más económico": bajá maxPrice ~15–20% si había tope.
- "Otro barrio" sin nombre: neighborhood null, conservá city si había.
- "Igual pero con cochera": sumá amenity parking si aplica.`

      const userContent = previous
        ? `[Búsqueda anterior]\nUsuario había dicho: ${previous.userMessage}\nFiltros inferidos (JSON): ${JSON.stringify(previous.intention)}\n\n[Nuevo mensaje — refiná o corregí]\n${message}`
        : message

      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemBase + (previous ? systemFollowUp : ''),
          },
          { role: 'user', content: userContent },
        ],
        temperature: 0.15,
        response_format: { type: 'json_object' },
      })
      const content = response.choices[0]?.message?.content?.trim()
      if (content) {
        const parsed = extractJsonObject(content)
        if (parsed) {
          return finalizeConversationalIntention(
            message,
            normalizeIntention(parsed)
          )
        }
      }
    } catch (err) {
      console.warn('[llm] OpenAI error, falling back to regex:', err)
    }
  }

  if (previous) {
    return finalizeConversationalIntention(
      message,
      mergeFollowUpFallback(message, previous.intention)
    )
  }

  return finalizeConversationalIntention(message, fallbackExtract(message))
}

/** Sin LLM: combina heurísticas locales con el estado previo. */
function mergeFollowUpFallback(
  message: string,
  base: ExtractedIntention
): ExtractedIntention {
  const lower = message.toLowerCase()
  const out: ExtractedIntention = { ...base }
  const ex = extractFiltersFromQuery(message)

  if (/más barat|más económ|menos caro|baj(a|á)\s+(el\s+)?precio/i.test(lower)) {
    if (out.maxPrice != null && out.maxPrice > 15_000) {
      out.maxPrice = Math.round(out.maxPrice * 0.84)
    }
  }
  if (/más caro|sub(i|í)\s+(el\s+)?(tope|precio)|presupuesto\s+más\s+alto/i.test(lower)) {
    if (out.maxPrice != null) {
      out.maxPrice = Math.round(out.maxPrice * 1.12)
    }
  }
  if (/sac(a|á)\s+(el\s+)?(tope|máximo)|sin\s+tope\s+de\s+precio|sin\s+límite\s+de\s+precio/i.test(lower)) {
    delete out.maxPrice
    delete out.minPrice
  }
  if (/otro\s+barrio|otra\s+zona|cambiar\s+(de\s+)?(barrio|zona)/i.test(lower)) {
    delete out.neighborhood
  }

  const fm = fallbackExtract(message)
  if (fm.neighborhood) out.neighborhood = fm.neighborhood
  if (fm.city) out.city = fm.city

  if (ex.operationType) out.operationType = ex.operationType
  if (ex.propertyType) out.propertyType = ex.propertyType
  if (ex.minPrice !== undefined) out.minPrice = ex.minPrice
  if (ex.maxPrice !== undefined) out.maxPrice = ex.maxPrice
  if (ex.minBedrooms !== undefined) out.minBedrooms = ex.minBedrooms
  if (ex.minSurface !== undefined) out.minSurface = ex.minSurface
  if (ex.amenities?.length) {
    const add = ex.amenities.map((a) => String(a))
    out.amenities = [...new Set([...(out.amenities ?? []), ...add])]
  }

  const trimmed = message.trim()
  if (
    trimmed.length >= 2 &&
    trimmed.length < 140 &&
    !/^más barat|^más económ|^menos caro|^otro barrio|^otra zona|^sac(a|á)\s+el|^sin\s+tope/i.test(
      trimmed
    )
  ) {
    out.q = [base.q, trimmed].filter(Boolean).join(' ').trim().slice(0, 200)
  }

  return out
}

function normalizeIntention(raw: Record<string, unknown>): ExtractedIntention {
  const out: ExtractedIntention = {}
  const op = raw.operationType
  if (op === 'sale' || op === 'rent' || op === 'temporary_rent') {
    out.operationType = op
  }
  if (typeof raw.propertyType === 'string' && raw.propertyType) {
    const sanitized = sanitizePropertyType(raw.propertyType)
    if (sanitized) out.propertyType = sanitized
  }
  if (typeof raw.city === 'string' && raw.city.trim()) {
    const c = raw.city.trim()
    const cLow = c.toLowerCase()
    if (
      matchOperationTypeFromText(cLow) == null &&
      matchPropertyTypeFromText(cLow) == null
    ) {
      out.city = c
    }
  }
  if (typeof raw.neighborhood === 'string' && raw.neighborhood.trim()) {
    const n = raw.neighborhood.trim()
    const nLow = n.toLowerCase()
    if (
      matchOperationTypeFromText(nLow) == null &&
      matchPropertyTypeFromText(nLow) == null
    ) {
      out.neighborhood = n
    }
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
