# Buscador del portal — arquitectura por capas (inductivo)

## Objetivo

Una sola pantalla de búsqueda con **potencia avanzada** pero **jerarquía clara**: lo principal primero, afinado guiado después, catálogo completo al final — **sin repetir** la misma lista de amenities en chips y checkboxes tres veces.

## Tres capas (implementación)

### Capa 1 — Lo principal (`buscarLayer1Kicker`)

- Operación, tipo, ciudad, barrio.
- **Elegir del catálogo** + **Prefiero en mapa** (CTA explícita junto a ubicación).
- Bloque **Mapa y zona** debajo de ubicación (refinamiento geográfico, no compite con el título global).
- Precio mín./máx.
- **Terreno:** superficie mín./máx. en esta capa.
- **Resto:** dormitorios + ambientes mínimos.
- Palabras clave + chips inductivos (`InductiveSearchChips`).

### Capa 2 — Afinado guiado (`#buscar-capa-2`)

- Colapsable; se **abre sola** cuando ya hay criterios activos (`hasActiveSearchCriteria`).
- Copy y **hasta 6 chips** contextuales según tipo (`getBuscarContextualBlock`).
- Enlace a capa 3 para el catálogo completo.
- **No residencial:** baños, cocheras, superficie mín./máx. (no se duplican dormitorios/ambientes de la capa 1).
- **Terreno:** texto guía (`buscarLayer2LandHint`); sin rejilla numérica redundante.
- Checkbox **amenities obligatorios** (modo strict vs preferido).

### Capa 3 — Más filtros (`#buscar-capa-3`)

- Un solo panel: medidas finas (cubierta, piso, orientación, escalera) + **una lista única** de checkboxes de amenities (`deepFacetCheckboxList`: nicho + resto del catálogo, sin IDs duplicados).
- Eliminada la antigua duplicación: chips globales de “Afinar más” + misma lista en checkboxes.

## Asistente conversacional (UI)

- Sigue protagonista arriba (`ConversationalSearchBlock`).
- CTA “Afinado guiado” lleva a `#buscar-capa-2`.
- “Filtros avanzados” lleva a `#buscar-capa-3`.

## Reglas de producto (recordatorio)

- **Requerido conceptual:** operación, tipo, zona (el usuario puede avanzar sin completar todo; el motor ya relaja).
- **Flexible:** precio, dormitorios, baños, superficie.
- **Preferido por defecto:** amenities (salvo strict marcado).

## Analítica (pendiente de instrumentar)

Medir: aperturas capa 2 / capa 3, toggles strict, uso de “Prefiero en mapa”, abandono con cero resultados. Ver pedido original en backlog de producto.

## Referencias de código

- UI: `apps/web/src/components/buscar/buscar-content.tsx`
- Copy: `PORTAL_SEARCH_UX_COPY` en `packages/shared/src/copy/portal-packs.ts`
- Contexto por tipo: `packages/shared/src/buscar-contextual-layer.ts`
