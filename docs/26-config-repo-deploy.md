# Configuración del repositorio para deploy automático

## Secuencia del pipeline

```
1. Push a deploy/infra
2. Promote workflow: Verify (lint, typecheck, build) ✓
3. Promote workflow: Crear PR → Esperar CI → Mergear  ← FALLA AQUÍ
4. Vercel despliega main
```

## Problema actual

**Error:** `GitHub Actions is not permitted to create or approve pull requests.`

**Causa:** El `GITHUB_TOKEN` del workflow no tiene permiso para crear PRs. Es una configuración del repo.

---

## Pasos para corregir (una sola vez)

### 1. Habilitar que Actions cree PRs

1. Ir a: **https://github.com/TeknoAriel/PropieYa/settings/actions**
2. Bajar a **"Workflow permissions"**
3. Marcar: **"Allow GitHub Actions to create and approve pull requests"**
4. Guardar

### 2. (Opcional) Bypass para merge

Si el merge del PR falla con "changes must be made through a pull request" o "Required status check":

1. Ir a: **https://github.com/TeknoAriel/PropieYa/settings/rules**
2. Editar la regla de `main`
3. En **Bypass list**, agregar: `github-actions[bot]`

**Alternativa (PAT):** Si el bypass no basta, crear un Fine-grained PAT con permisos Contents + Pull requests, añadirlo como secret **REPO_ACCESS_TOKEN** en Settings → Secrets. Ver docs/12-bypass-github-actions.md.

---

## Verificar que quedó bien

1. Hacer un push vacío a deploy/infra:
   ```bash
   git checkout deploy/infra
   git commit --allow-empty -m "chore: test promote workflow"
   git push origin deploy/infra
   ```
2. Ir a **Actions** y ver que el workflow completo pase (verify → merge → verify-deploy)
3. Verificar: `curl -s https://propieyaweb.vercel.app/api/version`

---

## Resumen de errores anteriores

| Error | Dónde | Solución |
|-------|-------|----------|
| Build: `@/lib/search` | Vercel | Corregido (lib/search/index.ts) |
| Build: `MappingProperty` | Vercel | Corregido (tipo local en mapping.ts) |
| Push directo a main | Promote | Workflow cambiado a PR-based |
| **Actions no puede crear PR** | Promote | **Habilitar en Settings → Actions** |
| **Branch protection requiere "Typecheck"** | Promote | Job "Typecheck" agregado al workflow Promote (crea el check que exige la regla) |
