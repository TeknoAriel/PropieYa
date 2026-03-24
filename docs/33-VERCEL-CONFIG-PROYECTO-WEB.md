# Configuración del proyecto Web en Vercel

Documento breve; el detalle operativo está en **`docs/DEPLOY-PASOS-URIs.md`**.

## Checklist (producción)

| Qué | Valor esperado |
|-----|----------------|
| Repositorio | `TeknoAriel/PropieYa` |
| Rama de producción | `main` |
| Root Directory | `apps/web` |
| Dominio del portal | `propieyaweb.vercel.app` (asignado al **mismo** proyecto web) |

Si `/` y `/api/health` devuelven **404** con `x-vercel-error: NOT_FOUND`, el dominio no está asociado a un deploy válido: revisar la tabla anterior en el dashboard de Vercel.

## Deploy sin depender solo del enlace Git (opcional)

Si el enlace Git → Vercel falla o el dominio queda huérfano, el workflow **Promote** puede desplegar por CLI cuando existan los secretos en GitHub: ver **Parte D** en `docs/DEPLOY-PASOS-URIs.md`.
