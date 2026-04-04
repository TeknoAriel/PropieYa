# Deploy — pasos y URLs (documento definitivo)

**Este es el documento de referencia.**

---

## Repositorio Git (operativo vs auditoría)

| Rol | Repo | Remoto típico | Uso |
|-----|------|---------------|-----|
| **Operativo (origin)** | [TeknoAriel/PropieYa](https://github.com/TeknoAriel/PropieYa) | `https://github.com/TeknoAriel/PropieYa.git` o `git@github.com:TeknoAriel/PropieYa.git` | Push diario, **GitHub Actions**, **Vercel → conectar este repo** (`propie-ya-web` y panel). |
| **Copia org (auditoría)** | [kiteprop/ia-propieya](https://github.com/kiteprop/ia-propieya) | `kiteprop` | Solo cuando el propietario pida: `git push kiteprop deploy/infra` (y `main` si aplica). |

**Clonar / alinear `origin`:**

```bash
git remote add origin https://github.com/TeknoAriel/PropieYa.git
# o SSH: git@github.com:TeknoAriel/PropieYa.git
git remote add kiteprop git@github.com:kiteprop/ia-propieya.git
```

**Flujo de deploy** (siempre contra `origin` = Tekno):

```bash
git push -u origin deploy/infra
```

**`main` en Tekno:** si el repo tiene reglas que exigen PR, actualizar `main` vía pull request desde `deploy/infra` (no push directo).

Verificación local del remoto: `pnpm verify:repo-remote`.

---

## URLs canónicas (NO cambiar)

| Recurso | URL exacta |
|---------|------------|
| Portal producción | https://propieyaweb.vercel.app |
| Health | https://propieyaweb.vercel.app/api/health |
| Version | https://propieyaweb.vercel.app/api/version |

---

## Parte A: Configuración UNA SOLA VEZ

### A1. Permisos de GitHub Actions

1. Ir a: **https://github.com/TeknoAriel/PropieYa/settings/actions**
2. En **Actions permissions**: permitir acciones (all actions/reusable workflows)
3. En **Workflow permissions**:
   - **Read and write permissions**
   - **Allow GitHub Actions to create and approve pull requests** (recomendado)
4. Guardar

### A2. Secretos Vercel en GitHub (obligatorio)

Ir a: **https://github.com/TeknoAriel/PropieYa/settings/secrets/actions** y crear (mismos nombres si también se despliega desde la copia `kiteprop`):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Origen de valores:
- Vercel → Account Settings → Tokens (`VERCEL_TOKEN`)
- Vercel → proyecto web (`propie-ya-web`) → Settings → General (`Project ID`)
- Vercel → Team Settings (`Team/Org ID`)

### A3. Vercel Web (proyecto correcto)

1. Proyecto web único: **`propie-ya-web`**
2. Root Directory: `apps/web`
3. Dominio `propieyaweb.vercel.app` asignado a ese proyecto
4. **Settings → Git:** conectar **`TeknoAriel/PropieYa`** (rama `deploy/infra` o la que uses para producción) para que previews y comentarios de deploy en dashboard coincidan con el repo que administrás.

Ver también: `docs/DEPLOY-CONTEXTO-AGENTES.md`.

> El deploy productivo lo realiza **GitHub Actions + Vercel CLI** en el repo **Tekno**; los secretos `VERCEL_*` deben estar en **TeknoAriel/PropieYa**. La integración Git en Vercel es complementaria (builds automáticos al push).

### A4. Org `kiteprop` (solo copia / auditoría)

La app de Vercel en la org **kiteprop** puede seguir **pendiente de aprobación** por un owner: no bloquea el día a día si trabajás con **Tekno** + secretos en [TeknoAriel/PropieYa → Secrets](https://github.com/TeknoAriel/PropieYa/settings/secrets/actions).

Cuando pidan auditoría: `git push kiteprop deploy/infra` (y secretos en `kiteprop/ia-propieya` solo si deben correr Actions desde ese repo).

**Si más adelante Vercel debe enlazarse solo a `kiteprop/ia-propieya`:** [instalaciones kiteprop](https://github.com/organizations/kiteprop/settings/installations) → **Vercel** → acceso al repo `ia-propieya`; luego reconectar Git en **propie-ya-web** / panel.

---

## Parte B: Flujo de deploy (cada vez)

### B1. Antes de pushear

```bash
pnpm verify
```

### B2. Publicar release

```bash
git checkout deploy/infra
git add -A
git commit -m "tipo: descripción"
git push origin deploy/infra
```

### B3. Qué ocurre automáticamente

Workflow: **`.github/workflows/promote-deploy-infra.yml`**

1. Install dependencies
2. `pnpm lint`, `pnpm typecheck`, `pnpm build` (equivalente a `pnpm verify`; pasos separados en CI para ver el fallo)
3. `vercel pull` (production) + **`vercel deploy --prod`** desde la **raíz del monorepo** (sube `packages/*`; Root Directory en Vercel sigue siendo `apps/web`). CLI `vercel@41`.
4. Smoke tests **obligatorios** en el dominio canónico:
   - `/` → 2xx
   - `/api/health` → 200 o 503
   - `/api/version` → debe responder (cuerpo no vacío)

   Si `/api/version.commit` no coincide con el commit del push, el job puede quedar **verde** igual (warning): el deploy CLI igual se ejecutó; el dominio puede actualizarse después o requerir ajuste en Vercel.

Si fallan lint, typecheck, build, `vercel deploy` o los smoke anteriores, el workflow queda en rojo.

### B4. Verificar resultado

```bash
pnpm verificar:deploy
```

---

## Parte C: Si algo falla

### Portal sigue 404

1. Confirmar secrets (`A2`)
2. Confirmar dominio/proyecto (`A3`)
3. Revisar logs del workflow de deploy

### Falla Vercel CLI en workflow

- Token inválido/expirado
- `VERCEL_PROJECT_ID` de proyecto incorrecto (ej. panel)
- `VERCEL_ORG_ID` incorrecto

Corregir secreto y volver a pushear `deploy/infra`.

---

## Resumen de URLs

- https://github.com/TeknoAriel/PropieYa/settings/actions
- https://github.com/TeknoAriel/PropieYa/settings/secrets/actions
- https://github.com/kiteprop/ia-propieya (copia org; sin uso obligatorio diario)
- https://propieyaweb.vercel.app
- https://propieyaweb.vercel.app/api/health
- https://propieyaweb.vercel.app/api/version
