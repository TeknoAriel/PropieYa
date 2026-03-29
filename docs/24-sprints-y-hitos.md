# Sprints y hitos — ejecución autónoma

**Objetivo:** hitos de trabajo con sprints y tareas concretas. El agente ejecuta en orden sin preguntar cada paso.

---

## Instrucciones para el agente

1. **Ejecutar sprints en orden** — no saltar ni mezclar.
2. **Por sprint:** completar todas las tareas, verificar `pnpm lint` + `pnpm typecheck`, commitear y pushear a `deploy/infra`.
3. **No preguntar** qué hacer después de cada tarea — seguir el plan.
4. **Marcar tareas** como `[x]` al completarlas en este archivo.
5. Si una tarea bloquea (credencial, decisión externa): documentar en `REGISTRO-BLOQUEOS.md` y pasar a la siguiente ejecutable.

---

## Estado actual (antes de Sprint 1)

| Área | Estado |
|------|--------|
| Apps web + panel | ✅ |
| Auth (JWT, login, register, refresh) | ✅ |
| CRUD propiedades + upload S3 | ✅ |
| Ficha edición panel (galería, publicar) | ✅ |
| Cron import Yumblin | ✅ |
| Búsqueda SQL (portal) | ✅ |
| next/image panel galería | ✅ |
| next/image portal | ❌ (4 warnings lint) |
| Sistema vigencia | ❌ |
| Elasticsearch | ❌ (búsqueda en SQL) |
| Leads | ❌ |
| Conversacional | ❌ |

---

## Sprint 1 — Pulido portal (imágenes y lint) ✅

**Objetivo:** eliminar warnings de lint en web y unificar uso de `next/image`.

- [x] 1.1 `apps/web`: reemplazar `<img>` por `next/image` en `buscar/page.tsx`
- [x] 1.2 `apps/web`: reemplazar `<img>` por `next/image` en `propiedad/[id]/page.tsx` (galería + thumbnails)
- [x] 1.3 `apps/web`: reemplazar `<img>` por `next/image` en `components/home/featured-listings.tsx`
- [x] 1.4 `apps/web`: corregir import `type NextRequest` si queda algún warning
- [x] 1.5 Verificar: `pnpm lint` sin warnings en web
- [x] 1.6 Commit + push

**Criterios:** portal sin warnings `no-img-element`, imágenes optimizadas donde aplique.

---

## Sprint 2 — Sistema de vigencia ✅

**Objetivo:** job que revise vigencia de avisos y permita renovar.

- [x] 2.1 Setup BullMQ (o cron interno) para job diario de vigencia
- [x] 2.2 Job: transición `active` → `expiring_soon` (X días antes)
- [x] 2.3 Job: transición `expiring_soon` o `active` → `suspended` si `expiresAt` pasó
- [x] 2.4 Endpoint `listing.renew` (protegido, solo propias)
- [x] 2.5 Botón "Renovar" en panel (propiedades expiring_soon / suspended)
- [x] 2.6 Estado `expiring_soon` en schema si no existe
- [x] 2.7 Verificar lint/typecheck, commit + push

**Criterios:** avisos pasan a suspendido tras vencimiento; usuario puede renovar desde panel.

---

## Sprint 3 — Notificaciones de vigencia ✅

**Objetivo:** avisar al publicador cuando un aviso está por vencer.

- [x] 3.1 Template email "próximo a vencer" (Resend o Sendgrid)
- [x] 3.2 Job o paso en job vigencia: enviar email a publisher
- [x] 3.3 Link de renovación en email (query param o token)
- [x] 3.4 Variable `EMAIL_FROM`, `RESEND_API_KEY` en .env.example
- [x] 3.5 Verificar lint/typecheck, commit + push

**Criterios:** publicador recibe email con link para renovar.

---

## Sprint 4 — Búsqueda Elasticsearch ✅

**Objetivo:** migrar búsqueda de SQL a Elasticsearch.

