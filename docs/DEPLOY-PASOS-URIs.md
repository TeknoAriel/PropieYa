# Deploy — pasos y URLs (documento definitivo)

**Este es el documento de referencia.** El agente y quien despliegue deben seguir exactamente esto. No inventar pasos ni URLs distintas.

---

## URLs canónicas (NO cambiar)

| Recurso | URL exacta |
|---------|------------|
| Portal producción | https://propieyaweb.vercel.app |
| Health | https://propieyaweb.vercel.app/api/health |
| Version | https://propieyaweb.vercel.app/api/version |

---

## Parte A: Configuración UNA SOLA VEZ (si ya está hecha, NO repetir)

### A1. Permitir que Actions cree PRs

1. Ir a: **https://github.com/TeknoAriel/PropieYa/settings/actions**
2. Sección **"Workflow permissions"**
3. Marcar **"Read and write permissions"**
4. Marcar **"Allow GitHub Actions to create and approve pull requests"**
5. **Save**

### A2. Ruleset de main — quitar "Require status checks"

**Es lo que evita el error "Required status check 'Typecheck' is expected".** El workflow Promote ya hace verify (lint+typecheck+build) antes de mergear; la regla de status checks es redundante y suele fallar por nombres de checks.

1. Ir a: **https://github.com/TeknoAriel/PropieYa/settings/rules**
2. Abrir la regla que protege `main`
3. En la sección **"Rules"**, buscar **"Require status checks to pass before merging"**
4. **Eliminar o desactivar** esa regla
5. Guardar

No hace falta bypass ni PAT.

### A3. Vercel — proyecto Web vinculado a main

1. Ir a: **https://vercel.com** → tu cuenta → proyecto del portal (el que sirve `propieyaweb.vercel.app`)
2. **Settings** → **Git** → Branch: debe ser **`main`**
3. **Settings** → **General** → **Root Directory**: debe ser **`apps/web`**

Si el proyecto no existe o da 404: crear proyecto nuevo importando el repo, Root Directory `apps/web`, rama `main`.

---

## Parte B: Flujo de deploy (cada vez que subís cambios)

### B1. Antes de pushear

```bash
pnpm verify
```

Si falla, corregir. No pushear si no pasa.

### B2. Push a deploy/infra

```bash
git checkout deploy/infra
git add -A
git commit -m "tipo: descripción"
git push origin deploy/infra
```

### B3. Qué ocurre automáticamente

1. Workflow **Promote deploy/infra → main** corre
2. Verify (lint + typecheck + build) → Merge a main → Verify-deploy
3. Vercel despliega al actualizarse `main`

### B4. Verificar que quedó bien

```bash
curl -s https://propieyaweb.vercel.app/api/version
```

O: `pnpm verificar:prod`

---

## Parte C: Si algo falla

### El merge del PR falla ("Required status check")

→ **A2**: En la regla de main, quitar la regla "Require status checks to pass".  
URL: https://github.com/TeknoAriel/PropieYa/settings/rules

### El merge falla ("not permitted" o similar)

→ **A1**: Verificar permisos de Actions.  
URL: https://github.com/TeknoAriel/PropieYa/settings/actions

### Actions no puede crear o mergear el PR (merge automático rojo)

En **Settings → Actions → General** → **Workflow permissions**:

- **Read and write permissions** (no solo read).
- Marcar **Allow GitHub Actions to create and approve pull requests**.

Sin esto, el job "Merge to main" falla aunque el código en `deploy/infra` sea correcto.

### `main` va atrasada respecto a `deploy/infra` (cambios no llegan a producción)

1. Esperar a que el workflow **Promote** pase (push a `deploy/infra` lo dispara).
2. Si el Promote sigue fallando: merge **manual del PR** (válido con la regla "solo por PR"):  
   **https://github.com/TeknoAriel/PropieYa/compare/main...deploy/infra**  
   → **Create pull request** → **Merge**. Tras eso, Vercel despliega desde `main`.

### Verify-deploy muestra advertencia (portal no responde 2xx)

→ El merge ya se hizo. Revisar A3; Vercel puede estar construyendo. Verificar luego: `curl https://propieyaweb.vercel.app/api/version`

### Portal devuelve 404

→ El proyecto web en Vercel no está desplegado o la URL es distinta. Revisar en Vercel qué URL tiene el proyecto.

---

## Parte D: Secretos opcionales en GitHub (deploy por CLI, una sola vez)

Si el enlace **Git → Vercel** deja el dominio en `NOT_FOUND`, el workflow **Promote** puede ejecutar `vercel deploy --prod` **después del merge a `main`**, sin abrir el dashboard en cada release.

1. En Vercel: proyecto del portal → **Settings → General** → copiar **Project ID** y **Team / Org ID** (o desde `.vercel/project.json` si existe en local).
2. En Vercel: **Account Settings → Tokens** → crear token con alcance adecuado.
3. En GitHub: **https://github.com/TeknoAriel/PropieYa/settings/secrets/actions** → **New repository secret**:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

Con los tres definidos, el job **Verificar deploy en producción** del workflow Promote ejecuta el deploy por CLI antes del `curl` al portal. Sin secretos, el flujo sigue dependiendo solo del enlace Git de Vercel.

**Nota:** `/api/health` puede responder **503** si la base en producción no está disponible; eso no invalida que el sitio esté desplegado (ver lógica en el workflow).

---

## Resumen de URLs para copiar/pegar

```
https://github.com/TeknoAriel/PropieYa/settings/actions
https://github.com/TeknoAriel/PropieYa/settings/rules
https://github.com/TeknoAriel/PropieYa/settings/secrets/actions
https://propieyaweb.vercel.app
https://propieyaweb.vercel.app/api/health
https://propieyaweb.vercel.app/api/version
```

---

## Qué NO hacer

- No pushear a `main` directamente (está protegida)
- No crear workflows ni reglas nuevas sin actualizar este doc
- No usar URLs distintas a las de este documento (salvo que se actualice aquí)
