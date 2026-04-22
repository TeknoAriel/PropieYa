/**
 * Aplica en orden los archivos listados en `docs/sql/manifest.txt` contra DATABASE_URL.
 * Pensado para local (Docker) y para alinear instancias sin prompts interactivos.
 *
 * Uso (desde la raíz del repo):
 *   pnpm db:sql:apply
 *   pnpm exec tsx scripts/apply-docs-sql.ts [ruta-a-.env-opcional]
 */
import { readFileSync, existsSync } from 'fs'
import path = require('path')
import { config } from 'dotenv'
import postgres = require('postgres')

function envPath(): string {
  return process.argv[2] ?? '.env'
}

function repoRoot(): string {
  return process.cwd()
}

async function main() {
  const root = repoRoot()
  const envFile = path.isAbsolute(envPath()) ? envPath() : path.join(root, envPath())
  if (existsSync(envFile)) {
    config({ path: envFile })
  }
  config({ path: path.join(root, '.env.local') })

  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error(`DATABASE_URL no definido (cargá ${path.basename(envFile)} en la raíz o pasá la ruta como argumento)`)
  }

  const manifestPath = path.join(root, 'docs/sql/manifest.txt')
  const raw = readFileSync(manifestPath, 'utf8')
  const files = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (files.length === 0) {
    throw new Error(`No hay entradas en ${manifestPath}`)
  }

  const localHost = /localhost|127\.0\.0\.1/i.test(url)
  const db = postgres(url, { max: 1, ssl: localHost ? false : 'require' })

  const applied: string[] = []
  try {
    for (const name of files) {
      const sqlPath = path.join(root, 'docs/sql', name)
      if (!existsSync(sqlPath)) {
        throw new Error(`Falta el archivo SQL: ${sqlPath}`)
      }
      const sql = readFileSync(sqlPath, 'utf8')
      await db.unsafe(sql)
      applied.push(name)
    }
  } finally {
    await db.end()
  }

  console.log(JSON.stringify({ ok: true, applied }, null, 2))
}

main().catch((err) => {
  console.error('[apply-docs-sql]', err)
  process.exit(1)
})