- [x] 4.1 Package `@propieya/search` o módulo en web: cliente ES
- [x] 4.2 Mapping índice listings (campos, geo)
- [x] 4.3 Job/sync: indexar listings activos (bulk inicial)
- [x] 4.4 Evento: al publicar/actualizar/archivar → reindex
- [x] 4.5 `listing.search` usa ES en lugar de SQL
- [x] 4.6 Fallback a SQL si ES no disponible (opcional)
- [x] 4.7 Verificar lint/typecheck, commit + push

**Criterios:** búsqueda del portal usa ES; resultados coherentes con SQL actual.

---

## Sprint 5 — Leads básico ✅

**Objetivo:** contacto desde ficha y listado en panel.

- [x] 5.1 Modal/página de contacto en ficha de propiedad (portal)
- [x] 5.2 Router `lead.create` (nombre, email, mensaje, listingId)
- [x] 5.3 Guardar lead en DB con datos del listing
- [x] 5.4 Página/listado de leads en panel (solo de mis propiedades)
- [x] 5.5 Detalle de lead (mensaje, fecha, listing)
- [x] 5.6 Verificar lint/typecheck, commit + push

**Criterios:** usuario puede contactar desde ficha; publicador ve leads en panel.

---

## Sprint 6 — Notificación de lead ✅

**Objetivo:** avisar al publicador cuando recibe un lead.

- [x] 6.1 Template email "nuevo lead"
- [x] 6.2 Tras `lead.create`: enviar email al publisher
- [x] 6.3 Link al panel en email
- [x] 6.4 Verificar lint/typecheck, commit + push

**Criterios:** publicador recibe email al crear lead.

---

## Sprint 7 — Conversacional v1 ✅

**Objetivo:** input conversacional en home que derive en búsqueda.

- [x] 7.1 Abstracción LLM (OpenAI o similar)
- [x] 7.2 Prompt: extraer intención (operación, tipo, ciudad, precio, etc.)
- [x] 7.3 Endpoint: mensaje → intención → query search → resultados
- [x] 7.4 UI: input en home + chips de ejemplo
- [x] 7.5 Respuesta con resultados inline o redirección a /buscar
- [x] 7.6 Rate limiting
- [x] 7.7 Verificar lint/typecheck, commit + push

**Criterios:** usuario escribe en lenguaje natural y recibe resultados de búsqueda.

---

## Sprint 8 — Panel: dashboard y vigencia visible ✅

**Objetivo:** métricas básicas y visibilidad de vigencia.

- [x] 8.1 Dashboard: contador avisos por estado (activo, draft, expiring, suspendido) — `listing.dashboardStats`
- [x] 8.2 Dashboard: leads recientes (últimos 5) — `lead.listByPublisher`
- [x] 8.3 Lista propiedades: badge/indicador vigencia (días restantes, vencido) — columna + `formatListingVigencia`
- [x] 8.4 Filtro por estado en lista propiedades — select ampliado
- [x] 8.5 Verificar lint/typecheck, commit + push

**Criterios:** panel muestra métricas y estado de vigencia claramente.

---

## Sprint 9 — Perfil de demanda + matching explicado ✅

**Objetivo:** explicar por qué cada aviso coincide con los filtros; persistir un perfil de demanda desde la búsqueda.

- [x] 9.1 Helper `explainMatchReasons` / `withMatchReasons` / resumen en `@propieya/shared`
- [x] 9.2 `listing.search` y `listing.searchConversational` enriquecen resultados con `matchReasons`
- [x] 9.3 Router `demand.getMyProfile` + `demand.upsertFromSearchFilters` (tabla `demand_profiles`)
- [x] 9.4 UI `/buscar`: bloque "Por qué coincide" + guardar filtros en perfil (usuario autenticado)
- [x] 9.5 Página `/perfil-demanda` (resumen guardado)
- [x] 9.6 Cliente web: guardar JWT tras login y enviar `Authorization` en tRPC
- [x] 9.7 Verificar lint/typecheck, commit + push

**Criterios:** los resultados listan motivos de coincidencia; el usuario con sesión puede guardar y consultar su perfil de demanda.

