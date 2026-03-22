# S3 / R2 — subida de fotos

## Variables (proyecto **web** en Vercel)

| Variable | Ejemplo |
|----------|---------|
| `S3_BUCKET` | `propieya-media` |
| `S3_REGION` | `us-east-1` o `auto` (R2) |
| `S3_ENDPOINT` | Vacío (AWS) o `https://xxx.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY` | Key |
| `S3_SECRET_KEY` | Secret |
| `S3_PUBLIC_URL` | URL pública del bucket (CDN o public bucket) |
| `S3_FORCE_PATH_STYLE` | `1` si MinIO / algunos compatibles |

Sin estas variables, `listing.getPresignedUploadUrl` responde error claro (no rompe el build).

## Flujo

1. Panel: **Propiedades** → **Foto** → elige archivo.
2. tRPC `getPresignedUploadUrl` → PUT directo al bucket.
3. tRPC `addMedia` → guarda URL y actualiza `primary_image_url` si corresponde.

## Next.js `images.remotePatterns`

Añadí el host de `S3_PUBLIC_URL` vía env opcional `NEXT_PUBLIC_MEDIA_HOST` (solo hostname, ej. `pub-xxx.r2.dev`) para `<img>` / optimización futura.
