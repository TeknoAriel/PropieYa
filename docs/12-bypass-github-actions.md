# Si falla "Merge to main" en Actions

## Error: "GitHub Actions is not permitted to create or approve pull requests"

**Solución:** Settings → **Actions** → **General** → **Workflow permissions** → marcar **"Allow GitHub Actions to create and approve pull requests"**.

Ver guía completa: **docs/26-config-repo-deploy.md**

## Error: "Required status check 'Typecheck' is expected"

La regla de branch protection exige checks que a veces no coinciden con los del workflow. Opciones:

### Opción A: Bypass para github-actions[bot] (recomendado primero)

1. **Settings** → **Rules** → **Rulesets** → regla de `main`
2. **Bypass list** → añadir **`github-actions[bot]`**
3. Guardar

### Opción B: PAT para merge (si A no funciona)

1. Crear **Fine-grained PAT**: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
2. Permisos: **Contents** (Read and write), **Pull requests** (Read and write)
3. En el repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
4. Nombre: **`REPO_ACCESS_TOKEN`**
5. Valor: el PAT creado

El workflow Promote usará este token para mergear si existe; así se evita el bloqueo de reglas.