---

## Leyenda de prioridad

| Símbolo | Significado |
|---------|-------------|
| Sprint 1–3 | Pulido + vigencia (base operativa) |
| Sprint 4–6 | Búsqueda + leads (valor core) |
| Sprint 7–9 | Conversacional + dashboard + demanda (diferenciadores) |

---

## Sprint 10 — Alertas guardadas ✅

**Objetivo:** persistir filtros de búsqueda como alerta (`search_alerts`) y resumen legible.

- [x] 10.1 `buildFiltersSummary` + `searchAlert.create` (input alineado con `listingSearchFiltersSchema`)
- [x] 10.2 UI `/buscar`: botón “Crear alerta con estos filtros” (usuario autenticado)
- [x] 10.3 Verificar lint/typecheck, commit + push

**Criterios:** el usuario logueado puede guardar una alerta desde la búsqueda; el feed en `/mis-alertas` la lista.

---

## Sprint 11 — Gestión de organización (invitaciones) ✅

**Objetivo:** invitar miembros por email con token y aceptación en el portal.

- [x] 11.1 Router `organization`: `listMembers`, `listPendingInvites`, `createInvite`, `revokeInvite`, `acceptInvite`
- [x] 11.2 `orgMembersProcedure` (permiso `org:members`) y JWT actualizado al aceptar
- [x] 11.3 Portal: `/aceptar-invitacion`, login/registro con `next` para volver al flujo
- [x] 11.4 Panel: página `/equipo` + enlace en sidebar
- [x] 11.5 Verificar lint/typecheck, commit + push

**Criterios:** un admin/coordinador genera enlace; el invitado acepta con el mismo email y obtiene acceso al panel.

---

## Sprint 12 — Ficha propiedad mejorada (similares) ✅

**Objetivo:** sugerir avisos parecidos en la ficha pública.

- [x] 12.1 `listing.similar` (misma operación/tipo, ciudad si hay, precio ±30% si se muestra precio)
- [x] 12.2 UI ficha: bloque “Propiedades similares”
- [x] 12.3 Verificar lint/typecheck, commit + push

**Criterios:** la ficha muestra hasta 6 similares cuando existen.

**Pendiente de producto (doc 38):** facets dinámicos tipo catálogo, MLS, semántica amplia — fuera de este sprint.

---

## Sprint 13 — Mapa en ficha + filtros avanzados (UX progresiva) ✅

**Objetivo:** primera capa de mapa en ficha y más criterios de búsqueda sin saturar la pantalla principal.

- [x] 13.1 Ficha: mapa embebido OpenStreetMap si hay `locationLat`/`locationLng` y no `hideExactAddress`
- [x] 13.2 `/buscar`: bloque colapsable “Más filtros” (barrio, dorm/baños/cocheras, superficie máx., piso, amenities)
- [x] 13.3 `SEARCH_FILTER_AMENITIES` en `@propieya/shared` y uso en `listing.search` / conversacional (SQL)
- [x] 13.4 Verificar lint/typecheck, commit + push

**Criterios:** ubicación visible cuando el aviso la expone; búsqueda refinable con amenities alineadas al backend.

---

## Sprint 14 — Mapa en búsqueda (zona visible) ✅

**Objetivo:** lista + mapa en `/buscar`; filtro por rectángulo (doc 38 AA, capa inicial).

- [x] 14.1 API: `bbox` en `listingSearchFiltersSchema`; `listing.search` SQL + Elasticsearch `geo_bounding_box` sobre `location`
- [x] 14.2 `_source` ES incluye `location`; matching explica “área del mapa”
- [x] 14.3 UI: Leaflet + «Ver mapa», «Buscar en esta zona», «Quitar filtro de zona»
- [x] 14.4 Verificar lint/typecheck, commit + push

**Criterios:** el usuario puede acotar resultados al viewport del mapa; solo entran avisos con coordenadas.

---

## Sprint 15 — Registro legible + guía Publicar / panel ✅

