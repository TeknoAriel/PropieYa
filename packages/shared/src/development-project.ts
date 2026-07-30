/**
 * Agrupación de avisos `development_unit` en proyectos (emprendimientos).
 * La clave de proyecto se persiste en `features.developmentProjectKey` en import;
 * si falta, se deriva del título + ubicación.
 */

import type { OperationType, PropertyType } from './types/listing'

export type DevelopmentProjectFeatures = {
  developmentProjectKey?: string | null
  developmentProjectName?: string | null
  deliveryDate?: string | null
  kitepropAgency?: { name?: string | null }
  kitepropAssignedContact?: { full_name?: string | null }
}

export type DevelopmentListingRow = {
  id: string
  title: string
  description: string
  propertyType: PropertyType
  operationType: OperationType
  priceAmount: number
  priceCurrency: string
  surfaceTotal: number
  surfaceCovered: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: {
    city?: string | null
    neighborhood?: string | null
    street?: string | boolean | null
    number?: string | null
  }
  features: unknown
  primaryImageUrl: string | null
  externalId: string | null
}

export type DevelopmentProjectUnit = {
  id: string
  title: string
  operationType: OperationType
  priceAmount: number
  priceCurrency: string
  surfaceTotal: number
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  externalId: string | null
  primaryImageUrl: string | null
}

export type DevelopmentProjectSummary = {
  projectKey: string
  slug: string
  name: string
  city: string
  neighborhood: string | null
  addressSummary: string | null
  deliveryDate: string | null
  advertiserName: string | null
  heroImageUrl: string | null
  unitCount: number
  operationTypes: OperationType[]
  priceMin: number
  priceMax: number
  priceCurrency: string
  surfaceMin: number
  surfaceMax: number
  unitsPreview: DevelopmentProjectUnit[]
}

export type DevelopmentProjectDetail = DevelopmentProjectSummary & {
  description: string | null
  units: DevelopmentProjectUnit[]
}

const UNIT_TAIL =
  /\s*[-–|/]\s*(depto|dpto|departamento|departamentos|unidad|unidades|ambientes?|dormitorios?|monoambiente|loft|piso|cochera|financiado).*$/i

const MARKETING_PREFIX =
  /^(oportunidad de inversi[oó]n|excelente oportunidad|incre[ií]ble oportunidad|venta\.?|alquiler\.?)\s*[-–:]\s*/i

