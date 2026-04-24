# Política de ingesta Properstar / Kiteprop: cron, webhook, actualizaciones y modelo de negocio

**Estado:** mandato operativo para producción y pruebas. Complementa `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md` y `docs/44-IMPORT-PROPERSTAR-Y-DEPURACION.md`.

**Credenciales (no mezclar):** la **API key única de Kiteprop** (MCP, REST, properties, etc.) y cómo va en cabecera para MCP están en **`docs/58-KITEPROP-API-KEY-UNICA-MCP-Y-REST.md`**. Este documento (48) trata el **flujo de ingesta al portal** y los secretos **`KITEPROP_INGEST_WEBHOOK_SECRET`** / **`CRON_SECRET`** hacia PropieYa.

---

## 1. Fuente de datos

| Concepto | Detalle |
|----------|---------|
| **Formato** | Un único **JSON** de catálogo (Properstar vía Kiteprop). URL por defecto en código; override con `YUMBLIN_JSON_URL` / `YUMBLIN_JSON_URLS`. |
| **Identidad del aviso** | `external_id` (o homólogo mapeado en `mapYumblinItem`) + `organization_id` en base. |
| **Código de tipo de aviso (negocio)** | El feed debe exponer un **código** (string o enum) que el portal preserve para **mapear después** a categorías de producto: destacado, superdestacado, simple, u otras que defina el modelo de negocio. **Hoy:** persistir en `listings.features` bajo una clave estable acordada con Kiteprop (p. ej. `features.import.listingTierCode` o nombre que fijen en el contrato JSON). **Futuro:** columna dedicada + tabla/catálogo de mapeo código → tier visual / orden / pricing sin re-ingestar histórico. |

---

## 2. Cadencia: producción vs prueba

| Entorno | Objetivo | Cómo se implementa |
|---------|----------|-------------------|
| **Producción** | Ingesta **a pedido**; cron solo como respaldo poco frecuente (Hobby). | **Operación normal:** webhook `POST /api/webhooks/kiteprop-ingest` o llamada manual a `GET /api/cron/import-yumblin`. **Vercel Cron** en `vercel.json` / `apps/web/vercel.json`: `import-yumblin` con **`0 6 1,16 * *`** (días 1 y 16 de cada mes, ~cada 15 días, UTC) — compatible con plan Hobby (no más de una vez por día). **GitHub:** `.github/workflows/cron-import-yumblin.yml` **solo** `workflow_dispatch` (preparado para pruebas u operador; sin schedule). Para cadencia agresiva (p. ej. cada 30 min) hace falta **Vercel Pro** u otro scheduler externo. Variable **`IMPORT_SYNC_INTERVAL_HOURS`:** ajustar según política (p. ej. `0` si cada disparo debe intentar sync real). Crons diarios del portal: `check-validity`, `sync-search`. |
| **Prueba / staging** | Menos carga sobre origen y sobre DB; misma lógica que prod. | **Opción A:** dejar el cron de Vercel solo en **Production** (comportamiento habitual de Vercel: crons en deploys de producción). Previews sin cron automático. **Opción B:** en un proyecto o env de staging, `IMPORT_SYNC_INTERVAL_HOURS=48` para que, si el cron dispara más seguido, la mayoría de llamadas retornen `skipped: interval` sin bajar el JSON. **Opción C:** sin cron; solo **ingesta puntual** (webhook o CLI). |
| **Actualización bajo demanda** | Publicación inmediata tras un alta o cambio en origen. | **POST** `https://<dominio-canónico>/api/webhooks/kiteprop-ingest` con `Authorization: Bearer <KITEPROP_INGEST_WEBHOOK_SECRET>` (si no existe, se acepta `CRON_SECRET`). **No** aplica `IMPORT_SYNC_INTERVAL_HOURS`. Dispara el mismo pipeline que el cron (ver §5). |

**Nota:** El JSON sigue siendo **monolítico** (no hay API por ID en el flujo actual). El webhook **vuelve a descargar el feed completo** y aplica la política incremental por ítem.

