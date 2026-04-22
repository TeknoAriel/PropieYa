import { config } from 'dotenv'
import postgres = require('postgres')

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

  const expectedColumns = [
    'message_generated_by_system',
    'enrichment',
    'quality_score',
    'access_status',
    'activated_at',
    'activation_mode',
    'intent_level',
    'source',
  ] as const

  const cols = (await db.unsafe(
    `select column_name
     from information_schema.columns
     where table_schema='public'
       and table_name='leads'
       and column_name in (${expectedColumns.map((c) => `'${c}'`).join(',')})
     order by column_name`
  )) as Row[]

  const idx = (await db.unsafe(
    "select indexname from pg_indexes where schemaname='public' and tablename='leads' and indexname = 'leads_access_status_idx'"
  )) as Row[]

  const countRows = (await db.unsafe('select count(*)::int as total from leads')) as Row[]

  const existingColumns = new Set(cols.map((r) => String(r.column_name)))
  const out = {
    leadsCount: Number(countRows[0]?.total ?? 0),
    leads: Object.fromEntries(expectedColumns.map((c) => [c, existingColumns.has(c)])),
    indexes: {
      leads_access_status_idx: Boolean(idx[0]?.indexname),
    },
  }

  console.log(JSON.stringify(out, null, 2))
  await db.end()
}

main().catch((err) => {
  console.error('[audit-prod-leads-schema]', err)
  process.exit(1)
})
