# Tu parte del deploy — Solo lo que debés hacer vos

Todo lo automatizable ya está hecho. Esto es lo que **solo vos** podés hacer:

---

## ✅ Ya hecho (automático)

- [x] Commit de todos los cambios
- [x] Push de la rama `deploy/infra` a GitHub
- [x] JWT_SECRET generado (está en `DEPLOY-CREDENTIALS.local.txt`)
- [x] Typecheck ejecutado (debería pasar en el PR)

---

## 🔲 Paso 1: Mergear el PR en GitHub

1. **Abrí:** https://github.com/TeknoAriel/PropieYa/pull/new/deploy/infra  
2. Creá el Pull Request de `deploy/infra` → `main`.  
3. Esperá a que pase el check **Typecheck** (si falla, avisame).  
4. Hacé **Merge** del PR.

---

## 🔲 Paso 2: Crear DB en Neon

1. **Abrí:** https://console.neon.tech  
2. Login con GitHub.  
3. **New Project** → nombre `propieya` → **Create**.  
4. En **Connection Details** copiá la connection string (activá **Pooled**).  

---

## 🔲 Paso 3: Aplicar schema en Neon

En la terminal (reemplazá la URL por la tuya):

```bash
cd /Users/arielcarnevali/Propieya
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require" pnpm db:push
```

---

## 🔲 Paso 4: Proyecto Web en Vercel

1. **Abrí:** https://vercel.com/new  
2. Importá `TeknoAriel/PropieYa`.  
3. **Root Directory:** `apps/web`  
4. **Variables de entorno:**
   - `DATABASE_URL` = tu connection string de Neon  
   - `JWT_SECRET` = `m2gmICmfIKaI/HH2y0Kb9Vfcy8SUcASharYczShIcqs=` (o el de `DEPLOY-CREDENTIALS.local.txt`)  
5. **Deploy** → copiá la URL del Web (ej: `https://propieya-web-xxx.vercel.app`).

---

## 🔲 Paso 5: Proyecto Panel en Vercel

1. **Abrí:** https://vercel.com/new  
2. Importá el mismo repo `PropieYa`.  
3. **Root Directory:** `apps/panel`  
4. **Variables de entorno:**
   - `DATABASE_URL` = misma de Neon  
   - `JWT_SECRET` = mismo que en Web  
   - `NEXT_PUBLIC_WEB_APP_URL` = URL del Web (la que copiaste antes)  
5. **Deploy**.

---

## Resumen de URLs

| Acción        | URL |
|---------------|-----|
| Crear PR      | https://github.com/TeknoAriel/PropieYa/pull/new/deploy/infra |
| Neon          | https://console.neon.tech |
| Vercel nuevo  | https://vercel.com/new |

JWT_SECRET: ver `DEPLOY-CREDENTIALS.local.txt` en la raíz del proyecto.
