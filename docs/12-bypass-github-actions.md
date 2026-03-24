# Si falla "Merge to main" en Actions

## Error: "GitHub Actions is not permitted to create or approve pull requests"

**Solución:** Settings → **Actions** → **General** → **Workflow permissions** → marcar **"Allow GitHub Actions to create and approve pull requests"**.

Ver guía completa: **docs/26-config-repo-deploy.md**

## Error: "Required status check 'Typecheck' is expected"

**Solución (sin PAT ni bypass):** En la regla de main, **quitar** la regla "Require status checks to pass before merging".

1. **https://github.com/TeknoAriel/PropieYa/settings/rules**
2. Abrir la regla de `main`
3. En **Rules** → buscar **"Require status checks to pass"** → **eliminar**
4. Guardar

El workflow Promote ya verifica lint+typecheck+build antes de mergear; esa regla es redundante y suele causar fallos.

Ver **docs/DEPLOY-PASOS-URIs.md** (Parte A2).
