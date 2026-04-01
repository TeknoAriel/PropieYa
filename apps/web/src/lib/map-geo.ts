/**
 * Normaliza coordenadas para el mapa de búsqueda: descarta basura y corrige
 * lat/lng invertidos frecuentes en datos del Cono Sur (p. ej. BA mal cargada).
 */
export function sanitizeListingCoordinates(
  lat: number,
  lng: number
): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return null

  // Heurística: "lat" cae en rango típico de longitud y "lng" en rango típico de latitud AR/UY/PY sur.
  const looksLikeSwapped =
    lng >= -55 &&
    lng <= -21 &&
    lat <= -45 &&
    lat >= -75
  if (looksLikeSwapped) {
    return { lat: lng, lng: lat }
  }

  return { lat, lng }
}
