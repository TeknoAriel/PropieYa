import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY
  )
}

function getClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    ...(process.env.S3_ENDPOINT
      ? {
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1',
        }
      : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  })
}

export async function getPresignedPutUrl(opts: {
  key: string
  contentType: string
  expiresIn?: number
}): Promise<string> {
  const client = getClient()
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: opts.key,
    ContentType: opts.contentType,
  })
  return getSignedUrl(client, cmd, { expiresIn: opts.expiresIn ?? 300 })
}

export function publicMediaUrl(key: string): string {
  const base = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '')
  if (!base) {
    throw new Error('S3_PUBLIC_URL no está configurada')
  }
  return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

export function sanitizeUploadFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'image'
}