---

## 3. Política de actualización por propiedad

1. **Clave en base:** por cada aviso importado se guardan entre otros **`external_id`**, **`import_source_updated_at`** (copia de `last_update` u homólogo del ítem en el JSON) e **`import_content_hash`** (hash del payload mapeado, incluye URLs de imágenes entre otros campos — ver `computeImportContentHash` en `@propieya/shared`).

2. **Si `last_update` del ítem en el JSON es distinto** de `import_source_updated_at` en DB **o** el hash de contenido cambió: se **reprocesa la ficha** (UPDATE de campos + **`listing_media`** reemplazada desde cero con las URLs del feed). Así se cubren cambios de texto **y** de galería aunque el proveedor solo moviera la marca temporal.

3. **Si el hash coincide pero cambió solo la marca temporal de origen** (`last_update`): igualmente se ejecuta **`replaceListingMedia`** y se actualiza `import_source_updated_at` (política explícita: **refrescar imágenes** cuando el origen declara nueva versión).

4. **Si `last_update` coincide** con DB y el resto del flujo no exige map: se **omite** reprocesar ese ítem (`skippedUnchangedBySourceTime`) para ahorrar CPU/IO.

5. **Nivel feed completo:** si el HTTP devuelve **304** o el **SHA-256 del body** no cambió respecto a `import_feed_sources`, se puede cortar el run sin re-leer ítems (comportamiento ya implementado).

---

## 4. Bajas (avisos que dejan de venir en el JSON)

1. Tras parsear el JSON, se conoce el conjunto de **`external_id` presentes**.

2. Los registros `listings` con `source = import`, `external_id` no nulo, **pertenecientes al scope de retiro** (`IMPORT_WITHDRAW_SCOPE`, recomendado **`org`** con un solo feed activo) cuyo `external_id` **no** está en ese conjunto pasan a estado **`withdrawn`**.

3. **Guardas antes de retiros masivos**
   - **Tamaño vs. histórico:** baseline = `max(last_trusted_full_feed_item_count, count(listings import con external_id))`. Si el baseline ≥ `IMPORT_WITHDRAW_SHRINK_GUARD_MIN_BASELINE` (default 150) y el feed parseado tiene **menos** ítems que el umbral, **no** se retira en bloque. El umbral es `floor(baseline × IMPORT_WITHDRAW_SHRINK_GUARD_FRACTION)` (default 0,2) y, si el baseline ≥ `IMPORT_WITHDRAW_SHRINK_GUARD_LARGE_BASELINE` (default 4000), **no menos** que `IMPORT_WITHDRAW_SHRINK_GUARD_ABS_FLOOR` (default 800), para que catálogos enormes no acepten feeds ridículamente pequeños.
   - **Ratio de inválidos:** si el feed tiene al menos `IMPORT_WITHDRAW_INVALID_RATIO_MIN_FEED` ítems (default 40) y más del `IMPORT_WITHDRAW_INVALID_RATIO_MAX` (default 0,75) fallan el mapeo, se asume esquema/feed roto y **no** se aplican bajas masivas (`shrinkGuardDetails.reason = invalid_ratio`).
   - **Cron sin bajas:** con **`IMPORT_CRON_SKIP_WITHDRAW=true`**, las llamadas GET al cron (`enforceInterval` como en `/api/cron/import-yumblin`) **no** ejecutan retiros por feed; siguen valiendo 304 / hash del body (no re-descarga si no cambió el JSON) y se procesan altas/actualizaciones. Las bajas quedan para **`POST /api/webhooks/kiteprop-ingest`** (u operador). Recomendado en producción si Kiteprop notifica cambios por webhook. La respuesta puede incluir `withdrawSkippedDueToCronPolicy` / `cronWithdrawSkipped` en el pipeline. **Default operativo actual en código:** `true` salvo override explícito.
   - **Publicación import en modo seguro (lanzamiento):** con **`IMPORT_PUBLISH_SAFE_MODE=true`** (default operativo), los avisos import solo se bloquean por hard blockers (sin `external_id`, sin operación, sin tipo, sin ubicación mínima o payload roto). Reglas blandas (p. ej. precio no soportado o pocas fotos) no provocan despublicación masiva; se registran para mejora por capas.
   - Para una caída real de inventario por debajo de los umbrales, usar **`IMPORT_WITHDRAW_SHRINK_GUARD_DISABLE=1`** en esa corrida (y volver a quitarlo). La respuesta del sync puede incluir `withdrawSkippedDueToShrinkGuard` y `shrinkGuardDetails` (`reason`: `feed_size` | `invalid_ratio`).

