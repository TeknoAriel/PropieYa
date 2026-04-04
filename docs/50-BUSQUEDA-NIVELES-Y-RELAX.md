# Búsqueda: capas de filtros, impacto y relajación

Referencia breve alineada a la implementación en portal (`listing.search`, ES, SQL, `/buscar`).

## Orden en UI (tres capas)

1. **Filtros principales:** operación → tipo → ciudad → barrio → mapa integrado → precio min/max → dormitorios → ambientes → palabras clave.
2. **Filtros avanzados:** baños → cocheras → superficie total min/max → cubierta min/max → piso desde/hasta → orientación → toggles de confort (apto crédito, frente, mascotas, amoblado, accesible) → escalera.
3. **Afinar más:** chips rápidos → checkbox “amenities obligatorios” → catálogo extendido (sin duplicar los toggles del paso 2).

Catálogo de flags: `packages/shared/src/search-facets.ts` (`FACETS_CATALOG`, `getFacetFlagsForBuscarRefineLayer`).

## Impacto (required / flexible / preferred)

| Modo | Filtros |
|------|---------|
| **Required (core)** | `status: active`, operación, tipo, ciudad/barrio (texto), texto residual de `q` tras merge, polígono/bbox cuando aplica, `must_not` de `excludeFlags`. |
| **Flexible** | Precio, dormitorios, ambientes, baños, cocheras, superficies, pisos, orientación, escalera, cubiertas. |
| **Preferred** | Amenities y `facets.flags` positivos cuando `amenitiesMatchMode: preferred` (default): en ES suman score (`should` + `constant_score`); en SQL no aplican `WHERE` por amenity. |
| **Strict** | Mismo conjunto pero en `must` / `@>` cuando el usuario marca “amenities obligatorios” (`amenitiesMatchMode: strict`). |

## Relajación progresiva (solo primera página ES)

Umbrales aproximados:

- **≥ 20** resultados: sin mensaje extra.
- **8–19:** mensaje informativo si hay amenities como preferencia.
- **1–7:** si relajar **solo detalles secundarios** aumenta el universo, se completan cupos con hits relajados (primero los “exactos”, luego el resto); `nextCursor` en `null` (sin paginación profunda estable en ese modo).
- **0:** secuencia en `apps/web/src/lib/search/search-relaxation.ts` (`ZERO_RESULTS_RELAXATION_SEQUENCE`): secundarios → cocheras → baños → superficie → precio → mapa → dormitorios/ambientes → barrio → quitar amenities/flags positivos. Se mantiene operación, tipo y ciudad.

## Mapa

El bloque de mapa vive dentro de la sección de ubicación. La relajación puede quitar polígono/bbox en pasos tardíos; en ese caso el mensaje lo indica (sin expandir el área “en silencio”).

## Analítica

Terminales en `packages/shared/src/analytics/portal-stats-terminals.ts`:

- `listing.search.zero_primary_resolved`
- `listing.search.relaxation_used`

Payload incluye `tier`, `steps` / `merged` y a veces `source: sql_fallback`.

## Respuesta API

`listing.search` devuelve `searchUX`: `tier`, `primaryTotal`, `strictMatchCount`, `mergedSupplement`, `nearAreaSupplement`, `messages[]`, `relaxationStepIds`, `disableDeepPagination`.
