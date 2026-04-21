import type { Database } from '@propieya/database'
import {
  listPendingListingLifecycleEvents,
  updateListingLifecycleWebhookOutcome,
} from '@propieya/database'

function webhookUrl(): string | null {
  const u = process.env.KITEPROP_LISTING_LIFECYCLE_WEBHOOK_URL?.trim()
  return u && u.startsWith('http') ? u : null
}

function webhookAuthHeader(): Record<string, string> {
  const secret =
    process.env.KITEPROP_LISTING_LIFECYCLE_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim()
  if (!secret) return {}
  return { Authorization: `Bearer ${secret}` }
}

/**
 * Procesa eventos `pending` de `listing_lifecycle_events`: POST JSON al webhook de KiteProp si hay URL;
 * si no, marca `skipped`. Idempotente por fila.
 */
export async function flushPendingListingLifecycleWebhooks(
  _db: Database,
  limit = 25
): Promise<{ processed: number; sent: number; skipped: number; errors: number }> {
  const url = webhookUrl()
  const rows = await listPendingListingLifecycleEvents(limit)
  let sent = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    if (!url) {
      await updateListingLifecycleWebhookOutcome(row.id, 'skipped', { error: null })
      skipped++
      continue
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...webhookAuthHeader(),
        },
        body: JSON.stringify(row.kitepropPayload),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        await updateListingLifecycleWebhookOutcome(row.id, 'error', {
          error: `HTTP ${res.status} ${body.slice(0, 500)}`,
        })
        errors++
      } else {
        await updateListingLifecycleWebhookOutcome(row.id, 'sent', {})
        sent++
      }
    } catch (e) {
      await updateListingLifecycleWebhookOutcome(row.id, 'error', {
        error: e instanceof Error ? e.message : String(e),
      })
      errors++
    }
  }

  return { processed: rows.length, sent, skipped, errors }
}
