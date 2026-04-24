# Política operativa: quién publica y con qué cupo (Propieya)

## Diagnóstico (estado del sistema)

- **Quién puede publicar:** hace falta **membresía activa** con una `organization` (inmobiliaria o `individual_owner` al registrarse como dueño). El buscador solo (`accountIntent: seeker`) no recibe org al registro: no publica.
- **Criterio en portal (`/publicar`):** `auth.me` expone `publisher` si el JWT tiene `organizationId` y la org existe en DB. Antes solo se miraba `organizationId`.
- **Panel:** el mismo `auth.me` alimenta cupo, alertas y bloqueo de “Nueva propiedad” si aplica.
- **Backend `listing.create`:** valida org **activa**, no suspendida, y **cupo** según `organizations.listing_limit` o default por tipo (ver `packages/shared` `effectiveListingLimit`).

## Política por perfil (operativa)

| Perfil (org.type) | Cupo por defecto | Notas |
|-------------------|------------------|--------|
| `individual_owner` | 3 avisos | Conteo: filas de `listings` de la org con estado distinto de `archived` y `withdrawn`. Ajuste: columna `listing_limit` en `organizations`. |
| `real_estate_agency` | Sin tope fijo (null) | Misma columna `listing_limit` para imponer tope si se configura. |

**Extensión futura:** `verifiedAt`, `status` distintos de `active`, planes — sin monetización en esta capa; solo mensajes y guardas mínimas.

## Calidad y vigencia

Reglas alineadas con `getListingPublishConfigFromEnv` (fotos mínimas, título, descripción, días de contenido obsoleto). `auth.me.qualityRules` las expone a UI para copy consistente.

## Archivos de referencia

- `packages/shared/src/publisher-policy.ts` — cupo efectivo y heurística “cerca del límite”.
- `packages/shared/src/copy/publisher-ux.ts` — textos.
- `apps/web/src/server/routers/auth.ts` — `me` con `publisher` + `qualityRules`.
- `apps/web/src/server/routers/listing.ts` — control de cupo y org en `create`.
