# Etapa actual — prioridad decidida

**Objetivo:** circuito **Panel → API web (tRPC) → DB** estable en producción.

## Qué se implementó

- **CORS** en `apps/web` para `/api/trpc` (`TRUSTED_PANEL_ORIGINS`).
- **Errores de DB** legibles si falta schema (`humanizeDbError` + doc **16**).
- **Magic link de prueba** (panel + web): doc **17**.
- **Packs de copy** del portal con **título** para A/B: doc **18** (`NEXT_PUBLIC_PORTAL_COPY_PACK`).

## Qué configurar en Vercel (una vez)

| Proyecto | Variable | Ejemplo |
|----------|----------|---------|
| **Web** | `TRUSTED_PANEL_ORIGINS` | `https://tu-panel.vercel.app` |
| **Panel** | `NEXT_PUBLIC_WEB_APP_URL` | `https://propieyaweb.vercel.app` |
| **Web** | `NEXT_PUBLIC_PANEL_URL` | URL del panel (magic link) |
| **Web** | `MAGIC_LINK_TEST_MODE` | `1` solo en prueba |
| **Panel** | `NEXT_PUBLIC_MAGIC_LINK_TEST_MODE` | `1` para ver el bloque en login |

Ver **`docs/CANONICAL-URLS.md`**.

## Siguiente (cuando esto funcione)

- Subida de imágenes (S3/R2).
- Búsqueda conversacional / Elasticsearch.
- Endurecer auth (refresh, roles).
