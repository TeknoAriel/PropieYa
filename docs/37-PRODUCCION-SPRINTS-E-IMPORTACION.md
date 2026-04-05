# Producción: sprints completados, panel e importación

**Objetivo:** que agentes y revisiones sepan qué está en código, qué debe verse en la URL pública y qué variables hacen falta. Fuente de tareas: `docs/24-sprints-y-hitos.md` (Sprints 1–9 marcados completos).

---

## 0. Causa #1 de “portal básico” o sin datos (2026-03-27)

- **`DATABASE_URL` no está definida en el proyecto Vercel `propie-ya-web` (Production).** El código de los sprints **sí** está en el deploy; el servidor no puede leer PostgreSQL.
- **Comprobar:** `curl -s https://propieyaweb.vercel.app/api/health` → si `status` es `degraded` y el error de `database` menciona `DATABASE_URL`, hay que **copiar la variable** desde Neon (o desde el proyecto Vercel anterior si aún existe) y **Redeploy**.
- Sin DB: no hay propiedades en home/buscar, fallan tRPC que consultan DB, registro/login pueden fallar, import/cron no persisten datos.
- **No confundir** con pérdida de código: revisar `git log` y `/api/version`; el commit desplegado incluye toda la app.
- **Schema nuevo (registro / pagos):** columnas `account_intent` en `users` y tabla `payment_webhook_events` (incluye índice único parcial `payment_webhook_provider_external_uidx` sobre `provider` + `external_event_id` cuando el id no es null). Ejecutar **`pnpm db:push`** (o migración Neon) en el entorno que use el portal; sin eso, registro o webhook pueden fallar al insertar. Si `db:push` falla por duplicados históricos en esa pareja, hay que limpiar filas duplicadas antes de aplicar el índice.

### GitHub: commits con “X” roja

- **Histórico:** en la lista de commits del PR, la X refleja el estado **del momento en que se pusheó** ese commit (p. ej. iteraciones de deploy); no reescribe el pasado aunque hoy el código sea bueno.
- **Estado combinado:** si el mismo repo tiene enlazados **varios proyectos Vercel** (web + panel), **uno solo en rojo** (p. ej. preview de `propieya-panel`) marca todo el commit como fallido aunque `propie-ya-web` esté en verde y el Promote ya haya publicado el portal.
- **Mitigación en repo:** `apps/panel/vercel.json` usa `ignoreCommand` con `turbo-ignore` para **no construir el panel** cuando el cambio no afecta `@propieya/panel`, evitando falsos rojos en PRs solo-web.
- **Duplicado web:** si siguen dos proyectos “portal” (`propieya_web` vs `propie-ya-web`), conviene dejar uno solo (`docs/11-vercel-proyecto-duplicado.md`).
- Criterio de producción: `GET /` = 200, `GET /api/health` y `/api/version` coherentes con `deploy/infra`.

---

## 1. Git vs lo que ves en el navegador

| Concepto | Detalle |
|----------|---------|
| **Portal web** (`propieyaweb.vercel.app`) | Se despliega con **GitHub Actions** al hacer push a **`deploy/infra`** (Vercel CLI desde la raíz del monorepo). Ver `docs/DEPLOY-CONTEXTO-AGENTES.md`. |
| **Rama `main`** | Debe **mantenerse al día** con `deploy/infra` (merge o PR). El workflow **no** fusiona solo a `main`; si `main` queda atrás, CI y clones no reflejan el último deploy del portal. |
| **Commit desplegado** | `curl -s https://propieyaweb.vercel.app/api/version` → `commit` / `branch`. |
| **Panel B2B** | Proyecto Vercel **aparte** (Root `apps/panel`). Suele construirse por **integración Git** con `main`. Si el panel “no tiene” Sprint 8 u otras mejoras, suele ser **panel sin redeploy** o `main` desactualizado. |

---

## 2. Sprints 1–9: qué validar en producción

| Sprint | Área | Comprobación rápida | Env crítico |
|--------|------|---------------------|-------------|
| 1 | Portal | `/buscar`, ficha propiedad, home: imágenes sin warnings | — |
| 2–3 | Vigencia + emails | Panel: renovar aviso; emails si Resend configurado | `DATABASE_URL`, jobs/cron, `RESEND_API_KEY`, `EMAIL_FROM` |
| 4 | Búsqueda | `/buscar` con ES; si no hay ES, fallback SQL | `ELASTICSEARCH_URL` (opcional) |
| 5–6 | Leads | Ficha → contacto; panel `/leads`; email al publicador | DB, `RESEND_*` |
| 7 | Conversacional | Home: input “contale a Propieya”; resultados | `OPENAI_API_KEY` (sin key hay fallback heurístico) |
| 8 | Panel | `/dashboard` stats, `/propiedades` badges vigencia | — |
| 9 | Demanda | `/buscar` motivos de coincidencia; `/perfil-demanda` con sesión | JWT/cookies en web |

