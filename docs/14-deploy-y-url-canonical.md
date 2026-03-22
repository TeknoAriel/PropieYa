# Deploy + URL canónica (resumen)

## URL de prueba / producción web

**https://propieyaweb.vercel.app**

Detalle y variables: **`docs/CANONICAL-URLS.md`**.

## Flujo de deploy (automatizado)

1. Cambios en rama **`deploy/infra`** → push.
2. GitHub Actions **Promote deploy/infra → main** (ver `.github/workflows/promote-deploy-infra.yml`):
   - **verify**: lint, typecheck, build
   - **merge-to-main**: fusiona `deploy/infra` en `main` y push
   - **verify-deploy**: espera 90s, verifica que el portal responda 2xx
3. **`main`** actualizado → Vercel despliega automáticamente.
4. Verificar: `curl https://propieyaweb.vercel.app/api/version`
5. Bypass GitHub si hace falta: **`docs/12-bypass-github-actions.md`**.
6. Si algo falla: **`docs/25-verificar-deploy.md`**.
7. **Config repo (primera vez):** **`docs/26-config-repo-deploy.md`** — habilitar "Allow GitHub Actions to create and approve pull requests".

## Vercel (por proyecto)

| Proyecto Vercel | Root Directory | Rama típica |
|-----------------|----------------|-------------|
| Web | `apps/web` | `main` |
| Panel | `apps/panel` | `main` |

Guía detallada: **`docs/06-despliegue-vercel.md`**.  
Copiar/pegar env: **`docs/09-CONFIGURACION-COPIAR-PEGAR.md`**.

## Prioridad de esta etapa

**`docs/15-etapa-actual-prioridad.md`** — Panel ↔ web (CORS + env).

- DB sin tablas: **`docs/16-db-inicializar-produccion.md`**
- Magic link prueba: **`docs/17-magic-link-prueba.md`**
- Copy A/B portal: **`docs/18-copy-portal-ab.md`**

## Reglas del agente / calidad

- **`AGENTS.md`**
- **`.cursor/rules/`** — `automacion-propietario.mdc`, `control-produccion.mdc`, `produccion-escala.mdc`

## Bloqueos externos

**`docs/REGISTRO-BLOQUEOS.md`**
