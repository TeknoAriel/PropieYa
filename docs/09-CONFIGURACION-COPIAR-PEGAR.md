# Configuración — URLs y datos para copiar/pegar

## URL canónica del portal

**https://propieyaweb.vercel.app**

En el **Panel**, variable `NEXT_PUBLIC_WEB_APP_URL`:

```text
https://propieyaweb.vercel.app
```

Más detalle: **`docs/CANONICAL-URLS.md`**.

---

## 1. NEON (Base de datos)

**URL:** https://console.neon.tech

| Dónde | Qué hacer |
|-------|-----------|
| Login | Entrá con GitHub |
| Dashboard | Clic en **New Project** |
| Nombre | `propieya` |
| Region | `South America (São Paulo)` o `US East` |
| Create | Clic en **Create project** |
| Connection Details | Clic en **Connect** o **Connection string** |
| Toggle | Activar **Pooled connection** |
| Copiar | La URL completa (empieza con `postgresql://`) |

**Guardá esa URL** → es tu `DATABASE_URL`.

---

## 2. APLICAR SCHEMA (terminal local)

Abrí la terminal y ejecutá (reemplazá `TU_URL_DE_NEON`):

```bash
cd /Users/arielcarnevali/Propieya
DATABASE_URL="TU_URL_DE_NEON" pnpm db:push
```

Ejemplo (NO usar literal, usar tu URL):
```bash
DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-cool-name-12345-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" pnpm db:push
```

---

## 3. GITHUB (mergear código)

**URL:** https://github.com/TeknoAriel/PropieYa/compare/main...deploy/infra

| Dónde | Qué hacer |
|-------|-----------|
| La página de compare | Clic en **Create pull request** |
| Título | Dejá o poné: `Deploy infra` |
| Merge | Clic en **Merge pull request** → **Confirm merge** |

---

## 4. VERCEL — Proyecto Web

**URL:** https://vercel.com/new

| Paso | Dónde está | Qué poner |
|------|------------|-----------|
| 1 | Import Git Repository | Buscar `PropieYa` → clic en **Import** |
| 2 | Project Name | `propieya-web` |
| 3 | Root Directory | Clic en **Edit** → escribir `apps/web` → **Continue** |
| 4 | Environment Variables | Expandir la sección |
| 5 | Agregar variable 1 | Name: `DATABASE_URL` |
| | | Value: *(pegar tu URL de Neon)* |
| | | Environments: Production, Preview, Development |
| 6 | Agregar variable 2 | Name: `JWT_SECRET` |
| | | Value: `m2gmICmfIKaI/HH2y0Kb9Vfcy8SUcASharYczShIcqs=` |
| | | Environments: Production, Preview, Development |
| 7 | Deploy | Clic en **Deploy** |

**Al terminar:** copiá la URL del sitio (ej: `https://propieya-web-xxxxx.vercel.app`) → es tu `NEXT_PUBLIC_WEB_APP_URL`.

---

## 5. VERCEL — Proyecto Panel

**URL:** https://vercel.com/new

| Paso | Dónde está | Qué poner |
|------|------------|-----------|
| 1 | Import Git Repository | Buscar `PropieYa` → clic en **Import** |
| 2 | Project Name | `propieya-panel` |
| 3 | Root Directory | Clic en **Edit** → escribir `apps/panel` → **Continue** |
| 4 | Environment Variables | Expandir la sección |
| 5 | Agregar variable 1 | Name: `DATABASE_URL` |
| | | Value: *(la misma URL de Neon)* |
| | | Environments: Production, Preview, Development |
| 6 | Agregar variable 2 | Name: `JWT_SECRET` |
| | | Value: `m2gmICmfIKaI/HH2y0Kb9Vfcy8SUcASharYczShIcqs=` |
| | | Environments: Production, Preview, Development |
| 7 | Agregar variable 3 | Name: `NEXT_PUBLIC_WEB_APP_URL` |
| | | Value: *(la URL del Web que copiaste, ej: `https://propieya-web-xxxxx.vercel.app`)* |
| | | Environments: Production, Preview, Development |
| 8 | Deploy | Clic en **Deploy** |

---

## 6. MODIFICAR VARIABLES DESPUÉS (si faltó algo)

**Web:** https://vercel.com/dashboard → tu proyecto `propieya-web` → **Settings** → **Environment Variables**

**Panel:** https://vercel.com/dashboard → tu proyecto `propieya-panel` → **Settings** → **Environment Variables**

---

## DATOS LISTOS PARA COPIAR

### JWT_SECRET
```
m2gmICmfIKaI/HH2y0Kb9Vfcy8SUcASharYczShIcqs=
```

### Nombres de variables (para no equivocarse)
- `DATABASE_URL` (sin espacios)
- `JWT_SECRET` (sin espacios)
- `NEXT_PUBLIC_WEB_APP_URL` (solo en Panel, sin espacios)

### Root Directory
- Web: `apps/web`
- Panel: `apps/panel`

---

## URLs DE REFERENCIA RÁPIDA

| Qué | URL |
|-----|-----|
| Neon | https://console.neon.tech |
| Crear PR / mergear | https://github.com/TeknoAriel/PropieYa/compare/main...deploy/infra |
| Nuevo proyecto Vercel | https://vercel.com/new |
| Dashboard Vercel | https://vercel.com/dashboard |
| Repo GitHub | https://github.com/TeknoAriel/PropieYa |
