import type { ListingReasonCode } from './listing-reason-codes'

export type ListingLifecycleNotificationSource =
  | 'validation'
  | 'expiration_job'
  | 'manual'
  | 'sync'
  | 'import_withdraw'

/**
 * Contrato JSON v1 hacia KiteProp (webhook u otro canal).
 * `statePrevious` / `stateNew` reflejan el varchar de `listings.status` en Propieya.
 */
export interface KitepropListingLifecyclePayloadV1 {
  version: 1
  timestamp: string
  source: ListingLifecycleNotificationSource
  listingId: string
  externalId: string | null
  statePrevious: string
  stateNew: string
  reasonCode: ListingReasonCode | string
  reasonMessage: string
  details: Record<string, unknown>
  /** Copia opcional del payload enviado (auditoría). */
  kitepropIntegration?: {
    /** Estado de negocio legible para operación (publicado = portal visible). */
    publishedBefore: boolean
    publishedAfter: boolean
  }
}

export function isListingPublishedLikeStatus(status: string): boolean {
  return status === 'active' || status === 'expiring_soon'
}

export function buildKitepropListingLifecyclePayloadV1(input: {
  source: ListingLifecycleNotificationSource
  listingId: string
  externalId: string | null
  statePrevious: string
  stateNew: string
  reasonCode: ListingReasonCode | string
  reasonMessage: string
  details: Record<string, unknown>
  at?: Date
}): KitepropListingLifecyclePayloadV1 {
  const at = input.at ?? new Date()
  return {
    version: 1,
    timestamp: at.toISOString(),
    source: input.source,
    listingId: input.listingId,
    externalId: input.externalId,
    statePrevious: input.statePrevious,
    stateNew: input.stateNew,
    reasonCode: input.reasonCode,
    reasonMessage: input.reasonMessage,
    details: input.details,
    kitepropIntegration: {
      publishedBefore: isListingPublishedLikeStatus(input.statePrevious),
      publishedAfter: isListingPublishedLikeStatus(input.stateNew),
    },
  }
}
