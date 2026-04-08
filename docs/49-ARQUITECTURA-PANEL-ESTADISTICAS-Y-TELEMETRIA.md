# Arquitectura: panel de estadísticas del portal y telemetría

**Objetivo:** que el panel (B2B y, más adelante, vistas operativas del portal) pueda mostrar **métricas precisas y completas** sin reescribir datos cada vez. Este documento fija **capas**, **fuentes actuales**, **terminales de instrumentación** y **fases de evolución**.

**Contrato de nombres:** `PORTAL_STATS_TERMINALS` en `@propieya/shared` (`analytics/portal-stats-terminals.ts`) — usar solo esos IDs al añadir hooks en código.

---

## 1. Principios

1. **Separar hechos, agregados y presentación**
   - **Hechos (raw):** evento o fila mínima con *qué*, *cuándo*, *contexto* (org, listing, sesión anonimizada).
   - **Agregados:** tablas/materialized views o jobs que suman por día/semana/org (el panel lee sobre todo agregados).
   - **Presentación:** tRPC/API de solo lectura + UI; sin lógica de negocio pesada en el cliente.

2. **Un solo vocabulario** entre portal web, panel e ingest: los IDs de `PORTAL_STATS_TERMINALS` evitan drift (`search_done` vs `listing_search`).

3. **Privacidad y minimización:** no guardar en hechos datos que no hagan falta para el KPI; PII solo cuando el rol lo exige (p. ej. lead con email en dominio leads, no en stream de analytics genérico).

4. **No bloquear UX:** escrituras de telemetría **asíncronas** (fire-and-forget, cola futura, o `try/catch` que no afecte la respuesta principal).

---

## 2. Estado actual del repo (fuentes ya útiles)

| Fuente | Qué mide | Límite hoy |
|--------|-----------|------------|
| `listings` (`view_count`, `contact_count`, …) | Agregados por aviso | `view_count` + fila en **`portal_stats_events`** vía **`listing.recordPublicView`**; log opcional `LOG_PORTAL_STATS=1` |
| `leads` | Contactos por listing/org | Ya es “hecho” de negocio; panel puede agregar |
| `search_history` | Búsquedas con sesión + filtros + `result_count` + `processing_time_ms` | Solo usuarios logueados en el camino actual |
| `listing.dashboardStats` (panel) | Conteos por estado de avisos del publicador | Agregado directo SQL |
| `conversations` / `conversation_messages` | Uso del asistente (mensajes, búsquedas asociadas) | Potencial para funnel búsqueda ↔ resultados |
| `import` cron + `import_feed_sources` | Ingesta, bajas, último sync | Operativo; combinar con inventario (`docs/37`, `docs/48`) |
| Logs `LOG_SEARCH_MS` | Latencia ES/SQL | Observabilidad técnica, no sustituye métricas de producto |

---

## 3. Arquitectura objetivo (capas)

```
[ Web / API / Cron ]  ──terminales──►  capa hechos  ──►  jobs/cron rollups  ──►  lecturas panel
                              │              │
                              │              └── opcional: export BI (BigQuery, etc.)
                              └── opcional: stream externo (Segment, PostHog) con mismo ID de evento
```

### 3.1 Capa de hechos

Tabla **`portal_stats_events`** (implementada), columnas:

- `id`, `created_at`
- `terminal_id` (varchar, valor de `PORTAL_STATS_TERMINALS`)
- `organization_id` (nullable si evento global o anónimo)
- `listing_id` (nullable)
- `user_id` (nullable; si el cliente envía JWT Bearer en tRPC)
- `payload` (jsonb pequeño: `{ "source": "es", "hasMap": true }` — sin PII)

Índices: `(terminal_id, created_at)`, `(organization_id, created_at)`, `(listing_id, created_at)`.

**Retención:** política por entorno (p. ej. 90 días raw + agregados indefinidos).

### 3.2 Capa de agregados

- **Vistas materializadas** o tablas `stats_daily_org`, `stats_daily_listing` actualizadas por cron (Vercel cron o worker futuro).
- Consultas del panel: **solo** contra agregados + tablas de negocio existentes (`leads`, `listings`), no full scan de millones de eventos en request.

