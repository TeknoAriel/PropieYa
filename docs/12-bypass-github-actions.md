# Si falla “Merge to main” en Actions

GitHub puede bloquear el `push` a `main`. **Una sola vez**, en el repo:

1. **Settings** → **Rules** → **Rulesets** (o **Branches** → reglas de `main`)
2. En la regla de `main`: **Bypass list** / excepciones
3. Añadí actor: **`github-actions[bot]`** o **Repository roles** que permitan a Actions escribir en `main`

Alternativa: **Settings** → **Actions** → **General** → **Workflow permissions** → **Read and write permissions**.

Sin bypass, el workflow `promote-deploy-infra` fallará en el paso *Merge to main*.
