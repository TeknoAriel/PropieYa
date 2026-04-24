/**
 * Política operativa de cupos y perfiles de publicación (sin monetización completa).
 * `organizations.listingLimit` en base pisa los defaults; si es null, se usan reglas por tipo.
 */

/** Cupo por defecto para particulares (`individual_owner`) cuando no hay tope en DB. */
export const DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP = 3

export type OrganizationTypeForQuota =
  | 'individual_owner'
  | 'real_estate_agency'
  | string

/**
 * Tope efectivo de avisos que cuentan para cupo, o `null` = sin tope duro (p. ej. inmobiliaria free).
 * `listingLimit` en org: si es >= 0, manda; si no, default solo para particulares.
 */
export function effectiveListingLimit(params: {
  orgType: string
  /** Columna `organizations.listing_limit` (nullable) */
  listingLimit: number | null
}): number | null {
  if (params.listingLimit != null && params.listingLimit >= 0) {
    return params.listingLimit
  }
  if (params.orgType === 'individual_owner') {
    return DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP
  }
  return null
}

/** Estados que ya no consumen cupo (dado de baja / archivo). */
const EXCLUDED_FROM_QUOTA: ReadonlySet<string> = new Set(['archived', 'withdrawn'])

export function listingStatusCountsTowardQuota(status: string): boolean {
  return !EXCLUDED_FROM_QUOTA.has(status)
}

export function isPublisherOrganizationStatusBlocked(
  status: string
): boolean {
  return status === 'suspended' || status === 'inactive'
}

export function publisherProfileLabel(params: {
  orgType: string
  accountIntent: string
}): 'dueño directo' | 'inmobiliaria' | 'publicador' {
  if (params.orgType === 'individual_owner') {
    return 'dueño directo'
  }
  if (params.orgType === 'real_estate_agency') {
    return 'inmobiliaria'
  }
  return 'publicador'
}

export function nearListingQuota(used: number, cap: number | null): boolean {
  if (cap == null || cap <= 0) return false
  if (used >= cap) return false
  if (cap <= 3) return used >= cap - 1
  return used / cap >= 0.8
}
