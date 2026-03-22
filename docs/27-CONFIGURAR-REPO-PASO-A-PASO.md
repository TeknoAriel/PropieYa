# Configuración del repo — paso a paso

URLs directas y valores a configurar para que el deploy funcione.

**Importante:** El workflow Promote ya tiene `contents: write` (necesario para mergear). Si faltaba, eso provocaba el fallo del merge.

---

## 1. Permisos de Actions (crear/aprobar PRs)

**URL:** https://github.com/TeknoAriel/PropieYa/settings/actions

1. Bajar hasta **"Workflow permissions"**
2. Marcar: **"Read and write permissions"**
3. Marcar: **"Allow GitHub Actions to create and approve pull requests"**
4. **Save**

---

## 2. Bypass para que Actions pueda mergear

**URL:** https://github.com/TeknoAriel/PropieYa/settings/rules

1. Si hay reglas activas, abrir la regla que protege `main`
2. Buscar **"Bypass list"** o **"Allow specified actors to bypass"**
3. Añadir: **`github-actions[bot]`**

Si usás **Rulesets** (nuevo):

**URL:** https://github.com/TeknoAriel/PropieYa/settings/rules/new (o editar la existente)

- En la regla que aplica a `main`, en **"Bypass list"** → añadir **`github-actions[bot]`**
- Guardar

---

## 3. Revisar required status checks

**URL:** https://github.com/TeknoAriel/PropieYa/settings/branches

O: **Settings** → **Rules** → regla de `main`

Verificar qué checks exige la protección. Debe incluir al menos uno de:

- `Typecheck` (del workflow CI o Promote)
- `Verify (lint + typecheck + build)` (si lo tenés como required)

Si sólo exige `Typecheck`, el workflow Promote ya lo genera. Si exige otros, puede haber conflicto.

---

## 4. Desbloquear ahora: merge manual del PR

Si todo lo anterior está bien y el workflow sigue fallando:

**URL del PR:** https://github.com/TeknoAriel/PropieYa/pull/3

1. Abrir el PR
2. Si los checks están en verde, usar **"Merge pull request"**
3. Confirmar el merge

Con eso, `main` se actualiza, Vercel despliega y producción queda al día. El flujo automático debería funcionar en los próximos pushes si la config está correcta.

---

## 5. Variables en Vercel (opcional)

Si el build en Vercel falla por variables:

**URL:** https://vercel.com/teknoariels-projects/propieya_web/settings/environment-variables

Variables necesarias (según `docs/22-vercel-env-s3.md`):

| Nombre | Valor |
|--------|-------|
| `DATABASE_URL` | postgresql://... (tu conexión Neon) |
| `JWT_SECRET` | secreto para tokens |
| `TRUSTED_PANEL_ORIGINS` | URL del panel si lo tenés |

---

## Checklist rápido

- [ ] **Settings → Actions** → "Allow GitHub Actions to create and approve pull requests"
- [ ] **Settings → Actions** → "Read and write permissions"
- [ ] **Settings → Rules** → Bypass: `github-actions[bot]`
- [ ] Si hace falta: merge manual del PR #3
