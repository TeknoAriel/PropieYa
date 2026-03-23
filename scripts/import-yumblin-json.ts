#!/usr/bin/env npx tsx
/**
 * Importa propiedades desde el feed JSON Yumblin (Kiteprop).
 *
 * Uso:
 *   pnpm import:yumblin
 *   pnpm import:yumblin -- --file=./lacapital.json
 *   pnpm import:yumblin -- --limit=100
 *   IMPORT_ORGANIZATION_ID=xxx IMPORT_PUBLISHER_ID=yyy pnpm import:yumblin
 *
 * Variables:
 *   DATABASE_URL          - Obligatoria
 *   IMPORT_ORGANIZATION_ID - UUID de la organización destino
 *   IMPORT_PUBLISHER_ID   - UUID del usuario publicador
 *   YUMBLIN_JSON_URL     - URL del feed (default en código)
 */

import 'dotenv/config'

import path from 'node:path'

import { runYumblinImportSync } from '@propieya/database'

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='))
  const filePath = fileArg?.slice('--file='.length)
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : undefined
  const forceFullFetch = process.argv.includes('--force-full-fetch')

  let rawData: unknown | undefined
  let feedUrl: string | undefined

  if (filePath) {
    const fs = await import('node:fs/promises')
    const buf = await fs.readFile(filePath, 'utf-8')
    rawData = JSON.parse(buf) as unknown
    feedUrl = `file://${path.resolve(filePath)}`
  }

  if (process.argv.includes('--debug') && rawData && typeof rawData === 'object') {
    const items = (rawData as Record<string, unknown>).propiedades
    if (Array.isArray(items) && items[0]) {
      console.log('Primer item (keys):', Object.keys(items[0] as object))
    }
  }

  const result = await runYumblinImportSync({
    feedUrl,
    rawData,
    limit,
    enforceInterval: false,
    forceFullFetch,
    assumeUnassignedBelongsToThisSource: true,
  })

  if (result.skipped) {
    console.log(`Omitido (${result.skipped}).`)
    return
  }

  const c = result.counts
  console.log(
    `Importadas: ${c.imported}, actualizadas: ${c.updated}, sin cambios: ${c.unchanged}, omitidas (inválidas): ${c.skippedInvalid}, bajas: ${c.withdrawn}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