/** Extrae nombre de proyecto desde el título del aviso (unidad). */
export function extractDevelopmentProjectName(title: string): string {
  const raw = (title ?? '').trim()
  if (!raw) return 'Emprendimiento'

  const dash = raw.match(/^(.+?)\s*[-–]\s*(.+)$/)
  if (dash) {
    const tail = dash[2] ?? ''
    if (
      UNIT_TAIL.test(tail) ||
      /^\s*(depto|dpto|departamento|departamentos|unidad|unidades|ambientes?|dorm)/i.test(tail)
    ) {
      const head = (dash[1] ?? '').trim()
      if (head.length >= 4) return head
    }
  }

  let name = raw.replace(MARKETING_PREFIX, '').trim()
  name = name.replace(/\s*[-–|/]\s*(depto|dpto).+$/i, '').trim()
  name = name.replace(/\s+en\s+(venta|alquiler)\b.*$/i, '').trim()
  if (name.length < 4) return raw.slice(0, 120)
  return name.slice(0, 200)
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function slugPart(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function normalizeForKey(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/\b(en venta|en alquiler|en pozo|oportunidad|inversion|barrio|bº|depto|dpto)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Clave estable de agrupación (nombre proyecto + ciudad + barrio opcional). */
export function buildDevelopmentProjectKey(
  projectName: string,
  city: string,
  neighborhood?: string | null
): string {
  const n = normalizeForKey(projectName)
  const c = slugPart(city || 'argentina')
  const nb = neighborhood ? slugPart(neighborhood) : ''
  return nb ? `${slugPart(n)}|${c}|${nb}` : `${slugPart(n)}|${c}`
}

export function readDevelopmentProjectFromFeatures(
  features: unknown,
  fallbackTitle: string,
  city: string,
  neighborhood?: string | null
): { projectKey: string; projectName: string; deliveryDate: string | null } {
  const f = (features && typeof features === 'object' && !Array.isArray(features)
    ? features
    : {}) as DevelopmentProjectFeatures

  const projectName =
    (typeof f.developmentProjectName === 'string' && f.developmentProjectName.trim()) ||
    extractDevelopmentProjectName(fallbackTitle)

  const projectKey =
    (typeof f.developmentProjectKey === 'string' && f.developmentProjectKey.trim()) ||
    buildDevelopmentProjectKey(projectName, city, neighborhood)

  const deliveryDate =
    typeof f.deliveryDate === 'string' && f.deliveryDate.trim().length > 0
      ? f.deliveryDate.trim()
      : null

  return { projectKey, projectName, deliveryDate }
}

export function developmentProjectSlug(projectKey: string, projectName: string, city: string): string {
  const base = `${slugPart(projectName)}-${slugPart(city)}`
  const suffix = projectKey.split('|').join('-').slice(-12)
  return `${base}-${suffix}`.replace(/-+/g, '-').slice(0, 120)
}

function readFloor(features: unknown): number | null {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return null
  const floor = (features as { floor?: unknown }).floor
  return typeof floor === 'number' && Number.isFinite(floor) ? floor : null
}

function rowToUnit(row: DevelopmentListingRow): DevelopmentProjectUnit {
  return {
    id: row.id,
    title: row.title,
    operationType: row.operationType,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency,
    surfaceTotal: row.surfaceTotal,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floor: readFloor(row.features),
    externalId: row.externalId,
    primaryImageUrl: row.primaryImageUrl,
  }
}

function readAdvertiser(features: unknown): string | null {
  if (!features || typeof features !== 'object' || Array.isArray(features)) return null
  const f = features as DevelopmentProjectFeatures
  return (
    f.kitepropAgency?.name?.trim() ||
    f.kitepropAssignedContact?.full_name?.trim() ||
    null
  )
}

function addressSummary(row: DevelopmentListingRow): string | null {
  const a = row.address
  const parts: string[] = []
  if (a.neighborhood) parts.push(String(a.neighborhood))
  if (a.city) parts.push(String(a.city))
  return parts.length > 0 ? parts.join(', ') : null
}

/** Agrupa filas `development_unit` en proyectos con rangos y preview de unidades. */
export function groupListingsIntoDevelopmentProjects(
  rows: DevelopmentListingRow[]
): DevelopmentProjectSummary[] {
  const byKey = new Map<string, DevelopmentListingRow[]>()

  for (const row of rows) {
    const city = String(row.address?.city ?? '').trim() || 'Argentina'
    const neighborhood = row.address?.neighborhood
      ? String(row.address.neighborhood).trim()
      : null
    const { projectKey } = readDevelopmentProjectFromFeatures(
      row.features,
      row.title,
      city,
      neighborhood
    )
    const list = byKey.get(projectKey) ?? []
    list.push(row)
    byKey.set(projectKey, list)
  }

  const projects: DevelopmentProjectSummary[] = []

  for (const [projectKey, units] of byKey) {
    const first = units[0]!
    const city = String(first.address?.city ?? '').trim() || 'Argentina'
    const neighborhood = first.address?.neighborhood
      ? String(first.address.neighborhood).trim()
      : null
    const { projectName, deliveryDate } = readDevelopmentProjectFromFeatures(
      first.features,
      first.title,
      city,
      neighborhood
    )

    const prices = units.map((u) => u.priceAmount).filter((n) => Number.isFinite(n))
    const surfaces = units.map((u) => u.surfaceTotal).filter((n) => Number.isFinite(n))
    const currency = first.priceCurrency || 'USD'
    const operationTypes = [...new Set(units.map((u) => u.operationType))]

    const sortedUnits = [...units].sort((a, b) => a.priceAmount - b.priceAmount)
    const mapped = sortedUnits.map(rowToUnit)

    projects.push({
      projectKey,
      slug: developmentProjectSlug(projectKey, projectName, city),
      name: projectName,
      city,
      neighborhood,
      addressSummary: addressSummary(first),
      deliveryDate,
      advertiserName: readAdvertiser(first.features),
      heroImageUrl:
        sortedUnits.find((u) => u.primaryImageUrl)?.primaryImageUrl ?? null,
      unitCount: units.length,
      operationTypes,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      priceCurrency: currency,
      surfaceMin: surfaces.length ? Math.min(...surfaces) : 0,
      surfaceMax: surfaces.length ? Math.max(...surfaces) : 0,
      unitsPreview: mapped.slice(0, 4),
    })
  }

  return projects.sort((a, b) => b.unitCount - a.unitCount || a.name.localeCompare(b.name, 'es'))
}

export function findDevelopmentProjectBySlug(
  projects: DevelopmentProjectSummary[],
  slug: string
): DevelopmentProjectSummary | undefined {
  return projects.find((p) => p.slug === slug)
}

export function buildDevelopmentProjectDetail(
  project: DevelopmentProjectSummary,
  rows: DevelopmentListingRow[]
): DevelopmentProjectDetail {
  const sorted = [...rows].sort((a, b) => a.priceAmount - b.priceAmount)
  const description =
    rows.find((r) => r.description && r.description.length > 80)?.description?.slice(0, 2000) ??
    null
  return {
    ...project,
    description,
    units: sorted.map(rowToUnit),
  }
}

/** Campos a persistir en import desde ítem de feed. */
export function developmentProjectFieldsFromFeedItem(
  item: Record<string, unknown>,
  mappedTitle: string,
  city: string,
  neighborhood?: string | null
): DevelopmentProjectFeatures {
  const projectName = extractDevelopmentProjectName(mappedTitle)
  const projectKey = buildDevelopmentProjectKey(projectName, city, neighborhood)
  const deliveryRaw = item.delivery_date ?? item.deliveryDate
  const deliveryDate =
    deliveryRaw != null && String(deliveryRaw).trim().length > 0
      ? String(deliveryRaw).trim()
      : null
  return {
    developmentProjectKey: projectKey,
    developmentProjectName: projectName,
    ...(deliveryDate ? { deliveryDate } : {}),
  }
}
