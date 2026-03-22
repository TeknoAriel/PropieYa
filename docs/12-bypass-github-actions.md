# Si falla "Merge to main" en Actions

El workflow `promote-deploy-infra` usa **PR** (crea PR deploy/infra→main, espera CI, mergea). Funciona con main protegido.

Si falla el merge del PR:

1. **Settings** → **Rules** → **Rulesets** → regla de `main`
2. **Bypass list**: añadir **`github-actions[bot]`** para que pueda mergear PRs
3. O: **Settings** → **Actions** → **General** → **Workflow permissions** → **Read and write**
