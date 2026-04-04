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

export type ConversationPrior = {
  userMessage: string
  intention: ExtractedIntention
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
      const systemBase = `Sos el extractor de intención de Propieya: plataforma inmobiliaria conversacional-first (Argentina, español rioplatense). La apuesta de producto es cambiar el paradigma de búsqueda (intención humana → mismo motor que filtros y mapa), no "un chat decorativo".

Tu salida NO es conversación con el usuario: solo JSON con filtros para el motor unificado.

Reglas:
- Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto extra.
- Campos opcionales: operationType (sale|rent|temporary_rent), propertyType (apartment|house|ph|land|office|commercial|warehouse|parking), city, neighborhood, minPrice, maxPrice, minBedrooms, minSurface, amenities (array de códigos en inglés: balcony, terrace, parking, pool, garden, bbq, air_conditioning, etc.), q (texto libre residual que no encaje en campos estructurados: ej. "luminoso", "reciclado a nuevo", "frente a plaza").
- Usá null para lo no detectado. Precios en números enteros (sin separadores de miles).
- Interpretá frases largas, matices y lenguaje coloquial o disruptivo si el usuario lo usa ("comprar", "alquilar", "depto", "casa quinta", "pileta", "quincho", "a refaccionar", "inversión fuerte").
- Capturá la intención aunque el usuario no use jerga de corredor; traducila a los campos anteriores.

Ejemplo: {"operationType":"rent","propertyType":"apartment","city":"Buenos Aires","neighborhood":"Palermo","minPrice":null,"maxPrice":200000,"minBedrooms":2,"minSurface":null,"amenities":["balcony"],"q":"luminoso"}`

      const systemFollowUp = `

Modo seguimiento: el usuario ya había buscado y ahora envía un mensaje corto para afinar (ej. "más barato", "en Belgrano", "con pileta", "sacá el tope de precio").
- Partí de los filtros previos que te damos en el mensaje de usuario y devolvé el JSON COMPLETO resultante (no un diff).
- Si el nuevo mensaje contradice un campo anterior, ganá el mensaje nuevo.
- "Más barato" / "más económico": bajá maxPrice ~15–20% o agregá tope si no había.
- "Otro barrio" sin nombre nuevo: dejá neighborhood en null y conservá ciudad si había.
- Frases como "igual pero con cochera": sumá amenity parking si aplica.`

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

  if (previous) {
    return mergeFollowUpFallback(message, previous.intention)
  }

  return fallbackExtract(message)
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
