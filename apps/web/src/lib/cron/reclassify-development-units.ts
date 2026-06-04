import { getDb, runReclassifyDevelopmentUnits } from '@propieya/database'

export type { ReclassifyDevelopmentUnitsResult } from '@propieya/database'

export async function reclassifyDevelopmentUnitsInProd(options: { apply: boolean }) {
  return runReclassifyDevelopmentUnits(getDb(), options)
}
