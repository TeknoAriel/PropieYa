# Checklist deploy (orden de prioridad 1 → 7)

| # | Tema | Qué hacer | Doc / código |
|---|------|-----------|----------------|
| **1** | Base de datos | `DATABASE_URL` de Neon en Vercel + `pnpm db:push` con esa URL | `docs/16`, `scripts/db-push-remote.sh` |
| **2** | Variables Vercel | Web: `DATABASE_URL`, `JWT_SECRET`, `TRUSTED_PANEL_ORIGINS`, `NEXT_PUBLIC_PANEL_URL`, opcional `MAGIC_LINK_TEST_MODE`. Panel: mismas DB/JWT + `NEXT_PUBLIC_WEB_APP_URL` + opcional `NEXT_PUBLIC_MAGIC_LINK_TEST_MODE` | `docs/CANONICAL-URLS.md`, `docs/09` |
| **3** | Rama `main` | Merge `deploy/infra` → `main` (o bypass Actions) para que producción = repo | `docs/12`, `docs/10` |
| **4** | Imágenes S3/R2 | Web: `S3_*` + `listing.getPresignedUploadUrl` / `listing.addMedia`. Panel: subir foto en listado | `docs/21-s3-media.md` |
| **5** | XML / fichas | Referencia feed + mapeo futuro | `docs/19`, `packages/shared/src/xml/property-ficha-map.ts` |
| **6** | Copy A/B | `NEXT_PUBLIC_PORTAL_COPY_PACK` + opcional `NEXT_PUBLIC_SHOW_COPY_PACK_LABEL=1` | `docs/18` |
| **7** | Búsqueda | `listing.search` + `/buscar` con filtros | `listing.search` en router |
