# Workflow: desarrollo local estable y prod controlada

Objetivo: **paridad funcional en Docker**, **pocos deploys exploratorios**, **cambios de esquema repetibles** sin depender de prompts interactivos en Neon.

## Día a día (local)

1. `docker compose up -d`
2. Raíz del repo: `.env` con `DATABASE_URL` apuntando a **localhost:5433** (ver `.env.example`).
3. Primera vez o tras cambios grandes de schema:
   - `pnpm db:schema:local` → `drizzle-kit push` + parches idempotentes de `docs/sql/manifest.txt`.
4. Portal/panel: `pnpm dev` (Next suele leer `apps/web/.env.local`; asegurate que `DATABASE_URL` sea coherente con el mismo Postgres).
5. Antes de merge/deploy del día: `pnpm verify` y, si aplica, `pnpm infra:test`.

## Producción (Neon + Vercel)

- **No** uses `drizzle-kit push` contra prod si puede pedir confirmaciones o renombres ambiguos.
- Aplicá los mismos parches versionados en `docs/sql/` (orden en `manifest.txt`) vía **Neon SQL Editor**, `psql`, o los scripts `scripts/apply-prod-*` / `pnpm apply:prod:*` pensados para auditoría y aplicación con `DATABASE_URL` de prod (sin commitear secretos).

## Staging (opcional, recomendado)

- Otra base Postgres (puede ser otro proyecto Neon): `STAGING_DATABASE_URL` en Vercel preview o env local para pruebas de migración antes de prod.
- Mismo flujo: `db:schema:local` contra esa URL (exportá `DATABASE_URL` temporalmente).

## CI

- El workflow **Schema local** corre `pnpm db:schema:local` contra Postgres en servicio, validando que push + manifest SQL no rompan.
