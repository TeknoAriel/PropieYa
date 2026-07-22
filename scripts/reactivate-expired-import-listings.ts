/**
 * Reactiva avisos importados en expired/suspended (no withdrawn) con nueva vigencia.
 * Uso: ENV_FILE=apps/web/.env.prod.audit APPLY=1 pnpm exec tsx scripts/reactivate-expired-import-listings.ts
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'

import { LISTING_VALIDITY } from '@propieya/shared'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), process.env.ENV_FILE ?? 'apps/web/.env.prod.audit') })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL missing')
  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'
  const days = LISTING_VALIDITY.MANUAL_VALIDITY_DAYS
  const sql = postgres(url, { max: 1, connect_timeout: 30 })

  const [before] = await sql`
    select
      count(*) filter (where status = 'expired')::int as expired,
      count(*) filter (where status = 'suspended')::int as suspended,
      count(*) filter (where status = 'active')::int as active
    from listings
    where source = 'import'
  `
  console.log('antes', before)

  if (!apply) {
    console.log(`Dry-run. APPLY=1 reactivaría expired+suspended con vigencia ${days} días.`)
    await sql.end()
    return
  }

  const result = await sql`
    update listings
    set
      status = 'active',
      published_at = coalesce(published_at, now()),
      last_validated_at = now(),
      expires_at = now() + (${days}::int * interval '1 day'),
      updated_at = now()
    where source = 'import'
      and status in ('expired', 'suspended')
    returning id
  `
  console.log('reactivados', result.length)

  const [after] = await sql`
    select
      count(*) filter (where status = 'expired')::int as expired,
      count(*) filter (where status = 'suspended')::int as suspended,
      count(*) filter (where status = 'active')::int as active,
      count(*) filter (where status = 'active' and property_type = 'development_unit')::int as development_unit
    from listings
    where source = 'import'
  `
  console.log('después', after)
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
