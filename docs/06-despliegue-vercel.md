# Despliegue en Vercel (Portal Web + Panel)

Este repo es un monorepo (Turborepo + Next.js App Router) con 2 apps:
- `apps/web` (portal público, Next.js)
- `apps/panel` (panel B2B, Next.js)

Para que el `Panel` llame al `tRPC` del `Web`, necesitás configurar `NEXT_PUBLIC_WEB_APP_URL`.

## Opción recomendada: 2 proyectos en Vercel

### 1) Proyecto Web (`apps/web`)
1. En Vercel: `Add New…` → importar el repo.
2. Elegí la ruta del “Project root” como `apps/web`.
3. Framework preset: `Next.js`.
4. Build settings:
   - `Install command`: `pnpm install --frozen-lockfile`
   - `Build command`: `pnpm --filter @propieya/web build`
   - `Output directory`: vacío (Next.js lo detecta)
5. Node version: 20.

Variables de entorno mínimas (en el proyecto Web):
- `DATABASE_URL`
- `ELASTICSEARCH_URL`
- `REDIS_URL`
- `OPENAI_API_KEY` (o el provider que uses)
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_URL`
- `JWT_SECRET` y otros secretos de auth

> Nota: si dejás `DATABASE_URL` apuntando a tu localhost, el deploy no va a funcionar. Para probar en Vercel necesitás una DB accesible desde Vercel.

### 2) Proyecto Panel (`apps/panel`)
1. En Vercel: `Add New…` → importar el mismo repo.
2. “Project root” como `apps/panel`.
3. Framework preset: `Next.js`.
4. Build settings:
   - `Install command`: `pnpm install --frozen-lockfile`
   - `Build command`: `pnpm --filter @propieya/panel build`
5. Node version: 20.

Variables de entorno mínimas (en el proyecto Panel):
- `NEXT_PUBLIC_WEB_APP_URL` → URL del proyecto Web (ej: `https://propieya.vercel.app`)
- `NEXT_PUBLIC_PANEL_URL` (opcional pero recomendado)
- `DATABASE_URL` + secretos si el panel los requiere en server-side

### 3) Comportamiento esperado
- El Panel crea/actualiza listings en estado `draft`.
- Con el botón “Publicar” llama `trpc.listing.publish`.
- El portal (`apps/web`) publica únicamente `status: active`.
- La ficha `GET /propiedad/[id]` muestra:
  - imágenes desde `listing.media`
  - `features.field` (todas las variantes rurales)
  - `features.commercialSub` cuando `propertyType` es `commercial` u `office`

## Opción alternativa rápida (sin Vercel): URL pública local
Si todavía no querés desplegar (por DB/S3/Redis), podés levantar un túnel (ej. `cloudflared` o `ngrok`) para exponer:
- `http://localhost:3000` (web)
- `http://localhost:3001` (panel)

En ese caso, seteá `NEXT_PUBLIC_WEB_APP_URL` en el panel para que apunte al URL público del web túnel.

