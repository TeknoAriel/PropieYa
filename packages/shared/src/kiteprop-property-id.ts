/**
 * ID numérico de propiedad en KiteProp para POST /api/v1/messages (`property_id`).
 * El portal guarda `public_code` (KP…) en `listings.externalId` y el `id` del feed en
 * `features.kitepropPropertyId` cuando está disponible.
 */

export type KitepropPropertyIdInput = {
  /** ID numérico persistido en import (`features.kitepropPropertyId`). */
  kitepropPropertyId?: string | number | null
  propertyId?: string | number | null
  propertyCode?: string | null
  externalId?: string | null
}

/** Parsea un identificador KiteProp a entero positivo (id REST o sufijo de KP…). */
export function parseKitepropNumericPropertyId(
  value: string | number | null | undefined
): number | null {
  if (value == null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    return Math.trunc(value)
  }
  const t = value.trim()
  if (t.length === 0) return null
  if (/^\d+$/.test(t)) {
    const n = Number.parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const tailDigits = t.match(/(\d{3,})$/)?.[1]
  if (tailDigits) {
    const parsed = Number.parseInt(tailDigits, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

/**
 * Resuelve el `property_id` para POST /messages.
 * Prioridad: id numérico del feed → property_id explícito → public_code / externalId.
 */
export function resolveKitepropPropertyIdForMessage(
  input: KitepropPropertyIdInput
): number | null {
  const fromStored = parseKitepropNumericPropertyId(input.kitepropPropertyId ?? undefined)
  if (fromStored != null) return fromStored
  const fromProperty = parseKitepropNumericPropertyId(input.propertyId ?? undefined)
  if (fromProperty != null) return fromProperty
  const fromCode = parseKitepropNumericPropertyId(input.propertyCode ?? undefined)
  if (fromCode != null) return fromCode
  const fromExternal = parseKitepropNumericPropertyId(input.externalId ?? undefined)
  if (fromExternal != null) return fromExternal
  return null
}

export function getKitepropPropertyIdFromListingFeatures(features: unknown): number | null {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return null
  const raw = (features as Record<string, unknown>).kitepropPropertyId
  return parseKitepropNumericPropertyId(
    typeof raw === 'number' || typeof raw === 'string' ? raw : null
  )
}

/** Solo el campo `id` del ítem de feed (no `public_code`). */
export function peekFeedKitepropNumericPropertyId(
  item: Record<string, unknown>
): number | null {
  const raw = item.id
  if (raw === undefined || raw === null) return null
  return parseKitepropNumericPropertyId(
    typeof raw === 'number' || typeof raw === 'string' ? raw : String(raw)
  )
}