**Objetivo:** que los errores de validación Zod no se muestren como JSON; aclarar el camino buscador vs publicador hacia el panel.

- [x] 15.1 Web: `formatTrpcUserMessage` (zodError + fallback si `message` es JSON) y uso en registro + login — desde S16 vive en `@propieya/shared`
- [x] 15.2 Registro paso 2: texto de ayuda bajo contraseña alineado a `registerSchema`
- [x] 15.3 `/publicar`: pasos concretos (registro con intent, panel → Propiedades → Nueva) y enlaces
- [x] 15.4 Verificar lint/typecheck, commit + push

**Criterios:** el usuario ve un mensaje claro ante contraseña inválida; la página Publicar explica el flujo sin asumir que el panel “está listo” sin contexto.

---

## Sprint 16 — Panel publicador: onboarding y errores legibles ✅

**Objetivo:** cerrar el hueco “panel para publicar”: registro desde login, primer aviso guiado, Zod legible en panel y salto a la ficha tras crear.

- [x] 16.1 `formatTrpcUserMessage` en `@propieya/shared`; web importa desde shared (sin duplicar en apps/web)
- [x] 16.2 Panel: login con enlaces a registro (particular / inmobiliaria / otro); `formatTrpcUserMessage` en login, magic link, nueva propiedad, edición, campos/nueva
- [x] 16.3 Tras `listing.create` (propiedad o campo): redirección a `/propiedades/[id]` para fotos, dirección y publicar
- [x] 16.4 Dashboard: card onboarding si hay 0 avisos; lista Propiedades vacía con CTA “Nueva propiedad”
- [x] 16.5 Verificar lint/typecheck, commit + push

**Criterios:** el publicador entiende el camino portal → panel → borrador → ficha → publicar; los errores de validación no se muestran como JSON.

---

## Sprint 17 — XML OpenNavent (Zonaprop/Kiteprop) + filtros y ficha ✅

**Objetivo:** incorporar el feed real OpenNavent como referencia en repo (muestra liviana), mapeo en código, campos alineados a búsqueda y edición en panel.

- [x] 17.1 Muestra `docs/samples/zonaprop-kiteprop-one-aviso.xml` + README; `.gitignore` al dump completo (~80MB); doc `36` actualizada con estructura `<OpenNavent>/<Avisos>/<Aviso>`
- [x] 17.2 `packages/shared/src/xml/zonaprop-opennavent-map.ts` (URL feed, roles `PRINCIPALES|*` → modelo interno)
- [x] 17.3 `createListingSchema.features.escalera`; create en panel con `escalera: null`
- [x] 17.4 Búsqueda: `orientation`, `minSurfaceCovered`, `maxSurfaceCovered`, `minTotalRooms` + ES/SQL + explain + resumen alertas/perfil + **escalera en UI** `/buscar`
- [x] 17.5 Panel editar ficha: superficie cubierta, ambientes totales, piso, pisos edificio, orientación, escalera (indexación ES al publicar)
- [x] 17.6 Verificar lint/typecheck, commit + push

**Criterios:** el XML de referencia está documentado y trazable en código; los filtros avanzados cubren campos del feed; el publicador puede cargar datos que entran en SQL/ES como el modelo XML.

---

## Sprint 18 — Orden de listados: más reciente arriba ✅

**Objetivo:** regla de producto única: en listados de negocio, lo más reciente aparece primero; criterio explícito según contexto.

**Regla**

- **Portal / búsqueda pública** (activos): orden principal `publishedAt` descendente; desempate `updatedAt`, luego `createdAt` (misma idea en SQL fallback y en Elasticsearch).
- **Panel “mis avisos”** (`listing.listMine`): orden por última modificación: `updatedAt` descendente, luego `createdAt`.
- **Otros listados ya alineados:** leads por `createdAt` desc; alertas / notificaciones / feed por fecha reciente; miembros e invitaciones de org por fecha desc.

