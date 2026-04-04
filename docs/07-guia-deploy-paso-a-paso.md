# Guía paso a paso: GitHub + Vercel + Neon

Guía con URLs y capturas mentales para dejar PropieYa funcionando en producción.

---

## Paso 1: Crear base de datos en Neon

### 1.1 Ir a Neon

- **URL:** https://console.neon.tech
- Iniciá sesión con GitHub (recomendado) o email.

### 1.2 Crear proyecto

1. Clic en **New Project**.
2. **Name:** `propieya` (o el que prefieras).
3. **Region:** elegir la más cercana (ej. `South America (São Paulo)` o `US East`).
4. Dejá **Create a project with a default branch** marcado.
5. Clic en **Create project**.

### 1.3 Obtener connection string

1. En el **Project Dashboard** verás el panel de conexión.
2. Clic en **Connection Details** o en **Connect**.
3. Seleccioná **Pooled connection** (recomendado para serverless).
4. Copiá la connection string. Ejemplo:
   ```
   postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 1.4 Sincronizar el schema

En tu máquina, en la raíz del proyecto:

```bash
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" pnpm db:push
```

(Reemplazá la URL por la tuya.)

---

## Paso 2: Subir código a GitHub

### 2.1 Revisar que el repo esté bien configurado

```bash
git remote -v
# Debe mostrar: origin  https://github.com/kiteprop/ia-propieya.git
```

### 2.2 Commit y push

```bash
git add .
git status   # revisar qué se va a subir
git commit -m "feat: monedas, subrubros, campos rurales, rutas propiedad/buscar, publish"
git push origin main
```

Si tu rama se llama `master`:

```bash
git push origin master
```

### 2.3 Verificar en GitHub

- **URL:** https://github.com/kiteprop/ia-propieya  
- Comprobá que el último commit esté subido.

---

## Paso 3: Crear proyecto Web en Vercel

### 3.1 Ir al dashboard de Vercel

- **URL:** https://vercel.com/dashboard  
- Iniciá sesión con GitHub.

### 3.2 Importar repositorio

1. Clic en **Add New…** → **Project**.
2. En **Import Git Repository**, buscá `PropieYa` o `kiteprop/ia-propieya`.
3. Clic en **Import** junto al repo.

### 3.3 Configurar el proyecto Web

Antes de **Deploy**, editá la configuración:

| Campo | Valor |
|-------|-------|
| **Project Name** | `propieya-web` (o el que prefieras) |
| **Framework Preset** | Next.js |
| **Root Directory** | Clic en **Edit** → escribir `apps/web` → **Continue** |
| **Build Command** | Dejar en blanco (usa `next build` por defecto) |
| **Output Directory** | Vacío |
| **Install Command** | Dejar en blanco (Vercel usa pnpm automáticamente) |

Si Vercel no detecta pnpm, activá **Override** en Install Command y poné:

```text
pnpm install --frozen-lockfile
```

### 3.4 Variables de entorno (Web)

1. Expandí **Environment Variables**.
2. Agregá:

| Name | Value | Entornos |
|------|-------|----------|
| `DATABASE_URL` | Tu connection string de Neon | Production, Preview, Development |
| `JWT_SECRET` | Un string aleatorio de 32+ caracteres (ej. `openssl rand -base64 32`) | Production, Preview, Development |

3. Clic en **Deploy**.

### 3.5 Esperar el deploy

- Si el build pasa, verás la URL del proyecto (ej. `https://propieya-web.vercel.app`).
- **Guardá esa URL**; la vas a usar para el Panel.

---

## Paso 4: Crear proyecto Panel en Vercel

### 4.1 Nuevo proyecto

1. **URL:** https://vercel.com/new  
2. Clic en **Import** junto a `kiteprop/ia-propieya` (mismo repo).

### 4.2 Configurar el proyecto Panel

| Campo | Valor |
|-------|-------|
| **Project Name** | `propieya-panel` |
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/panel` |
| **Build Command** | Vacío |
| **Output Directory** | Vacío |

### 4.3 Variables de entorno (Panel)

| Name | Value | Entornos |
|------|-------|----------|
| `DATABASE_URL` | La misma URL de Neon | Production, Preview, Development |
| `JWT_SECRET` | El mismo valor que en Web | Production, Preview, Development |
| `NEXT_PUBLIC_WEB_APP_URL` | `https://propieya-web.vercel.app` (URL de tu Web) | Production, Preview, Development |

> Si Vercel te asignó otra URL al Web (ej. `propieya-web-xxx.vercel.app`), usá esa.

### 4.4 Deploy

Clic en **Deploy** y esperá a que termine el build.

---

## Paso 5: Verificar que todo funciona

### 5.1 Web

1. Abrí la URL del Web (ej. `https://propieya-web.vercel.app`).
2. Comprobá que la home cargue.
3. Probá `/buscar` y `/propiedad/[algún-id]` si tenés datos.

### 5.2 Panel

1. Abrí la URL del Panel (ej. `https://propieya-panel.vercel.app`).
2. Hacé login.
3. Creá una propiedad de prueba y publicála.
4. Verificá que aparezca en el portal Web.

### 5.3 Health (opcional)

- Web: `https://propieya-web.vercel.app/api/health`  
- Panel: `https://propieya-panel.vercel.app/api/health`  

Deberían devolver `200` y un JSON con `ok: true`.

---

## Paso 6: Ajustar configuraciones avanzadas (opcional)

### 6.1 Node.js 20

1. Proyecto en Vercel → **Settings** → **General**.
2. **Node.js Version** → `20.x`.
3. **Save**.

### 6.2 Dominios personalizados

1. **Settings** → **Domains**.
2. Agregá tu dominio y configurá los registros DNS según las instrucciones.

### 6.3 Build Command explícito (si falla el build)

Si el build falla por el monorepo:

- **Build Command:**  
  `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @propieya/web build`

---

## URLs de referencia rápida

| Servicio | URL |
|----------|-----|
| **Neon Console** | https://console.neon.tech |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Repositorio GitHub** | https://github.com/kiteprop/ia-propieya |
| **Vercel - Nuevo proyecto** | https://vercel.com/new |
| **Vercel - Docs Monorepos** | https://vercel.com/docs/monorepos |

---

## Errores frecuentes

| Error | Solución |
|-------|----------|
| `DATABASE_URL is required` | Agregá la variable en Vercel y redeployá. |
| `Could not connect to database` | Verificá que la URL de Neon sea correcta y tenga `?sslmode=require`. |
| `Module not found: @propieya/database` | Asegurate de que **Root Directory** sea `apps/web` o `apps/panel` y que el install corra desde la raíz del repo. |
| Panel no llama al API | Revisá que `NEXT_PUBLIC_WEB_APP_URL` apunte a la URL real del Web. |
| Build falla con pnpm | Probá Install Command: `pnpm install --frozen-lockfile`. |

---

## Checklist final

- [ ] Proyecto Neon creado y `DATABASE_URL` copiada
- [ ] `pnpm db:push` ejecutado contra Neon
- [ ] Código pusheado a GitHub
- [ ] Proyecto Web creado en Vercel con `apps/web` como root
- [ ] Variables `DATABASE_URL` y `JWT_SECRET` en Web
- [ ] Proyecto Panel creado en Vercel con `apps/panel` como root
- [ ] Variables `DATABASE_URL`, `JWT_SECRET` y `NEXT_PUBLIC_WEB_APP_URL` en Panel
- [ ] Web y Panel desplegados y respondiendo
- [ ] Login en Panel y creación/publicación de una propiedad de prueba
