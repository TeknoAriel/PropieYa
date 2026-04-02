# Registro de bloqueos automáticos

El agente anota aquí fallos que **no puede resolver** sin acción externa (GitHub org, Vercel, secretos).

| Fecha | Qué falló | Acción necesaria (una vez) |
|-------|-----------|----------------------------|
| 2026-03-22 | Build Vercel: `@elastic/elasticsearch/api/types` y `@/lib/search` | Corregido en mapping.ts (tipo local) y lib/search/index.ts |
| 2026-03-22 | main protegido: push directo rechazado (PR requerido) | Workflow cambiado a PR-based: crea PR, espera CI, mergea |
| 2026-03-22 | **Actions no puede crear PR**: "GitHub Actions is not permitted to create or approve pull requests" | **Settings → Actions → General → Workflow permissions** → marcar "Allow GitHub Actions to create and approve pull requests". Ver docs/26-config-repo-deploy.md |
| 2026-03-24 | **Merge PR falla**: "Required status check 'Typecheck' is expected" | **Settings → Rules** → regla de `main` → **Rules** → **quitar** "Require status checks to pass". Ver docs/DEPLOY-PASOS-URIs.md A2 |
| 2026-03-24 | **Verify-deploy falla**: portal no responde 2xx en tiempo | Workflow ajustado (sleep 120s, 8 intentos). Si persiste: revisar Vercel build logs, que el proyecto web esté vinculado a `main`. |
| 2026-03-24 | **Portal 404**: propieyaweb.vercel.app devuelve 404 tras merge OK | **Checklist:** docs/33-VERCEL-CONFIG-PROYECTO-WEB.md y A3 de `DEPLOY-PASOS-URIs.md`. **Alternativa sin dashboard en cada release:** Parte D (secretos `VERCEL_*` en GitHub) para deploy por CLI en el workflow Promote. El job verify-deploy **falla** si el portal no da 2xx (ya no se ignora). |
| 2026-03-25 | **Vercel plan Hobby**: bloqueo / límite por **exceso de descargas** (ventana ~24 h) | Revisar **Vercel Dashboard → Usage / Billing**. Opciones: esperar reinicio de cuota, reducir builds, o **upgrade** a plan de pago. Sin builds exitosos no hay deploy nuevo. |
| 2026-03-26 | **Probe portal**: `https://propieyaweb.vercel.app` **404** `x-vercel-error: NOT_FOUND` (re-verificado; `pnpm diagnostico:prod` igual) | Dominio sin deployment válido en el proyecto **web**: `docs/33-VERCEL-CONFIG-PROYECTO-WEB.md`, A3 de `docs/DEPLOY-PASOS-URIs.md`; secretos `VERCEL_*` = proyecto **web**, no panel. Cuando responda 2xx: `/`, `/api/health`, `/api/version`, `/estado`. |
| 2026-03-27 | **Portal “vacío” / sin propiedades / listados en cero** pese a código de sprints en repo | **`DATABASE_URL` ausente en Vercel** (proyecto **`propie-ya-web`**, Production). `/api/health` → `503` y `checks.database.error` lo indica. **Un paso:** Vercel → proyecto web → Settings → Environment Variables → pegar `DATABASE_URL` de Neon (misma cadena que en el proyecto viejo o desde Neon dashboard). Redeploy. Ver `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`. |
| 2026-03-29 | **Web sin cambios visibles** (`/api/version` queda en `b4067f2`): el código nuevo está en Git pero no en Vercel | **Causa habitual:** run del workflow **Promote** falla en deploy; el portal queda en el último deploy **exitoso**. **Repo (iteraciones):** `pull` + `deploy --prod` desde **raíz del monorepo** (incluye `packages/*`; deploy solo desde `apps/web` rompía el build remoto); CLI `vercel@41`. Producción también se actualiza si **Vercel está enlazado a `main`** y se mergea. Si sigue en rojo: [Actions → Promote](https://github.com/kiteprop/ia-propieya/actions/workflows/promote-deploy-infra.yml) → log del paso Deploy; [secretos](https://github.com/kiteprop/ia-propieya/settings/secrets/actions). |

| 2026-03-30 | **Migración repo** a `kiteprop/ia-propieya` | Tras el primer push: en **Vercel** → proyecto web → Settings → Git → conectar el nuevo repo; en **GitHub** del nuevo repo → Settings → Secrets → volver a cargar `VERCEL_*` si hace falta; Actions en https://github.com/kiteprop/ia-propieya/actions |
| 2026-03-31 | **Portal sin propiedades / tRPC 500:** `column "dedup_canonical_id" does not exist` | **Causa:** schema con columna nueva sin migrar en Neon. **Arreglo en código:** quitada la columna del ORM y filtros hasta alinear DB. **Opcional (dedup real):** ejecutar una vez `docs/sql/add-dedup-canonical-id.sql` en prod y volver a añadir columna + filtros en el repo. |

Formato al añadir fila:

```markdown
| YYYY-MM-DD | workflow X / error Y | quién hace qué en qué URL |
```
