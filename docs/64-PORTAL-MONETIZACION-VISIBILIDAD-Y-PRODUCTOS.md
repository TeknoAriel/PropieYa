# Base comercial: visibilidad y productos (Propieya)

**Estado:** preparación (etapa 1: publicación abierta; **sin cobro activo**).  
**Código:** `packages/shared/src/portal-visibility.ts`, tira en ficha `ListingVisibilityStrip`, datos en `listing.features.portalVisibility` (JSONB).

---

## TAREA 1 — Puntos monetizables (mapa)

| Slot | Ubicación | Tipo de monetización | Impacto UX |
|------|------------|----------------------|------------|
| **Resultados** | Listado / mapa (futuro) | Destacado, boost, orden | Cablear a ES con peso; **no** tocado aún (motor) |
| **Ficha** | `/propiedad/[id]` | Tira de visibilidad, ficha premium | **Implementada** tira sobria si `features.portalVisibility.tier` ≠ `standard` |
| **Similares / relacionados** | Bajo ficha | Repetir criterio de visibilidad | Mismo dato; UI pendiente de no tocar buscador en esta entrega |
| **Landings** venta/alquiler | Páginas de operación | Módulos patrocinados | Reservado; sin implementación en esta tarea |
| **Home** | Bloque destacados | Inserción comercial | **No** modificar estructura principal del home en esta entrega |
| **Emprendimientos** | `/emprendimientos` | Publicación, destaque, banner, prioridad | Texto de preparación; módulo completo fuera de scope |

---

## TAREA 2 — Modelo de productos (catálogo)

Definido en `PORTAL_VISIBILITY_PRODUCT_IDS`: `visibility_highlight`, `visibility_boost`, `visibility_zone_priority`, `visibility_premium_ficha`, y para emprendimientos `developments_*`.  
**Tiers** en UI: `standard` | `highlight` | `boost` | `premium_ficha`.

Ingestión: **panel** (ficha de edición del aviso) o job escribe en `listings.features.portalVisibility` sin migración SQL.

### Panel (operativo)

- **Edición:** `apps/panel/src/app/(dashboard)/propiedades/[id]/page.tsx` — bloque «Visibilidad del aviso» (nivel, vigencia opcional, checkbox prioridad por zona). Se persiste con **Guardar borrador** (`listing.update`).
- **Listados:** columna «Visibilidad» en `propiedades/page.tsx` y `campos/page.tsx` (texto: Normal / Destacado / Impulso / Ficha premium).
- **Validación wire:** `listingPortalVisibilitySchema` en `packages/shared/src/schemas/listing.ts` (evita que Zod elimine el campo en tRPC).

---

## TAREAS 4–6 — Datos y emprendimientos

**Estado normal / destacado / impulsado / premium** se refleja en `portalVisibility.tier` y opcionalmente `products[]` y `until`.

**Leads y pasarela:** no tocados (requisito de tarea).

---

## Cómo probar en dev

En DB, para un aviso `active`, mergear en `features`:

```json
"portalVisibility": { "tier": "highlight", "products": ["visibility_highlight"] }
```

Recargar ficha: debe verse la tira bajo el título (sin ruido visual agresivo).

---

## Capa pública en resultados (exact set)

- Implementada en `apps/web/src/components/buscar/buscar-content.tsx`.
- Intercepta solo el bucket `strong` de `searchV2` (resultados exactos).
- Muestra bloque discreto **“Destacados en esta búsqueda”** con máximo 3 avisos.
- Elegibilidad por tier:
  - `boost`: prioridad visual del bloque.
  - `highlight`: prioridad visual secundaria.
  - `premium_ficha`: visible de forma sobria; el foco principal sigue en ficha.
  - `standard`: sin tratamiento extra.
- No inyecta avisos fuera de filtros: el bloque toma únicamente IDs que ya están en `strong`.
- No altera total/paginación: el listado principal sigue intacto y mantiene el mismo conteo.

## Punto de intercepción técnico (sin tocar motor)

- En `apps/web/src/server/routers/listing.ts` (`listing.searchV2`) se enriquece cada item de bucket con `portalVisibilityTier`.
- El tier se resuelve desde `listings.features.portalVisibility.tier` para los IDs devueltos por el buscador.
- Esta capa es de observación/presentación y no modifica reglas de matching del motor.

## Extensión futura (sin sobreimplementar)

- `apps/web/src/app/venta/page.tsx` y `apps/web/src/app/alquiler/page.tsx` ya reutilizan `BuscarContent`; heredan este mismo bloque sin cambios de lógica.
- Landings por ciudad pueden reutilizar el mismo criterio leyendo `bucket strong` antes del grid principal.
- Emprendimientos queda fuera de esta capa: mantener en su superficie propia para no mezclar inventario residencial con slots comerciales.
