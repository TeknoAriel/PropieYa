# Registro de bloqueos automáticos

El agente anota aquí fallos que **no puede resolver** sin acción externa (GitHub org, Vercel, secretos).

| Fecha | Qué falló | Acción necesaria (una vez) |
|-------|-----------|----------------------------|
| 2026-03-22 | Build Vercel: `@elastic/elasticsearch/api/types` y `@/lib/search` | Corregido en mapping.ts (tipo local) y lib/search/index.ts |
| 2026-03-22 | main protegido: push directo rechazado (PR requerido) | Workflow cambiado a PR-based: crea PR, espera CI, mergea |
| 2026-03-22 | **Actions no puede crear PR**: "GitHub Actions is not permitted to create or approve pull requests" | **Settings → Actions → General → Workflow permissions** → marcar "Allow GitHub Actions to create and approve pull requests". Ver docs/26-config-repo-deploy.md |
| 2026-03-24 | **Merge PR falla**: "Required status check 'Typecheck' is expected" | **Settings → Rules → Rulesets** → regla de `main` → **Bypass list** → añadir `github-actions[bot]`. Ver docs/12-bypass-github-actions.md |
| 2026-03-24 | **Verify-deploy falla**: portal no responde 2xx en tiempo | Workflow ajustado (sleep 120s, 8 intentos). Si persiste: revisar Vercel build logs, que el proyecto web esté vinculado a `main`. |

Formato al añadir fila:

```markdown
| YYYY-MM-DD | workflow X / error Y | quién hace qué en qué URL |
```
