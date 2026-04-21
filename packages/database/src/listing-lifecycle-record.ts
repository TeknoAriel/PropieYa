import {
  buildKitepropListingLifecyclePayloadV1,
  type ListingLifecycleNotificationSource,
} from '@propieya/shared'

import { insertListingLifecycleEvent } from './listing-lifecycle'

/** Registra transición + payload v1 para outbox / auditoría (envío vía `flushPendingListingLifecycleWebhooks`). */
export async function recordListingTransitionForKiteprop(input: {
  listingId: string
  externalId: string | null
  previousStatus: string
  newStatus: string
  source: ListingLifecycleNotificationSource
  reasonCode: string
  reasonMessage: string
  details: Record<string, unknown>
  actorUserId?: string | null
}): Promise<{ id: string } | null> {
  const payload = buildKitepropListingLifecyclePayloadV1({
    source: input.source,
    listingId: input.listingId,
    externalId: input.externalId,
    statePrevious: input.previousStatus,
    stateNew: input.newStatus,
    reasonCode: input.reasonCode,
    reasonMessage: input.reasonMessage,
    details: input.details,
  })

  return insertListingLifecycleEvent({
    listingId: input.listingId,
    source: input.source,
    actorUserId: input.actorUserId ?? null,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    reasonCode: input.reasonCode,
    reasonMessage: input.reasonMessage,
    details: input.details,
    kitepropPayload: payload as unknown as Record<string, unknown>,
  })
}
