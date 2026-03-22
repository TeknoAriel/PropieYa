# Si falla "Merge to main" en Actions

## Error: "GitHub Actions is not permitted to create or approve pull requests"

**Solución:** Settings → **Actions** → **General** → **Workflow permissions** → marcar **"Allow GitHub Actions to create and approve pull requests"**.

Ver guía completa: **docs/26-config-repo-deploy.md**

## Si falla el merge del PR (otro error)

1. **Settings** → **Rules** → **Rulesets** → regla de `main`
2. **Bypass list**: añadir **`github-actions[bot]`** para que pueda mergear PRs
3. O: **Settings** → **Actions** → **General** → **Workflow permissions** → **Read and write**
