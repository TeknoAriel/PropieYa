# Buscador del portal: estabilidad, fallback SQL y regresiones evitadas

**Última actualización:** 2026-04-17. Complementa `docs/47-RITMO-PRODUCCION-BUSQUEDA-Y-ASISTENTE.md` con **reglas operativas** para no romper el listado público (`/buscar`, `/venta`, `/alquiler`).

---

## 1. Objetivo de producto

- El usuario **siempre** debe ver avisos activos cuando existan en base, aunque **Elasticsearch / OpenSearch** no esté disponible o el índice esté vacío.
- El refinamiento (chips, mapa, texto) **reduce** el catálogo; no debe **bloquear** la primera pintura con pantallas vacías obligatorias.

---

## 2. Arquitectura resumida (no duplicar lógica contradictoria)

| Capa | Rol |
|------|-----|
| **`listing.getFeatured`** | Home: SQL directo, pocos ítems. No depende de ES. |
| **`listing.searchV2`** | Páginas de catálogo/buscador: `runListingSearchV2` (ES) → si falla o cero por índice, **`trySearchV2SqlFallback`** (SQL, bucket `strong`). |
| **`searchSessionHasAnchor`** (`@propieya/shared`) | Señal de intención acotada (asistente, mensajes vacíos); **no** debe usarse para impedir ejecutar `searchV2` en el cliente. |
| **`isSearchV2ElasticsearchUnreachable`** (`@propieya/shared`) | Decide si el resultado de v2 es “ES caído / no consultable” y hay que intentar SQL. |

---

## 3. Regresión crítica (abril 2026) — no repetir

Cuando ES no responde, `runListingSearchV2` devuelve:

- **`messages`:** p. ej. “El buscador no está disponible…”
- **`emptyExplanation`:** p. ej. “No pudimos consultar el índice de búsqueda…”

Un detector que solo miraba **`messages`** y buscaba la frase del índice **nunca** encontraba coincidencia → **`trySearchV2SqlFallback` no corría** → listado vacío en producción aunque Neon tuviera avisos.

**Regla:** cualquier heurística de “¿hay que hacer fallback?” debe considerar **`messages` y `emptyExplanation`** (y mantenerse cubierta por test). Implementación: `isSearchV2ElasticsearchUnreachable` en `packages/shared/src/listing-search-v2-es-unreachable.ts` + tests en `listing-search-v2-es-unreachable.test.ts`.

---

## 4. Checklist antes de tocar búsqueda listado (PR / agente)

1. **`pnpm verify`** (incluye build web).
2. **`pnpm --filter @propieya/shared test`** si se tocó `packages/shared` relacionado con sesión v2 o el detector de ES.
3. Probar manualmente (o smoke): **`/buscar`** sin querystring → deben verse fichas si hay activos en DB.
4. Si se cambian strings de error en `search-v2-executor.ts`, **actualizar** `isSearchV2ElasticsearchUnreachable` o los tests fallarán a propósito.
5. No volver a gatear `trpc.listing.searchV2` con `enabled: false` por “falta de ancla” salvo decisión explícita documentada aquí.

---

## 5. Archivos canónicos (referencia rápida)

- Cliente: `apps/web/src/components/buscar/buscar-content.tsx`
- Barra de chips: `apps/web/src/components/buscar/buscar-session-bar.tsx`
- Motor v2 (ES): `apps/web/src/lib/search/search-v2-executor.ts`
- Consulta ES genérica: `apps/web/src/lib/search/search.ts` (`searchListings`)
- Router: `apps/web/src/server/routers/listing.ts` (`searchV2`, `trySearchV2SqlFallback`)
- Sesión y anclas semánticas: `packages/shared/src/search-session-mvp.ts`
- Detector fallback ES: `packages/shared/src/listing-search-v2-es-unreachable.ts`

---

## 6. Regla Cursor

Ver `.cursor/rules/buscador-portal-estable.mdc` (no romper buscador; cambios mínimos y verificados).

---

## 7. Inventario completo y capas (abril 2026)

- **`listing.searchV2`** devuelve primero solo el bucket **exacto** (`strong`) paginado: `strictCatalogTotal` es el total real en índice/SQL para los filtros elegidos; `exactNextCursor` / `exactEsOffsetNext` permiten recorrer todo el catálogo (24 o 30 por página).
- Los buckets **near** y **widened** solo se calculan si el cliente envía **`includeAlternativeBuckets: true`** (segunda capa explícita; no se mezclan con el listado exacto).
- **`isSearchV2ElasticsearchUnreachable`** usa la **cantidad de ítems** en los buckets (no `totalsByBucket` acumulado contra el catálogo), para no bloquear el fallback SQL cuando el total global es alto pero la página actual está vacía por post-filtros.
