/**
 * Reclasifica avisos activos a `development_unit` cuando el título/descripción
 * indica emprendimiento / en pozo (misma lógica que import tras fix de mapper).
 *
 * Uso:
 *   DATABASE_URL=... pnpm reclassify:development-units
 *   APPLY=1 DATABASE_URL=... pnpm reclassify:development-units
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { getDb, runReclassifyDevelopmentUnits } from '@propieya/database'

const envFile = process.env.ENV_FILE
if (envFile) {
  config({ path: resolve(process.cwd(), envFile) })
} else {
  config()
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL no está definido')
    process.exit(1)
  }

  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'
  const result = await runReclassifyDevelopmentUnits(getDb(), { apply })

  console.log('Candidatos SQL:', result.candidateCount)
  console.log('Examinados (mapper):', result.examined)
  console.log('Cambiarían a development_unit:', result.wouldChange)
  if (apply) console.log('Actualizados:', result.updated)
  if (result.samples.length > 0) {
    console.log('\nMuestra:')
    for (const s of result.samples) console.log(' ', s)
  }
  if (!apply && result.wouldChange > 0) {
    console.log('\nEjecutá APPLY=1 o cron ?dryRun=0 en producción.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
