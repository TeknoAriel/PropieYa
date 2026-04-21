/**
 * Códigos técnicos de motivo para validación, bajas y notificaciones a KiteProp.
 * Extensible: agregar nuevos valores aquí + mensaje en LISTING_REASON_MESSAGES_ES.
 */
export const LISTING_REASON_CODES = [
  'MIN_IMAGES_NOT_MET',
  'UNSUPPORTED_PRICE',
  'MISSING_REQUIRED_FIELDS',
  'INVALID_LOCATION',
  'INVALID_PROPERTY_TYPE',
  'STALE_CONTENT_EXPIRED',
  'LISTING_VALIDITY_EXPIRED',
  'MANUALLY_UNPUBLISHED',
  'VALIDATION_FAILED',
  'IMPORT_FEED_WITHDRAWN',
] as const

export type ListingReasonCode = (typeof LISTING_REASON_CODES)[number]

export const LISTING_REASON_MESSAGES_ES: Record<ListingReasonCode, string> = {
  MIN_IMAGES_NOT_MET:
    'El aviso no fue publicado porque no cumple con el mínimo de imágenes.',
  UNSUPPORTED_PRICE:
    'El aviso no fue publicado porque el precio indicado no es soportado.',
  MISSING_REQUIRED_FIELDS:
    'El aviso fue rechazado porque faltan datos obligatorios para publicarlo.',
  INVALID_LOCATION:
    'El aviso no fue publicado porque la ubicación no alcanza el mínimo requerido.',
  INVALID_PROPERTY_TYPE:
    'El aviso no fue publicado porque el tipo de propiedad no es válido.',
  STALE_CONTENT_EXPIRED:
    'El aviso se dio de baja porque alcanzó el plazo de publicación sin actualizarse el contenido.',
  LISTING_VALIDITY_EXPIRED:
    'El aviso dejó de estar publicado por vencimiento de la vigencia sin renovación.',
  MANUALLY_UNPUBLISHED: 'El aviso se dio de baja de forma manual o por proceso interno.',
  VALIDATION_FAILED: 'El aviso no superó la validación de publicación.',
  IMPORT_FEED_WITHDRAWN:
    'El aviso se dio de baja porque ya no figura en el catálogo sincronizado.',
}

export function listingReasonMessage(code: ListingReasonCode): string {
  return LISTING_REASON_MESSAGES_ES[code]
}

/** Mensaje operativo con el umbral concreto (días) para vencimiento por contenido obsoleto. */
export function staleContentExpiredMessageEs(staleDays: number): string {
  const n = Math.max(1, Math.round(staleDays))
  return `El aviso se dio de baja porque alcanzó los ${n} días de publicación sin actualizarse el contenido.`
}
