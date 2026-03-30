# Deploy — pasos y URLs (documento definitivo)

**Este es el documento de referencia.**

---

## Repositorio Git oficial

| Qué | Valor |
|-----|--------|
| **Remoto (SSH)** | `git@github.com:kiteprop/ia-propieya.git` |
| **Web** | https://github.com/kiteprop/ia-propieya |

**Primera subida (repo vacío, rama `main`):** con el historial actual en `deploy/infra`:

```bash
git push -u origin deploy/infra:main
```

**Seguir usando el flujo de deploy** (rama `deploy/infra` en el mismo remoto):

```bash
git push -u origin deploy/infra
```

El remoto anterior puede quedar como respaldo, por ejemplo:

```bash
git remote add old-propiya https://github.com/TeknoAriel/PropieYa.git
```

Si `git push` devuelve *Repository not found*: crear el repo vacío en la org **kiteprop**, comprobar que tu usuario tiene acceso y que la clave SSH en https://github.com/settings/keys está asociada a esa cuenta (o usar HTTPS + PAT).

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

1. Ir a: **https://github.com/kiteprop/ia-propieya/settings/actions**
2. En **Actions permissions**: permitir acciones (all actions/reusable workflows)
3. En **Workflow permissions**:
   - **Read and write permissions**
   - **Allow GitHub Actions to create and approve pull requests** (recomendado)
4. Guardar

### A2. Secretos Vercel en GitHub (obligatorio)

Ir a: **https://github.com/kiteprop/ia-propieya/settings/secrets/actions** y crear:

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

Ver también: `docs/DEPLOY-CONTEXTO-AGENTES.md`.

> El deploy productivo lo realiza **GitHub Actions + Vercel CLI**, por lo que no dependemos del Git Integration de Vercel para publicar.

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
2. `pnpm verify`
3. `vercel pull` (production) + **`vercel deploy --prod`** desde la **raíz del monorepo** (sube `packages/*`; Root Directory en Vercel sigue siendo `apps/web`). CLI `vercel@41`.
4. Smoke tests estrictos:
   - `/` debe ser 2xx
   - `/api/health` debe ser 200 o 503
   - `/api/version` debe responder

Si algo falla, el workflow queda en rojo.

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

- https://github.com/kiteprop/ia-propieya/settings/actions
- https://github.com/kiteprop/ia-propieya/settings/secrets/actions
- https://propieyaweb.vercel.app
- https://propieyaweb.vercel.app/api/health
- https://propieyaweb.vercel.app/api/version
