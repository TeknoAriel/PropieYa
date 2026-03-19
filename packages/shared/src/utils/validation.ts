/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida teléfono argentino
 */
export function isValidPhoneAR(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 13
}

/**
 * Valida CUIT/CUIL argentino
 */
export function isValidCUIT(cuit: string): boolean {
  const cleaned = cuit.replace(/\D/g, '')
  if (cleaned.length !== 11) return false

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]!) * multipliers[i]!
  }

  const checkDigit = 11 - (sum % 11)
  const expectedDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit

  return parseInt(cleaned[10]!) === expectedDigit
}

/**
 * Valida coordenadas geográficas
 */
export function isValidGeoPoint(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

/**
 * Valida que un precio sea válido
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && price < 1000000000 && Number.isFinite(price)
}

/**
 * Valida que una superficie sea válida
 */
export function isValidSurface(surface: number): boolean {
  return surface > 0 && surface < 100000 && Number.isFinite(surface)
}

/**
 * Sanitiza HTML básico (para descripciones)
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Valida que una URL sea válida
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (_error) {
    return false
  }
}

/**
 * Valida UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}
