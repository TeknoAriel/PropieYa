# Error: `relation "users" does not exist` / "La base de datos aún no tiene las tablas"

La base en Neon (o la que use `DATABASE_URL` en Vercel) **no tiene las tablas** del proyecto.

## Solución

1. **Obtener DATABASE_URL** de Vercel → propieya-web → Settings → Environment Variables
2. **Desde tu máquina:**
   ```bash
   cd /Users/arielcarnevali/Propieya
   DATABASE_URL="postgresql://..." ./scripts/db-push-produccion.sh
   ```
   O: `DATABASE_URL="postgresql://..." pnpm db:push`
3. **Reintentá** registro o login en `/registro` y en el panel.

Ver `docs/31-DEPURAR-PRODUCCION.md` para más pasos de depuración.
