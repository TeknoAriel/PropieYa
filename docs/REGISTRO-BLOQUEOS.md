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
| 2026-03-26 | **Probe portal**: `https://propieyaweb.vercel.app` sigue **404** desde agente | Mismo checklist que fila 404 (rama `main`, Root `apps/web`, proyecto correcto). Página pública **`/estado`** en el código resume pendientes cuando el sitio ya responde. |

Formato al añadir fila:

```markdown
| YYYY-MM-DD | workflow X / error Y | quién hace qué en qué URL |
```
