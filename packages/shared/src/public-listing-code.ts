/**
 * Códigos públicos de aviso (Properstar / Kiteprop: `KP` + dígitos).
 * Solo reglas; sin inventario ni MCP.
 */

/** Patrón soportado: `KP` (mayúsc/minúsc) + separador opcional (espacio, guion, punto) + 5–14 dígitos. */
export const PUBLIC_LISTING_CODE_REGEX = /\b(kp)(?:[\s.\-_]*)?(\d{5,14})\b/gi

/**
 * Extrae el primer código válido del texto (p. ej. "casa KP486622" → KP486622).
 * Normalizado a mayúsculas `KP` + dígitos.
 */
export function extractPublicListingCodeFromQuery(q: string): string | null {
  if (!q?.trim()) return null
  const re = new RegExp(PUBLIC_LISTING_CODE_REGEX.source, 'i')
  const m = re.exec(q)
  if (!m?.[2]) return null
  return `KP${m[2]}`
}

/** Quita del texto libre el/los fragmentos que matchean el código (evita ruido en full-text). */
export function stripPublicListingCodeFromQuery(q: string, code: string): string {
  if (!q?.trim() || !code?.trim()) return q.trim()
  const digits = code.replace(/^kp/i, '').replace(/\D/g, '')
  if (!digits) return q.trim()
  const re = new RegExp(`\\bkp(?:[\\s.\\-_]*)?${digits}\\b`, 'gi')
  return q.replace(re, ' ').replace(/\s+/g, ' ').trim()
}

/** True si toda la consulta es solo un código (con separadores triviales). */
export function isQueryOnlyPublicListingCode(q: string): boolean {
  const t = q?.trim() ?? ''
  if (!t) return false
  const code = extractPublicListingCodeFromQuery(t)
  if (!code) return false
  const stripped = stripPublicListingCodeFromQuery(t, code)
  return stripped.length === 0
}