- [x] 18.1 Router `listing`: constantes `ORDER_PUBLIC_RECENCY` y `ORDER_PANEL_RECENCY`; `similar`, `getFeatured`, SQL de `search` / `searchConversational` y `listMine` usan esos criterios
- [x] 18.2 Elasticsearch: campo `updatedAt` en mapping, documento indexado, sort en cascada alineado a SQL; cron `sync-search` y script `sync-search:local` envían `updatedAt`
- [x] 18.3 Verificar `pnpm verify`, commit + push

**Criterios:** listados de avisos en portal y panel reflejan “más reciente arriba” con criterio documentado; ES y SQL coinciden en intención de orden.

---

## Sprint 19 — Semántica de búsqueda en texto (operación, tipo, amenities) ✅

**Objetivo:** capa AB de `docs/38`: misma lógica de sinónimos para barra de búsqueda (ES) y fallback conversacional sin duplicar mapas en `llm.ts`.

- [x] 19.1 `packages/shared/src/search-semantics.ts`: operación (venta/alquiler/temporal) y tipo de propiedad (frases y `ph` con límite de palabra)
- [x] 19.2 `extractFiltersFromQuery` devuelve `operationType` / `propertyType`; `mergeFilters` en `apps/web/src/lib/search/query.ts` los aplica si el usuario no los fijó en UI
- [x] 19.3 `apps/web/src/lib/llm.ts` fallback usa solo `extractFiltersFromQuery` para esos campos; más términos en `SEARCH_TERM_TO_AMENITY` (quincho, barbacoa, natación)
- [x] 19.4 Verificar `pnpm verify`, commit + push

**Criterios:** una consulta tipo “alquiler departamento Palermo con pileta” refuerza filtros desde `q` alineados al modelo interno.

---

## Sprint 20 — Webhook Mercado Pago: firma e idempotencia ✅

**Objetivo:** avanzar `docs/39` sin romper entornos sin secreto.

- [x] 20.1 Validación HMAC-SHA256 con `x-signature`; manifest MP con partes opcionales (`id` si hay `data.id`, `request-id`, `ts`); normalización de id alfanumérico; tolerancia de reloj (`MERCADOPAGO_WEBHOOK_TS_SKEW_MS`, default 10 min)
- [x] 20.2 Idempotencia: índice único parcial en DB `(provider, external_event_id)` + `ON CONFLICT DO NOTHING` + `200` + `{ duplicate: true }` si ya existía
- [x] 20.3 Documentar en `docs/39` y `.env.example`; `pnpm db:push` en cada entorno tras el cambio de schema; verificar `pnpm verify`, commit + push

**Criterios:** con `MERCADOPAGO_WEBHOOK_SECRET` solo entran notificaciones firmadas (salvo entornos sin secreto); reintentos de MP no duplican fila ni en carrera concurrente.

**Realizado (Sprint 20 completo en código)**

- Webhook + `mercadopago-webhook-verify.ts` (manifest flexible, `ts` en segundos o ms, skew configurable).
- `payment_webhook_events`: `payment_webhook_provider_external_uidx` único parcial; webhook sin `findFirst` previo.

**Fuera de Sprint 20** (monetización producto)

- Modelo `orders` / `subscriptions`, Checkout Pro, pantalla Facturación, destacados tras pago (ver `docs/39`).

**Nota QR Mercado Pago:** notificaciones QR no verifican firma igual; sin secreto en ese flujo o URL separada — documentado en `docs/39`.

---

## Próximos sprints (backlog)

**Criterios ampliados (MLS, facets, mapa, semántica, UX progresiva):** `docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md` — repaso de producto/arquitectura; priorizar ítems en nuevos sprints según esa hoja.

**Onboarding y monetización (registro por persona, MP stub):** `docs/40-ONBOARDING-PERSONAS-Y-FLUJOS.md`, `docs/39-MONETIZACION-MERCADOPAGO.md`. Tras pull: `pnpm db:push` para `users.account_intent` y `payment_webhook_events`.

---

**Producción (qué validar en la URL, Git, importación):** `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`

---

*Actualizado: 2026-03-29 (Sprint 20 ampliado: DB + manifest + ts)*
