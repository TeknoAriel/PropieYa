# Depurar producción

Checklist cuando algo falla en https://propieyaweb.vercel.app

---

## Error: "La base de datos aún no tiene las tablas necesarias"

**Causa:** Neon (o la DB de producción) no tiene el schema aplicado.

### Solución (ejecutar en tu máquina)

1. **Obtener DATABASE_URL**
   - Vercel → [propieya-web](https://vercel.com/teknoariels-projects/propieya-web) → Settings → Environment Variables
   - Copiá el valor de `DATABASE_URL`

2. **Aplicar schema**
   ```bash
   cd /Users/arielcarnevali/Propieya
   DATABASE_URL="postgresql://..." ./scripts/db-push-produccion.sh
   ```

3. **Probar** en https://propieyaweb.vercel.app/registro

---

## Si DATABASE_URL no está en Vercel

1. Creá un proyecto en [Neon](https://console.neon.tech)
2. Copiá la connection string (pooled)
3. En Vercel → propieya-web → Settings → Environment Variables → Add:
   - Name: `DATABASE_URL`
   - Value: `postgresql://...?sslmode=require`
   - Environments: Production, Preview, Development
4. Redeploy del proyecto web
5. Ejecutá `db-push-produccion.sh` con esa URL

---

## Orden de depuración

| Paso | Qué verificar |
|------|---------------|
| 1 | `/api/health` responde 200 |
| 2 | `/api/version` muestra commit esperado |
| 3 | `DATABASE_URL` existe en Vercel (web y panel) |
| 4 | Schema aplicado: `DATABASE_URL=... pnpm db:push` |
| 5 | `JWT_SECRET` definido (auth) |
| 6 | `TRUSTED_PANEL_ORIGINS` si el panel llama al web |

---

## Scripts útiles

```bash
# Verificar estado
bash scripts/verificar-produccion.sh

# Aplicar schema a prod
DATABASE_URL="..." ./scripts/db-push-produccion.sh
```