Si falta **solo** configuración (DB, ES, OpenAI, email), la UI puede verse “incompleta” aunque el código esté desplegado.

---

## 3. Importación de propiedades (Yumblin / Kiteprop)

**Política operativa completa (cron 30 min prod, prueba 48 h, webhook push, bajas, código tipo de aviso):** `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md`.

### Catálogo visible (active vs draft)

- Por defecto, cada sync de Yumblin/Kiteprop **inserta y mantiene** los avisos del JSON como **`status: active`** (con `published_at`, `expires_at` según `LISTING_VALIDITY.MANUAL_VALIDITY_DAYS`), para que el portal liste **todo el feed** sin paso manual.
- Al final de cada sync completo, un **UPDATE masivo** pasa a `active` los importados que sigan en `draft` pero cuyo `external_id` sigue en el JSON (corrige histórico de ~14k drafts).
- Solo staging u operación especial: `IMPORT_INGEST_AS_DRAFT=true` vuelve a dejar ingesta en borrador; luego `pnpm publish:imported` publica en lote.

### Automático (cron)

- **Ruta:** `GET /api/cron/import-yumblin`
- **Definición:** `apps/web/vercel.json` y `vercel.json` (raíz) — schedule **`*/30 * * * *`** (UTC, cada 30 min) para producción; entre corridas reales usar **`IMPORT_SYNC_INTERVAL_HOURS=0`** en Vercel Production (ver doc 48).
- **Auth:** header `Authorization: Bearer <CRON_SECRET>` si `CRON_SECRET` está definido (recomendado en producción).
- **Lógica:** `packages/database/src/yumblin-import-sync.ts`, `runYumblinImportSyncAllSources`; pipeline HTTP en `apps/web/src/lib/cron/run-yumblin-import-pipeline.ts`.
- **Ingesta puntual (push Kiteprop):** `POST /api/webhooks/kiteprop-ingest` — mismo pipeline, sin intervalo; secret `KITEPROP_INGEST_WEBHOOK_SECRET` o `CRON_SECRET` (doc 48).
- **Feed default:** JSON Properstar en static.kiteprop.com (ver `docs/44-IMPORT-PROPERSTAR-Y-DEPURACION.md`). Variable **`YUMBLIN_JSON_URL`** lo sobreescribe. **`IMPORT_WITHDRAW_SCOPE`**: `org` (recomendado, un solo feed) vs `source` (legado). Columna **`import_source_updated_at`**: evita reprocesar ítems si `last_update` del feed no cambió; si cambia la marca temporal se **refrescan imágenes** aunque el hash de contenido coincida (`pnpm db:push` o `docs/sql/add-import-source-updated-at.sql` en Neon).
- **Si el buscador o tRPC muestran** `column "import_source_updated_at" does not exist` **en Neon:** el esquema Drizzle ya incluye la columna pero la base aún no. Ejecutar **una vez** el SQL en `docs/sql/add-import-source-updated-at.sql` (o `pnpm db:push` contra esa `DATABASE_URL`). El código del portal usa `listingsSelectPublic` en lecturas para tolerar DB atrasada, pero **INSERT/UPDATE del import** siguen necesitando la columna para el sync incremental óptimo.
- **Totales ingest vs manual (solo agregados):** `GET /api/inventory-stats` y la sección “Inventario e ingestión” en `/estado`. Los contadores por **ejecución** del cron siguen en el JSON de respuesta de `GET /api/cron/import-yumblin` (con `CRON_SECRET` si aplica).
- **Org/publisher:** si no hay `IMPORT_ORGANIZATION_ID` / `IMPORT_PUBLISHER_ID`, el código usa la **primera organización** y un **miembro** de esa org (requiere DB ya sembrada).

### Variables útiles en Vercel (web, Production)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Obligatorio para import y listados |
| `CRON_SECRET` | Protege crons |
| `YUMBLIN_JSON_URL` | Feed (default en código apunta al JSON Kiteprop público) |
| `IMPORT_SYNC_INTERVAL_HOURS` | Mínimo entre ejecuciones reales del cron (`0` = sin mínimo; admite decimales, p. ej. `48` en prueba). Ver doc 48 |
| `KITEPROP_INGEST_WEBHOOK_SECRET` | Opcional; auth del POST `/api/webhooks/kiteprop-ingest` |
| `IMPORT_ORGANIZATION_ID` / `IMPORT_PUBLISHER_ID` | Forzar org/usuario publicador |
| `LOG_SEARCH_MS` | `1` = logs JSON de rendimiento de `listing.search` en servidor (Vercel); ver `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md` |

