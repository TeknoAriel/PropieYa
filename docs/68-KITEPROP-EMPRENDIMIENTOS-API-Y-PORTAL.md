# Kiteprop — emprendimientos: API y portal

**Fecha:** 2026-05-19

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Hay emprendimientos en el portal hoy? | **Sí** — avisos con `propertyType = development_unit` (import Kiteprop/Properstar). Producción: **~72** activos (sondeo `listing.search`). |
| ¿Existe `GET /api/v1/developments` documentado? | **No confirmado** — sin API key devuelve **404**; con key usar `pnpm probe:kiteprop-developments`. |
| ¿La ingesta actual los trae? | **Sí**, si el ítem en feed/API trae `property_type` / texto mapeable a `emprendimiento` → `development_unit` (`mapFeedPropertyTypeWithListingText`). |
| ¿`/emprendimientos` en el portal? | **Listado real** vía `BuscarContent` con `forcedPropertyType=development_unit` (mismo buscador que venta/alquiler). |

## Auditoría REST (sin API key)

Rutas probadas en `https://www.kiteprop.com/api/v1/`:

| Ruta | HTTP sin key | Notas |
|------|----------------|-------|
| `properties` | 500 `Unauthenticated` | Endpoint existe |
| `developments` | 404 | No expuesto públicamente (o ruta distinta) |
| `emprendimientos` | 404 | Idem |
| `real-estate-developments` | 404 | Idem |

**Acción con credenciales:** `KITEPROP_API_KEY=… pnpm probe:kiteprop-developments` — prueba rutas candidatas y filtros `type` / `property_type` en `properties`.

## Ingesta en Propieya

1. **Feed JSON** (`YUMBLIN_JSON_URL` / Properstar): hoy puede venir vacío (`[]`); revisar URL activa en Kiteprop.
2. **REST paginado** (`fetchKitepropPropertiesAllPages`): mismo listado que `GET /properties`; cada ítem pasa por `mapYumblinItem` → `mapFeedPropertyTypeWithListingText` (clave `emprendimiento` → `development_unit`).
3. **Webhook** (`kiteprop-ingest`): misma cadena de mapeo al upsert.

Variables: `docs/58-KITEPROP-API-KEY-UNICA-MCP-Y-REST.md`, `KITEPROP_INGEST_MODE`, `KITEPROP_INGEST_PROPERTIES_QUERY`.

## Portal (UI)

- **`/emprendimientos`:** listado + mapa + filtros (tipo bloqueado en Emprendimiento).
- **Búsqueda general:** filtro tipo «Emprendimiento» en desplegable de `/buscar`.
- **Ficha:** misma `/propiedad/[id]` que el resto del inventario.

Backlog producto (tipologías, stock por unidad, ficha de proyecto): `docs/46-BACKLOG-EMPRENDIMIENTOS-MULTIPAIS-MONEDA.md`.

## Próximo paso si Kiteprop expone API de emprendimientos

1. Confirmar ruta y schema con `probe:kiteprop-developments` + doc oficial.
2. Ajustar `KITEPROP_PATH_DEVELOPMENTS` si no es `developments`.
3. Extender ingesta (`fetchKitepropDevelopmentsAllPages` + mapper) solo si el payload **no** es compatible con `mapYumblinItem`.
