# Variables Vercel — S3/R2 y Cron

## Proyecto Web (apps/web)

### S3 / R2 (subida de imágenes)

En **Vercel** → proyecto **web** → **Settings** → **Environment Variables**:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `S3_BUCKET` | Nombre del bucket | Production, Preview |
| `S3_ACCESS_KEY` | Access Key ID | Production, Preview |
| `S3_SECRET_KEY` | Secret Access Key | Production, Preview |
| `S3_PUBLIC_URL` | URL pública del bucket (CDN o bucket público) | Production, Preview |
| `S3_REGION` | `us-east-1` o `auto` (R2) | Production, Preview |
| `S3_ENDPOINT` | Vacío (AWS) o URL R2 (ej. `https://xxx.r2.cloudflarestorage.com`) | Production, Preview |
| `NEXT_PUBLIC_MEDIA_HOST` | Hostname público (ej. `pub-xxx.r2.dev`) para `images.remotePatterns` | Production, Preview |

### Cron (import automático Yumblin)

| Variable | Valor | Entornos |
|----------|-------|----------|
| `CRON_SECRET` | String aleatorio (Vercel lo envía en el header del cron) | Production |

Generar: `openssl rand -hex 32`

### Copiar todas (script)

```bash
# Desde la raíz del repo
vercel env pull .env.vercel.local
# Luego editar y subir las que falten
```

## Referencia

- S3/R2 detalle: `docs/21-s3-media.md`
- Checklist deploy: `docs/20-checklist-deploy-priorizado.md`
