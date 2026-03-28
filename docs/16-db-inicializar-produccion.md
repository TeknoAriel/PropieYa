# Error: `relation "users" does not exist` / "La base de datos aún no tiene las tablas"

La base en Neon (o la que use `DATABASE_URL` en Vercel) **no tiene las tablas** del proyecto.

## Solución

1. **Obtener DATABASE_URL** de Vercel → **propie-ya-web** → Settings → Environment Variables
2. **Desde tu máquina:**
   ```bash
   cd /Users/arielcarnevali/Propieya
   DATABASE_URL="postgresql://..." ./scripts/db-push-produccion.sh
   ```
   O: `DATABASE_URL="postgresql://..." pnpm db:push`
3. **Reintentá** registro o login en `/registro` y en el panel.

## Después del schema: importar propiedades (Yumblin)

En la raíz del repo, con la **misma** `DATABASE_URL` de producción:

```bash
DATABASE_URL="postgresql://..." pnpm exec tsx scripts/seed-org-for-import.ts
DATABASE_URL="postgresql://..." pnpm import:yumblin
DATABASE_URL="postgresql://..." pnpm publish:imported
```

Opcional: `./scripts/verificar-ingestion.sh` (pull de env desde Vercel en `apps/web` + import + ES). Ver `docs/35-VERIFICACION-INGESTA.md`.

Ver `docs/31-DEPURAR-PRODUCCION.md` para más pasos de depuración.
