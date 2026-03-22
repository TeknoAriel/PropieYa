# Solución: 401 en local y cambios no visibles en producción

## 401 en local (panel → web)

### Causas frecuentes

1. **No estás logueado**: El panel requiere sesión. Dos formas de entrar:
   - **Registro:** http://localhost:3000/registro → creá cuenta → http://localhost:3001/login
   - **Magic link (más rápido):** en `.env` poné `MAGIC_LINK_TEST_MODE=1` (web) y `NEXT_PUBLIC_MAGIC_LINK_TEST_MODE=1` (panel), reiniciá `pnpm dev`, y en http://localhost:3001/login usá el bloque "Modo prueba — magic link"

2. **CORS / env**: Asegurate de tener en `.env`:
   - `TRUSTED_PANEL_ORIGINS="http://localhost:3001,http://127.0.0.1:3001"`
   - `NEXT_PUBLIC_WEB_APP_URL="http://localhost:3000"`

3. **Token expirado**: Borrá localStorage (DevTools → Application → localhost:3001) y volvé a iniciar sesión.

### 404

- Se eliminó el enlace a `/forgot-password` (no implementado). Si ves 404 en otra ruta, revisá que la URL sea correcta.

---

## Producción: cambios no visibles tras muchos deploys

### Diagnóstico

- **Versión desplegada:** `curl -s https://propieyaweb.vercel.app/api/version`
- **Último commit en main:** `git log -1 --format=%h origin/main`

Si no coinciden, producción está desactualizada.

### Causa típica

**Vercel despliega desde `main`.** Los cambios van así:

1. Push a `deploy/infra` → workflow **Promote** corre
2. Promote mergea `deploy/infra` → `main`
3. Vercel detecta cambio en `main` → deploy

Si Promote falla, `main` no se actualiza y producción sigue en la versión anterior.

### Qué revisar en Vercel

1. **Settings → Git** del proyecto Web:
   - **Production Branch** debe ser `main`
   - Si está en `deploy/infra`, cambiá a `main`

2. **Root Directory:** debe ser `apps/web` (no la raíz del repo)

3. **Deploys:** en la pestaña Deployments, verificá que los deploys de producción vengan de la rama `main`.

### Forzar actualización

1. Ejecutar Promote manualmente: https://github.com/TeknoAriel/PropieYa/actions → "Promote deploy/infra → main" → **Run workflow**

2. O mergear el PR manualmente: si hay un PR abierto `deploy/infra` → `main`, mergealo desde GitHub.

3. Si Promote falla: revisá **docs/12-bypass-github-actions.md** y **docs/27-CONFIGURAR-REPO-PASO-A-PASO.md**
