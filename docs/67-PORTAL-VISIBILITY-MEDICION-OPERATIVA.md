# Medicion operativa de portalVisibility

Estado: activo (sin cobro habilitado).

## Eventos definidos

Se reutiliza `portal_stats_events` via `recordPortalStatsEvent`:

- `listing.portal_visibility.impression`
  - `surface`: `search_featured` | `listing_strip`
  - `tier`: `highlight` | `boost` | `premium_ficha`
  - `products`: lista de productos de `features.portalVisibility.products`
  - `searchContext` opcional: `city`, `neighborhood`, `operationType`, `propertyType`, `session`
- `listing.portal_visibility.click`
  - `surface`: `search_featured` | `listing_strip_cta`
  - `tier`, `products`, `searchContext` con mismo criterio

Regla: solo se registran eventos para avisos con tier distinto de `standard`.

## Superficies cubiertas

- Resultados exactos: bloque `Destacados en esta busqueda` (`search_featured`)
- Ficha: tira de visibilidad (`listing_strip`) y clic relevante de contacto (`listing_strip_cta`)

Puntos de extension ya definidos (en endpoint de ops):

- `landing_featured`
- `developments_featured`
- `home_featured`

## Consulta operativa

Endpoint interno:

- `GET /api/internal/ops/portal-visibility-performance?sinceHours=24`
- Auth: `Authorization: Bearer <PORTAL_VISIBILITY_OPS_SECRET>` (fallback `CRON_SECRET`)

Devuelve:

- impresiones, clics, CTR global
- impresiones por tier
- clics por tier
- CTR por tier
- distribucion por `surface`
- top listings por visibilidad
- top productos de visibilidad

Ejemplo de salida resumida:

```json
{
  "totals": { "impressions": 184, "clicks": 27, "ctrPct": 14.67 },
  "byTierCtr": [
    { "tier": "boost", "impressions": 72, "clicks": 14, "ctr_pct": 19.44 },
    { "tier": "highlight", "impressions": 96, "clicks": 11, "ctr_pct": 11.46 }
  ],
  "bySurface": [
    { "surface": "search_featured", "impressions": 132, "clicks": 21 },
    { "surface": "listing_strip", "impressions": 52, "clicks": 0 },
    { "surface": "listing_strip_cta", "impressions": 0, "clicks": 6 }
  ]
}
```

## Script rapido

```
pnpm --filter @propieya/web exec tsx scripts/portal-visibility-ops-check.ts --sinceHours=24
```

Env:

- `PORTAL_VISIBILITY_OPS_BASE_URL`
- `PORTAL_VISIBILITY_OPS_TOKEN` (fallback: `PORTAL_VISIBILITY_OPS_SECRET` o `CRON_SECRET`)

## Garantias de esta implementacion

- no altera ranking
- no altera total real
- no altera paginacion
- no altera matching exacto
- no activa cobro
