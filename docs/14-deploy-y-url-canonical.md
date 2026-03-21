# Deploy + URL canónica (resumen)

## URL de prueba / producción web

**https://propieyaweb.vercel.app**

Detalle y variables: **`docs/CANONICAL-URLS.md`**.

## Flujo de deploy (automatizado)

1. Cambios en rama **`deploy/infra`** → push.
2. GitHub Actions **Promote deploy/infra → main** (ver `.github/workflows/promote-deploy-infra.yml`).
3. **`main`** actualizado → Vercel despliega si el proyecto está enlazado a `main`.
4. Bypass GitHub si hace falta: **`docs/12-bypass-github-actions.md`**.

## Vercel (por proyecto)

| Proyecto Vercel | Root Directory | Rama típica |
|-----------------|----------------|-------------|
| Web | `apps/web` | `main` |
| Panel | `apps/panel` | `main` |

Guía detallada: **`docs/06-despliegue-vercel.md`**.  
Copiar/pegar env: **`docs/09-CONFIGURACION-COPIAR-PEGAR.md`**.

## Prioridad de esta etapa

**`docs/15-etapa-actual-prioridad.md`** — Panel ↔ web (CORS + env).

## Reglas del agente / calidad

- **`AGENTS.md`**
- **`.cursor/rules/`** — `automacion-propietario.mdc`, `control-produccion.mdc`, `produccion-escala.mdc`

## Bloqueos externos

**`docs/REGISTRO-BLOQUEOS.md`**
