# Configuración Vercel: Proyecto Web (propieya-web)

Este documento describe los valores exactos para que el deploy del portal web funcione sin errores como `No Output Directory named "public" found`.

---

## Configuración obligatoria en Vercel Dashboard

**Proyecto:** `propieya-web` (o el que esté asociado a `apps/web`)

**URL de settings:**  
https://vercel.com/teknoariels-projects/propieya-web/settings (ajustar `teknoariels-projects` si el scope es otro)

### General → Root Directory

| Campo | Valor | Notas |
|-------|-------|-------|
| **Root Directory** | `apps/web` | **Crítico.** Sin esto Vercel construye desde la raíz, busca `public` y falla. |

### Build & Development Settings

| Campo | Valor | Notas |
|-------|-------|-------|
| **Framework Preset** | Next.js | No usar "Other" ni "Static HTML". |
| **Build Command** | *(vacío o heredar de vercel.json)* | `apps/web/vercel.json` define `buildCommand` en código. |
| **Output Directory** | *(vacío)* | Debe estar vacío para usar el default de Next.js (`.next`). Si dice `public`, borrarlo. |
| **Install Command** | `pnpm install --frozen-lockfile` | Para monorepos Vercel ejecuta install desde la raíz del repo. |
| **Node.js Version** | 20.x | Evita warnings de deprecación. |

### Un solo proyecto Web

Solo debe existir un proyecto Vercel para el portal. Si hay duplicados (`propieya_web` con underscore, `propieya-web` con guión):

- Usar uno como producción (recomendado: `propieya-web` vinculado a `main`).
- Eliminar o desvincular el duplicado.
- La URL canónica está en `docs/CANONICAL-URLS.md`: `https://propieyaweb.vercel.app`.

---

## Qué hace `apps/web/vercel.json`

```json
{
  "buildCommand": "cd ../.. && pnpm exec turbo run build --filter=@propieya/web",
  "framework": "nextjs",
  "crons": [...]
}
```

- **buildCommand:** Construye desde la raíz del monorepo para que Turborepo resuelva dependencias (`@propieya/database`, etc.) y genere el output en `apps/web/.next`.
- **framework:** Refuerza que Vercel trate el proyecto como Next.js.
- **crons:** Rutas de cron (import, sync, etc.).

---

## Si el deploy sigue fallando

1. **Revisar Root Directory:** Debe ser exactamente `apps/web`.
2. **Output Directory:** Si está en `public`, borrarlo y dejar vacío.
3. **Redeploy sin caché:** En el deployment fallido → "Redeploy" → desmarcar "Use existing Build Cache".
4. **Turbo cache:** Si el build es "cache hit" y falta `.next`, los `outputs` en `turbo.json` deben incluir `.next/**` y `!.next/cache/**` (ya configurado).

---

## Referencias

- [Vercel Turborepo](https://vercel.com/docs/monorepos/turborepo)
- [Missing Output Directory (Turborepo)](https://vercel.com/guides/missing-routes-manifest-or-output-turborepo-nx)
- `docs/06-despliegue-vercel.md`
- `docs/32-PIPELINE-DEPLOY-COMPLETO.md`
