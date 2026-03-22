# URLs canónicas (fuente de verdad)

> **No usar** otras variantes (`propieya-web`, `propieya_web`, etc.) salvo que este archivo se actualice.

| Entorno | Servicio | URL |
|---------|----------|-----|
| **Producción / pruebas públicas** | Portal web (`apps/web`) | **https://propieyaweb.vercel.app** |
| Producción | Panel B2B (`apps/panel`) | *(definir en Vercel → Settings → Domains y actualizar esta tabla)* |

## Variables que deben coincidir

En el proyecto **Panel** (Vercel → Environment Variables):

```text
NEXT_PUBLIC_WEB_APP_URL=https://propieyaweb.vercel.app
```

Sin barra final. Mismo valor en Production, Preview y Development si el panel debe apuntar siempre al mismo portal.

En el proyecto **Web** (Vercel → Environment Variables), CORS para que el panel llame a `/api/trpc`:

```text
TRUSTED_PANEL_ORIGINS=https://URL-EXACTA-DEL-PANEL.vercel.app
```

Si usás previews del panel, agregá varias URLs separadas por coma.

## Verificación rápida

- Abrí **https://propieyaweb.vercel.app** → debe cargar el home de Propieya.
- Health: `https://propieyaweb.vercel.app/api/health` (incluye `version.commit` si hay deploy Vercel).
- Version (qué commit está desplegado): `https://propieyaweb.vercel.app/api/version`

Última confirmación: contenido esperado incluye título *Propieya - Encontrá tu propiedad ideal* y hero *Contale a Propieya*.

### Verificar que el deploy coincide con el repo

```bash
# Commit desplegado (desde /api/version o /api/health)
curl -s https://propieyaweb.vercel.app/api/version | jq .commit

# Comparar con el último en main
git fetch origin main && git log -1 --format=%h origin/main
```
