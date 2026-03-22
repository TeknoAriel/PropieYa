# Verificar que el deploy está actualizado

## Problema

Si ves la URL de pruebas (https://propieyaweb.vercel.app) pero no aparecen cambios recientes, puede ser que:

1. **El promote workflow falló** (lint/typecheck/build en CI) → `main` no se actualizó.
2. **Vercel no desplegó** tras el merge (revisar Vercel Dashboard).
3. **Caché del navegador** (probar en incógnito o forzar recarga).

## Cómo verificar qué está desplegado

### 1. Commit desplegado

```bash
curl -s https://propieyaweb.vercel.app/api/version
```

O desde `/api/health` (incluye `version` si existe):

```bash
curl -s https://propieyaweb.vercel.app/api/health | jq .
```

### 2. Comparar con el repo

```bash
# Último commit en main (lo que Vercel debería tener)
git fetch origin main
git log -1 --format="%h %s" origin/main

# Commits en deploy/infra que aún no están en main
git log --oneline origin/main..origin/deploy/infra
```

Si `origin/main` está muy atrás respecto a `deploy/infra`, el promote workflow no está pasando.

### 3. Estado del workflow

1. GitHub → Actions → "Promote deploy/infra → main".
2. Si **verify** falla: corregir lint/typecheck/build y volver a pushear a `deploy/infra`.
3. Si **merge-to-main** falla: revisar permisos (GITHUB_TOKEN).
4. Si **verify-deploy** falla: el portal no respondió 2xx tras 90s; puede ser Vercel lento o error de deploy.

### 4. Forzar re-ejecución

```bash
# Push vacío para re-disparar el workflow
git checkout deploy/infra
git commit --allow-empty -m "chore: re-trigger promote workflow"
git push origin deploy/infra
```

Luego ir a GitHub Actions y vigilar que verify → merge → verify-deploy pasen.

## Antes de pushear a deploy/infra

Ejecutar localmente lo mismo que hace el CI:

```bash
pnpm verify
```

Equivale a `pnpm lint && pnpm typecheck && pnpm build`. Si falla, corregir antes de push.

## Resumen

| Qué revisar          | Dónde                                         |
|----------------------|-----------------------------------------------|
| Commit desplegado    | `curl https://propieyaweb.vercel.app/api/version` |
| Último en main       | `git log -1 origin/main`                      |
| Workflow status      | GitHub Actions                                |
| Build/deploy Vercel  | Vercel Dashboard → Deployments                |
