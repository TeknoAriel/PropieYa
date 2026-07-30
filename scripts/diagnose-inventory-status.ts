import { config } from 'dotenv'
import { resolve } from 'node:path'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), process.env.ENV_FILE ?? 'apps/web/.env.prod.audit') })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL missing')
  const sql = postgres(url, { max: 1, connect_timeout: 25 })
  const byStatus = await sql`
    select status, count(*)::int as c
    from listings
    where source = 'import'
    group by status
    order by c desc
  `
  const byTypeActive = await sql`
    select property_type, count(*)::int as c
    from listings
    where status = 'active'
    group by property_type
    order by c desc
  `
  const feedCols = await sql`
    select column_name from information_schema.columns
    where table_name = 'import_feed_sources'
    order by ordinal_position
  `
  console.log('import_feed_sources columns:', feedCols.map((r) => r.column_name))
  const feeds = await sql`select * from import_feed_sources limit 5`
  console.log('status:', byStatus)
  console.log('active by type:', byTypeActive)
  console.log('feeds:', feeds)
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
