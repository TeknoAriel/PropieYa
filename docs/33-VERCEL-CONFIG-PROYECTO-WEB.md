# Configuración del proyecto Web en Vercel

Documento breve; el detalle operativo está en **`docs/DEPLOY-PASOS-URIs.md`**.

## Checklist (producción)

| Qué | Valor esperado |
|-----|----------------|
| Repositorio | `TeknoAriel/PropieYa` |
| **Nombre del proyecto Vercel (web)** | **`propie-ya-web`** (team `teknoariels-projects`) |
| Root Directory | `apps/web` |
| Dominio del portal | `propieyaweb.vercel.app` (asignado al **mismo** proyecto web) |

> Detalle histórico y reglas duras: `docs/DEPLOY-CONTEXTO-AGENTES.md`.

> El deploy productivo ahora lo hace GitHub Actions por **Vercel CLI** desde `deploy/infra`.
> La rama de producción configurada en Vercel ya **no es el punto crítico** del flujo.

Si `/` y `/api/health` devuelven **404** con `x-vercel-error: NOT_FOUND`, el dominio no está asociado a un deploy válido del proyecto web: revisar Domains en Vercel.

## Requisito para deploy automatizado por CLI

Secretos en GitHub (repo):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Ruta: `https://github.com/TeknoAriel/PropieYa/settings/secrets/actions`