4. **Elasticsearch:** por cada ID retirado en ese run se llama **`removeListingFromSearch`** (el documento deja el índice).

5. **“Todos los feeds o listing”:** en este modelo, “feed” = el JSON de import; los avisos manuales del panel **no** tienen `source=import` y **no** se retiran por esta regla. No hay otro caché de listados en servidor sustituto de DB/ES; **cachés de cliente** (navegador, comparador en `localStorage`, etc.) son eventualmente consistentes al refrescar o al navegar.

6. Si el índice ES quedara desincronizado tras incidentes: **`pnpm reindex:es`** (o cron `sync-search`) según `docs/37` §4.

---

## 5. Rutas y secretos

| Ruta | Método | Uso |
|------|--------|-----|
| `/api/cron/import-yumblin` | GET | Vercel Cron ~2×/mes (ver §2); **workflow_dispatch** en GitHub para disparo manual. `Authorization: Bearer <CRON_SECRET>` si `CRON_SECRET` está definido. Respeta `IMPORT_SYNC_ENFORCE_INTERVAL` y `IMPORT_SYNC_INTERVAL_HOURS` salvo `IMPORT_SYNC_ENFORCE_INTERVAL=false`. |
| `/api/webhooks/kiteprop-ingest` | POST | Push desde Kiteprop (o operador). `Bearer <KITEPROP_INGEST_WEBHOOK_SECRET>` preferido; si no hay, `CRON_SECRET`. Cuerpo JSON **opcional** (solo trazabilidad). **Siempre** `enforceInterval: false`. |

Variables relacionadas: `docs/37` §3 y `.env.example` (`IMPORT_SYNC_INTERVAL_HOURS` admite **decimales**, p. ej. `0.5` = 30 min entre ejecuciones **reales** si no se usa `0`).

---

## 6. Elasticsearch y cron `sync-search`

El pipeline del **import** publica borradores nuevos y elimina de ES los **withdrawn** de ese run. Los avisos **ya activos** que solo se **actualizan** en DB pueden quedar en ES hasta el próximo **`/api/cron/sync-search`** o reindex manual. Con ingesta a pedido y cron de import espaciado, la paridad en `/buscar` depende del webhook/cron `sync-search` (hoy diario en `vercel.json`).

---

## 7. Checklist operativo (agente)

1. Production: `CRON_SECRET` en Vercel si se quiere proteger GET cron/webhook; opcionalmente el mismo secreto en GitHub solo si se usa **workflow_dispatch** manual; `IMPORT_SYNC_INTERVAL_HOURS` según política; feed URL; `IMPORT_WITHDRAW_SCOPE=org` si un solo feed. Aplicar en Neon (o `pnpm db:push`) la columna `import_feed_sources.last_trusted_full_feed_item_count` (`docs/sql/add-import-feed-last-trusted-count.sql` en el manifest de `pnpm db:sql:apply`).
2. Webhook: definir `KITEPROP_INGEST_WEBHOOK_SECRET` y configurar en Kiteprop la URL POST del dominio canónico.
3. Contrato JSON: documentar el **campo del código de tipo de aviso** y la clave en `features` donde se guardará hasta tener columna dedicada.
4. Tras cambiar `vercel.json` (crons): referencia en `docs/DEPLOY-CONTEXTO-AGENTES.md` (excepción autorizada por propietario 2026-03-31).

---

*Documento vivo; alinear con cambios de mapping ES o nuevas columnas de tier.*
