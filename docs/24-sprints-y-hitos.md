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

## Sprint 7 — Conversacional v1

**Objetivo:** input conversacional en home que derive en búsqueda.

- [ ] 7.1 Abstracción LLM (OpenAI o similar)
- [ ] 7.2 Prompt: extraer intención (operación, tipo, ciudad, precio, etc.)
- [ ] 7.3 Endpoint: mensaje → intención → query search → resultados
- [ ] 7.4 UI: input en home + chips de ejemplo
- [ ] 7.5 Respuesta con resultados inline o redirección a /buscar
- [ ] 7.6 Rate limiting
- [ ] 7.7 Verificar lint/typecheck, commit + push

**Criterios:** usuario escribe en lenguaje natural y recibe resultados de búsqueda.

---

## Sprint 8 — Panel: dashboard y vigencia visible

**Objetivo:** métricas básicas y visibilidad de vigencia.

- [ ] 8.1 Dashboard: contador avisos por estado (activo, draft, expiring, suspendido)
- [ ] 8.2 Dashboard: leads recientes (últimos 5)
- [ ] 8.3 Lista propiedades: badge/indicador vigencia (días restantes, vencido)
- [ ] 8.4 Filtro por estado en lista propiedades
- [ ] 8.5 Verificar lint/typecheck, commit + push

**Criterios:** panel muestra métricas y estado de vigencia claramente.

---

## Leyenda de prioridad

| Símbolo | Significado |
|---------|-------------|
| Sprint 1–3 | Pulido + vigencia (base operativa) |
| Sprint 4–6 | Búsqueda + leads (valor core) |
| Sprint 7–8 | Conversacional + dashboard (diferenciadores) |

---

## Próximos sprints (backlog)

- Sprint 9: Perfil de demanda + matching explicado
- Sprint 10: Alertas guardadas
- Sprint 11: Gestión de organización (invitar miembros)
- Sprint 12: Ficha propiedad mejorada (mapa, similares)

---

*Actualizado: 2026-03-22*