**Búsqueda a escala y ritmo de producto:** `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md` (golden queries, ES/SQL, roadmap asistente).

**Telemetría portal (eventos):** tabla `portal_stats_events` — `pnpm db:push` o `docs/sql/add-portal-stats-events.sql`; detalle en `docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md`.

### Manual (operador / agente con CLI)

- `pnpm import:yumblin` — ver `scripts/import-yumblin-json.ts`
- `./scripts/verificar-ingestion.sh` — flujo completo: env pull, import, publish drafts, sync ES — ver `docs/35-VERIFICACION-INGESTA.md`
- Pipeline detallado: `docs/32-PIPELINE-DEPLOY-COMPLETO.md`

### Tipos de propiedad en feed Kiteprop / Yumblin (inglés y alias)

- El campo habitual es **`property_type`** con códigos en **inglés** (`houses`, `apartments`, `residential_lands`, `retail_spaces`, etc.), no solo español.
- **`mapFeedPropertyType`** / **`mapFeedPropertyTypeWithListingText`** (`packages/shared/src/map-feed-property-type.ts`): el feed se normaliza al enum interno; además, si el código dice “departamento” pero el **título o la descripción** describen otro tipo (terreno, PH, local, etc.), se usa el texto para no quedar todo como `apartment`.
- El mapper JSON (**`mapYumblinItem`**) usa `mapFeedPropertyTypeWithListingText`, resuelve claves con **mayúsculas/guiones** equivalentes (`typeProperty`, `type_property`, …) y busca **`typeproperty` anidado** si existiera.
- El hash **`computeImportContentHash`** incluye `propertyType`: si el mapper pasa a devolver otro tipo para el mismo aviso, el **siguiente import** detecta cambio y hace **UPDATE** de la fila.
- **Depuración:** `pnpm audit:yumblin-fields` (distribución en el JSON remoto), `pnpm audit:listing-types` (SQL + sospechosos “casa” en texto), `pnpm diff:import-types` (feed mapper vs DB por `external_id`).
- **Reclasificación en DB (sin esperar al próximo import):** `pnpm reclassify:listing-types` (dry-run). Con **`APPLY=1`** escribe cambios (por defecto solo **apartment → otro** cuando el texto lo justifica). Con **`RECLASSIFY_ALL=1`** compara cualquier tipo actual con la sugerencia (más riesgoso). Después conviene **`pnpm reindex:es`** si usás Elasticsearch.

---

## 4. Jobs, sync y calidad de datos (visibilidad operativa)

| Job / comando | Qué hace | Si falla |
|----------------|----------|----------|
| Cron `GET /api/cron/import-yumblin` | Import Yumblin/Kiteprop | `CRON_SECRET`, `DATABASE_URL`, logs del deploy |
| Cron `GET /api/cron/sync-search` | Listings activos → Elasticsearch | `ELASTICSEARCH_URL`, índice; luego `/api/health` |
| `pnpm reindex:es` (= `sync-search:local`) | Reindex manual | Mismo; ver `docs/DEPLOY-PASOS-URIs.md` |
| `pnpm dedup:apply` | Marca duplicados (`dedup_canonical_id`) | DB; conviene `reindex:es` después |

### 4.1 Elasticsearch: contrato estable (facets / Sprint 26.5)

- **Mapping en código:** `apps/web/src/lib/search/mapping.ts` (`amenities`, `feedAmenityRaw`, geo `location`, campos de ficha; `dedupCanonicalId` en mapping para cuando la columna exista en DB y se vuelva a indexar).
- **Documentos:** `listingToEsDoc` en `apps/web/src/lib/search/indexer.ts` debe alinearse con ese mapping.
- **Cuándo reindexar:** tras **cambiar el mapping**, tras **`pnpm dedup:apply`** en producción, o si el índice se creó antes de Sprint 26 y faltan campos. Comando: **`pnpm reindex:es`** (equivale a `sync-search:local` con `ELASTICSEARCH_URL` válida). Luego validar `/buscar` y cron `sync-search` en `docs/34-ELASTICSEARCH-BONSAI-CONFIG.md`.

**Geo:** avisos sin `location_lat` / `location_lng` no generan pin en el mapa de `/buscar`.

**Vigencia:** `expires_at` y flujo de renovación afectan estado en panel (`/propiedades`).

---

## 5. Health y diagnóstico

- `https://propieyaweb.vercel.app/api/health` — **200** si DB OK; **503** “degradado” si falta `DATABASE_URL` u otro servicio (app igual puede estar desplegada).
- `pnpm diagnostico:prod` — script del repo.

---

*Actualizado: 2026-03-31 (mapper tipo + título/descripción; script `reclassify:listing-types`; doc 48 ingest)*
