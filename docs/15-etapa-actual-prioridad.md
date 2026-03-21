# Etapa actual — prioridad decidida

**Objetivo:** circuito **Panel → API web (tRPC) → DB** estable en producción.

## Qué se implementó

- **CORS** en `apps/web` para `/api/trpc` (`TRUSTED_PANEL_ORIGINS`).
- Sin esto, el panel en otro dominio no puede usar tRPC desde el navegador.

## Qué configurar en Vercel (una vez)

| Proyecto | Variable | Ejemplo |
|----------|----------|---------|
| **Web** | `TRUSTED_PANEL_ORIGINS` | `https://tu-panel.vercel.app` |
| **Panel** | `NEXT_PUBLIC_WEB_APP_URL` | `https://propieyaweb.vercel.app` |

Ver **`docs/CANONICAL-URLS.md`**.

## Siguiente (cuando esto funcione)

- Subida de imágenes (S3/R2).
- Búsqueda conversacional / Elasticsearch.
- Endurecer auth (refresh, roles).
