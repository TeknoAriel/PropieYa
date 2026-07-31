/**
 * Horizonte de entrega para emprendimientos / unidades en pozo.
 * Usado en listado `/emprendimientos` y badges de proyecto.
 */

export type DevelopmentDeliveryHorizon = 'under_construction' | 'near_term' | 'unknown'

export const DEVELOPMENT_DELIVERY_HORIZON_LABELS: Record<
  DevelopmentDeliveryHorizon,
  string
> = {
  under_construction: 'En pozo / obra',
  near_term: 'Entrega próxima',
  unknown: 'Entrega a confirmar',
}

/** Filtro de URL/API: pozo = obra; proxima = a estrenar / < ~6 meses. */
export type DevelopmentDeliveryFilter = 'pozo' | 'proxima'

const MONTHS_ES: Record<string, number> = {
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  mar: 3,
  marzo: 3,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  jul: 7,
  julio: 7,
  ago: 8,
  agosto: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  set: 9,
  setiembre: 9,
  oct: 10,
  octubre: 10,
  nov: 11,
  noviembre: 11,
  dic: 12,
  diciembre: 12,
}

/** Intenta parsear fechas tipo «JUNIO 2027», «2027-06», «06/2027». */
export function parseDevelopmentDeliveryDate(
  raw: string | null | undefined,
  now = new Date()
): Date | null {
  if (!raw?.trim()) return null
  const s = raw.trim().toLowerCase()

  const iso = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3] ?? 1)
    if (y >= 2000 && m >= 1 && m <= 12) return new Date(y, m - 1, d)
  }

  const slash = s.match(/^(\d{1,2})[/.-](\d{4})$/)
  if (slash) {
    const m = Number(slash[1])
    const y = Number(slash[2])
    if (y >= 2000 && m >= 1 && m <= 12) return new Date(y, m - 1, 1)
  }

  const monthYear = s.match(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|sept|set|oct|nov|dic)\.?\s*(?:de\s+)?(\d{4})\b/i
  )
  if (monthYear) {
    const key = monthYear[1]!.toLowerCase().replace(/\.$/, '')
    const m = MONTHS_ES[key]
    const y = Number(monthYear[2])
    if (m && y >= 2000) return new Date(y, m - 1, 1)
  }

  const yearOnly = s.match(/\b(20[2-3]\d)\b/)
  if (yearOnly && !/\b\d{1,2}[/.-]\d{1,2}/.test(s)) {
    const y = Number(yearOnly[1])
    // Si solo hay año, asumir mitad de año
    return new Date(y, 5, 1)
  }

  // Evitar interpretar ruido con «now» vacío
  void now
  return null
}

function monthsFromNow(date: Date, now: Date): number {
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth())
}

/**
 * Infere horizonte: pozo/obra vs entrega próxima vs desconocido.
 */
export function inferDevelopmentDeliveryHorizon(input: {
  deliveryDate?: string | null
  title?: string
  description?: string
  now?: Date
}): DevelopmentDeliveryHorizon {
  const now = input.now ?? new Date()
  const blob = `${input.title ?? ''} ${input.description ?? ''} ${input.deliveryDate ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  const nearSignals =
    /\b(a estrenar|entrega inmediata|listo para habitar|ocupacion inmediata|ocupaci[oó]n inmediata|ya habitable|entrega inmediata)\b/.test(
      blob
    )
  const pozoSignals =
    /\b(en\s+pozo|en\s+obra|en\s+construcci[oó]n|en\s+desarrollo|emprendimiento\s+en\s+pozo|pozo\s+avanzado)\b/.test(
      blob
    ) && !/\bposibilidad(?:es)?\s+en\s+pozo\b/.test(blob)

  const parsed = parseDevelopmentDeliveryDate(input.deliveryDate, now)
  if (parsed) {
    const months = monthsFromNow(parsed, now)
    if (months > 6) return 'under_construction'
    if (months >= -1) return 'near_term'
  }

  // Año futuro en texto («entrega 2028»)
  const yearHit = blob.match(
    /\b(?:entrega|posesion|posesi[oó]n)\s*(?:estimada\s*)?(?:en\s*)?(20[2-3]\d)\b/
  )
  if (yearHit) {
    const y = Number(yearHit[1])
    if (y > now.getFullYear()) return 'under_construction'
    if (y === now.getFullYear() && now.getMonth() <= 5) return 'near_term'
  }

  if (pozoSignals) return 'under_construction'
  if (nearSignals) return 'near_term'

  return 'unknown'
}

export function developmentHorizonMatchesFilter(
  horizon: DevelopmentDeliveryHorizon,
  filter: DevelopmentDeliveryFilter
): boolean {
  if (filter === 'pozo') return horizon === 'under_construction'
  return horizon === 'near_term'
}

export function pickProjectDeliveryHorizon(
  unitHorizons: DevelopmentDeliveryHorizon[]
): DevelopmentDeliveryHorizon {
  if (unitHorizons.includes('under_construction')) return 'under_construction'
  if (unitHorizons.includes('near_term')) return 'near_term'
  return 'unknown'
}
