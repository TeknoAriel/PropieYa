# Política de ingesta Properstar / Kiteprop: cron, webhook, actualizaciones y modelo de negocio

**Estado:** mandato operativo para producción y pruebas. Complementa `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md` y `docs/44-IMPORT-PROPERSTAR-Y-DEPURACION.md`.

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
| **Producción** | Mantener el portal alineado al JSON con latencia baja. | **Vercel Cron** en `apps/web/vercel.json` y `vercel.json` (raíz): ruta `GET /api/cron/import-yumblin`, schedule **`*/30 * * * *`** (cada 30 minutos, UTC). Variable **`IMPORT_SYNC_INTERVAL_HOURS=0`** en Vercel Production para que **cada tick del cron ejecute** sync real (sin saltarse por intervalo). |
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

3. **Elasticsearch:** por cada ID retirado en ese run se llama **`removeListingFromSearch`** (el documento deja el índice).

4. **“Todos los feeds o listing”:** en este modelo, “feed” = el JSON de import; los avisos manuales del panel **no** tienen `source=import` y **no** se retiran por esta regla. No hay otro caché de listados en servidor sustituto de DB/ES; **cachés de cliente** (navegador, comparador en `localStorage`, etc.) son eventualmente consistentes al refrescar o al navegar.

5. Si el índice ES quedara desincronizado tras incidentes: **`pnpm reindex:es`** (o cron `sync-search`) según `docs/37` §4.

---

## 5. Rutas y secretos

| Ruta | Método | Uso |
|------|--------|-----|
| `/api/cron/import-yumblin` | GET | Vercel Cron; `Authorization: Bearer <CRON_SECRET>` si `CRON_SECRET` está definido. Respeta `IMPORT_SYNC_ENFORCE_INTERVAL` y `IMPORT_SYNC_INTERVAL_HOURS` salvo `IMPORT_SYNC_ENFORCE_INTERVAL=false`. |
| `/api/webhooks/kiteprop-ingest` | POST | Push desde Kiteprop (o operador). `Bearer <KITEPROP_INGEST_WEBHOOK_SECRET>` preferido; si no hay, `CRON_SECRET`. Cuerpo JSON **opcional** (solo trazabilidad). **Siempre** `enforceInterval: false`. |

Variables relacionadas: `docs/37` §3 y `.env.example` (`IMPORT_SYNC_INTERVAL_HOURS` admite **decimales**, p. ej. `0.5` = 30 min entre ejecuciones **reales** si no se usa `0`).

---

## 6. Elasticsearch y cron `sync-search`

El pipeline del **import** publica borradores nuevos y elimina de ES los **withdrawn** de ese run. Los avisos **ya activos** que solo se **actualizan** en DB pueden quedar en ES hasta el próximo **`/api/cron/sync-search`** o reindex manual. Con ingest cada 30 min, **conviene** revisar la cadencia de `sync-search` en `vercel.json` (hoy diaria) si se exige paridad casi inmediata en `/buscar`; cambio sujeto a coste y plan Vercel.

---

## 7. Checklist operativo (agente)

1. Production: `IMPORT_SYNC_INTERVAL_HOURS=0`, `CRON_SECRET`, feed URL, `IMPORT_WITHDRAW_SCOPE=org` si un solo feed.
2. Webhook: definir `KITEPROP_INGEST_WEBHOOK_SECRET` y configurar en Kiteprop la URL POST del dominio canónico.
3. Contrato JSON: documentar el **campo del código de tipo de aviso** y la clave en `features` donde se guardará hasta tener columna dedicada.
4. Tras cambiar `vercel.json` (crons): referencia en `docs/DEPLOY-CONTEXTO-AGENTES.md` (excepción autorizada por propietario 2026-03-31).

---

*Documento vivo; alinear con cambios de mapping ES o nuevas columnas de tier.*