### 3.3 API panel / portal admin

- **Implementado:** `stats.portalActivityByTerminal` (sesión requerida): con `organizationId` agrega por org; sin org, solo eventos cuyo `listing_id` pertenece al publicador. Etiquetas humanas: `portalStatsTerminalLabel` en `@propieya/shared`.
- **Futuro:** `stats.orgSummary`, embudos, rol admin plataforma para agregados globales.

---

## 4. Terminales (mapa mental)

Cada terminal es un **punto único** en código donde se registrará el hecho (ahora o en la siguiente fase). Lista canónica en código: `PORTAL_STATS_TERMINALS`.

| Área | Terminal (ejemplo) | Dónde cablear |
|------|---------------------|---------------|
| Búsqueda | `listing.search.executed` | **Implementado (Sprint 45):** primera página de `listing.search` (sin cursor, offset 0); `payload`: `total`, `source` (`es` \| `sql` \| `sql_underfill`), `tier` o `esEmpty` según camino |
| Ficha | `listing.ficha.view` | **Implementado:** tRPC `listing.recordPublicView` tras `getById` OK en `/propiedad/[id]` |
| Lead | `lead.submitted` | **Implementado (Sprint 46):** `lead.create` exitoso; `listingId`, `organizationId`, `payload.source` |
| Comparador | `listing.compare.add` / `listing.compare.view` | **Implementado (Sprint 46):** `listing.recordCompareAdd` (botón comparar) y `listing.recordCompareView` (`/comparar`, 2+ activos) |
| Asistente | `assistant.message.sent` / `assistant.search.triggered` | **`assistant.message.sent` (S46):** cada intento `searchConversational` tras rate limit; `lenBucket` s/m/l. **`assistant.search.triggered` (S45):** mutación exitosa |
| Demanda / alertas | `demand.profile.updated`, `search_alert.created` | **Implementado (Sprint 46):** `demand.upsertFromSearchFilters` y `searchAlert.create` |
| Auth | `auth.login.success` (opcional) | Tras login panel/portal |
| Ingesta | Ya cubierto por respuestas cron; opcional `ingest.run.completed` con counts en payload | Pipeline import |

---

## 5. Fases de implementación

| Fase | Entrega | Esfuerzo |
|------|---------|----------|
| **F0 (hecho)** | Doc 49 + `PORTAL_STATS_TERMINALS` en shared | Bajo |
| **F1** | **Hecho:** `listing.recordPublicView` (mutación pública) + incremento `view_count` al cargar ficha; log JSON si `LOG_PORTAL_STATS=1` con `PORTAL_STATS_TERMINALS.LISTING_FICHA_VIEW` | Medio |
| **F2** | **Hecho:** tabla Drizzle `portal_stats_events` (`packages/database/src/schema/portal-stats.ts`); helper `recordPortalStatsEvent` (`apps/web/src/lib/analytics/record-portal-stats-event.ts`); cableado en `listing.recordPublicView`. Aplicar esquema: **`pnpm db:push`** o `docs/sql/add-portal-stats-events.sql` en Neon. | Medio |
| **F3** | **v0 hecho:** tRPC `stats.portalActivityByTerminal` (agregación directa sobre `portal_stats_events` + suma `view_count` por org o por publicador); tarjeta en dashboard del panel. **Siguiente:** cron de rollups / vista métricas dedicada / más KPIs. | Alto |
| **F4** | Export externo, embudos multi-touch, experimentos A/B | Según negocio |

---

## 6. Relación con otros documentos

- Producto M14 / métricas: `docs/00-fundacion-producto.md`
- Arquitectura general: `docs/01-arquitectura-tecnica.md`
- Búsqueda medible: `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md`
- Ingesta operativa: `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md`

---

*Documento vivo; ejemplo de consulta agregada en F3.*

**Migración:** tras pull, `pnpm db:push` contra la `DATABASE_URL` del entorno. Si el insert falla (tabla inexistente), los logs muestran `[recordPortalStatsEvent]` sin romper la ficha.
