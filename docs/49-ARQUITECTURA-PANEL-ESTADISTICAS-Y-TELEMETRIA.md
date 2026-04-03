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
| `listings` (`view_count`, `contact_count`, …) | Agregados por aviso | `view_count` existe en schema; **falta** terminal servidor que lo incremente al ver ficha pública |
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

### 3.1 Capa de hechos (fase siguiente recomendada)

Tabla tipo **`portal_stats_events`** (nombre tentativo), columnas mínimas sugeridas:

- `id`, `created_at`
- `terminal_id` (varchar, valor de `PORTAL_STATS_TERMINALS`)
- `organization_id` (nullable si evento global o anónimo)
- `listing_id` (nullable)
- `user_id` (nullable; anon session con `session_id` uuid si hace falta)
- `payload` (jsonb pequeño: `{ "source": "es", "hasMap": true }` — sin PII)

Índices: `(terminal_id, created_at)`, `(organization_id, created_at)`, `(listing_id, created_at)`.

**Retención:** política por entorno (p. ej. 90 días raw + agregados indefinidos).

### 3.2 Capa de agregados

- **Vistas materializadas** o tablas `stats_daily_org`, `stats_daily_listing` actualizadas por cron (Vercel cron o worker futuro).
- Consultas del panel: **solo** contra agregados + tablas de negocio existentes (`leads`, `listings`), no full scan de millones de eventos en request.

### 3.3 API panel / portal admin

- Procedimientos tRPC dedicados: `stats.orgSummary`, `stats.listingFunnel`, `stats.searchQuality` (nombres ilustrativos).
- Autorización: `organizationId` del contexto; rol admin plataforma para agregados globales (futuro).

---

## 4. Terminales (mapa mental)

Cada terminal es un **punto único** en código donde se registrará el hecho (ahora o en la siguiente fase). Lista canónica en código: `PORTAL_STATS_TERMINALS`.

| Área | Terminal (ejemplo) | Dónde cablear |
|------|---------------------|---------------|
| Búsqueda | `listing.search.executed` | Tras `listing.search` exitoso (ya hay `search_history` si sesión; alinear nombre / duplicar como evento si hace falta anon) |
| Ficha | `listing.ficha.view` | Server Component / route handler de `/propiedad/[id]` o tRPC `listing.getPublic` |
| Lead | `lead.submitted` | Creación de lead desde ficha |
| Comparador | `listing.compare.add` / `listing.compare.view` | Storage + página `/comparar` |
| Asistente | `assistant.message.sent` / `assistant.search.triggered` | Router conversacional |
| Demanda / alertas | `demand.profile.updated`, `search_alert.created` | Routers existentes |
| Auth | `auth.login.success` (opcional) | Tras login panel/portal |
| Ingesta | Ya cubierto por respuestas cron; opcional `ingest.run.completed` con counts en payload | Pipeline import |

---

## 5. Fases de implementación

| Fase | Entrega | Esfuerzo |
|------|---------|----------|
| **F0 (hecho)** | Doc 49 + `PORTAL_STATS_TERMINALS` en shared | Bajo |
| **F1** | Incremento `view_count` + 1 evento DB o log estructurado con `terminal_id` | Medio |
| **F2** | Tabla `portal_stats_events` + helper `recordPortalStatsEvent` en `apps/web` | Medio |
| **F3** | Cron rollups + nuevas rutas tRPC `stats.*` + pantallas panel | Alto |
| **F4** | Export externo, embudos multi-touch, experimentos A/B | Según negocio |

---

## 6. Relación con otros documentos

- Producto M14 / métricas: `docs/00-fundacion-producto.md`
- Arquitectura general: `docs/01-arquitectura-tecnica.md`
- Búsqueda medible: `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md`
- Ingesta operativa: `docs/48-INGEST-PROPERSTAR-POLITICA-CRON-PUSH-Y-NEGOCIO.md`

---

*Documento vivo; al crear la tabla de eventos, añadir migración Drizzle y ejemplo de consulta agregada.*
