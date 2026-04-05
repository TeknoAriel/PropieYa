# Flujo simple y estable — portal en producción

**Objetivo:** una sola secuencia repetible para que **GitHub**, **Actions**, **Vercel** y la **URL canónica** queden alineados. Complementa `docs/DEPLOY-CONTEXTO-AGENTES.md` y `docs/DEPLOY-PASOS-URIs.md`.

---

## Reglas de oro

1. **Repo operativo:** [TeknoAriel/PropieYa](https://github.com/TeknoAriel/PropieYa) — remoto `origin`. Ahí viven **secretos `VERCEL_*`** y el workflow **Promote**.
2. **Rama que dispara el deploy del portal:** `deploy/infra` → [workflow Promote](https://github.com/TeknoAriel/PropieYa/actions/workflows/promote-deploy-infra.yml) → `vercel deploy --prod` al proyecto **`propie-ya-web`**.
3. **Rama `main`:** debe contener **el mismo código** que acaba de salir a producción (merge desde `deploy/infra`). Así el panel (Vercel Git en `main`) y los clones no quedan desfasados.
4. **Copia org:** `kiteprop/ia-propieya` (`git remote add kiteprop …`) — tras cada release estable, `git push kiteprop deploy/infra` y `git push kiteprop main` para no divergir.
5. **Antes de cualquier push:** `pnpm verify`.

---

## Secuencia estándar (después de cerrar un sprint o un fix)

| Paso | Acción |
|------|--------|
| 1 | En `deploy/infra`: `pnpm verify` |
| 2 | `git push origin deploy/infra` (dispara Promote; esperar job **verde**) |
| 3 | `git checkout main && git pull origin main && git merge deploy/infra && pnpm verify && git push origin main` |
| 4 | `git checkout deploy/infra && git merge main --ff-only && git push origin deploy/infra` (opcional si `main` solo avanzó por el merge; deja **mismo SHA** en ambas ramas) |
| 5 | `git push kiteprop deploy/infra && git push kiteprop main` |
| 6 | `pnpm verificar:deploy` — comprobar `https://propieyaweb.vercel.app/api/version` ≈ último commit |

**Atajo cuando `main` ya está al día:** si solo trabajaste en `deploy/infra`, tras el push y el merge a `main`, un `git merge main --ff-only` en `deploy/infra` alinea ambas puntas al **mismo commit** (como en el alineamiento 2026-04-05).

---

## Si `/api/version` no coincide con el último push

1. [Actions → Promote (Tekno)](https://github.com/TeknoAriel/PropieYa/actions/workflows/promote-deploy-infra.yml) — último run: ¿**failure**? Abrir log del paso **Deploy producción** o **Smoke test**.
2. `pnpm diagnostico:prod` en el repo.
3. Si el fallo fue **transitorio** (red, Vercel): **Re-run jobs** en el workflow o un push vacío en `deploy/infra` tras alinear `main`.

---

## Base de datos: catálogo activo y depurado (post-deploy)

El código nuevo **no** reescribe sola la Neon: hace falta **ingesta/publicación** según `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`.

| Orden | Qué |
|-------|-----|
| A | Tras deploy con Sprint 39+: esperar cron `GET /api/cron/import-yumblin` o dispararlo con `CRON_SECRET` |
| B | Si `activeListings` sigue bajo: `pnpm publish:imported` con `DATABASE_URL` de producción (o equivalente documentado) |
| C | Si el import devuelve `searchIndexDeferred`: `GET /api/cron/sync-search` o `pnpm reindex:es` |
| D | Depuración opcional de tipos: `pnpm reclassify:listing-types` (ver doc 37) |

**Comprobación:** `GET /api/inventory-stats` — `activeListings` del orden del feed menos retirados.

---

*Actualizado: 2026-04-05 — alineación main/deploy/infra + Promote verde (`9d27342`).*
