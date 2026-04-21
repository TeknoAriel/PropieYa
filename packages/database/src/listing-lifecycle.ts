import { asc, eq } from 'drizzle-orm'

import { db } from './client'
import { listingLifecycleEvents } from './schema/listings'

export type ListingLifecycleWebhookStatus = 'pending' | 'sent' | 'skipped' | 'error'

export interface InsertListingLifecycleEventInput {
  listingId: string
  source: string
  actorUserId?: string | null
  previousStatus: string
  newStatus: string
  reasonCode: string
  reasonMessage: string
  details: Record<string, unknown>
  kitepropPayload: Record<string, unknown>
}

export async function insertListingLifecycleEvent(
  input: InsertListingLifecycleEventInput
): Promise<{ id: string } | null> {
  const [row] = await db
    .insert(listingLifecycleEvents)
    .values({
      listingId: input.listingId,
      source: input.source,
      actorUserId: input.actorUserId ?? null,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      reasonCode: input.reasonCode,
      reasonMessage: input.reasonMessage,
      details: input.details,
      kitepropPayload: input.kitepropPayload,
      kitepropWebhookStatus: 'pending',
    })
    .returning({ id: listingLifecycleEvents.id })

  return row ?? null
}

export async function updateListingLifecycleWebhookOutcome(
  id: string,
  status: ListingLifecycleWebhookStatus,
  options?: { error?: string | null; sentAt?: Date }
): Promise<void> {
  await db
    .update(listingLifecycleEvents)
    .set({
      kitepropWebhookStatus: status,
      kitepropWebhookError: options?.error ?? null,
      kitepropSentAt: status === 'sent' ? (options?.sentAt ?? new Date()) : null,
    })
    .where(eq(listingLifecycleEvents.id, id))
}

export async function listPendingListingLifecycleEvents(
  limit: number
): Promise<(typeof listingLifecycleEvents.$inferSelect)[]> {
  return db
    .select()
    .from(listingLifecycleEvents)
    .where(eq(listingLifecycleEvents.kitepropWebhookStatus, 'pending'))
    .orderBy(asc(listingLifecycleEvents.createdAt))
    .limit(Math.min(100, Math.max(1, limit)))
}
