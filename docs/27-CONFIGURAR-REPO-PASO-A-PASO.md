# Configuración del repo — paso a paso

URLs directas y valores a configurar para que el deploy funcione.

**Importante:** El workflow Promote ya tiene `contents: write` (necesario para mergear). Si faltaba, eso provocaba el fallo del merge.

---

## 1. Permisos de Actions (crear/aprobar PRs)

**URL:** https://github.com/kiteprop/ia-propieya/settings/actions

1. Bajar hasta **"Workflow permissions"**
2. Marcar: **"Read and write permissions"**
3. Marcar: **"Allow GitHub Actions to create and approve pull requests"**
4. **Save**

---

## 2. Ruleset de main — quitar "Require status checks"

**URL:** https://github.com/kiteprop/ia-propieya/settings/rules

1. Abrir la regla que protege `main`
2. En **"Rules"**, buscar **"Require status checks to pass before merging"**
3. **Eliminar** esa regla
4. Guardar

Evita el error "Required status check 'Typecheck' is expected". El Promote ya verifica antes de mergear.

---

## 4. Desbloquear ahora: merge manual del PR

Si todo lo anterior está bien y el workflow sigue fallando:

**URL del PR:** https://github.com/kiteprop/ia-propieya/pull/3

1. Abrir el PR
2. Si los checks están en verde, usar **"Merge pull request"**
3. Confirmar el merge

Con eso, `main` se actualiza, Vercel despliega y producción queda al día. El flujo automático debería funcionar en los próximos pushes si la config está correcta.

---

## 5. Variables en Vercel (opcional)

Si el build en Vercel falla por variables:

**URL:** https://vercel.com/teknoariels-projects/propie-ya-web/settings/environment-variables

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
