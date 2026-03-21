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

## Verificación rápida

- Abrí **https://propieyaweb.vercel.app** → debe cargar el home de Propieya.
- Health (si está desplegado): `https://propieyaweb.vercel.app/api/health`

Última confirmación: contenido esperado incluye título *Propieya - Encontrá tu propiedad ideal* y hero *Contale a Propieya*.
