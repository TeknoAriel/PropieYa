# Pipeline de deploy completo (sin reconfigurar)

Este documento describe el flujo que ejecuta el agente para subir cambios a producción. Sirve para que cada deploy no requiera pasos manuales repetidos.

---

## Resumen del flujo

1. **Código** → push a `deploy/infra`
2. **Promote** → GitHub Actions verifica y mergea a `main`
3. **Vercel** → despliega automáticamente al actualizarse `main`
4. **Schema DB** → se aplica con `vercel env pull` + `db-push-produccion.sh` (si hay cambios)
5. **Org/seed** → `pnpm seed:org` contra prod (solo si no existe org para imports)

---

## 1. Push a deploy/infra

```bash
git checkout deploy/infra
# ... cambios ...
git add -A
git commit -m "feat: descripción"
git push origin deploy/infra
```

El workflow **Promote deploy/infra → main** se dispara automáticamente. Verifica lint, typecheck y build; luego crea/actualiza un PR y lo mergea a `main`.

---

## 2. Schema de base de datos (Neon producción)

Cuando hay cambios en el schema (nuevas tablas/columnas), hay que aplicar `db:push` contra la DB de producción **antes** de que el cron u otras rutas usen las nuevas estructuras.

**El agente lo hace así:**

```bash
cd /Users/arielcarnevali/Propieya
vercel env pull .env.prod.from-vercel --environment=production --yes
set -a && source .env.prod.from-vercel && set +a
./scripts/db-push-produccion.sh
rm .env.prod.from-vercel   # no subir a git
```

**Requisito:** tener `vercel` CLI instalado y logueado (`vercel login`). El proyecto debe estar linkeado a `propieya-web`:

```bash
cd apps/web
vercel link --project propieya-web --scope teknoariels-projects
```

---

## 3. Organización para imports (cron Yumblin)

El cron `/api/cron/import-yumblin` necesita al menos una organización y un usuario publicador. Si la DB está vacía o sin org de import:

```bash
vercel env pull .env.prod.from-vercel --environment=production --yes
set -a && source .env.prod.from-vercel && set +a
pnpm seed:org
rm .env.prod.from-vercel
```

Crea org y usuario `import@propieya.local` / `import-demo-2024`.

---

## 4. Cron y plan Vercel Hobby

En plan **Hobby**, Vercel solo permite crons que se ejecuten **una vez por día**. Un cron horario (`0 * * * *`) falla el deploy con:

> Hobby accounts are limited to daily cron jobs.

**Solución aplicada:** el cron de import está en `0 6 * * *` (diario a las 06:00 UTC). La lógica interna sigue respetando `IMPORT_SYNC_INTERVAL_HOURS` cuando el cron se ejecute.

Si pasás a plan **Pro**, podés cambiar en `apps/web/vercel.json` a `0 * * * *` para ejecución horaria.

---

## 5. Reglas de main (branch protection)

`main` está protegido: **no acepta push directo**. Los cambios deben llegar vía:

- PR desde `deploy/infra` (creado y mergeado por el workflow Promote), o
- Merge manual de un PR aprobado con checks pasando.

Si intentás `git push origin main` verás:

```
Changes must be made through a pull request.
Required status check "Typecheck" is expected.
```

---

## 6. URLs de referencia

| Recurso | URL |
|--------|-----|
| Portal producción | https://propieyaweb.vercel.app |
| Health API | https://propieyaweb.vercel.app/api/health |
| Version API | https://propieyaweb.vercel.app/api/version |
| Variables Vercel (web) | https://vercel.com/teknoariels-projects/propieya-web/settings/environment-variables |
| Reglas del repo | https://github.com/TeknoAriel/PropieYa/rules |
| Actions Promote | https://github.com/TeknoAriel/PropieYa/actions/workflows/promote-deploy-infra.yml |

---

## 7. Checklist rápido para el agente

- [ ] `pnpm lint` y `pnpm typecheck` pasan
- [ ] `pnpm build` pasa
- [ ] Commit en `deploy/infra` con mensaje claro
- [ ] Push a `origin deploy/infra`
- [ ] Si hubo cambios de schema: `vercel env pull` + `db-push-produccion.sh`
- [ ] Si la DB no tenía org: `pnpm seed:org` contra prod
- [ ] Verificar: `curl https://propieyaweb.vercel.app/api/health`

---

## 8. Bloqueos conocidos y solución

| Bloqueo | Causa | Solución |
|---------|-------|----------|
| Deploy falla por cron | Hobby no permite horario | Usar `0 6 * * *` en vercel.json |
| `relation "X" does not exist` | Schema no aplicado en Neon | Ejecutar `db-push-produccion.sh` con DATABASE_URL de prod |
| `No organization` en cron import | Sin org/publicador | Ejecutar `pnpm seed:org` contra prod |
| Push a main rechazado | Branch protection | Usar flujo deploy/infra → Promote → main |
| Promote no mergea | Checks fallan o timeout | Revisar Actions; corregir lint/typecheck/build localmente |
