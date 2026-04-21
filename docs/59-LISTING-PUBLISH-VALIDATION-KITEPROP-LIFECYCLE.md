# Publicación, validación, vencimiento por contenido y notificaciones KiteProp

**Estado:** operativo. Complementa `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md` (ingesta) y el modelo de estados en `packages/shared/src/types/listing.ts`.

## 1. Diagnóstico / punto de inserción

| Punto | Rol |
|--------|-----|
| **`assessListingPublishability`** (`@propieya/shared`) | Reglas mínimas centralizadas (fotos, completitud, precio, ubicación). |
| **Ingesta** `packages/database/src/yumblin-import-sync.ts` | Decide `draft` / `active` / `rejected`, rebaja `active` si el feed deja de ser publicable, promoción validada de drafts, bajas `withdrawn` con evento. |
| **tRPC** `apps/web/src/server/routers/listing.ts` (`publish`, `update`, `renew`) | Publicación manual y rebaja por edición si el aviso activo deja de cumplir reglas. |
| **Cron** `GET /api/cron/listing-stale-content` | Vencimiento por contenido obsoleto → `expired`. |
| **Cron** `GET /api/cron/check-validity` | Vigencia por `expiresAt` → `suspended` + evento `LISTING_VALIDITY_EXPIRED`. |
| **Outbox** tabla `listing_lifecycle_events` + `flushPendingListingLifecycleWebhooks` | Trazabilidad y envío POST opcional a KiteProp. |

## 2. Qué cuenta como actualización de contenido

Se persiste en `listings.last_content_updated_at`:

- Primera publicación (`publish`) o publicación válida en import.
- Sync de import con **cambio real de payload** (`import_content_hash` distinto) mientras el aviso sigue **publicado** (`active` / `expiring_soon`).
- Edición manual en `listing.update` cuando se envían campos de contenido (tipo, operación, dirección, título, descripción, precio, superficie, ambientes, features, ubicación, etc.).

**No renueva** la marca: solo `view_count`, renovación de vigencia (`renew`), ni toques que no pasen por esos caminos.

## 3. Estados relevantes

| Estado interno | Uso |
|------------------|-----|
| `draft` | No publicado; puede recuperarse tras corregir feed o datos. |
| `pending_review` | Equiv. operativo a “pendiente de validación” (moderación). |
| `active` / `expiring_soon` | Publicado en portal. |
| `rejected` | Import sin `IMPORT_INGEST_AS_DRAFT` y validación fallida. |
| `expired` | Publicación retirada por **stale content** (cron). |
| `suspended` | Vigencia (`expiresAt`) vencida sin renovar. |
| `withdrawn` | Ya no está en el JSON del feed (baja import). |

## 4. Reason codes y mensajes

Definidos en `packages/shared/src/listing-reason-codes.ts` (`LISTING_REASON_CODES`, `LISTING_REASON_MESSAGES_ES`, `staleContentExpiredMessageEs` para texto con días).

## 5. Configuración (env)

Ver `.env.example` sección **Publicación de avisos + vencimiento por contenido**.

## 6. Payload de notificación (v1)

Tipo `KitepropListingLifecyclePayloadV1` en `packages/shared/src/listing-kiteprop-lifecycle-payload.ts`.

**Ejemplo:**

```json
{
  "version": 1,
  "timestamp": "2026-04-21T12:00:00.000Z",
  "source": "sync",
  "listingId": "uuid-interno",
  "externalId": "id-kiteprop",
  "statePrevious": "active",
  "stateNew": "draft",
  "reasonCode": "MIN_IMAGES_NOT_MET",
  "reasonMessage": "El aviso no fue publicado porque no cumple con el mínimo de imágenes.",
  "details": { "issues": [] },
  "kitepropIntegration": {
    "publishedBefore": true,
    "publishedAfter": false
  }
}
```

## 7. Webhook y outbox

- Inserción: `recordListingTransitionForKiteprop` → fila `listing_lifecycle_events` con `kiteprop_webhook_status = pending`.
- Envío: `flushPendingListingLifecycleWebhooks` (tras import pipeline, cron de vigencia y cron de stale).
- Si `KITEPROP_LISTING_LIFECYCLE_WEBHOOK_URL` está vacío, las filas pasan a `skipped` (auditoría conservada).

## 8. SQL / migración

Script manual: `docs/sql/add-listing-lifecycle-and-content-at.sql`. En desarrollo: `pnpm db:push` desde `@propieya/database`.

## 9. Tests

`packages/shared/src/listing-publishability.test.ts` — fotos, precio, válido mínimo, stale, payload v1.
