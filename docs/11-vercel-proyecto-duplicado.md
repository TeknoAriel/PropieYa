# Vercel: evitar proyectos web duplicados

**URL canónica del portal:** https://propieyaweb.vercel.app (`docs/CANONICAL-URLS.md`).

---

# Vercel: dos proyectos “web” (propie-ya-web vs propieya_web)

Solo necesitás **un** proyecto Vercel para el portal (`apps/web`). El otro es duplicado y genera confusión.

## Qué conservar

- Dejá el que tengas bien configurado con:
  - **Root Directory:** `apps/web`
  - Variables `DATABASE_URL`, `JWT_SECRET`
  - URL de producción que quieras usar (ej. la que pusiste en `NEXT_PUBLIC_WEB_APP_URL` del panel)

## Cómo eliminar el duplicado

1. Abrí **https://vercel.com/dashboard**
2. Entrá al proyecto que **no** quieras (ej. `propieya_web` o `propie-ya-web`, el que sea el extra).
3. **Settings** (⚙️ en el menú del proyecto)
4. Bajá hasta **Delete Project**
5. Escribí el nombre del proyecto para confirmar y **Delete**

## Después de borrar uno

- Si borraste el que usaba el panel en `NEXT_PUBLIC_WEB_APP_URL`, actualizá esa variable en el proyecto **Panel** con la URL del web que quedó.
- **Settings** → **Environment Variables** → editá `NEXT_PUBLIC_WEB_APP_URL` → **Redeploy** el panel.

## Resumen

| Necesitás | Cantidad |
|-----------|----------|
| Web (`apps/web`) | **1** proyecto |
| Panel (`apps/panel`) | **1** proyecto |
| Total | **2** proyectos en Vercel |
