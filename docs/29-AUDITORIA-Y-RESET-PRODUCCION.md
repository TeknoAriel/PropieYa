# Auditoría y reset de producción

Punto de control: sincronizar local, Git, Neon y Vercel.

---

## 1. Estado actual (diagnóstico)

**Verificación rápida:** `bash scripts/verificar-produccion.sh`

### Git

| Rama | Último commit | Contenido |
|------|---------------|-----------|
| **main** | `7fd7f2a` | Merge deploy/infra; Sprints 1–5, Yumblin, copy packs, Elasticsearch, Leads |
| **deploy/infra** | `69d67a2` | + Sprint 6 (email lead) |

**Nota:** Si main y producción coinciden pero ves diferencias con local, suele ser **datos** (Neon vacío) o **env** (variables no configuradas en Vercel).

### Producción (Vercel)

- **URL:** https://propieyaweb.vercel.app
- **Commit desplegado:** `7fd7f2a` (verificar: `curl -s https://propieyaweb.vercel.app/api/version`)
- **Branch de deploy:** debe ser `main`

### Discrepancias típicas

| Síntoma | Causa probable |
|---------|----------------|
| Sin propiedades destacadas | Neon vacío o sin listings |
| Búsqueda vacía | Elasticsearch no configurado o índice vacío |
| Copy/lenguaje distinto a local | `NEXT_PUBLIC_PORTAL_COPY_PACK` distinto o no definido |
| Sin datos de Yumblin | Cron no ejecutado o fallando; `CRON_SECRET`, `YUMBLIN_JSON_URL` |

---

## 2. Cadena: Git → Neon → Vercel

```
[Git main] → [Vercel deploy] → [Next.js build]
                    ↓
              [Neon PostgreSQL] ← DATABASE_URL
              [Elasticsearch]   ← ELASTICSEARCH_URL (si aplica)
              [Cron Yumblin]    ← CRON_SECRET, YUMBLIN_JSON_URL
```

### Verificar cada eslabón

**Git:**
```bash
git fetch origin main
git log -1 --format="%h %s" origin/main
# Debe coincidir con /api/version en producción
```

**Neon (DB):**
- Conectar con `DATABASE_URL` de Vercel
- Verificar tablas: `listings`, `leads`, `users`
- Comprobar si hay filas en `listings` con `status = 'active'`

**Vercel:**
- Settings → Git → Production Branch = `main`
- Settings → General → Root Directory = `apps/web`
- Settings → Environment Variables: revisar `DATABASE_URL`, `ELASTICSEARCH_URL`, `CRON_SECRET`, `YUMBLIN_JSON_URL`, `NEXT_PUBLIC_PORTAL_COPY_PACK`

---

## 3. Reset general de producción

### Opción A: Deploy limpio (sin tocar DB)

1. **Sincronizar main con deploy/infra** (incluir Sprint 6):
   - Merge manual: https://github.com/kiteprop/ia-propieya/compare/main...deploy/infra
   - O ejecutar Promote: Actions → "Promote deploy/infra → main" → Run workflow

2. **Forzar redeploy en Vercel:**
   - Deployments → último deploy → ⋮ → Redeploy
   - Marcar **"Use existing Build Cache"** = No (build limpio)

3. **Revisar logs** del deploy por errores de build o env.

### Opción B: Reset completo (DB + deploy)

1. **Neon:** backup si hace falta, luego:
   ```bash
   DATABASE_URL="postgresql://...tu-neon..." pnpm db:push
   ```

2. **Poblar DB (opcional):**
   ```bash
   DATABASE_URL="postgresql://...neon..." IMPORT_ORGANIZATION_ID=xxx IMPORT_PUBLISHER_ID=yyy pnpm import:yumblin
   ```
   Necesitás un `organization_id` y `publisher_id` (usuario) válidos. Crear org y usuario desde el panel o con scripts.

3. **Indexar en Elasticsearch** (si usás ES):
   - El cron `/api/cron/sync-search` o job equivalente indexa listings.
   - O ejecutar manualmente el sync si hay script.

4. **Redeploy Vercel** como en Opción A.

---

## 4. Variables mínimas para que todo funcione

### Web (Vercel)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Neon PostgreSQL |
| `JWT_SECRET` | Auth |
| `ELASTICSEARCH_URL` | Búsqueda (opcional; fallback a SQL) |
| `S3_*` | Imágenes |
| `CRON_SECRET` | Cron Yumblin, check-validity, sync-search |
| `YUMBLIN_JSON_URL` | URL del feed (o default) |
| `NEXT_PUBLIC_PORTAL_COPY_PACK` | `regla_portal_v1` o `variante_b_cercano` |
| `TRUSTED_PANEL_ORIGINS` | CORS panel |
| `NEXT_PUBLIC_PANEL_URL` | Links al panel |

### Panel (Vercel)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Mismo que web |
| `JWT_SECRET` | Mismo que web |
| `NEXT_PUBLIC_WEB_APP_URL` | `https://propieyaweb.vercel.app` |

---

## 5. Checklist post-reset

- [ ] `/api/version` devuelve el commit esperado
- [ ] `/api/health` devuelve `healthy`
- [ ] Home muestra copy correcto (hero, ejemplos)
- [ ] Propiedades destacadas (si hay datos en Neon)
- [ ] Búsqueda devuelve resultados o mensaje claro si no hay datos
- [ ] Login/registro funcionan
- [ ] Cron Yumblin configurado (vercel.json) y con `CRON_SECRET`

---

*Actualizado: 2026-03-22*
