import { config } from 'dotenv'
import postgres from 'postgres'

type Row = Record<string, unknown>

function envPath(): string {
  return process.argv[2] ?? '.env.vercel.production.local'
}

async function main() {
  config({ path: envPath() })
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error(`DATABASE_URL missing in ${envPath()}`)
  }

  const db = postgres(url, { max: 1, ssl: 'require' })

  const cols = (await db.unsafe(
    "select column_name from information_schema.columns where table_schema='public' and table_name='listings' and column_name in ('last_content_updated_at','renewal_count') order by column_name"
  )) as Row[]

  const lifecycle = (await db.unsafe(
    "select to_regclass('public.listing_lifecycle_events') as reg"
  )) as Row[]

  const idx = (await db.unsafe(
    "select indexname from pg_indexes where schemaname='public' and tablename='listing_lifecycle_events' and indexname in ('listing_lifecycle_events_listing_idx','listing_lifecycle_events_pending_webhook_idx') order by indexname"
  )) as Row[]

  const countRows = (await db.unsafe(
    'select count(*)::int as total from listings'
  )) as Row[]

  const existingColumns = new Set(cols.map((r) => String(r.column_name)))
  const out = {
    listingsCount: Number(countRows[0]?.total ?? 0),
    listings: {
      last_content_updated_at: existingColumns.has('last_content_updated_at'),
      renewal_count: existingColumns.has('renewal_count'),
    },
    listing_lifecycle_events: {
      exists: Boolean(lifecycle[0]?.reg),
      indexes: idx.map((r) => String(r.indexname)),
    },
  }

  console.log(JSON.stringify(out, null, 2))
  await db.end()
}

main().catch((err) => {
  console.error('[audit-prod-listing-schema]', err)
  process.exit(1)
})
